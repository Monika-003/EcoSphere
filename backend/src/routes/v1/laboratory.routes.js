'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/laboratory.controller');
const { authenticate }  = require('../../middleware/auth');
const { authorize }     = require('../../middleware/rbac');

router.use(authenticate);

router.get ('/dashboard',             authorize('lab_review', 'read'),     ctrl.getDashboard);
router.get ('/pending',               authorize('lab_review', 'read'),     ctrl.getPendingReviews);
router.get ('/reports/:id',           authorize('lab_review', 'read'),     ctrl.getReportForReview);
router.post('/reports/:id/approve',   authorize('lab_review', 'approve'),  ctrl.approveReport);
router.post('/reports/:id/reject',    authorize('lab_review', 'reject'),   ctrl.rejectReport);
router.post('/reports/:id/correct',   authorize('lab_review', 'approve'),  ctrl.requestCorrection);
router.post('/reports/:id/forward',   authorize('lab_review', 'approve'),  ctrl.forwardToRegulatory);
router.post('/reports/:id/cert',      authorize('certificate', 'issue'),   ctrl.generateCertificate);

module.exports = router;
