'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/certificates.controller');
const { authenticate }  = require('../../middleware/auth');
const { authorize }     = require('../../middleware/rbac');
const { optionalAuth }  = require('../../middleware/auth');

/* Public verify endpoint (no auth required) */
router.get('/verify/:hash', optionalAuth, ctrl.verifyCertificate);

/* Protected routes */
router.use(authenticate);

router.get ('/',          authorize('certificate', 'read'),   ctrl.getCertificates);
router.get ('/:id',       authorize('certificate', 'read'),   ctrl.getCertificate);
router.get ('/:id/pdf',   authorize('certificate', 'read'),   ctrl.downloadCertificate);
router.post('/:id/revoke', authorize('certificate', 'revoke'), ctrl.revokeCertificate);

module.exports = router;
