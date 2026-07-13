'use strict';

/**
 * AI Insight Controller — Phase 11
 * Thin HTTP handler; all computation lives in ai.insight.service.
 */

const { computeInsights } = require('../services/ai.insight.service');
const eiaService           = require('../services/eia.service');
const { success }          = require('../utils/response');

exports.getInsights = async (req, res) => {
  const { orgId }    = req.params;
  const year         = req.query.year      || new Date().getFullYear();
  const projectId    = req.query.projectId || null;

  eiaService.assertOrgAccess(req.user, orgId, true);

  const insights = await computeInsights(orgId, Number(year), projectId);
  return success(res, { insights }, 'AI insights generated');
};
