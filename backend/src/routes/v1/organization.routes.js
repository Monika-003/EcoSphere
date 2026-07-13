'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/organization.controller');
const { authenticate }     = require('../../middleware/auth');
const { authorize }        = require('../../middleware/rbac');
const { documentUploader } = require('../../middleware/upload');

router.use(authenticate);

router.post('/',               authorize('organization', 'create'), ctrl.createOrganization);
router.get ('/me',             authorize('organization', 'read'),   ctrl.getOrganization);
router.get ('/team',           authorize('organization', 'read'),   ctrl.getTeamMembers);
router.get ('/:id',            authorize('organization', 'read'),   ctrl.getOrganization);
router.put ('/:id',            authorize('organization', 'update'), ctrl.updateOrganization);
router.post('/:id/documents',  authorize('organization', 'update'), documentUploader.single('file'), ctrl.uploadDocument);

module.exports = router;
