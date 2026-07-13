'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/monitoring.controller');
const { authenticate }       = require('../../middleware/auth');
const { authorize }          = require('../../middleware/rbac');
const { uploadLimiter }      = require('../../middleware/rateLimiter');
const { dataUploader }       = require('../../middleware/upload');
const { validate }           = require('../../middleware/validate');
const {
  createStationSchema,
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema
} = require('../../validations/monitoring.validation');

router.use(authenticate);

/* ── Stations ── */
router.get ('/stations',     authorize('monitoring', 'read'),   ctrl.getStations);
router.post('/stations',     authorize('monitoring', 'create'), validate(createStationSchema), ctrl.createStation);

/* ── Records — specific routes BEFORE parameterised /:id ── */
router.get ('/records/dashboard',     authorize('monitoring', 'read'),   ctrl.getDashboard);
router.get ('/records/:id/pdf',       authorize('monitoring', 'read'),   ctrl.downloadRecordPdf);

router.get ('/records',               authorize('monitoring', 'read'),   validate(listRecordsQuerySchema, 'query'), ctrl.getRecords);
router.get ('/records/:id',           authorize('monitoring', 'read'),   ctrl.getRecord);
router.post('/records',               authorize('monitoring', 'create'), validate(createRecordSchema),               ctrl.createRecord);
router.put ('/records/:id',           authorize('monitoring', 'update'), validate(updateRecordSchema),               ctrl.updateRecord);
router.delete('/records/:id',         authorize('monitoring', 'delete'), ctrl.deleteRecord);

/* ── IoT & Bulk import ── */
router.post('/iot-sync',    authorize('iot', 'manage'),  ctrl.iotSync);
router.post('/bulk-import', uploadLimiter, authorize('monitoring', 'create'), dataUploader.single('file'), ctrl.bulkImport);

module.exports = router;
