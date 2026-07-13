'use strict';

/**
 * regulatory.routes.js
 *
 * All routes are gated by:
 *   1. authenticate       — valid JWT
 *   2. injectRegFilter    — attaches req.regOrgIds (null = SUPER_ADMIN,
 *                           [] or [ids] = scoped REG_* user)
 *   3. authorize(...)     — role-based permission check
 *
 * Every controller handler uses req.regOrgIds to filter all queries
 * server-side; regulatory users NEVER see unassigned organizations.
 */

const router = require('express').Router();
const ctrl   = require('../../controllers/regulatory.controller');
const { authenticate }  = require('../../middleware/auth');
const { authorize }     = require('../../middleware/rbac');

router.use(authenticate);
router.use(ctrl.injectRegFilter); // inject assigned org IDs on every request

// ── Dashboard & analytics ────────────────────────────────────────
router.get('/dashboard',   authorize('reg_review', 'read'), ctrl.getDashboard);
router.get('/analytics',   authorize('reg_review', 'read'), ctrl.getRegionalAnalytics);

// ── Assigned organizations ───────────────────────────────────────
router.get('/organizations', authorize('reg_review', 'read'), ctrl.getAssignedOrganizations);

// ── Pending approvals queue ──────────────────────────────────────
router.get('/pending',     authorize('reg_review', 'read'), ctrl.getPendingApprovals);

// ── All reports (read-only, all statuses) ────────────────────────
router.get('/reports',     authorize('reg_review', 'read'), ctrl.getAllReports);

// ── Monitoring data (read-only) ──────────────────────────────────
router.get('/monitoring',  authorize('reg_review', 'read'), ctrl.getMonitoringData);

// ── Compliance & notices ─────────────────────────────────────────
router.get('/compliance',  authorize('reg_review', 'read'), ctrl.getComplianceHistory);
router.get('/inspections', authorize('reg_review', 'read'), ctrl.getInspections);

// ── Alerts (non-compliant monitoring records) ────────────────────
router.get('/alerts',      authorize('reg_review', 'read'), ctrl.getAlerts);

// ── Documents ────────────────────────────────────────────────────
router.get('/documents',   authorize('reg_review', 'read'), ctrl.getDocuments);

// ── Write actions (scoped by assertOrgAccess inside each handler) ─
router.post('/reports/:id/approve',  authorize('reg_review',   'approve'),    ctrl.approveReport);
router.post('/reports/:id/request-correction', authorize('reg_review', 'approve'), ctrl.requestCorrection);
router.post('/reports/:id/certify',  authorize('certificate',  'issue'),      ctrl.issueCertificate);
router.post('/notices',              authorize('notice',        'issue'),      ctrl.issueNotice);
router.post('/inspections',          authorize('notice',        'issue'),      ctrl.scheduleInspection);

module.exports = router;
