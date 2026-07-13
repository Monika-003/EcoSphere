'use strict';

const { prisma }         = require('../config/database');
const { AppError }       = require('../middleware/errorHandler');
const { success, paginated, parsePagination } = require('../utils/response');
const certificateService = require('../services/certificate.service');
const { createAuditLog } = require('../middleware/auditLogger');

/* ── List certificates (org-scoped or admin) ── */
exports.getCertificates = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const orgId = req.user.role === 'SUPER_ADMIN' ? req.query.orgId : req.user.orgId;

  const where = {};
  if (orgId) where.organizationId = orgId;
  if (req.query.status) where.status = req.query.status;
  if (req.query.type)   where.certificateType = req.query.type;

  const [certs, total] = await Promise.all([
    prisma.certificate.findMany({
      where, skip, take: limit, orderBy: { issuedDate: 'desc' },
      include: {
        organization: { select: { name: true, industryType: true, city: true, state: true } },
        issuedBy:     { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.certificate.count({ where })
  ]);

  return paginated(res, certs, total, page, limit);
};

/* ── Get single certificate ── */
exports.getCertificate = async (req, res) => {
  const cert = await prisma.certificate.findUnique({
    where:   { id: req.params.id },
    include: {
      organization: true,
      report:       { select: { reportNumber: true, reportType: true } },
      issuedBy:     { select: { firstName: true, lastName: true } }
    }
  });
  if (!cert) throw new AppError('Certificate not found', 404);

  /* Access control */
  if (req.user.role.startsWith('ORG_') && cert.organizationId !== req.user.orgId) {
    throw new AppError('Access denied', 403);
  }

  return success(res, { certificate: cert });
};

/* ── Public verification (no auth) ── */
exports.verifyCertificate = async (req, res) => {
  const { hash } = req.params;
  const result = await certificateService.verifyCertificate(hash);

  await createAuditLog({
    action: 'VERIFY', entityType: 'Certificate',
    description: `Certificate verification attempt: hash=${hash}`,
    ipAddress: req.ip
  });

  return success(res, result, result.valid ? 'Certificate is valid' : 'Certificate verification failed');
};

/* ── Revoke certificate (admin/regulatory) ── */
exports.revokeCertificate = async (req, res) => {
  const cert = await prisma.certificate.findUnique({ where: { id: req.params.id } });
  if (!cert) throw new AppError('Certificate not found', 404);

  await certificateService.revokeCertificate(cert.id, req.body.reason, req.user.id);

  await createAuditLog({
    userId: req.user.id, action: 'REVOKE', entityType: 'Certificate', entityId: cert.id,
    description: `Certificate revoked: ${cert.certificateNumber}`,
    ipAddress: req.ip
  });

  return success(res, {}, 'Certificate revoked');
};

/* ── Download certificate PDF ── */
exports.downloadCertificate = async (req, res) => {
  const cert = await prisma.certificate.findUnique({
    where:   { id: req.params.id },
    include: { organization: true }
  });
  if (!cert) throw new AppError('Certificate not found', 404);
  if (req.user.role.startsWith('ORG_') && cert.organizationId !== req.user.orgId) {
    throw new AppError('Access denied', 403);
  }

  const { generateCertificatePdf } = require('../utils/pdfGenerator');
  const pdfBuffer = await generateCertificatePdf({ certificate: cert, qrCodeUrl: cert.qrCodeUrl });

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${cert.certificateNumber}.pdf"`,
    'Content-Length':      pdfBuffer.length
  });
  res.send(pdfBuffer);
};
