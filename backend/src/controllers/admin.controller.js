'use strict';

const { prisma }   = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { success, paginated, parsePagination } = require('../utils/response');
const { createAuditLog } = require('../middleware/auditLogger');
const { cacheGetOrSet, cacheDel, cacheDelPattern, CACHE_TTL } = require('../config/redis');
const { emitToAdmin } = require('../socket');

/* ══════════════════════════════════════
   PLATFORM OVERVIEW DASHBOARD
══════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  const cacheKey = 'admin:dashboard';

  const data = await cacheGetOrSet(cacheKey, async () => {
    const [orgs, labs, authorities, users, reports, certs, notices] = await Promise.all([
      prisma.organization.count(),
      prisma.laboratory.count(),
      prisma.regulatoryAuthority.count(),
      prisma.user.count(),
      prisma.report.count(),
      prisma.certificate.count(),
      prisma.complianceNotice.count()
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [newOrgsThisMonth, newUsersThisMonth, pendingReports, activeMonitoring] = await Promise.all([
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.report.count({ where: { status: { in: ['SUBMITTED_TO_LAB','LAB_UNDER_REVIEW','SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW'] } } }),
      prisma.monitoringStation.count({ where: { isActive: true } })
    ]);

    const reportsByStatus = await prisma.report.groupBy({
      by: ['status'], _count: { id: true }
    });

    return {
      totals: { orgs, labs, authorities, users, reports, certs, notices },
      thisMonth: { newOrgs: newOrgsThisMonth, newUsers: newUsersThisMonth },
      pending: pendingReports,
      activeMonitoring,
      reportsByStatus
    };
  }, CACHE_TTL.SHORT);

  return success(res, data);
};

/* ══════════════════════════════════════
   USER MANAGEMENT
══════════════════════════════════════ */
exports.getUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { role, isActive, q } = req.query;

  const where = {};
  if (role)     where.role     = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (q) {
    where.OR = [
      { email:     { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName:  { contains: q, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, isEmailVerified: true,
        lastLoginAt: true, createdAt: true,
        organization: { select: { name: true } },
        laboratory:   { select: { name: true } }
      }
    }),
    prisma.user.count({ where })
  ]);

  return paginated(res, users, total, page, limit);
};

exports.getUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.params.id },
    include: {
      organization: { select: { name: true, industryType: true } },
      laboratory:   { select: { name: true } }
    }
  });
  if (!user) throw new AppError('User not found', 404);
  const { passwordHash, ...safeUser } = user;
  return success(res, { user: safeUser });
};

exports.updateUser = async (req, res) => {
  const { isActive, role, orgId, labId, authorityId } = req.body;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data:  { isActive, role, orgId, labId, authorityId }
  });

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'User', entityId: req.params.id,
    description: `Admin updated user: ${user.email}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, {}, 'User updated');
};

exports.deactivateUser = async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data:  { isActive: false }
  });
  await createAuditLog({
    userId: req.user.id, action: 'DEACTIVATE', entityType: 'User', entityId: req.params.id,
    description: 'User deactivated by admin', ipAddress: req.ip
  });
  return success(res, {}, 'User deactivated');
};

/* ══════════════════════════════════════
   ORGANIZATION MANAGEMENT
══════════════════════════════════════ */
exports.getOrganizations = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { industryType, isVerified, state, q } = req.query;

  const where = {};
  if (industryType) where.industryType = industryType;
  if (isVerified !== undefined) where.isVerified = isVerified === 'true';
  if (state) where.state = { contains: state, mode: 'insensitive' };
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, reports: true } } }
    }),
    prisma.organization.count({ where })
  ]);

  return paginated(res, orgs, total, page, limit);
};

exports.verifyOrganization = async (req, res) => {
  await prisma.organization.update({
    where: { id: req.params.id },
    data:  { isVerified: true, verifiedAt: new Date(), verifiedById: req.user.id }
  });
  await createAuditLog({
    userId: req.user.id, action: 'VERIFY', entityType: 'Organization', entityId: req.params.id,
    description: 'Organization verified', ipAddress: req.ip
  });
  return success(res, {}, 'Organization verified');
};

/* ══════════════════════════════════════
   LABORATORY MANAGEMENT
══════════════════════════════════════ */
exports.getLaboratories = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [labs, total] = await Promise.all([
    prisma.laboratory.findMany({
      skip, take: limit, orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } }
    }),
    prisma.laboratory.count()
  ]);

  return paginated(res, labs, total, page, limit);
};

/* ══════════════════════════════════════
   SYSTEM CONFIG
══════════════════════════════════════ */
exports.getSystemConfig = async (req, res) => {
  const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  return success(res, { configs });
};

exports.updateSystemConfig = async (req, res) => {
  const { key, value, description } = req.body;

  const config = await prisma.systemConfig.upsert({
    where:  { key },
    create: { key, value: String(value), description, updatedById: req.user.id },
    update: { value: String(value), description, updatedById: req.user.id }
  });

  await cacheDelPattern('system:config:*');

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'SystemConfig', entityId: config.id,
    description: `System config updated: ${key}`, ipAddress: req.ip
  });

  return success(res, { config }, 'Configuration updated');
};

/* ══════════════════════════════════════
   AUDIT LOGS
══════════════════════════════════════ */
exports.getAuditLogs = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId, entityType, action, from, to } = req.query;

  const where = {};
  if (userId)     where.userId     = userId;
  if (entityType) where.entityType = entityType;
  if (action)     where.action     = action;
  if (from || to) {
    where.performedAt = {};
    if (from) where.performedAt.gte = new Date(from);
    if (to)   where.performedAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, skip, take: limit, orderBy: { performedAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } }
    }),
    prisma.auditLog.count({ where })
  ]);

  return paginated(res, logs, total, page, limit);
};

/* ══════════════════════════════════════
   PLATFORM BROADCAST MESSAGE
══════════════════════════════════════ */
exports.broadcastMessage = async (req, res) => {
  const { title, message, type, targetRole } = req.body;

  emitToAdmin('broadcast', { title, message, type, from: 'SUPER_ADMIN' });

  await createAuditLog({
    userId: req.user.id, action: 'BROADCAST', entityType: 'System',
    description: `Admin broadcast: ${title}`, ipAddress: req.ip
  });

  return success(res, {}, 'Broadcast sent');
};
