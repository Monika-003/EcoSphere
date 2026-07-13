'use strict';

/**
 * regulatory-access.routes.js
 *
 * Organization-side management of regulatory access grants.
 * All routes require authentication.
 * Org admin / ORG_ENGINEER can manage grants for their own org.
 * SUPER_ADMIN can manage any org's grants.
 *
 * Mounted at: /api/v1/organizations/:orgId/regulatory-access
 */

const router = require('express').Router({ mergeParams: true });
const ctrl   = require('../../controllers/regulatory-access.controller');
const { authenticate }  = require('../../middleware/auth');
const { authorize }     = require('../../middleware/rbac');

router.use(authenticate);

// List available regulatory users (search)
router.get('/users',
  authorize('regulatory_access', 'read'),
  ctrl.listRegulatoryUsers
);

// List current access grants for this org
router.get('/',
  authorize('regulatory_access', 'read'),
  ctrl.listAccess
);

// Grant access to a regulatory user
router.post('/',
  authorize('regulatory_access', 'create'),
  ctrl.grantAccess
);

// Activate or deactivate an existing grant
router.patch('/:accessId',
  authorize('regulatory_access', 'update'),
  ctrl.updateAccess
);

// Revoke (delete) a grant
router.delete('/:accessId',
  authorize('regulatory_access', 'delete'),
  ctrl.revokeAccess
);

module.exports = router;
