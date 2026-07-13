'use strict';

/**
 * Master API Router — EcoSphere v1
 * Mounts all sub-routers under /api/v1
 */

const router = require('express').Router();

/* ── Sub-routers ── */
const authRoutes          = require('./v1/auth.routes');
const monitoringRoutes    = require('./v1/monitoring.routes');
const reportsRoutes       = require('./v1/reports.routes');
const laboratoryRoutes    = require('./v1/laboratory.routes');
const regulatoryRoutes    = require('./v1/regulatory.routes');
const organizationRoutes      = require('./v1/organization.routes');
const regulatoryAccessRoutes  = require('./v1/regulatory-access.routes');
const notificationsRoutes = require('./v1/notifications.routes');
const certificatesRoutes  = require('./v1/certificates.routes');
const adminRoutes         = require('./v1/admin.routes');
const ecobotRoutes        = require('./v1/ecobot.routes');
const billingRoutes       = require('./v1/billing.routes');
const iotRoutes           = require('./v1/iot.routes');
const esgRoutes           = require('./v1/esg.routes');
const eiaRoutes           = require('./v1/eia.routes');
const insightRoutes       = require('./v1/insight.routes');
const imageRoutes         = require('./v1/image.routes');

/* ── Mount routes ── */
router.use('/auth',          authRoutes);
router.use('/monitoring',    monitoringRoutes);
router.use('/reports',       reportsRoutes);
router.use('/laboratory',    laboratoryRoutes);
router.use('/regulatory',    regulatoryRoutes);
router.use('/organizations', organizationRoutes);
// Org-side regulatory access management (nested under organizations)
router.use('/organizations/:orgId/regulatory-access', regulatoryAccessRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/certificates',  certificatesRoutes);
router.use('/admin',         adminRoutes);
router.use('/ecobot',        ecobotRoutes);
router.use('/billing',       billingRoutes);
router.use('/iot',           iotRoutes);
router.use('/esg',           esgRoutes);
router.use('/eia',           eiaRoutes);
router.use('/insights',      insightRoutes);
router.use('/images',        imageRoutes);

/* ── API info ── */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EcoSphere API v1',
    version: '1.0.0',
    endpoints: [
      '/auth', '/monitoring', '/reports', '/laboratory',
      '/regulatory', '/organizations', '/notifications',
      '/certificates', '/admin', '/ecobot', '/billing', '/iot', '/esg', '/eia', '/insights', '/images'
    ]
  });
});

module.exports = router;
