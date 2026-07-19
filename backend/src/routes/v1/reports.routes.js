'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/reports.controller');
const { authenticate }       = require('../../middleware/auth');
const { authorize }          = require('../../middleware/rbac');
const { reportGenLimiter }   = require('../../middleware/rateLimiter');
const { validate }           = require('../../middleware/validate');
const {
  createReportSchema,
  quickPdfSchema,
  listReportsQuerySchema,
  submitReportSchema
} = require('../../validations/report.validation');

router.use(authenticate);

/* ── List / Create ── */
router.get ('/',  authorize('report', 'read'),   validate(listReportsQuerySchema, 'query'), ctrl.getReports);
router.post('/',  authorize('report', 'create'), validate(createReportSchema),              ctrl.createReport);

/* ── Specific routes BEFORE parameterised /:id — order is critical ── */
router.get ('/quick-pdf',       reportGenLimiter, authorize('report', 'download'), validate(quickPdfSchema, 'query'), ctrl.quickPdf);
router.get ('/files/:filename', authorize('report', 'read'), ctrl.serveFile);

/* ── Single report actions ── */
router.get ('/:id',            authorize('report', 'read'),   ctrl.getReport);
router.post('/:id/submit-lab',         authorize('report', 'submit'), validate(submitReportSchema), ctrl.submitToLab);
router.post('/:id/submit-regulatory',  authorize('report', 'submit'), ctrl.submitToRegulatory);
router.post('/:id/pdf',        reportGenLimiter, authorize('report', 'read'),               ctrl.generatePdf);
router.get ('/:id/download',   authorize('report', 'read'),   ctrl.getDownloadUrl);

module.exports = router;
