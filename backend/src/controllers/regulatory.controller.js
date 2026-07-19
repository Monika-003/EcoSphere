'use strict';

const { prisma }          = require('../config/database');
const { AppError }        = require('../middleware/errorHandler');
const { success, created, paginated, parsePagination } = require('../utils/response');
const { createAuditLog }  = require('../middleware/auditLogger');
const { getIo }           = require('../socket');
const certificateService  = require('../services/certificate.service');
const notificationService = require('../services/notification.service');
const { cacheGetOrSet, cacheDel, CACHE_TTL } = require('../config/redis');
const { v4: uuid } = require('uuid');

// ── REG roles that have org-scoped access ────────────────────────
const REG_ROLES = ['REG_OFFICER','REG_INSPECTOR','REG_REGIONAL_OFFICER','REG_GOVERNMENT_AUTHORITY'];

/* ══════════════════════════════════════════════════════════════════
   INJECT REG FILTER  (middleware — applied to every reg route)

   Sets req.regOrgIds:
     null          → SUPER_ADMIN, no filter (sees all orgs)
     string[]      → REG_* user, only these organization IDs
                     (empty array = no assignments = sees nothing)
══════════════════════════════════════════════════════════════════ */
exports.injectRegFilter = async (req, _res, next) => {
  try {
    if (req.user.role === 'SUPER_ADMIN') {
      req.regOrgIds = null;
      return next();
    }
    const rows = await prisma.regulatoryAccess.findMany({
      where:  { regulatorUserId: req.user.id, status: 'ACTIVE' },
      select: { organizationId: true }
    });
    req.regOrgIds = rows.map(r => r.organizationId);
    next();
  } catch (err) {
    next(err);
  }
};

/* ── Build Prisma organizationId where-clause from req.regOrgIds ── */
function orgFilter(req) {
  if (req.regOrgIds === null) return {};                         // SUPER_ADMIN
  return { organizationId: { in: req.regOrgIds } };             // REG_* scoped
}

/* ── Assert a specific orgId is within the regulator's scope ────── */
function assertOrgAccess(req, organizationId) {
  if (req.regOrgIds === null) return;                           // SUPER_ADMIN
  if (!req.regOrgIds.includes(organizationId)) {
    throw new AppError(
      'Access denied: organization not assigned to your account',
      403, 'ORG_NOT_ASSIGNED'
    );
  }
}

/* ══════════════════════════════════════
   VIEW SINGLE REPORT  (auto-transition to REG_UNDER_REVIEW)
══════════════════════════════════════ */
exports.viewReport = async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: {
      organization:    { select: { name: true, industryType: true, city: true, state: true } },
      submittedBy:     { select: { firstName: true, lastName: true, role: true } },
      reviews:         { include: { reviewedBy: { select: { firstName: true, lastName: true } }, laboratory: { select: { name: true } }, authority: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      certificate:     true,
      workflowHistory: { orderBy: { performedAt: 'asc' }, include: { performedBy: { select: { firstName: true, lastName: true, role: true } } } },
      monitoringRecords: { include: { monitoringRecord: { select: { monitoringType: true, parameters: true, complianceStatus: true, recordingDate: true } } }, take: 20 }
    }
  });
  if (!report) throw new AppError('Report not found', 404);
  assertOrgAccess(req, report.organizationId);

  /* Auto-advance to REG_UNDER_REVIEW when a regulator opens the report */
  if (report.status === 'SUBMITTED_TO_REGULATORY') {
    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: report.id },
        data:  { status: 'REG_UNDER_REVIEW', currentStage: 'REGULATORY' }
      });
      await tx.workflowHistory.create({
        data: {
          reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
          stage: 'REGULATORY', fromStatus: 'SUBMITTED_TO_REGULATORY', toStatus: 'REG_UNDER_REVIEW',
          action: 'REG_UNDER_REVIEW', comments: 'Report opened for review'
        }
      });
    });
    report.status = 'REG_UNDER_REVIEW';
  }

  return success(res, { report });
};

/* ══════════════════════════════════════
   REJECT REPORT
══════════════════════════════════════ */
exports.rejectReport = async (req, res) => {
  const { comments } = req.body;
  if (!comments || !comments.trim()) {
    throw new AppError('Rejection reason is required', 400);
  }

  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: { organization: true }
  });
  if (!report) throw new AppError('Report not found', 404);
  assertOrgAccess(req, report.organizationId);

  if (!['SUBMITTED_TO_REGULATORY', 'REG_UNDER_REVIEW'].includes(report.status)) {
    throw new AppError(`Cannot reject in status: ${report.status}`, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportReview.create({
      data: {
        reportId:    report.id,
        reviewedById: req.user.id,
        reviewStage: 'REGULATORY',
        authorityId: req.user.authorityId || null,
        status:      'REJECTED',
        comments,
        reviewedAt:  new Date()
      }
    });
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'REG_REJECTED', currentStage: 'REGULATORY' }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
        stage: 'REGULATORY', fromStatus: report.status, toStatus: 'REG_REJECTED',
        action: 'REG_REJECTED', comments
      }
    });
  });

  await cacheDel(`dashboard:regulatory:${req.user.id}`);

  const io = getIo();
  if (io) io.to(`org:${report.organizationId}`).emit('report:reg_rejected', { reportId: report.id });

  await notificationService.notifyRegRejection(report.organizationId, report.id, comments);

  await createAuditLog({
    userId: req.user.id, action: 'REJECT', entityType: 'Report', entityId: report.id,
    description: `Regulatory rejected: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, {}, 'Report rejected by regulatory authority');
};

/* ══════════════════════════════════════
   PENDING APPROVALS QUEUE
══════════════════════════════════════ */
exports.getPendingApprovals = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const where = {
    status: { in: ['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW','REG_CORRECTION_REQUESTED'] },
    ...orgFilter(req)
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { submittedToRegAt: 'asc' },
      skip, take: limit,
      include: {
        organization: { select: { name: true, industryType: true, city: true, state: true } },
        reviews:      { where: { reviewStage: 'LABORATORY' }, orderBy: { createdAt: 'desc' }, take: 1 }
      }
    }),
    prisma.report.count({ where })
  ]);

  return paginated(res, reports, total, page, limit);
};

/* ══════════════════════════════════════
   APPROVE REPORT
══════════════════════════════════════ */
exports.approveReport = async (req, res) => {
  const { comments, complianceScore, enforcementActions } = req.body;

  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: { organization: true }
  });
  if (!report) throw new AppError('Report not found', 404);

  assertOrgAccess(req, report.organizationId);

  if (!['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW'].includes(report.status)) {
    throw new AppError(`Cannot approve in status: ${report.status}`, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportReview.create({
      data: {
        reportId:    report.id,
        reviewedById: req.user.id,
        reviewStage: 'REGULATORY',
        authorityId: req.user.authorityId || null,
        status:      'APPROVED',
        comments, complianceScore, enforcementActions,
        reviewedAt:  new Date()
      }
    });
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'REG_APPROVED', regApprovedAt: new Date(), currentStage: 'REGULATORY', complianceScore }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
        stage: 'REGULATORY', fromStatus: report.status, toStatus: 'REG_APPROVED',
        action: 'REG_APPROVED', comments
      }
    });
  });

  await cacheDel(`dashboard:regulatory:${req.user.id}`);
  await notificationService.notifyRegApproval(report.organizationId, report.id);

  const io = getIo();
  if (io) io.to(`org:${report.organizationId}`).emit('report:reg_approved', { reportId: report.id });

  await createAuditLog({
    userId: req.user.id, action: 'APPROVE', entityType: 'Report', entityId: report.id,
    description: `Regulatory approved: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, {}, 'Report approved by regulatory authority');
};

/* ══════════════════════════════════════
   ISSUE CERTIFICATE
══════════════════════════════════════ */
exports.issueCertificate = async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: { organization: true, certificate: true }
  });
  if (!report) throw new AppError('Report not found', 404);

  assertOrgAccess(req, report.organizationId);

  if (report.certificate) throw new AppError('Certificate already issued for this report', 409);
  if (!['REG_APPROVED','LAB_APPROVED'].includes(report.status)) {
    throw new AppError('Report must be approved before issuing certificate', 400);
  }

  const certificate = await certificateService.issueCertificate({
    reportId:         report.id,
    organizationId:   report.organizationId,
    issuedById:       req.user.id,
    issuingAuthId:    req.user.authorityId,
    certificateType:  req.body.certificateType || 'ENVIRONMENTAL_COMPLIANCE',
    complianceScore:  report.complianceScore,
    esgScore:         report.esgScore,
    carbonScore:      report.totalCarbon,
    standards:        req.body.standards || ['CPCB','MoEFCC','ISO 14001'],
    validityMonths:   req.body.validityMonths || 12,
    scope:            req.body.scope
  });

  await prisma.report.update({
    where: { id: report.id },
    data:  { status: 'CERTIFIED', certifiedAt: new Date() }
  });

  await notificationService.notifyCertificateIssued(report.organizationId, certificate.id, certificate.certificateNumber);

  const io = getIo();
  if (io) io.to(`org:${report.organizationId}`).emit('certificate:issued', {
    certId: certificate.id, certNumber: certificate.certificateNumber
  });

  await createAuditLog({
    userId: req.user.id, action: 'CERTIFICATE_ISSUED', entityType: 'Certificate', entityId: certificate.id,
    description: `Certificate issued: ${certificate.certificateNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { certificate }, 'Certificate issued successfully');
};

/* ══════════════════════════════════════
   ISSUE COMPLIANCE NOTICE
══════════════════════════════════════ */
exports.issueNotice = async (req, res) => {
  const {
    organizationId, organizationName, reportId,
    noticeType, title, description, violations,
    penaltyAmount, responseDeadline
  } = req.body;

  if (organizationId) assertOrgAccess(req, organizationId);

  const year  = new Date().getFullYear();
  const count = await prisma.complianceNotice.count();
  const noticeNumber = `NOC-${year}-${String(count + 1).padStart(4, '0')}`;

  const notice = await prisma.complianceNotice.create({
    data: {
      noticeNumber,
      authorityId:      req.user.authorityId || (await prisma.regulatoryAuthority.findFirst())?.id || uuid(),
      organizationId:   organizationId || uuid(),
      organizationName: organizationName || '',
      reportId,
      noticeType, title, description,
      violations:       violations || {},
      penaltyAmount,
      responseDeadline: new Date(responseDeadline)
    }
  });

  if (organizationId) {
    await notificationService.notifyComplianceNotice(organizationId, notice.id, noticeNumber, title);
  }

  await createAuditLog({
    userId: req.user.id, action: 'NOTICE_ISSUED', entityType: 'ComplianceNotice', entityId: notice.id,
    description: `Compliance notice issued: ${noticeNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { notice }, 'Compliance notice issued');
};

/* ══════════════════════════════════════
   SCHEDULE INSPECTION
══════════════════════════════════════ */
exports.scheduleInspection = async (req, res) => {
  const { organizationId, organizationName, scheduledDate, inspectionType, inspectorName, inspectorId } = req.body;

  if (organizationId) assertOrgAccess(req, organizationId);

  const year  = new Date().getFullYear();
  const count = await prisma.inspection.count();
  const inspectionNumber = `INS-${year}-${String(count + 1).padStart(4, '0')}`;

  const inspection = await prisma.inspection.create({
    data: {
      inspectionNumber,
      authorityId:     req.user.authorityId || (await prisma.regulatoryAuthority.findFirst())?.id || uuid(),
      organizationId:  organizationId || uuid(),
      organizationName,
      inspectorName, inspectorId, inspectionType,
      scheduledDate: new Date(scheduledDate),
      status: 'SCHEDULED'
    }
  });

  if (organizationId) {
    await notificationService.notifyInspectionScheduled(organizationId, inspection.id, scheduledDate);
  }

  return created(res, { inspection }, 'Inspection scheduled');
};

/* ══════════════════════════════════════
   REGULATORY DASHBOARD
   — Per-user cache key prevents data leakage between regulators
══════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  const cacheKey = `dashboard:regulatory:${req.user.id}`;
  const filter   = orgFilter(req);

  const data = await cacheGetOrSet(cacheKey, async () => {
    const orgIdWhere = req.regOrgIds !== null
      ? { id: { in: req.regOrgIds || [] } }
      : {};

    const [pending, approved, rejected, certs, notices, inspections, orgs] = await Promise.all([
      prisma.report.count({ where: { status: { in: ['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW'] }, ...filter } }),
      prisma.report.count({ where: { status: { in: ['REG_APPROVED','CERTIFIED'] }, ...filter } }),
      prisma.report.count({ where: { status: 'REG_REJECTED', ...filter } }),
      prisma.certificate.count({ where: filter }),
      prisma.complianceNotice.count({ where: filter }),
      prisma.inspection.count({ where: filter }),
      req.regOrgIds !== null
        ? Promise.resolve(req.regOrgIds.length)
        : prisma.organization.count({ where: { isActive: true } })
    ]);

    return { pending, approved, rejected, certificates: certs, notices, inspections, organizations: orgs };
  }, CACHE_TTL.SHORT);

  return success(res, data);
};

/* ══════════════════════════════════════
   REGIONAL ANALYTICS
══════════════════════════════════════ */
exports.getRegionalAnalytics = async (req, res) => {
  const cacheKey = `analytics:regional:${req.user.id}`;
  const filter   = orgFilter(req);

  const data = await cacheGetOrSet(cacheKey, async () => {
    const orgIdWhere = req.regOrgIds !== null
      ? { id: { in: req.regOrgIds || [] } }
      : {};

    const [byIndustry, byState, complianceRate] = await Promise.all([
      prisma.organization.groupBy({
        by:     ['industryType'],
        where:  orgIdWhere,
        _count: { id: true }
      }),
      prisma.organization.groupBy({
        by:     ['state'],
        where:  orgIdWhere,
        _count: { id: true }
      }),
      prisma.monitoringRecord.groupBy({
        by:     ['complianceStatus'],
        where:  filter,
        _count: { id: true }
      })
    ]);

    return { byIndustry, byState, complianceRate };
  }, CACHE_TTL.MEDIUM);

  return success(res, data);
};

/* ══════════════════════════════════════
   ASSIGNED ORGANIZATIONS LIST
══════════════════════════════════════ */
exports.getAssignedOrganizations = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, state, industryType } = req.query;

  const where = {
    isActive: true,
    ...(req.regOrgIds !== null ? { id: { in: req.regOrgIds } } : {}),
    ...(state        ? { state }        : {}),
    ...(industryType ? { industryType } : {}),
    ...(search ? {
      OR: [
        { name:                 { contains: search, mode: 'insensitive' } },
        { registrationNumber:   { contains: search, mode: 'insensitive' } },
        { city:                 { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip, take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, industryType: true, status: true,
        city: true, state: true, registrationNumber: true,
        contactEmail: true, contactPhone: true, isVerified: true,
        _count: { select: { reports: true, monitoringRecords: true } }
      }
    }),
    prisma.organization.count({ where })
  ]);

  return paginated(res, orgs, total, page, limit);
};

/* ══════════════════════════════════════
   MONITORING DATA  (read-only)
══════════════════════════════════════ */
exports.getMonitoringData = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { monitoringType, startDate, endDate, complianceStatus } = req.query;

  const where = {
    ...orgFilter(req),
    ...(monitoringType   ? { monitoringType }   : {}),
    ...(complianceStatus ? { complianceStatus } : {}),
    ...(startDate || endDate ? {
      recordingDate: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate   && { lte: new Date(endDate) })
      }
    } : {})
  };

  const [records, total] = await Promise.all([
    prisma.monitoringRecord.findMany({
      where,
      skip, take: limit,
      orderBy: { recordingDate: 'desc' },
      include: {
        organization: { select: { id: true, name: true, city: true, state: true } },
        station:      { select: { name: true, stationCode: true } }
      }
    }),
    prisma.monitoringRecord.count({ where })
  ]);

  return paginated(res, records, total, page, limit);
};

/* ══════════════════════════════════════
   ALL REPORTS  (read-only, all statuses)
══════════════════════════════════════ */
exports.getAllReports = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, reportType } = req.query;

  const where = {
    ...orgFilter(req),
    ...(status     ? { status }     : {}),
    ...(reportType ? { reportType } : {})
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip, take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, industryType: true, city: true, state: true } },
        reviews:      { where: { reviewStage: 'LABORATORY' }, orderBy: { createdAt: 'desc' }, take: 1 },
        certificate:  { select: { id: true, certificateNumber: true, status: true } }
      }
    }),
    prisma.report.count({ where })
  ]);

  return paginated(res, reports, total, page, limit);
};

/* ══════════════════════════════════════
   COMPLIANCE / NOTICE HISTORY  (read-only)
══════════════════════════════════════ */
exports.getComplianceHistory = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const where = orgFilter(req);

  const [notices, total] = await Promise.all([
    prisma.complianceNotice.findMany({
      where,
      skip, take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.complianceNotice.count({ where })
  ]);

  return paginated(res, notices, total, page, limit);
};

/* ══════════════════════════════════════
   INSPECTIONS LIST  (read-only)
══════════════════════════════════════ */
exports.getInspections = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status } = req.query;

  const where = {
    ...orgFilter(req),
    ...(status ? { status } : {})
  };

  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      skip, take: limit,
      orderBy: { scheduledDate: 'desc' }
    }),
    prisma.inspection.count({ where })
  ]);

  return paginated(res, inspections, total, page, limit);
};

/* ══════════════════════════════════════
   ALERTS  (non-compliant monitoring records)
══════════════════════════════════════ */
exports.getAlerts = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { monitoringType } = req.query;

  const where = {
    ...orgFilter(req),
    complianceStatus: { in: ['NON_COMPLIANT', 'MARGINAL'] },
    ...(monitoringType ? { monitoringType } : {})
  };

  const [records, total] = await Promise.all([
    prisma.monitoringRecord.findMany({
      where,
      skip, take: limit,
      orderBy: { recordingDate: 'desc' },
      include: {
        organization: { select: { id: true, name: true, city: true, state: true } },
        station: {
          select: { id: true, name: true, stationCode: true, monitoringType: true }
        }
      }
    }),
    prisma.monitoringRecord.count({ where })
  ]);

  return paginated(res, records, total, page, limit);
};

/* ══════════════════════════════════════
   DOCUMENTS  (reports that have files)
══════════════════════════════════════ */
exports.getDocuments = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { reportType } = req.query;

  const where = {
    ...orgFilter(req),
    OR: [
      { documentKey: { not: null } },
      { pdfKey:      { not: null } }
    ],
    ...(reportType ? { reportType } : {})
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip, take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, reportNumber: true, title: true, reportType: true,
        status: true, documentKey: true, pdfKey: true, updatedAt: true,
        organization: { select: { id: true, name: true } }
      }
    }),
    prisma.report.count({ where })
  ]);

  return paginated(res, reports, total, page, limit);
};

exports.requestCorrection = async (req, res) => {
  const { comments, correctionNotes } = req.body;

  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: { organization: true }
  });
  if (!report) throw new AppError('Report not found', 404);

  assertOrgAccess(req, report.organizationId);

  if (!['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW'].includes(report.status)) {
    throw new AppError(`Cannot request correction in status: ${report.status}`, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportReview.create({
      data: {
        reportId:    report.id,
        reviewedById: req.user.id,
        reviewStage: 'REGULATORY',
        authorityId: req.user.authorityId || null,
        status:      'CORRECTION_REQUESTED',
        comments,
        correctionNotes,
        reviewedAt:  new Date()
      }
    });
    await tx.report.update({
      where: { id: report.id },
      data:  { status: 'REG_CORRECTION_REQUESTED', currentStage: 'REGULATORY' }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId,
        performedById: req.user.id,
        stage: 'REGULATORY', fromStatus: report.status, toStatus: 'REG_CORRECTION_REQUESTED',
        action: 'REG_CORRECTION_REQUESTED', comments
      }
    });
  });

  await notificationService.notifyRegCorrectionRequested(report.organizationId, report.id, correctionNotes);

  await createAuditLog({
    userId: req.user.id, action: 'CORRECTION_REQUESTED', entityType: 'Report', entityId: report.id,
    description: `Regulatory correction requested: ${report.reportNumber || report.id}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, {}, 'Correction requested by regulatory authority');
};
