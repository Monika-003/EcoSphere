'use strict';

/**
 * Image Engine Routes — Phase 12
 * GET  /api/v1/images/:orgId/analyze?year=YYYY&projectId=<optional>
 * PATCH /api/v1/images/:orgId/evidence/:evidenceId/quality
 */

const router  = require('express').Router({ mergeParams: true });
const ctrl    = require('../../controllers/image.engine.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize }    = require('../../middleware/rbac');
const { validate }     = require('../../middleware/validate');
const Joi              = require('joi');

const qualitySchema = Joi.object({ qualityScore: Joi.number().integer().min(0).max(100).required() });

router.get(
  '/:orgId/analyze',
  authenticate,
  authorize('esg', 'read'),
  ctrl.analyzeEvidence
);

router.patch(
  '/:orgId/evidence/:evidenceId/quality',
  authenticate,
  authorize('esg', 'write'),
  validate(qualitySchema, 'body', { allowUnknown: false, stripUnknown: true }),
  ctrl.updateQuality
);

module.exports = router;
