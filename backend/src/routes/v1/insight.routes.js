'use strict';

/**
 * AI Insight Routes — Phase 11
 * GET /api/v1/insights/:orgId?year=YYYY&projectId=<optional>
 */

const router     = require('express').Router({ mergeParams: true });
const ctrl       = require('../../controllers/ai.insight.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize }    = require('../../middleware/rbac');

router.get(
  '/:orgId',
  authenticate,
  authorize('esg', 'read'),
  ctrl.getInsights
);

module.exports = router;
