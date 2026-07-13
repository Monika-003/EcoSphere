'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/admin.controller');
const { authenticate }    = require('../../middleware/auth');
const { requireSuperAdmin } = require('../../middleware/rbac');

router.use(authenticate, requireSuperAdmin);

/* Dashboard */
router.get ('/dashboard',           ctrl.getDashboard);

/* Users */
router.get ('/users',               ctrl.getUsers);
router.get ('/users/:id',           ctrl.getUser);
router.put ('/users/:id',           ctrl.updateUser);
router.post('/users/:id/deactivate', ctrl.deactivateUser);

/* Organizations */
router.get ('/organizations',         ctrl.getOrganizations);
router.post('/organizations/:id/verify', ctrl.verifyOrganization);

/* Labs */
router.get ('/laboratories',          ctrl.getLaboratories);

/* Config */
router.get ('/config',               ctrl.getSystemConfig);
router.put ('/config',               ctrl.updateSystemConfig);

/* Audit logs */
router.get ('/audit-logs',           ctrl.getAuditLogs);

/* Broadcast */
router.post('/broadcast',            ctrl.broadcastMessage);

module.exports = router;
