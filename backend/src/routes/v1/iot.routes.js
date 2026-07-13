'use strict';

/**
 * IoT Routes
 * External device endpoints — use a separate API key auth in production.
 * Currently reuses the standard JWT authenticate middleware.
 */

const router = require('express').Router();
const { authenticate }    = require('../../middleware/auth');
const { authorize }       = require('../../middleware/rbac');
const monCtrl             = require('../../controllers/monitoring.controller');

router.use(authenticate);

/* Device data push */
router.post('/sync',   authorize('iot', 'manage'), monCtrl.iotSync);

/* Real-time station status */
router.get ('/stations', authorize('monitoring', 'read'), monCtrl.getStations);

module.exports = router;
