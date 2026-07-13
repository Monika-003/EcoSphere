'use strict';

/**
 * ESG Module — Controller Layer
 * Phase 2 | HTTP request handlers → service calls → standardised response
 */

const esgService     = require('../services/esg.service');
const { success, created, paginated } = require('../utils/response');
const { createAuditLog } = require('../middleware/auditLogger');

/* ── Section name → human label (for audit logs) ─────────────── */
const SECTION_LABEL = {
  profile: 'ESG Profile', energy: 'Energy', water: 'Water',
  emissions: 'GHG Emissions', waste: 'Waste', biodiversity: 'Biodiversity',
  employees: 'Employees', safety: 'Health & Safety',
  governance: 'Governance', csr: 'CSR'
};

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD / SUMMARY
═══════════════════════════════════════════════════════════════ */

exports.getSummary = async (req, res) => {
  const { orgId }       = req.params;
  const { year }        = req.query;
  esgService.assertOrgAccess(req.user, orgId, true);

  const summary = await esgService.getSectionSummary(orgId, year);
  return success(res, summary, 'ESG summary retrieved');
};

/* ═══════════════════════════════════════════════════════════════
   SECTION HANDLERS (generic factory — avoids ~20 near-identical fns)
═══════════════════════════════════════════════════════════════ */

/**
 * Factory: returns { getHandler, upsertHandler } for a given section name.
 * The route file calls these directly.
 */
function sectionHandlers(section) {
  const label = SECTION_LABEL[section] || section;

  async function getHandler(req, res) {
    const { orgId } = req.params;
    const { year }  = req.query;
    esgService.assertOrgAccess(req.user, orgId, true);

    const record = await esgService.getSection(section, orgId, year);
    return success(res, { [section]: record }, `${label} data retrieved`);
  }

  async function upsertHandler(req, res) {
    const { orgId } = req.params;
    esgService.assertOrgAccess(req.user, orgId, false);

    const { reportingYear, ...rest } = req.body;
    const isNew = !(await esgService.getSection(section, orgId, reportingYear));

    const record = await esgService.upsertSection(section, orgId, reportingYear, req.body, req.user.id);

    await createAuditLog({
      userId:      req.user.id,
      action:      isNew ? 'CREATE' : 'UPDATE',
      entityType:  `Esg${label.replace(/\s/g, '')}`,
      entityId:    record.id,
      description: `${label} data ${isNew ? 'created' : 'updated'} for year ${reportingYear}`,
      ipAddress:   req.ip,
      userAgent:   req.get('User-Agent'),
      requestId:   req.requestId,
      newData:     { orgId, reportingYear, section }
    });

    const fn = isNew ? created : success;
    return fn(res, { [section]: record }, `${label} data ${isNew ? 'created' : 'updated'}`);
  }

  return { getHandler, upsertHandler };
}

/* ── Bind section handlers as named exports ─────────────────── */
const profile      = sectionHandlers('profile');
const energy       = sectionHandlers('energy');
const water        = sectionHandlers('water');
const emissions    = sectionHandlers('emissions');
const waste        = sectionHandlers('waste');
const biodiversity = sectionHandlers('biodiversity');
const employees    = sectionHandlers('employees');
const safety       = sectionHandlers('safety');
const governance   = sectionHandlers('governance');
const csr          = sectionHandlers('csr');

exports.getProfile      = profile.getHandler;
exports.upsertProfile   = profile.upsertHandler;
exports.getEnergy       = energy.getHandler;
exports.upsertEnergy    = energy.upsertHandler;
exports.getWater        = water.getHandler;
exports.upsertWater     = water.upsertHandler;
exports.getEmissions    = emissions.getHandler;
exports.upsertEmissions = emissions.upsertHandler;
exports.getWaste        = waste.getHandler;
exports.upsertWaste     = waste.upsertHandler;
exports.getBiodiversity  = biodiversity.getHandler;
exports.upsertBiodiversity = biodiversity.upsertHandler;
exports.getEmployees    = employees.getHandler;
exports.upsertEmployees = employees.upsertHandler;
exports.getSafety       = safety.getHandler;
exports.upsertSafety    = safety.upsertHandler;
exports.getGovernance   = governance.getHandler;
exports.upsertGovernance = governance.upsertHandler;
exports.getCsr          = csr.getHandler;
exports.upsertCsr       = csr.upsertHandler;

/* ═══════════════════════════════════════════════════════════════
   EVIDENCE
═══════════════════════════════════════════════════════════════ */

exports.uploadEvidence = async (req, res) => {
  const { orgId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, false);

  if (!req.file) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('No file uploaded', 400, 'FILE_REQUIRED');
  }

  // req.body contains the evidence metadata (validated before upload middleware)
  const record = await esgService.createEvidenceRecord(orgId, req.file, req.body, req.user.id);

  await createAuditLog({
    userId:      req.user.id,
    action:      'UPLOAD',
    entityType:  'EsgEvidence',
    entityId:    record.id,
    description: `Evidence uploaded for section ${req.body.section} year ${req.body.reportingYear}`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return created(res, { evidence: record }, 'Evidence uploaded successfully');
};

exports.listEvidence = async (req, res) => {
  const { orgId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, true);

  const { year, section, page = 1, limit = 20 } = req.query;
  const result = await esgService.listEvidence(orgId, {
    reportingYear: year,
    section,
    page: parseInt(page),
    limit: parseInt(limit)
  });

  return paginated(res, result.items, result.total, result.page, result.limit, 'Evidence retrieved');
};

exports.getEvidence = async (req, res) => {
  const { orgId, evidenceId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, true);

  const record = await esgService.getEvidenceById(evidenceId, orgId);
  return success(res, { evidence: record }, 'Evidence retrieved');
};

exports.getEvidenceSignedUrl = async (req, res) => {
  const { orgId, evidenceId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, true);

  const result = await esgService.getEvidenceSignedUrl(evidenceId, orgId);

  await createAuditLog({
    userId:      req.user.id,
    action:      'DOWNLOAD',
    entityType:  'EsgEvidence',
    entityId:    evidenceId,
    description: `Signed URL generated for evidence file ${result.fileName}`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return success(res, result, 'Signed URL generated');
};

exports.deleteEvidence = async (req, res) => {
  const { orgId, evidenceId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, false);

  const result = await esgService.deleteEvidence(evidenceId, orgId);

  await createAuditLog({
    userId:      req.user.id,
    action:      'DELETE',
    entityType:  'EsgEvidence',
    entityId:    evidenceId,
    description: `Evidence file deleted`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return success(res, result, 'Evidence deleted');
};

/* ═══════════════════════════════════════════════════════════════
   ESG SCORE
═══════════════════════════════════════════════════════════════ */

exports.getScore = async (req, res) => {
  const { orgId } = req.params;
  const { year }  = req.query;
  esgService.assertOrgAccess(req.user, orgId, true);

  const score = await esgService.getScore(orgId, year);
  return success(res, { score }, score ? 'Score retrieved' : 'No score computed yet for this period');
};

exports.computeScore = async (req, res) => {
  const { orgId }        = req.params;
  const { year }         = req.body;
  esgService.assertOrgAccess(req.user, orgId, false);

  const score = await esgService.computeScore(orgId, year, req.user.id);

  await createAuditLog({
    userId:      req.user.id,
    action:      'CREATE',
    entityType:  'EsgScore',
    entityId:    score.id,
    description: `ESG score computed for year ${year}: Overall ${score.overallScore} (${score.esgRating})`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId,
    newData:     { year, overallScore: score.overallScore, rating: score.esgRating }
  });

  return success(res, { score }, `ESG score computed: ${score.overallScore}/100 (${score.esgRating})`);
};

/* ═══════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

exports.listReportHistory = async (req, res) => {
  const { orgId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, true);

  const { year, page = 1, limit = 20 } = req.query;
  const result = await esgService.listReportHistory(orgId, {
    reportingYear: year,
    page: parseInt(page),
    limit: parseInt(limit)
  });

  return paginated(res, result.items, result.total, result.page, result.limit, 'Report history retrieved');
};

exports.createReportHistory = async (req, res) => {
  const { orgId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, false);

  const record = await esgService.createReportHistory(orgId, req.body, req.user.id);

  await createAuditLog({
    userId:      req.user.id,
    action:      'CREATE',
    entityType:  'EsgReportHistory',
    entityId:    record.id,
    description: `ESG report history created for year ${req.body.reportingYear} format ${req.body.reportFormat}`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return created(res, { report: record }, 'Report history created');
};

exports.getReportHistoryById = async (req, res) => {
  const { orgId, reportId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, true);

  const record = await esgService.getReportHistoryById(reportId, orgId);
  return success(res, { report: record }, 'Report history retrieved');
};

exports.updateReportHistory = async (req, res) => {
  const { orgId, reportId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, false);

  const record = await esgService.updateReportHistory(reportId, orgId, req.body);

  await createAuditLog({
    userId:      req.user.id,
    action:      'UPDATE',
    entityType:  'EsgReportHistory',
    entityId:    reportId,
    description: `Report history status updated to ${req.body.status}`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return success(res, { report: record }, 'Report history updated');
};

/* ═══════════════════════════════════════════════════════════════
   REPORT DATA AGGREGATOR (Phase 5)
═══════════════════════════════════════════════════════════════ */

exports.getReportData = async (req, res) => {
  const { orgId } = req.params;
  const { year }  = req.query;
  esgService.assertOrgAccess(req.user, orgId, true);

  const data = await esgService.getReportData(orgId, year);
  return success(res, data, 'Report data aggregated');
};

exports.archiveReportHistory = async (req, res) => {
  const { orgId, reportId } = req.params;
  esgService.assertOrgAccess(req.user, orgId, false);

  const result = await esgService.deleteReportHistory(reportId, orgId);

  await createAuditLog({
    userId:      req.user.id,
    action:      'UPDATE',
    entityType:  'EsgReportHistory',
    entityId:    reportId,
    description: `Report history archived`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return success(res, result, 'Report archived');
};
