'use strict';

/**
 * EIA Module — Controller Layer
 * Phase 7 | HTTP handlers → service calls → standardised response
 */

const eiaService = require('../services/eia.service');
const { success, created, paginated } = require('../utils/response');
const { createAuditLog } = require('../middleware/auditLogger');

/* ═══════════════════════════════════════════════════════════════
   PROJECTS
═══════════════════════════════════════════════════════════════ */

exports.listProjects = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const result = await eiaService.listProjects(req.params.orgId, req.query);
  return paginated(res, result.items, result.total, result.page, result.limit, 'EIA projects retrieved');
};

exports.createProject = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const project = await eiaService.createProject(req.params.orgId, req.body, req.user.id);

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'EiaProject', entityId: project.id,
    description: `EIA project created: ${project.projectName} (${project.projectCategory})`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return created(res, { project }, 'EIA project created');
};

exports.getProject = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const project = await eiaService.getProjectById(req.params.projectId, req.params.orgId);
  return success(res, { project }, 'EIA project retrieved');
};

exports.updateProject = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const project = await eiaService.updateProject(req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'EiaProject', entityId: project.id,
    description: `EIA project updated: ${project.projectName}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, { project }, 'EIA project updated');
};

exports.deleteProject = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const result = await eiaService.deleteProject(req.params.projectId, req.params.orgId);

  await createAuditLog({
    userId: req.user.id, action: 'DELETE', entityType: 'EiaProject', entityId: req.params.projectId,
    description: 'EIA project deleted',
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, result, 'EIA project deleted');
};

/* ═══════════════════════════════════════════════════════════════
   MONITORING — GENERIC HANDLER FACTORY
═══════════════════════════════════════════════════════════════ */

function monitoringHandlers(module, servicePrefix) {
  const list   = `list${servicePrefix}`;
  const create = `create${servicePrefix}`;
  const getById= `get${servicePrefix}ById`;
  const update = `update${servicePrefix}`;
  const remove = `delete${servicePrefix}`;
  const label  = servicePrefix;

  return {
    list: async (req, res) => {
      eiaService.assertOrgAccess(req.user, req.params.orgId, true);
      const result = await eiaService[list](req.params.projectId, req.params.orgId, req.query);
      return paginated(res, result.items, result.total, result.page, result.limit, `${label} records retrieved`);
    },

    create: async (req, res) => {
      eiaService.assertOrgAccess(req.user, req.params.orgId, false);
      const record = await eiaService[create](req.params.projectId, req.params.orgId, req.body);

      await createAuditLog({
        userId: req.user.id, action: 'CREATE', entityType: `Eia${label}`, entityId: record.id,
        description: `${label} monitoring record added for project ${req.params.projectId}`,
        ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
      });

      return created(res, { record }, `${label} record created`);
    },

    getById: async (req, res) => {
      eiaService.assertOrgAccess(req.user, req.params.orgId, true);
      const record = await eiaService[getById](req.params.recordId, req.params.projectId, req.params.orgId);
      return success(res, { record }, `${label} record retrieved`);
    },

    update: async (req, res) => {
      eiaService.assertOrgAccess(req.user, req.params.orgId, false);
      const record = await eiaService[update](req.params.recordId, req.params.projectId, req.params.orgId, req.body);

      await createAuditLog({
        userId: req.user.id, action: 'UPDATE', entityType: `Eia${label}`, entityId: record.id,
        description: `${label} monitoring record updated`,
        ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
      });

      return success(res, { record }, `${label} record updated`);
    },

    remove: async (req, res) => {
      eiaService.assertOrgAccess(req.user, req.params.orgId, false);
      const result = await eiaService[remove](req.params.recordId, req.params.projectId, req.params.orgId);

      await createAuditLog({
        userId: req.user.id, action: 'DELETE', entityType: `Eia${label}`, entityId: req.params.recordId,
        description: `${label} monitoring record deleted`,
        ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
      });

      return success(res, result, `${label} record deleted`);
    }
  };
}

const airHandlers   = monitoringHandlers('air',   'Air');
const waterHandlers = monitoringHandlers('water', 'Water');
const soilHandlers  = monitoringHandlers('soil',  'Soil');
const noiseHandlers = monitoringHandlers('noise', 'Noise');

exports.listAir    = airHandlers.list;
exports.createAir  = airHandlers.create;
exports.getAir     = airHandlers.getById;
exports.updateAir  = airHandlers.update;
exports.deleteAir  = airHandlers.remove;

exports.listWater  = waterHandlers.list;
exports.createWater= waterHandlers.create;
exports.getWater   = waterHandlers.getById;
exports.updateWater= waterHandlers.update;
exports.deleteWater= waterHandlers.remove;

exports.listSoil   = soilHandlers.list;
exports.createSoil = soilHandlers.create;
exports.getSoil    = soilHandlers.getById;
exports.updateSoil = soilHandlers.update;
exports.deleteSoil = soilHandlers.remove;

exports.listNoise  = noiseHandlers.list;
exports.createNoise= noiseHandlers.create;
exports.getNoise   = noiseHandlers.getById;
exports.updateNoise= noiseHandlers.update;
exports.deleteNoise= noiseHandlers.remove;

/* ═══════════════════════════════════════════════════════════════
   IMPACT ASSESSMENT
═══════════════════════════════════════════════════════════════ */

exports.listImpacts = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const result = await eiaService.listImpacts(req.params.projectId, req.params.orgId, req.query);
  return paginated(res, result.items, result.total, result.page, result.limit, 'Impact assessments retrieved');
};

exports.createImpact = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const record = await eiaService.createImpact(req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'EiaImpactAssessment', entityId: record.id,
    description: `Impact assessment created: ${record.component} — ${record.significance}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return created(res, { impact: record }, 'Impact assessment created');
};

exports.getImpact = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const record = await eiaService.getImpactById(req.params.impactId, req.params.projectId, req.params.orgId);
  return success(res, { impact: record }, 'Impact assessment retrieved');
};

exports.updateImpact = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const record = await eiaService.updateImpact(req.params.impactId, req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'EiaImpactAssessment', entityId: record.id,
    description: `Impact assessment updated: ${record.component} — ${record.significance}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, { impact: record }, 'Impact assessment updated');
};

exports.deleteImpact = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const result = await eiaService.deleteImpact(req.params.impactId, req.params.projectId, req.params.orgId);

  await createAuditLog({
    userId: req.user.id, action: 'DELETE', entityType: 'EiaImpactAssessment', entityId: req.params.impactId,
    description: 'Impact assessment deleted',
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, result, 'Impact assessment deleted');
};

/* ═══════════════════════════════════════════════════════════════
   MITIGATION MEASURES
═══════════════════════════════════════════════════════════════ */

exports.listMitigations = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const result = await eiaService.listMitigations(req.params.projectId, req.params.orgId, req.query);
  return paginated(res, result.items, result.total, result.page, result.limit, 'Mitigation measures retrieved');
};

exports.createMitigation = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const record = await eiaService.createMitigation(req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'EiaMitigationMeasure', entityId: record.id,
    description: `Mitigation measure created: ${record.measureTitle} (${record.component})`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return created(res, { mitigation: record }, 'Mitigation measure created');
};

exports.getMitigation = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const record = await eiaService.getMitigationById(req.params.mitigationId, req.params.projectId, req.params.orgId);
  return success(res, { mitigation: record }, 'Mitigation measure retrieved');
};

exports.updateMitigation = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const record = await eiaService.updateMitigation(req.params.mitigationId, req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'EiaMitigationMeasure', entityId: record.id,
    description: `Mitigation measure updated: ${record.status}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, { mitigation: record }, 'Mitigation measure updated');
};

exports.deleteMitigation = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const result = await eiaService.deleteMitigation(req.params.mitigationId, req.params.projectId, req.params.orgId);

  await createAuditLog({
    userId: req.user.id, action: 'DELETE', entityType: 'EiaMitigationMeasure', entityId: req.params.mitigationId,
    description: 'Mitigation measure deleted',
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, result, 'Mitigation measure deleted');
};

/* ═══════════════════════════════════════════════════════════════
   MONITORING PROGRAM
═══════════════════════════════════════════════════════════════ */

exports.getMonitoringProgram = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const program = await eiaService.getMonitoringProgram(req.params.projectId, req.params.orgId);
  return success(res, { program }, program ? 'Monitoring program retrieved' : 'No monitoring program set');
};

exports.upsertMonitoringProgram = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const program = await eiaService.upsertMonitoringProgram(req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'EiaMonitoringProgram', entityId: program.id,
    description: 'Monitoring program upserted',
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, { program }, 'Monitoring program saved');
};

/* ═══════════════════════════════════════════════════════════════
   EVIDENCE
═══════════════════════════════════════════════════════════════ */

exports.uploadEvidence = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);

  if (!req.file) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('No file uploaded', 400, 'FILE_REQUIRED');
  }

  const record = await eiaService.createEvidence(
    req.params.projectId, req.params.orgId,
    req.file, req.body, req.user.id
  );

  await createAuditLog({
    userId: req.user.id, action: 'UPLOAD', entityType: 'EiaEvidence', entityId: record.id,
    description: `Evidence uploaded for module ${req.body.module}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return created(res, { evidence: record }, 'Evidence uploaded successfully');
};

exports.listEvidence = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const { module, docType, page, limit } = req.query;
  const result = await eiaService.listEvidence(req.params.projectId, req.params.orgId, { module, docType, page, limit });
  return paginated(res, result.items, result.total, result.page, result.limit, 'Evidence retrieved');
};

exports.getEvidence = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const record = await eiaService.getEvidenceById(req.params.evidenceId, req.params.projectId, req.params.orgId);
  return success(res, { evidence: record }, 'Evidence retrieved');
};

exports.getEvidenceSignedUrl = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const result = await eiaService.getEvidenceSignedUrl(req.params.evidenceId, req.params.projectId, req.params.orgId);

  await createAuditLog({
    userId: req.user.id, action: 'DOWNLOAD', entityType: 'EiaEvidence', entityId: req.params.evidenceId,
    description: `Signed URL generated for evidence ${result.originalName}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, result, 'Signed URL generated');
};

exports.deleteEvidence = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const result = await eiaService.deleteEvidence(req.params.evidenceId, req.params.projectId, req.params.orgId);

  await createAuditLog({
    userId: req.user.id, action: 'DELETE', entityType: 'EiaEvidence', entityId: req.params.evidenceId,
    description: 'EIA evidence deleted',
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, result, 'Evidence deleted');
};

/* ═══════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

exports.listReportHistory = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const result = await eiaService.listReportHistory(req.params.projectId, req.params.orgId, req.query);
  return paginated(res, result.items, result.total, result.page, result.limit, 'Report history retrieved');
};

exports.createReportHistory = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const record = await eiaService.createReportHistory(req.params.projectId, req.params.orgId, req.body, req.user.id);

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'EiaReportHistory', entityId: record.id,
    description: `EIA report history created: ${record.reportType} — ${record.reportTitle}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return created(res, { report: record }, 'Report history created');
};

exports.getReportHistoryById = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const record = await eiaService.getReportHistoryById(req.params.reportId, req.params.projectId, req.params.orgId);
  return success(res, { report: record }, 'Report history retrieved');
};

exports.updateReportHistory = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const record = await eiaService.updateReportHistory(req.params.reportId, req.params.projectId, req.params.orgId, req.body);

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'EiaReportHistory', entityId: req.params.reportId,
    description: `Report status updated to ${req.body.status}`,
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, { report: record }, 'Report history updated');
};

exports.archiveReportHistory = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, false);
  const result = await eiaService.archiveReportHistory(req.params.reportId, req.params.projectId, req.params.orgId);

  await createAuditLog({
    userId: req.user.id, action: 'UPDATE', entityType: 'EiaReportHistory', entityId: req.params.reportId,
    description: 'EIA report archived',
    ipAddress: req.ip, userAgent: req.get('User-Agent'), requestId: req.requestId
  });

  return success(res, result, 'Report archived');
};

/* ═══════════════════════════════════════════════════════════════
   AGGREGATORS
═══════════════════════════════════════════════════════════════ */

exports.getProjectSummary = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const summary = await eiaService.getProjectSummary(req.params.projectId, req.params.orgId);
  return success(res, summary, 'EIA project summary retrieved');
};

exports.getReportData = async (req, res) => {
  eiaService.assertOrgAccess(req.user, req.params.orgId, true);
  const data = await eiaService.getReportData(req.params.projectId, req.params.orgId);
  return success(res, data, 'EIA report data aggregated');
};
