'use strict';

const fs              = require('fs');
const path            = require('path');
const { prisma }          = require('../config/database');
const { AppError }        = require('../middleware/errorHandler');
const { success, created, paginated, parsePagination, parseSort } = require('../utils/response');
const { createAuditLog }  = require('../middleware/auditLogger');
const { cacheDel, CACHE_TTL } = require('../config/redis');
const { getIo }           = require('../socket');
const reportService       = require('../services/report.service');
const notificationService = require('../services/notification.service');
const workflowService     = require('../services/workflow.service');
const aiService           = require('../services/ai.service');
const { getSignedUrl }    = require('../middleware/upload');

/* ── Local reports folder (same path as report.service.js uses) ── */
const REPORTS_DIR = path.join(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

/* ── Generate unique report number ── */
async function generateReportNumber() {
  const year   = new Date().getFullYear();
  const count  = await prisma.report.count();
  return `RPT-${year}-${String(count + 1).padStart(4, '0')}`;
}

/* ══════════════════════════════════════
   LIST REPORTS
══════════════════════════════════════ */
exports.getReports = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, reportType, from, to } = req.query;

  const where = {};

  /* Scope by role */
  if (req.user.role.startsWith('ORG_')) {
    where.organizationId = req.user.orgId;
  } else if (req.user.role.startsWith('LAB_')) {
    where.status = { in: ['SUBMITTED_TO_LAB','LAB_UNDER_REVIEW','LAB_CORRECTION_REQUESTED','LAB_APPROVED','LAB_REJECTED'] };
  } else if (req.user.role.startsWith('REG_')) {
    where.status = { in: ['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW','REG_CORRECTION_REQUESTED','REG_APPROVED','CERTIFIED'] };
  }

  if (status)     where.status     = status;
  if (reportType) where.reportType = reportType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }

  const orderBy = parseSort(req.query, ['createdAt','updatedAt','reportNumber','status']);

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where, orderBy, skip, take: limit,
      include: {
        organization: { select: { name: true, industryType: true } },
        submittedBy:  { select: { firstName: true, lastName: true } },
        certificate:  { select: { certificateNumber: true, issuedDate: true } },
        reviews: {
          orderBy:  { createdAt: 'desc' },
          take: 3,
          include: {
            reviewedBy: { select: { firstName: true, lastName: true } },
            laboratory: { select: { name: true } },
            authority:  { select: { name: true } }
          }
        }
      }
    }),
    prisma.report.count({ where })
  ]);

  return paginated(res, reports, total, page, limit);
};

/* ══════════════════════════════════════
   GET SINGLE REPORT
══════════════════════════════════════ */
exports.getReport = async (req, res) => {
  const report = await prisma.report.findUnique({
    where:   { id: req.params.id },
    include: {
      organization:  { select: { name: true, industryType: true, city: true, state: true } },
      submittedBy:   { select: { firstName: true, lastName: true, role: true } },
      reviews:       { include: { reviewedBy: { select: { firstName: true, lastName: true } }, laboratory: { select: { name: true } }, authority: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      certificate:   true,
      workflowHistory: { orderBy: { performedAt: 'asc' }, include: { performedBy: { select: { firstName: true, lastName: true, role: true } } } },
      monitoringRecords: { include: { monitoringRecord: { select: { monitoringType: true, parameters: true, complianceStatus: true, recordingDate: true } } }, take: 20 }
    }
  });

  if (!report) throw new AppError('Report not found', 404);

  /* Access control */
  const role = req.user.role;
  if (role.startsWith('ORG_') && report.organizationId !== req.user.orgId) throw new AppError('Access denied', 403);

  return success(res, { report });
};

/* ══════════════════════════════════════
   CREATE REPORT
══════════════════════════════════════ */
exports.createReport = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  const b = req.body;

  const title              = b.title;
  const monitoringRecordIds = b.monitoringRecordIds;
  const notes              = b.notes;
  const isDraft            = b.isDraft || false;

  /* ── period — required non-nullable String in Prisma ── */
  const period = b.period || 'MONTHLY';

  /* ── Period dates — accept both flat fields and nested reportingPeriod ── */
  const periodStartDate = b.periodStartDate
    || (b.reportingPeriod && b.reportingPeriod.startDate)
    || null;
  const periodEndDate   = b.periodEndDate
    || (b.reportingPeriod && b.reportingPeriod.endDate)
    || null;

  /* ── Normalise reportType to valid Prisma enum ── */
  const VALID_REPORT_TYPES = [
    'ENVIRONMENTAL_MONITORING','ESG_REPORT','CARBON_EMISSION','SUSTAINABILITY',
    'ISO14001_COMPLIANCE','EIA_REPORT','WATER_AUDIT','ENERGY_AUDIT','WASTE_AUDIT','ANNUAL_ENVIRONMENTAL'
  ];
  const TYPE_ALIASES = {
    'ENVIRONMENTAL_COMPLIANCE': 'ENVIRONMENTAL_MONITORING',
    'ENVIRONMENTAL':            'ENVIRONMENTAL_MONITORING',
    'MONITORING':               'ENVIRONMENTAL_MONITORING',
    'ESG':                      'ESG_REPORT',
    'CARBON':                   'CARBON_EMISSION',
    'CARBON_REPORT':            'CARBON_EMISSION',
    'ANNUAL':                   'ANNUAL_ENVIRONMENTAL',
    'SUSTAINABILITY_REPORT':    'SUSTAINABILITY'
  };
  /* Accept `type` (frontend primary) OR `reportType` (legacy alias) */
  const rawType    = ((b.type || b.reportType) || 'ENVIRONMENTAL_MONITORING').toUpperCase().replace(/ /g,'_');
  const reportType = VALID_REPORT_TYPES.includes(rawType)
    ? rawType
    : (TYPE_ALIASES[rawType] || 'ENVIRONMENTAL_MONITORING');

  const reportNumber = await generateReportNumber();

  /* Get org for context */
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError('Organization not found', 404);

  /* AI: generate ESG / carbon scores */
  let aiSummary = null, aiRecommendations = null, aiRiskScore = null;
  let esgScore = null, envScore = null, socialScore = null, govScore = null;
  let scope1 = null, scope2 = null, scope3 = null, totalCarbon = null, complianceScore = null;

  try {
    const monRecords = monitoringRecordIds?.length
      ? await prisma.monitoringRecord.findMany({ where: { id: { in: monitoringRecordIds } } })
      : [];

    const aiResult = await aiService.generateReportAnalysis(reportType, monRecords, org);
    aiSummary         = aiResult.summary;
    aiRecommendations = aiResult.recommendations;
    aiRiskScore       = aiResult.riskScore;
    esgScore          = aiResult.esgScore;
    envScore          = aiResult.envScore;
    socialScore       = aiResult.socialScore;
    govScore          = aiResult.govScore;
    complianceScore   = aiResult.complianceScore;
    scope1            = aiResult.scope1;
    scope2            = aiResult.scope2;
    scope3            = aiResult.scope3;
    totalCarbon       = aiResult.totalCarbon;
  } catch (e) { /* AI non-blocking */ }

  const report = await prisma.$transaction(async (tx) => {
    const r = await tx.report.create({
      data: {
        reportNumber, organizationId: orgId, submittedById: req.user.id,
        reportType, title, period,
        periodStartDate: periodStartDate ? new Date(periodStartDate) : null,
        periodEndDate:   periodEndDate   ? new Date(periodEndDate)   : null,
        notes, isDraft: isDraft || false,
        esgScore, envScore, socialScore, govScore,
        scope1, scope2, scope3, totalCarbon, complianceScore,
        aiSummary, aiRecommendations, aiRiskScore,
        status: 'DRAFT'
      }
    });

    /* Link monitoring records */
    if (monitoringRecordIds?.length) {
      await tx.reportMonitoringRecord.createMany({
        data: monitoringRecordIds.map(id => ({ reportId: r.id, monitoringRecordId: id }))
      });
    }

    return r;
  });

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'Report', entityId: report.id,
    description: `Report created: ${reportNumber} (${reportType})`,
    newData: { reportNumber, reportType, isDraft },
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { report }, 'Report created successfully');
};

/* ══════════════════════════════════════
   SUBMIT TO LABORATORY
══════════════════════════════════════ */
exports.submitToLab = async (req, res) => {
  const report = await prisma.report.findUnique({
    where:   { id: req.params.id },
    include: { organization: true }
  });
  if (!report) throw new AppError('Report not found', 404);
  if (report.organizationId !== req.user.orgId) throw new AppError('Access denied', 403);
  if (!['DRAFT', 'LAB_CORRECTION_REQUESTED'].includes(report.status)) {
    throw new AppError(`Cannot submit report in status: ${report.status}`, 400);
  }

  const updated = await workflowService.advanceToLab(report.id, req.user.id, req.body.notes || '');

  /* Real-time notification to lab users */
  const io = getIo();
  if (io) io.to('lab').emit('report:submitted', { reportId: report.id, orgName: report.organization?.name || '' });

  await notificationService.notifyNewReportForLab(report.id, report.reportNumber, report.organization?.name || '');

  await createAuditLog({
    userId: req.user.id, action: 'SUBMIT', entityType: 'Report', entityId: report.id,
    description: `Report submitted to laboratory: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, { report: updated }, 'Report submitted to laboratory for review');
};

/* ══════════════════════════════════════
   SUBMIT TO REGULATORY
══════════════════════════════════════ */
exports.submitToRegulatory = async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new AppError('Report not found', 404);
  if (report.organizationId !== req.user.orgId) throw new AppError('Access denied', 403);
  if (!['LAB_APPROVED', 'REG_CORRECTION_REQUESTED'].includes(report.status)) {
    throw new AppError(`Report must be LAB_APPROVED or REG_CORRECTION_REQUESTED to submit to regulatory. Current status: ${report.status}`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({
      where: { id: report.id },
      data:  { status: 'SUBMITTED_TO_REGULATORY', submittedToRegAt: new Date(), currentStage: 'REGULATORY' }
    });
    await tx.workflowHistory.create({
      data: {
        reportId: report.id, organizationId: report.organizationId, performedById: req.user.id,
        stage: 'REGULATORY', fromStatus: report.status, toStatus: 'SUBMITTED_TO_REGULATORY',
        action: 'SUBMITTED_TO_REGULATORY', comments: req.body.notes || ''
      }
    });
    return r;
  });

  const io = getIo();
  if (io) io.to('reg').emit('report:submitted_regulatory', { reportId: report.id, orgName: '' });

  await notificationService.notifyNewReportForRegulatory(report.id, report.organizationId);

  await createAuditLog({
    userId: req.user.id, action: 'SUBMIT', entityType: 'Report', entityId: report.id,
    description: `Report submitted to regulatory: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return success(res, { report: updated }, 'Report submitted to regulatory authority');
};

/* ══════════════════════════════════════
   GENERATE PDF
══════════════════════════════════════ */
exports.generatePdf = async (req, res) => {
  const report = await prisma.report.findUnique({
    where:   { id: req.params.id },
    include: {
      organization:    true,
      monitoringRecords: { include: { monitoringRecord: { include: { station: { select: { name: true, stationCode: true } } } } } },
      reviews: {
        include: {
          reviewedBy: { select: { firstName: true, lastName: true } },
          laboratory: { select: { name: true } },
          authority:  { select: { name: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  if (!report) throw new AppError('Report not found', 404);

  const { pdfKey, pdfBuffer } = await reportService.generatePdf(report);

  await createAuditLog({
    userId: req.user.id, action: 'DOWNLOAD', entityType: 'Report', entityId: report.id,
    description: `PDF generated for report: ${report.reportNumber}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${report.reportNumber}.pdf"`,
    'Content-Length':      pdfBuffer.length
  });
  res.send(pdfBuffer);
};

/* ══════════════════════════════════════
   QUICK PDF — one-shot create + generate
   GET /api/v1/reports/quick-pdf?type=ESG_REPORT&token=JWT
   Works as a direct browser navigation URL — no blob/fetch needed
══════════════════════════════════════ */
exports.quickPdf = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  /* Normalise type */
  const VALID_TYPES = ['ENVIRONMENTAL_MONITORING','ESG_REPORT','CARBON_EMISSION','SUSTAINABILITY','ISO14001_COMPLIANCE','EIA_REPORT','WATER_AUDIT','ENERGY_AUDIT','WASTE_AUDIT','ANNUAL_ENVIRONMENTAL'];
  const ALIASES = { ENVIRONMENTAL_COMPLIANCE:'ENVIRONMENTAL_MONITORING', ESG:'ESG_REPORT', CARBON:'CARBON_EMISSION', ISO:'ISO14001_COMPLIANCE', 'ISO 14001':'ISO14001_COMPLIANCE', EIA:'EIA_REPORT', ANNUAL:'ANNUAL_ENVIRONMENTAL', SUSTAINABILITY_REPORT:'SUSTAINABILITY' };
  const rawType    = (req.query.type || 'ENVIRONMENTAL_MONITORING').toUpperCase().replace(/ /g,'_');
  const reportType = VALID_TYPES.includes(rawType) ? rawType : (ALIASES[rawType] || 'ENVIRONMENTAL_MONITORING');

  const label      = (req.query.label || reportType.replace(/_/g,' ')).slice(0, 80);
  const reportNumber = `RPT-${new Date().getFullYear()}-${String(await prisma.report.count() + 1).padStart(4,'0')}`;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError('Organization not found', 404);

  /* Date range — must be declared BEFORE use in title */
  const fromDate = req.query.startDate ? new Date(req.query.startDate)
                                       : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate   = req.query.endDate   ? new Date(req.query.endDate) : new Date();
  toDate.setHours(23, 59, 59, 999);

  /* Build a descriptive title including the date range */
  const fmtD = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dateRangeLabel = req.query.startDate && req.query.endDate
    ? ` (${fmtD(fromDate)} – ${fmtD(toDate)})`
    : ` — ${fmtD(new Date())}`;

  /* Create report */
  const report = await prisma.report.create({
    data: {
      reportNumber,
      organizationId:  orgId,
      submittedById:   req.user.id,
      reportType,
      title:           `${label}${dateRangeLabel}`,
      period:          'MONTHLY',
      periodStartDate: fromDate,
      periodEndDate:   toDate,
      isDraft: false,
      status: 'DRAFT'
    },
    include: {
      organization:    true,
      monitoringRecords: { include: { monitoringRecord: { include: { station: { select: { name: true, stationCode: true } } } } } },
      reviews: {
        include: {
          reviewedBy: { select: { firstName: true, lastName: true } },
          laboratory: { select: { name: true } },
          authority:  { select: { name: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  /* ── Fetch actual saved monitoring records for this report type ── */
  const REPORT_MONITORING_MAP = {
    ENVIRONMENTAL_MONITORING: ['AIR','NOISE','SOIL','TEMPERATURE','HUMIDITY'],
    WATER_AUDIT:              ['WATER','GROUNDWATER','ETP','STP'],
    CARBON_EMISSION:          ['STACK_EMISSION'],
    WASTE_AUDIT:              ['WASTE','ETP','STP'],
    ENERGY_AUDIT:             ['TEMPERATURE','HUMIDITY','METEOROLOGICAL'],
    ESG_REPORT:               null,   /* null = all types */
    SUSTAINABILITY:            null,
    ISO14001_COMPLIANCE:       null,
    EIA_REPORT:                null,
    ANNUAL_ENVIRONMENTAL:      null
  };
  const mTypes = REPORT_MONITORING_MAP[reportType];

  const liveRecords = await prisma.monitoringRecord.findMany({
    where: {
      organizationId: orgId,
      ...(mTypes ? { monitoringType: { in: mTypes } } : {}),
      recordingDate: { gte: fromDate, lte: toDate }
    },
    orderBy: { recordingDate: 'desc' },
    take:    200,
    include: { station: { select: { name: true, stationCode: true } } }
  });

  /* Override monitoringRecords with live DB data so PDF shows real values */
  report.monitoringRecords = liveRecords;
  /* Ensure full org is attached (quickPdf include may not have all fields) */
  if (org && (!report.organization || !report.organization.registrationNumber)) {
    report.organization = org;
  }

  /* Generate PDF — attachment so browser saves to Downloads folder */
  const { pdfBuffer } = await reportService.generatePdf(report);

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${reportNumber}.pdf"`,
    'Content-Length':      pdfBuffer.length,
    'Cache-Control':       'no-store'
  });
  res.send(pdfBuffer);
};

/* ══════════════════════════════════════
   SERVE SAVED PDF FILE
   GET /api/v1/reports/files/:filename?token=JWT
   Streams a previously saved PDF from backend/reports/ folder
══════════════════════════════════════ */
exports.serveFile = async (req, res) => {
  const { filename } = req.params;

  /* Safety: prevent path traversal */
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new AppError('Invalid filename', 400);
  }
  if (!filename.endsWith('.pdf')) throw new AppError('Only PDF files are served here', 400);

  const filePath = path.join(REPORTS_DIR, filename);
  if (!fs.existsSync(filePath)) throw new AppError('Report file not found', 404);

  const stat = fs.statSync(filePath);
  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length':      stat.size,
    'Cache-Control':       'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
};

/* ══════════════════════════════════════
   GET DOWNLOAD URL
══════════════════════════════════════ */
exports.getDownloadUrl = async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new AppError('Report not found', 404);
  if (!report.pdfKey) throw new AppError('PDF not yet generated', 404);

  const url = await getSignedUrl(report.pdfKey, 3600);
  return success(res, { url, expiresIn: 3600 });
};
