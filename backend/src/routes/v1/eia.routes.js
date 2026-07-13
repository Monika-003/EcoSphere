'use strict';

/**
 * EIA Module — Routes
 * Phase 7 | All endpoints under /api/v1/eia/:orgId/projects/:projectId/...
 *
 * Auth chain:  authenticate → authorize('eia', action) → validate(schema) → controller
 * Org isolation enforced inside eiaService.assertOrgAccess() at controller level.
 */

const router        = require('express').Router({ mergeParams: true });
const ctrl          = require('../../controllers/eia.controller');
const analyticsCtrl = require('../../controllers/eia.analytics.controller');
const { authenticate }   = require('../../middleware/auth');
const { authorize }      = require('../../middleware/rbac');
const { validate }       = require('../../middleware/validate');
const { createUploader } = require('../../middleware/upload');
const {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  airMonitoringSchema,
  listAirSchema,
  waterMonitoringSchema,
  listWaterSchema,
  soilMonitoringSchema,
  listSoilSchema,
  noiseMonitoringSchema,
  listNoiseSchema,
  impactAssessmentSchema,
  listImpactSchema,
  mitigationMeasureSchema,
  listMitigationSchema,
  updateMitigationStatusSchema,
  monitoringProgramSchema,
  evidenceMetaSchema,
  listEvidenceSchema,
  createReportSchema,
  updateReportSchema,
  listReportSchema
} = require('../../validations/eia.validation');

/* ── Evidence uploader — same MIME set as ESG evidence ───────── */
const eiaEvidenceUploader = createUploader(
  'eia-evidence',
  20,
  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp','image/gif',
    'text/csv'
  ]
);

const BODY_OPTS = { allowUnknown: false, stripUnknown: true };

/* ═══════════════════════════════════════════════════════════════
   PROJECTS  (/api/v1/eia/:orgId/projects)
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects',
  authenticate,
  authorize('eia', 'read'),
  validate(listProjectsSchema, 'query'),
  ctrl.listProjects
);

router.post(
  '/:orgId/projects',
  authenticate,
  authorize('eia', 'write'),
  validate(createProjectSchema, 'body', BODY_OPTS),
  ctrl.createProject
);

router.get(
  '/:orgId/projects/:projectId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getProject
);

router.put(
  '/:orgId/projects/:projectId',
  authenticate,
  authorize('eia', 'write'),
  validate(updateProjectSchema, 'body', BODY_OPTS),
  ctrl.updateProject
);

router.delete(
  '/:orgId/projects/:projectId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteProject
);

/* ═══════════════════════════════════════════════════════════════
   PROJECT SUMMARY & REPORT DATA
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/summary',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getProjectSummary
);

router.get(
  '/:orgId/projects/:projectId/report-data',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getReportData
);

router.get(
  '/:orgId/projects/:projectId/analytics',
  authenticate,
  authorize('eia', 'read'),
  analyticsCtrl.getAnalytics
);

/* ═══════════════════════════════════════════════════════════════
   AIR MONITORING
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/air',
  authenticate,
  authorize('eia', 'read'),
  validate(listAirSchema, 'query'),
  ctrl.listAir
);

router.post(
  '/:orgId/projects/:projectId/air',
  authenticate,
  authorize('eia', 'write'),
  validate(airMonitoringSchema, 'body', BODY_OPTS),
  ctrl.createAir
);

router.get(
  '/:orgId/projects/:projectId/air/:recordId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getAir
);

router.put(
  '/:orgId/projects/:projectId/air/:recordId',
  authenticate,
  authorize('eia', 'write'),
  validate(airMonitoringSchema.fork(Object.keys(airMonitoringSchema.describe().keys), k => k.optional()), 'body', BODY_OPTS),
  ctrl.updateAir
);

router.delete(
  '/:orgId/projects/:projectId/air/:recordId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteAir
);

/* ═══════════════════════════════════════════════════════════════
   WATER MONITORING
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/water',
  authenticate,
  authorize('eia', 'read'),
  validate(listWaterSchema, 'query'),
  ctrl.listWater
);

router.post(
  '/:orgId/projects/:projectId/water',
  authenticate,
  authorize('eia', 'write'),
  validate(waterMonitoringSchema, 'body', BODY_OPTS),
  ctrl.createWater
);

router.get(
  '/:orgId/projects/:projectId/water/:recordId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getWater
);

router.put(
  '/:orgId/projects/:projectId/water/:recordId',
  authenticate,
  authorize('eia', 'write'),
  validate(waterMonitoringSchema.fork(Object.keys(waterMonitoringSchema.describe().keys), k => k.optional()), 'body', BODY_OPTS),
  ctrl.updateWater
);

router.delete(
  '/:orgId/projects/:projectId/water/:recordId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteWater
);

/* ═══════════════════════════════════════════════════════════════
   SOIL MONITORING
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/soil',
  authenticate,
  authorize('eia', 'read'),
  validate(listSoilSchema, 'query'),
  ctrl.listSoil
);

router.post(
  '/:orgId/projects/:projectId/soil',
  authenticate,
  authorize('eia', 'write'),
  validate(soilMonitoringSchema, 'body', BODY_OPTS),
  ctrl.createSoil
);

router.get(
  '/:orgId/projects/:projectId/soil/:recordId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getSoil
);

router.put(
  '/:orgId/projects/:projectId/soil/:recordId',
  authenticate,
  authorize('eia', 'write'),
  validate(soilMonitoringSchema.fork(Object.keys(soilMonitoringSchema.describe().keys), k => k.optional()), 'body', BODY_OPTS),
  ctrl.updateSoil
);

router.delete(
  '/:orgId/projects/:projectId/soil/:recordId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteSoil
);

/* ═══════════════════════════════════════════════════════════════
   NOISE MONITORING
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/noise',
  authenticate,
  authorize('eia', 'read'),
  validate(listNoiseSchema, 'query'),
  ctrl.listNoise
);

router.post(
  '/:orgId/projects/:projectId/noise',
  authenticate,
  authorize('eia', 'write'),
  validate(noiseMonitoringSchema, 'body', BODY_OPTS),
  ctrl.createNoise
);

router.get(
  '/:orgId/projects/:projectId/noise/:recordId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getNoise
);

router.put(
  '/:orgId/projects/:projectId/noise/:recordId',
  authenticate,
  authorize('eia', 'write'),
  validate(noiseMonitoringSchema.fork(Object.keys(noiseMonitoringSchema.describe().keys), k => k.optional()), 'body', BODY_OPTS),
  ctrl.updateNoise
);

router.delete(
  '/:orgId/projects/:projectId/noise/:recordId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteNoise
);

/* ═══════════════════════════════════════════════════════════════
   IMPACT ASSESSMENT
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/impacts',
  authenticate,
  authorize('eia', 'read'),
  validate(listImpactSchema, 'query'),
  ctrl.listImpacts
);

router.post(
  '/:orgId/projects/:projectId/impacts',
  authenticate,
  authorize('eia', 'write'),
  validate(impactAssessmentSchema, 'body', BODY_OPTS),
  ctrl.createImpact
);

router.get(
  '/:orgId/projects/:projectId/impacts/:impactId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getImpact
);

router.put(
  '/:orgId/projects/:projectId/impacts/:impactId',
  authenticate,
  authorize('eia', 'write'),
  validate(impactAssessmentSchema.fork(Object.keys(impactAssessmentSchema.describe().keys), k => k.optional()), 'body', BODY_OPTS),
  ctrl.updateImpact
);

router.delete(
  '/:orgId/projects/:projectId/impacts/:impactId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteImpact
);

/* ═══════════════════════════════════════════════════════════════
   MITIGATION MEASURES
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/mitigations',
  authenticate,
  authorize('eia', 'read'),
  validate(listMitigationSchema, 'query'),
  ctrl.listMitigations
);

router.post(
  '/:orgId/projects/:projectId/mitigations',
  authenticate,
  authorize('eia', 'write'),
  validate(mitigationMeasureSchema, 'body', BODY_OPTS),
  ctrl.createMitigation
);

router.get(
  '/:orgId/projects/:projectId/mitigations/:mitigationId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getMitigation
);

router.put(
  '/:orgId/projects/:projectId/mitigations/:mitigationId',
  authenticate,
  authorize('eia', 'write'),
  validate(mitigationMeasureSchema.fork(Object.keys(mitigationMeasureSchema.describe().keys), k => k.optional()), 'body', BODY_OPTS),
  ctrl.updateMitigation
);

router.patch(
  '/:orgId/projects/:projectId/mitigations/:mitigationId/status',
  authenticate,
  authorize('eia', 'write'),
  validate(updateMitigationStatusSchema, 'body', BODY_OPTS),
  ctrl.updateMitigation
);

router.delete(
  '/:orgId/projects/:projectId/mitigations/:mitigationId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteMitigation
);

/* ═══════════════════════════════════════════════════════════════
   MONITORING PROGRAM  (upsert via GET / PUT)
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/program',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getMonitoringProgram
);

router.put(
  '/:orgId/projects/:projectId/program',
  authenticate,
  authorize('eia', 'write'),
  validate(monitoringProgramSchema, 'body', BODY_OPTS),
  ctrl.upsertMonitoringProgram
);

/* ═══════════════════════════════════════════════════════════════
   EVIDENCE
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/evidence',
  authenticate,
  authorize('eia', 'read'),
  validate(listEvidenceSchema, 'query'),
  ctrl.listEvidence
);

router.post(
  '/:orgId/projects/:projectId/evidence',
  authenticate,
  authorize('eia', 'upload'),
  eiaEvidenceUploader.single('file'),
  validate(evidenceMetaSchema, 'body', BODY_OPTS),
  ctrl.uploadEvidence
);

router.get(
  '/:orgId/projects/:projectId/evidence/:evidenceId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getEvidence
);

router.get(
  '/:orgId/projects/:projectId/evidence/:evidenceId/url',
  authenticate,
  authorize('eia', 'download'),
  ctrl.getEvidenceSignedUrl
);

router.delete(
  '/:orgId/projects/:projectId/evidence/:evidenceId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.deleteEvidence
);

/* ═══════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

router.get(
  '/:orgId/projects/:projectId/reports',
  authenticate,
  authorize('eia', 'read'),
  validate(listReportSchema, 'query'),
  ctrl.listReportHistory
);

router.post(
  '/:orgId/projects/:projectId/reports',
  authenticate,
  authorize('eia', 'write'),
  validate(createReportSchema, 'body', BODY_OPTS),
  ctrl.createReportHistory
);

router.get(
  '/:orgId/projects/:projectId/reports/:reportId',
  authenticate,
  authorize('eia', 'read'),
  ctrl.getReportHistoryById
);

router.patch(
  '/:orgId/projects/:projectId/reports/:reportId',
  authenticate,
  authorize('eia', 'write'),
  validate(updateReportSchema, 'body', BODY_OPTS),
  ctrl.updateReportHistory
);

router.delete(
  '/:orgId/projects/:projectId/reports/:reportId',
  authenticate,
  authorize('eia', 'delete'),
  ctrl.archiveReportHistory
);

module.exports = router;
