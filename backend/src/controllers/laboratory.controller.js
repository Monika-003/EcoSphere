'use strict';

const { prisma }          = require('../config/database');
const { AppError }        = require('../middleware/errorHandler');
const { success, created, paginated, parsePagination } = require('../utils/response');
const { createAuditLog }  = require('../middleware/auditLogger');
const { getIo }           = require('../socket');
const workflowService     = require('../services/workflow.service');
const notificationService = require('../services/notification.service');
const certificateService  = require('../services/certificate.service');
const { cacheGetOrSet, cacheDel, CACHE_TTL } = require('../config/redis');

/* ══════════════════════════════════════
   PENDING REVIEWS QUEUE
══════════════════════════════════════ */
exports.getPendingReviews = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where:   { status: { in: ['SUBMITTED_TO_LAB', 'LAB_UNDER_REVIEW', 'LAB_CORRECTION_REQUESTED'] } },
      orderBy: { submittedToLabAt: 'asc' },
      skip, take: limit,
      include: {
        organization: { select: { name: true, industryType: true, city: true, state: true } },
        submittedBy:  { select: { firstName: true, lastName: true } },
        reviews:      { where: { reviewStage: 'LABORATORY' }, orderBy: { createdAt: 'desc' }, take: 1 }
      }
    }),
    prisma.report.count({
      where: { status: { in: ['SUBMITTED_TO_LAB', 'LAB_UNDER_REVIEW', 'LAB_CORRECTION_REQUESTED'] } }
    })
  ]);

  return paginated(res, reports, total, page, limit);
};

/* ══════════════════════════════════════
   GET SINGLE REPORT (for review)
══════════════════════════════════════ */
exports.getReportForReview = async (req, res) => {
  const report = await prisma.report.findUnique({
    where:   { id: req.params.id },
    include: {
      organization:     { select: { name: true, industryType: true, city: true, state: true, registrationNumber: true } },
      submittedBy:      { select: { firstName: true, lastName: true, email: true } },
      monitoringRecords: { include: { monitoringRecord: true } },
      reviews:          { include: { reviewedBy: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
      workflowHistory:  { orderBy: { performedAt: 'asc' } }
    }
  });

  if (!report) throw new AppError('Report not found', 404);
  if (!['SUBMITTED_TO_LAB','LAB_UNDER_REVIEW','LAB_CORRECTION_REQUESTED'].includes(report.status)) {
    throw new AppError('Report not in lab review stage', 400);
  }

  /* Mark as under review */
  if (report.status === 'SUBMITTED_TO_LAB') {
    await prisma.report.update({
      where: { id: report.id },
      data:  { status: 'LAB_UNDER_REVIEW', labReviewStartedAt: new Date() }
    });
  }

  return success(res, { report });
};

/* ══════════════════════════════════════
   APPROVE REPORT
══════════════════════════════════════ */
exports.approveReport = async (req, res) => {
  const { findings, comments, technicalScore, complianceScore, testMethodsUsed, samplesAnalysed } = req.body;

  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new AppError('Report not found', 404);
  if (!['LAB_UNDER_REVIEW','SUBMITTED_TO_LAB'].includes(report.status)) {
    throw new AppError(`Cannot approve report in status: ${report.status}`, 400);
  }

  /* Get lab context */
  const lab = req.user.labId
    ? await prisma.laboratory.findUnique({ where: { id: req.user.labId } })
    : null;

  await prisma.$transaction(async (tx) => {
    /* Create review record */
    await tx.reportReview.create({
      data: {
        reportId:       report.id,
        reviewedById:   req.user.id,
        reviewStage:    'LABORATORY',
        laboratoryId:   req.user.labId || null,
        status:         'APPROVED',
        findings, comments, technicalScore, complianceScore,
        testMethodsUsed: testMethodsUsed || [],
        samplesAnalysed: samplesAnalysed || null,
        reviewedAt:     new Date()
      }
    });

    /* Advance workflow */
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'LAB_APPROVED', labApprovedAt: new Date(), currentStage: 'LABORATORY' }
    });

    /* Log workflow */
    await tx.workflowHistory.create({
      data: {
        reportId:       report.id,
        organizationId: report.organizationId,
        performedById:  req.user.id,
        stage:          'LABORATORY',
        fromStatus:     'LAB_UNDER_REVIEW',
        toStatus:       'LAB_APPROVED',
        action:         'LAB_APPROVED',
        comments
      }
    });
  });

  /* Notify org */
  await notificationService.notifyLabApproval(report.organizationId, report.id, report.reportNumber);

  /* Real-time */
  const io = getIo();
  if (io) {
    io.to(`org:${report.organizationId}`).emit('report:lab_approved', { reportId: report.id });
    io.to('regulatory').emit('report:ready_for_review', { reportId: report.id });
  }

  await createAuditLog({
    userId: req.user.id, action: 'APPROVE', entityType: 'Report', entityId: report.id,
    description: `Lab approved report: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, {}, 'Report approved by laboratory');
};

/* ══════════════════════════════════════
   REJECT REPORT
══════════════════════════════════════ */
exports.rejectReport = async (req, res) => {
  const { findings, comments, correctionNotes } = req.body;

  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new AppError('Report not found', 404);
  if (!['LAB_UNDER_REVIEW','SUBMITTED_TO_LAB'].includes(report.status)) {
    throw new AppError(`Cannot reject report in status: ${report.status}`, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportReview.create({
      data: {
        reportId: report.id, reviewedById: req.user.id, reviewStage: 'LABORATORY',
        laboratoryId: req.user.labId || null,
        status: 'REJECTED', findings, comments, correctionNotes, reviewedAt: new Date()
      }
    });
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'LAB_REJECTED' }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
        stage: 'LABORATORY', fromStatus: 'LAB_UNDER_REVIEW', toStatus: 'LAB_REJECTED',
        action: 'LAB_REJECTED', comments: correctionNotes || comments
      }
    });
  });

  await notificationService.notifyLabRejection(report.organizationId, report.id, correctionNotes);

  const io = getIo();
  if (io) io.to(`org:${report.organizationId}`).emit('report:lab_rejected', { reportId: report.id });

  await createAuditLog({
    userId: req.user.id, action: 'REJECT', entityType: 'Report', entityId: report.id,
    description: `Lab rejected report: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, {}, 'Report rejected');
};

/* ══════════════════════════════════════
   REQUEST CORRECTION
══════════════════════════════════════ */
exports.requestCorrection = async (req, res) => {
  const { correctionNotes, comments } = req.body;

  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new AppError('Report not found', 404);

  await prisma.$transaction(async (tx) => {
    await tx.reportReview.create({
      data: {
        reportId: report.id, reviewedById: req.user.id, reviewStage: 'LABORATORY',
        laboratoryId: req.user.labId || null,
        status: 'CORRECTION_REQUESTED', comments, correctionNotes, reviewedAt: new Date()
      }
    });
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'LAB_CORRECTION_REQUESTED' }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
        stage: 'LABORATORY', fromStatus: report.status, toStatus: 'LAB_CORRECTION_REQUESTED',
        action: 'CORRECTION_REQUESTED', comments: correctionNotes
      }
    });
  });

  await notificationService.notifyCorrectionRequested(report.organizationId, report.id, correctionNotes);

  const io = getIo();
  if (io) io.to(`org:${report.organizationId}`).emit('report:correction_requested', { reportId: report.id });

  return success(res, {}, 'Correction requested from organization');
};

/* ══════════════════════════════════════
   FORWARD TO REGULATORY
══════════════════════════════════════ */
exports.forwardToRegulatory = async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new AppError('Report not found', 404);
  if (report.status !== 'LAB_APPROVED') {
    throw new AppError('Report must be lab-approved before forwarding to regulatory', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'SUBMITTED_TO_REGULATORY', submittedToRegAt: new Date(), currentStage: 'REGULATORY' }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
        stage: 'LABORATORY', fromStatus: 'LAB_APPROVED', toStatus: 'SUBMITTED_TO_REGULATORY',
        action: 'FORWARDED_TO_REGULATORY', comments: req.body.comments || ''
      }
    });
  });

  await notificationService.notifyForwardedToRegulatory(report.organizationId, report.id);

  const io = getIo();
  if (io) io.to('regulatory').emit('report:forwarded', { reportId: report.id });

  return success(res, {}, 'Report forwarded to regulatory authority');
};

/* ══════════════════════════════════════
   LAB ANALYTICS DASHBOARD
══════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  const cacheKey = `dashboard:lab:${req.user.labId || 'all'}`;

  const data = await cacheGetOrSet(cacheKey, async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [pending, underReview, approved, rejected, corrections, totalThisMonth] = await Promise.all([
      prisma.report.count({ where: { status: 'SUBMITTED_TO_LAB' } }),
      prisma.report.count({ where: { status: 'LAB_UNDER_REVIEW' } }),
      prisma.report.count({ where: { status: 'LAB_APPROVED' } }),
      prisma.report.count({ where: { status: 'LAB_REJECTED' } }),
      prisma.report.count({ where: { status: 'LAB_CORRECTION_REQUESTED' } }),
      prisma.report.count({ where: { status: { in: ['LAB_APPROVED','LAB_REJECTED'] }, labApprovedAt: { gte: thirtyDaysAgo } } })
    ]);

    const approvalRate = approved + rejected > 0
      ? Math.round((approved / (approved + rejected)) * 100)
      : 0;

    return { pending, underReview, approved, rejected, corrections, totalThisMonth, approvalRate };
  }, CACHE_TTL.SHORT);

  return success(res, data);
};

/* ══════════════════════════════════════
   GENERATE LAB CERTIFICATE
══════════════════════════════════════ */
exports.generateCertificate = async (req, res) => {
  const report = await prisma.report.findUnique({
    where:   { id: req.params.id },
    include: { organization: true }
  });
  if (!report) throw new AppError('Report not found', 404);
  if (report.status !== 'LAB_APPROVED') throw new AppError('Report must be lab-approved', 400);

  const certificate = await certificateService.issueCertificate({
    reportId:          report.id,
    organizationId:    report.organizationId,
    issuedById:        req.user.id,
    issuingLabId:      req.user.labId,
    certificateType:   req.body.certificateType || 'ENVIRONMENTAL_COMPLIANCE',
    complianceScore:   report.complianceScore,
    esgScore:          report.esgScore,
    carbonScore:       null,
    standards:         req.body.standards || ['ISO 14001', 'CPCB'],
    validityMonths:    req.body.validityMonths || 12
  });

  await notificationService.notifyCertificateIssued(report.organizationId, certificate.id, certificate.certificateNumber);

  await createAuditLog({
    userId: req.user.id, action: 'CERTIFICATE_ISSUED', entityType: 'Certificate', entityId: certificate.id,
    description: `Lab certificate issued: ${certificate.certificateNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { certificate }, 'Certificate issued successfully');
};
