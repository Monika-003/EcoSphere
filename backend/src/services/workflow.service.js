'use strict';

/**
 * Workflow Service
 * Manages the multi-stage compliance workflow:
 *   DRAFT → SUBMITTED_TO_LAB → LAB_UNDER_REVIEW → LAB_APPROVED
 *   → SUBMITTED_TO_REGULATORY → REG_UNDER_REVIEW → REG_APPROVED → CERTIFIED
 */

const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/* ══════════════════════════════════════
   ADVANCE TO LABORATORY
══════════════════════════════════════ */
exports.advanceToLab = async (reportId, userId, notes = '') => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError('Report not found', 404);

  if (!['DRAFT', 'LAB_CORRECTION_REQUESTED'].includes(report.status)) {
    throw new AppError(`Cannot submit to lab from status: ${report.status}`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({
      where: { id: reportId },
      data:  {
        status:           'SUBMITTED_TO_LAB',
        submittedToLabAt: new Date(),
        currentStage:     'LABORATORY'
      }
    });

    await tx.workflowHistory.create({
      data: {
        reportId,
        organizationId: report.organizationId,
        performedById:  userId,
        stage:          'ORGANIZATION',
        fromStatus:     report.status,
        toStatus:       'SUBMITTED_TO_LAB',
        action:         'SUBMITTED_TO_LAB',
        comments:       notes
      }
    });

    return r;
  });

  return updated;
};

/* ══════════════════════════════════════
   ADVANCE TO REGULATORY
══════════════════════════════════════ */
exports.advanceToRegulatory = async (reportId, userId, notes = '') => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError('Report not found', 404);

  if (!['LAB_APPROVED', 'REG_CORRECTION_REQUESTED'].includes(report.status)) {
    throw new AppError(`Cannot forward to regulatory from status: ${report.status}`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({
      where: { id: reportId },
      data:  {
        status:           'SUBMITTED_TO_REGULATORY',
        submittedToRegAt: new Date(),
        currentStage:     'REGULATORY'
      }
    });

    await tx.workflowHistory.create({
      data: {
        reportId,
        organizationId: report.organizationId,
        performedById:  userId,
        stage:          'LABORATORY',
        fromStatus:     report.status,
        toStatus:       'SUBMITTED_TO_REGULATORY',
        action:         'FORWARDED_TO_REGULATORY',
        comments:       notes
      }
    });

    return r;
  });

  return updated;
};

/* ══════════════════════════════════════
   COMPLETE (CERTIFIED)
══════════════════════════════════════ */
exports.complete = async (reportId, userId, certificateId, notes = '') => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError('Report not found', 404);

  if (!['REG_APPROVED'].includes(report.status)) {
    throw new AppError(`Cannot complete workflow from status: ${report.status}`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({
      where: { id: reportId },
      data:  {
        status:      'CERTIFIED',
        certifiedAt: new Date(),
        currentStage: 'COMPLETED'
      }
    });

    await tx.workflowHistory.create({
      data: {
        reportId,
        organizationId: report.organizationId,
        performedById:  userId,
        stage:          'REGULATORY',
        fromStatus:     'REG_APPROVED',
        toStatus:       'CERTIFIED',
        action:         'CERTIFIED',
        comments:       notes
      }
    });

    return r;
  });

  return updated;
};

/* ══════════════════════════════════════
   GET WORKFLOW HISTORY
══════════════════════════════════════ */
exports.getHistory = async (reportId) => {
  return prisma.workflowHistory.findMany({
    where:   { reportId },
    orderBy: { performedAt: 'asc' },
    include: {
      performedBy: { select: { firstName: true, lastName: true, role: true } }
    }
  });
};

/* ══════════════════════════════════════
   GET STAGE METRICS
══════════════════════════════════════ */
exports.getStageMetrics = async (orgId) => {
  const counts = await prisma.report.groupBy({
    by:     ['status'],
    where:  orgId ? { organizationId: orgId } : {},
    _count: { id: true }
  });

  const metrics = {
    draft:              0,
    submittedToLab:     0,
    labUnderReview:     0,
    labApproved:        0,
    labRejected:        0,
    correctionRequested: 0,
    submittedToReg:     0,
    regUnderReview:     0,
    regApproved:        0,
    certified:          0
  };

  const map = {
    DRAFT:                    'draft',
    SUBMITTED_TO_LAB:         'submittedToLab',
    LAB_UNDER_REVIEW:         'labUnderReview',
    LAB_APPROVED:             'labApproved',
    LAB_REJECTED:             'labRejected',
    LAB_CORRECTION_REQUESTED: 'correctionRequested',
    SUBMITTED_TO_REGULATORY:  'submittedToReg',
    REG_UNDER_REVIEW:         'regUnderReview',
    REG_APPROVED:             'regApproved',
    CERTIFIED:                'certified'
  };

  for (const { status, _count } of counts) {
    if (map[status]) metrics[map[status]] = _count.id;
  }

  return metrics;
};
