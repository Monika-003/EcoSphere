'use strict';

/**
 * EIA Analytics Controller — Phase 9
 * Thin HTTP handler; all calculation logic lives in eia.analytics.service.
 */

const { computeAnalytics } = require('../services/eia.analytics.service');
const eiaService            = require('../services/eia.service');
const { success }           = require('../utils/response');

exports.getAnalytics = async (req, res) => {
  const { orgId, projectId } = req.params;
  eiaService.assertOrgAccess(req.user, orgId, true);
  const analytics = await computeAnalytics(projectId);
  return success(res, { analytics }, 'EIA analytics computed');
};
