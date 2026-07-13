'use strict';

/**
 * ESG Module — Routes
 * Phase 2 | All endpoints under /api/v1/esg/:orgId/...
 *
 * Auth chain per endpoint:
 *   authenticate → authorize('esg', action) → validate(schema) → controller
 *
 * Org isolation is enforced inside esgService.assertOrgAccess() at the
 * controller level, because ESG read access is also granted to external
 * roles (AUDITOR, CONSULTANT, REG_*) who don't have an orgId.
 */

const router   = require('express').Router({ mergeParams: true });
const ctrl     = require('../../controllers/esg.controller');
const { authenticate }       = require('../../middleware/auth');
const { authorize }          = require('../../middleware/rbac');
const { validate }           = require('../../middleware/validate');
const { createUploader }     = require('../../middleware/upload');
const {
  yearOnlySchema,
  evidenceQuerySchema,
  evidenceMetaSchema,
  scoreComputeSchema,
  reportHistorySchema,
  reportHistoryUpdateSchema,
  esgProfileSchema,
  esgEnergySchema,
  esgWaterSchema,
  esgEmissionsSchema,
  esgWasteSchema,
  esgBiodiversitySchema,
  esgEmployeesSchema,
  esgSafetySchema,
  esgGovernanceSchema,
  esgCsrSchema
} = require('../../validations/esg.validation');

/* ── Evidence uploader — accepts docs + images up to 20 MB ───── */
const esgEvidenceUploader = createUploader(
  'esg-evidence',
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

/* ── Validation options for large section bodies ─────────────── */
const BODY_OPTS = { allowUnknown: false, stripUnknown: true };

/* ═══════════════════════════════════════════════════════════════
   SUMMARY / DASHBOARD
═══════════════════════════════════════════════════════════════ */
router.get(
  '/:orgId/summary',
  authenticate,
  authorize('esg', 'read'),
  validate(yearOnlySchema, 'query'),
  ctrl.getSummary
);

/* ═══════════════════════════════════════════════════════════════
   SECTION CRUD  (10 sections — same pattern each)
═══════════════════════════════════════════════════════════════ */

// ── Profile ──────────────────────────────────────────────────
router.get( '/:orgId/profile', authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),  ctrl.getProfile);
router.put( '/:orgId/profile', authenticate, authorize('esg','write'), validate(esgProfileSchema,'body',BODY_OPTS), ctrl.upsertProfile);

// ── Energy ───────────────────────────────────────────────────
router.get( '/:orgId/energy',  authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),  ctrl.getEnergy);
router.put( '/:orgId/energy',  authenticate, authorize('esg','write'), validate(esgEnergySchema,'body',BODY_OPTS),  ctrl.upsertEnergy);

// ── Water ────────────────────────────────────────────────────
router.get( '/:orgId/water',   authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),  ctrl.getWater);
router.put( '/:orgId/water',   authenticate, authorize('esg','write'), validate(esgWaterSchema,'body',BODY_OPTS),   ctrl.upsertWater);

// ── Emissions ────────────────────────────────────────────────
router.get( '/:orgId/emissions', authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),      ctrl.getEmissions);
router.put( '/:orgId/emissions', authenticate, authorize('esg','write'), validate(esgEmissionsSchema,'body',BODY_OPTS), ctrl.upsertEmissions);

// ── Waste ────────────────────────────────────────────────────
router.get( '/:orgId/waste',   authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),  ctrl.getWaste);
router.put( '/:orgId/waste',   authenticate, authorize('esg','write'), validate(esgWasteSchema,'body',BODY_OPTS),   ctrl.upsertWaste);

// ── Biodiversity ─────────────────────────────────────────────
router.get( '/:orgId/biodiversity', authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),         ctrl.getBiodiversity);
router.put( '/:orgId/biodiversity', authenticate, authorize('esg','write'), validate(esgBiodiversitySchema,'body',BODY_OPTS), ctrl.upsertBiodiversity);

// ── Employees ────────────────────────────────────────────────
router.get( '/:orgId/employees', authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),       ctrl.getEmployees);
router.put( '/:orgId/employees', authenticate, authorize('esg','write'), validate(esgEmployeesSchema,'body',BODY_OPTS), ctrl.upsertEmployees);

// ── Safety ───────────────────────────────────────────────────
router.get( '/:orgId/safety',  authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),  ctrl.getSafety);
router.put( '/:orgId/safety',  authenticate, authorize('esg','write'), validate(esgSafetySchema,'body',BODY_OPTS),  ctrl.upsertSafety);

// ── Governance ───────────────────────────────────────────────
router.get( '/:orgId/governance', authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),        ctrl.getGovernance);
router.put( '/:orgId/governance', authenticate, authorize('esg','write'), validate(esgGovernanceSchema,'body',BODY_OPTS), ctrl.upsertGovernance);

// ── CSR ──────────────────────────────────────────────────────
router.get( '/:orgId/csr',     authenticate, authorize('esg','read'),  validate(yearOnlySchema,'query'),  ctrl.getCsr);
router.put( '/:orgId/csr',     authenticate, authorize('esg','write'), validate(esgCsrSchema,'body',BODY_OPTS),     ctrl.upsertCsr);

/* ═══════════════════════════════════════════════════════════════
   EVIDENCE
═══════════════════════════════════════════════════════════════ */

// List evidence files
router.get(
  '/:orgId/evidence',
  authenticate,
  authorize('esg', 'read'),
  validate(evidenceQuerySchema, 'query'),
  ctrl.listEvidence
);

// Upload a new evidence file (multipart/form-data)
// Metadata fields come as form-data text fields alongside the file
router.post(
  '/:orgId/evidence',
  authenticate,
  authorize('esg', 'upload'),
  esgEvidenceUploader.single('file'),
  validate(evidenceMetaSchema, 'body', BODY_OPTS),
  ctrl.uploadEvidence
);

// Get evidence metadata
router.get(
  '/:orgId/evidence/:evidenceId',
  authenticate,
  authorize('esg', 'read'),
  ctrl.getEvidence
);

// Get a presigned download URL
router.get(
  '/:orgId/evidence/:evidenceId/url',
  authenticate,
  authorize('esg', 'download'),
  ctrl.getEvidenceSignedUrl
);

// Delete evidence
router.delete(
  '/:orgId/evidence/:evidenceId',
  authenticate,
  authorize('esg', 'delete'),
  ctrl.deleteEvidence
);

/* ═══════════════════════════════════════════════════════════════
   ESG SCORE
═══════════════════════════════════════════════════════════════ */

// Get latest computed score
router.get(
  '/:orgId/score',
  authenticate,
  authorize('esg', 'read'),
  validate(yearOnlySchema, 'query'),
  ctrl.getScore
);

// Trigger score computation
router.post(
  '/:orgId/score/compute',
  authenticate,
  authorize('esg', 'compute'),
  validate(scoreComputeSchema, 'body', BODY_OPTS),
  ctrl.computeScore
);

/* ═══════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

// List reports
router.get(
  '/:orgId/reports',
  authenticate,
  authorize('esg', 'read'),
  ctrl.listReportHistory
);

// Create a report history record (called after PDF is generated in Phase 5)
router.post(
  '/:orgId/reports',
  authenticate,
  authorize('esg', 'write'),
  validate(reportHistorySchema, 'body', BODY_OPTS),
  ctrl.createReportHistory
);

// Get a single report history
router.get(
  '/:orgId/reports/:reportId',
  authenticate,
  authorize('esg', 'read'),
  ctrl.getReportHistoryById
);

// Update report status (SHARED, DOWNLOADED, ARCHIVED)
router.patch(
  '/:orgId/reports/:reportId',
  authenticate,
  authorize('esg', 'write'),
  validate(reportHistoryUpdateSchema, 'body', BODY_OPTS),
  ctrl.updateReportHistory
);

// Archive (soft-delete) a report
router.delete(
  '/:orgId/reports/:reportId',
  authenticate,
  authorize('esg', 'delete'),
  ctrl.archiveReportHistory
);

/* ═══════════════════════════════════════════════════════════════
   REPORT DATA AGGREGATOR (Phase 5)
   Single endpoint that returns all sections + score + signed evidence
   images in one call — used by the frontend report engine.
═══════════════════════════════════════════════════════════════ */
router.get(
  '/:orgId/report-data',
  authenticate,
  authorize('esg', 'read'),
  validate(yearOnlySchema, 'query'),
  ctrl.getReportData
);

module.exports = router;
