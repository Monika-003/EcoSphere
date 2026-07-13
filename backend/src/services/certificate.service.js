'use strict';

const { prisma }    = require('../config/database');
const crypto        = require('crypto');
const { logger }    = require('../config/logger');
const { generateCertificatePdf } = require('../utils/pdfGenerator');

/**
 * Certificate Service
 * Handles: issuance, QR generation, PDF attachment, verification
 */

/* ── Generate unique certificate number ── */
async function generateCertNumber(type) {
  const year  = new Date().getFullYear();
  const count = await prisma.certificate.count();
  const prefix = {
    ENVIRONMENTAL_COMPLIANCE: 'ECC',
    ISO_14001:                 'ISO',
    NABL_ACCREDITATION:        'NABL',
    PCB_CLEARANCE:             'PCB',
    WATER_QUALITY:             'WQC',
    AIR_EMISSION:              'AEC'
  }[type] || 'ECC';
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
}

/* ── Generate verification hash ── */
function generateVerificationHash(certNumber, orgId, issuedDate) {
  return crypto
    .createHmac('sha256', process.env.CERT_SECRET || 'ecosphere-cert-secret')
    .update(`${certNumber}:${orgId}:${issuedDate}`)
    .digest('hex');
}

/* ══════════════════════════════════════
   ISSUE CERTIFICATE
══════════════════════════════════════ */
exports.issueCertificate = async ({
  reportId,
  organizationId,
  issuedById,
  issuingLabId,
  issuingAuthId,
  certificateType,
  complianceScore,
  esgScore,
  carbonScore,
  standards,
  validityMonths,
  scope
}) => {
  const issuedDate   = new Date();
  const expiryDate   = new Date(issuedDate);
  expiryDate.setMonth(expiryDate.getMonth() + (validityMonths || 12));

  const certificateNumber = await generateCertNumber(certificateType);
  const verificationHash  = generateVerificationHash(certificateNumber, organizationId, issuedDate.toISOString());
  const verificationUrl   = `${process.env.FRONTEND_URL || 'https://ecosphere.app'}/verify/${verificationHash}`;

  /* Generate QR code data URL */
  let qrCodeUrl = null;
  try {
    const QRCode = require('qrcode');
    qrCodeUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });
  } catch (err) {
    logger.warn('[Certificate] QR generation failed:', err.message);
  }

  /* Create DB record */
  const certificate = await prisma.certificate.create({
    data: {
      certificateNumber,
      organizationId,
      reportId,
      issuedById,
      issuingLabId:  issuingLabId  || null,
      issuingAuthId: issuingAuthId || null,
      certificateType,
      title:           `Environmental Compliance Certificate`,
      scope:           scope || 'General Environmental Compliance',
      standards:       standards || ['CPCB', 'MoEFCC', 'ISO 14001'],
      complianceScore: complianceScore || null,
      esgScore:        esgScore        || null,
      carbonScore:     carbonScore     || null,
      issuedDate,
      expiryDate,
      validFrom:  issuedDate,    // explicit — schema default is now(), which may differ by ms
      validUntil: expiryDate,    // explicit — must match expiryDate for compliance checks
      verificationHash,
      verificationUrl,
      qrCodeUrl,
      status: 'ACTIVE'
    }
  });

  /* Generate PDF in background (non-blocking) */
  setImmediate(async () => {
    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      const pdfBuffer = await generateCertificatePdf({
        certificate: { ...certificate, organization: org },
        qrCodeUrl
      });

      /* In production: upload to S3 */
      logger.info(`[Certificate] PDF generated for ${certificateNumber} (${pdfBuffer.length} bytes)`);
    } catch (err) {
      logger.error('[Certificate] PDF generation error:', err.message);
    }
  });

  logger.info(`[Certificate] Issued: ${certificateNumber}`);
  return certificate;
};

/* ══════════════════════════════════════
   VERIFY CERTIFICATE
══════════════════════════════════════ */
exports.verifyCertificate = async (verificationHash) => {
  const cert = await prisma.certificate.findFirst({
    where: { verificationHash },
    include: {
      organization: { select: { name: true, industryType: true, city: true, state: true } },
      issuedBy:     { select: { firstName: true, lastName: true } }
    }
  });

  if (!cert) return { valid: false, reason: 'Certificate not found' };
  if (cert.status === 'REVOKED') return { valid: false, reason: 'Certificate has been revoked', revokedAt: cert.revokedAt };
  if (cert.status === 'EXPIRED' || cert.expiryDate < new Date()) return { valid: false, reason: 'Certificate has expired', expiryDate: cert.expiryDate };

  return {
    valid: true,
    certificate: {
      certificateNumber: cert.certificateNumber,
      organizationName:  cert.organization?.name,
      industryType:      cert.organization?.industryType,
      certificateType:   cert.certificateType,
      issuedDate:        cert.issuedDate,
      expiryDate:        cert.expiryDate,
      complianceScore:   cert.complianceScore,
      standards:         cert.standards,
      status:            cert.status
    }
  };
};

/* ══════════════════════════════════════
   REVOKE CERTIFICATE
══════════════════════════════════════ */
exports.revokeCertificate = async (certificateId, reason, revokedById) => {
  return prisma.certificate.update({
    where: { id: certificateId },
    data:  { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason }
  });
};

/* ══════════════════════════════════════
   LIST CERTIFICATES
══════════════════════════════════════ */
exports.getCertificates = async (organizationId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [certs, total] = await Promise.all([
    prisma.certificate.findMany({
      where:   { organizationId },
      orderBy: { issuedDate: 'desc' },
      skip, take: limit,
      include: { issuedBy: { select: { firstName: true, lastName: true } } }
    }),
    prisma.certificate.count({ where: { organizationId } })
  ]);

  return { certs, total };
};
