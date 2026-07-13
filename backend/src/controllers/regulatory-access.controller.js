'use strict';

/**
 * regulatory-access.controller.js
 *
 * Org-side management of regulatory access assignments.
 * Organization admins use these endpoints to:
 *   - List which regulatory officers can see their org
 *   - Grant access to a specific regulatory user
 *   - Activate / deactivate an existing grant
 *   - Revoke a grant entirely
 *   - Search for available regulatory users to assign
 */

const { prisma }         = require('../config/database');
const { AppError }       = require('../middleware/errorHandler');
const { success, created, paginated, parsePagination } = require('../utils/response');
const { createAuditLog } = require('../middleware/auditLogger');
const { cacheDel }       = require('../config/redis');

const REG_ROLES = [
  'REG_OFFICER', 'REG_INSPECTOR',
  'REG_REGIONAL_OFFICER', 'REG_GOVERNMENT_AUTHORITY'
];

/* ── Ensure the caller can manage the target org ──────────────── */
function assertCanManage(req, orgId) {
  if (req.user.role === 'SUPER_ADMIN') return;
  if (req.user.role.startsWith('ORG_') && req.user.orgId === orgId) return;
  throw new AppError('Access denied: not your organization', 403, 'ORG_ACCESS_DENIED');
}

/* ══════════════════════════════════════
   LIST ACCESS GRANTS FOR AN ORG
   GET /organizations/:orgId/regulatory-access
══════════════════════════════════════ */
exports.listAccess = async (req, res) => {
  const orgId = req.params.orgId || req.user.orgId;
  if (!orgId) throw new AppError('Organization ID required', 400);

  assertCanManage(req, orgId);

  const { page, limit, skip } = parsePagination(req.query);
  const { status } = req.query;

  const where = {
    organizationId: orgId,
    ...(status ? { status } : {})
  };

  const [accesses, total] = await Promise.all([
    prisma.regulatoryAccess.findMany({
      where,
      skip, take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.regulatoryAccess.count({ where })
  ]);

  // Enrich with regulator user details
  const userIds = [...new Set(accesses.map(a => a.regulatorUserId))];
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true,
      authority: { select: { id: true, name: true, shortName: true } }
    }
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const enriched = accesses.map(a => ({
    ...a,
    regulatorUser: userMap[a.regulatorUserId] || null
  }));

  return paginated(res, enriched, total, page, limit);
};

/* ══════════════════════════════════════
   GRANT ACCESS
   POST /organizations/:orgId/regulatory-access
   Body: { regulatorUserId }
══════════════════════════════════════ */
exports.grantAccess = async (req, res) => {
  const orgId           = req.params.orgId || req.user.orgId;
  const { regulatorUserId } = req.body;

  if (!orgId)           throw new AppError('Organization ID required', 400);
  if (!regulatorUserId) throw new AppError('regulatorUserId required', 400);

  assertCanManage(req, orgId);

  // Verify the organization exists
  const org = await prisma.organization.findUnique({
    where: { id: orgId }, select: { id: true, name: true }
  });
  if (!org) throw new AppError('Organization not found', 404);

  // Verify target user has a regulatory role
  const regUser = await prisma.user.findUnique({
    where:  { id: regulatorUserId },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, isActive: true,
      authority: { select: { id: true, name: true, shortName: true } }
    }
  });
  if (!regUser)                        throw new AppError('Regulatory user not found', 404);
  if (!REG_ROLES.includes(regUser.role)) throw new AppError('Target user does not have a regulatory role', 400);
  if (!regUser.isActive)               throw new AppError('Regulatory user account is inactive', 400);

  // Upsert: create new or re-activate an existing (previously deactivated) grant
  const access = await prisma.regulatoryAccess.upsert({
    where: {
      organizationId_regulatorUserId: { organizationId: orgId, regulatorUserId }
    },
    create: { organizationId: orgId, regulatorUserId, status: 'ACTIVE' },
    update: { status: 'ACTIVE', updatedAt: new Date() }
  });

  // Invalidate the regulator's dashboard cache so they see the new org immediately
  await cacheDel(`dashboard:regulatory:${regulatorUserId}`);
  await cacheDel(`analytics:regional:${regulatorUserId}`);

  await createAuditLog({
    userId:      req.user.id,
    action:      'PERMISSION_CHANGE',
    entityType:  'RegulatoryAccess',
    entityId:    access.id,
    description: `Regulatory access granted — org "${org.name}" → user ${regUser.email}`,
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return created(res, { access, regulatorUser: regUser }, 'Regulatory access granted successfully');
};

/* ══════════════════════════════════════
   UPDATE STATUS  (activate / deactivate)
   PATCH /organizations/:orgId/regulatory-access/:accessId
   Body: { status: "ACTIVE" | "INACTIVE" }
══════════════════════════════════════ */
exports.updateAccess = async (req, res) => {
  const { orgId, accessId } = req.params;
  const { status }          = req.body;

  if (!['ACTIVE','INACTIVE'].includes(status)) {
    throw new AppError('Status must be ACTIVE or INACTIVE', 400);
  }

  const access = await prisma.regulatoryAccess.findUnique({ where: { id: accessId } });
  if (!access) throw new AppError('Access record not found', 404);

  // Validate the accessId belongs to the stated orgId
  if (orgId && access.organizationId !== orgId) {
    throw new AppError('Access record does not belong to this organization', 400);
  }

  assertCanManage(req, access.organizationId);

  const updated = await prisma.regulatoryAccess.update({
    where: { id: accessId },
    data:  { status }
  });

  // Invalidate the regulator's cache
  await cacheDel(`dashboard:regulatory:${access.regulatorUserId}`);
  await cacheDel(`analytics:regional:${access.regulatorUserId}`);

  await createAuditLog({
    userId:      req.user.id,
    action:      'PERMISSION_CHANGE',
    entityType:  'RegulatoryAccess',
    entityId:    accessId,
    description: `Regulatory access ${status.toLowerCase()} — org ${access.organizationId} → user ${access.regulatorUserId}`,
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return success(res, { access: updated }, `Access ${status.toLowerCase()}`);
};

/* ══════════════════════════════════════
   REVOKE ACCESS  (hard delete)
   DELETE /organizations/:orgId/regulatory-access/:accessId
══════════════════════════════════════ */
exports.revokeAccess = async (req, res) => {
  const { orgId, accessId } = req.params;

  const access = await prisma.regulatoryAccess.findUnique({ where: { id: accessId } });
  if (!access) throw new AppError('Access record not found', 404);

  if (orgId && access.organizationId !== orgId) {
    throw new AppError('Access record does not belong to this organization', 400);
  }

  assertCanManage(req, access.organizationId);

  await prisma.regulatoryAccess.delete({ where: { id: accessId } });

  await cacheDel(`dashboard:regulatory:${access.regulatorUserId}`);
  await cacheDel(`analytics:regional:${access.regulatorUserId}`);

  await createAuditLog({
    userId:      req.user.id,
    action:      'PERMISSION_CHANGE',
    entityType:  'RegulatoryAccess',
    entityId:    accessId,
    description: `Regulatory access revoked — org ${access.organizationId} → user ${access.regulatorUserId}`,
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return success(res, {}, 'Regulatory access revoked');
};

/* ══════════════════════════════════════
   LIST AVAILABLE REGULATORY USERS
   GET /organizations/:orgId/regulatory-access/users
   (Used by org admin to search who to assign)
══════════════════════════════════════ */
exports.listRegulatoryUsers = async (req, res) => {
  const orgId  = req.params.orgId || req.user.orgId;
  const { search } = req.query;

  if (orgId) assertCanManage(req, orgId);

  const where = {
    role:     { in: REG_ROLES },
    isActive: true,
    ...(search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };

  const users = await prisma.user.findMany({
    where,
    take: 50,
    orderBy: { firstName: 'asc' },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true,
      authority: { select: { id: true, name: true, shortName: true } }
    }
  });

  // For each user, check if already assigned to this org
  let assignedIds = new Set();
  if (orgId) {
    const existing = await prisma.regulatoryAccess.findMany({
      where:  { organizationId: orgId },
      select: { regulatorUserId: true, status: true }
    });
    existing.forEach(e => {
      if (e.status === 'ACTIVE') assignedIds.add(e.regulatorUserId);
    });
  }

  const result = users.map(u => ({
    ...u,
    alreadyAssigned: assignedIds.has(u.id)
  }));

  return success(res, { users: result });
};
