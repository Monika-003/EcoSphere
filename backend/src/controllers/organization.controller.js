'use strict';

const { prisma }   = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');
const { createAuditLog }   = require('../middleware/auditLogger');
const { cacheDel }         = require('../config/redis');

/* ══════════════════════════════════════
   ONBOARD / CREATE ORGANIZATION
══════════════════════════════════════ */
exports.createOrganization = async (req, res) => {
  const {
    name, industryType, registrationNumber, gstNumber, panNumber,
    address, city, state, pincode, country,
    contactName, contactEmail, contactPhone, website
  } = req.body;

  const existing = await prisma.organization.findFirst({
    where: { OR: [
      { registrationNumber: registrationNumber },
      { gstNumber: gstNumber || undefined }
    ]}
  });
  if (existing) throw new AppError('Organization with this registration/GST number already exists', 409);

  const org = await prisma.organization.create({
    data: {
      name, industryType, registrationNumber, gstNumber, panNumber,
      address, city, state, pincode, country: country || 'India',
      contactName, contactEmail, contactPhone, website
    }
  });

  /* Assign org to creating user */
  await prisma.user.update({
    where: { id: req.user.id },
    data:  { orgId: org.id }
  });

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'Organization', entityId: org.id,
    description: `Organization onboarded: ${name}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { organization: org }, 'Organization registered successfully');
};

/* ══════════════════════════════════════
   GET OWN ORGANIZATION
══════════════════════════════════════ */
exports.getOrganization = async (req, res) => {
  const orgId = req.params.id || req.user.orgId;
  if (!orgId) throw new AppError('Organization ID required', 400);

  /* Access control */
  if (req.user.role.startsWith('ORG_') && orgId !== req.user.orgId) {
    throw new AppError('Access denied', 403);
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: {
          users:   true,
          reports: true,
          monitoringRecords: true,
          certificates:      true
        }
      }
    }
  });
  if (!org) throw new AppError('Organization not found', 404);

  return success(res, { organization: org });
};

/* ══════════════════════════════════════
   UPDATE ORGANIZATION
══════════════════════════════════════ */
exports.updateOrganization = async (req, res) => {
  const orgId = req.params.id || req.user.orgId;
  if (!orgId) throw new AppError('Organization ID required', 400);

  if (req.user.role.startsWith('ORG_') && orgId !== req.user.orgId) {
    throw new AppError('Access denied', 403);
  }

  const {
    name, address, city, state, pincode,
    contactName, contactEmail, contactPhone, website,
    sustainabilityGoals, certifications
  } = req.body;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data:  { name, address, city, state, pincode, contactName, contactEmail, contactPhone, website, sustainabilityGoals, certifications }
  });

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'Organization', entityId: orgId,
    description: 'Organization profile updated', ipAddress: req.ip
  });

  return success(res, { organization: org }, 'Organization updated');
};

/* ══════════════════════════════════════
   GET ORG TEAM MEMBERS
══════════════════════════════════════ */
exports.getTeamMembers = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  const users = await prisma.user.findMany({
    where:  { orgId, isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, lastLoginAt: true, createdAt: true }
  });

  return success(res, { users });
};

/* ══════════════════════════════════════
   UPLOAD DOCUMENT
══════════════════════════════════════ */
exports.uploadDocument = async (req, res) => {
  if (!req.file) throw new AppError('Document file is required', 400);

  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  const { documentType } = req.body;

  /* In production, file is already uploaded to S3 by multer-s3 */
  const fileUrl = req.file.location || req.file.path || '';

  await prisma.organization.update({
    where: { id: orgId },
    data:  {
      documents: {
        push: {
          type: documentType || 'GENERAL',
          name: req.file.originalname,
          url:  fileUrl,
          key:  req.file.key || '',
          uploadedAt: new Date().toISOString()
        }
      }
    }
  });

  return success(res, { url: fileUrl, name: req.file.originalname }, 'Document uploaded');
};
