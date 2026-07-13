'use strict';

/**
 * Image Engine Controller — Phase 12
 */

const { analyzeEvidence, updateQualityScore } = require('../services/image.engine.service');
const eiaService  = require('../services/eia.service');
const { success } = require('../utils/response');

exports.analyzeEvidence = async (req, res) => {
  const { orgId }   = req.params;
  const year        = req.query.year      || new Date().getFullYear();
  const projectId   = req.query.projectId || null;

  eiaService.assertOrgAccess(req.user, orgId, true);
  const result = await analyzeEvidence(orgId, Number(year), projectId);
  return success(res, result, 'Evidence analysis complete');
};

exports.updateQuality = async (req, res) => {
  const { orgId, evidenceId } = req.params;
  const { qualityScore }      = req.body;

  eiaService.assertOrgAccess(req.user, orgId, true);
  await updateQualityScore(orgId, evidenceId, Number(qualityScore));
  return success(res, {}, 'Quality score updated');
};
