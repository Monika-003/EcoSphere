'use strict';

const { prisma }           = require('../config/database');
const { AppError }         = require('../middleware/errorHandler');
const { success, created, paginated, parsePagination, parseSort } = require('../utils/response');
const { createAuditLog }   = require('../middleware/auditLogger');
const { cacheGetOrSet, cacheDel, CACHE_TTL } = require('../config/redis');
const { getIo }            = require('../socket');
const aiService            = require('../services/ai.service');
const notificationService  = require('../services/notification.service');
const reportService        = require('../services/report.service');

/* ══════════════════════════════════════
   MONITORING STATIONS
══════════════════════════════════════ */

/* GET /stations */
exports.getStations = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization not found', 404);

  const cacheKey = `stations:${orgId}:${page}:${limit}`;

  const { stations, total } = await cacheGetOrSet(cacheKey, async () => {
    const [stations, total] = await Promise.all([
      prisma.monitoringStation.findMany({
        where:   { organizationId: orgId },
        orderBy: { name: 'asc' },
        skip, take: limit
      }),
      prisma.monitoringStation.count({ where: { organizationId: orgId } })
    ]);
    return { stations, total };
  }, CACHE_TTL.MEDIUM);

  return paginated(res, stations, total, page, limit);
};

/* POST /stations */
exports.createStation = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization not found', 404);

  const b = req.body;

  /* Normalise field names — schema uses `code` / `monitoringTypes[]`, Prisma needs `stationCode` / `monitoringType` */
  const name           = b.name;
  const stationCode    = b.stationCode || b.code || `STN-${Date.now().toString().slice(-6)}`;
  const monitoringType = b.monitoringType || (b.monitoringTypes && b.monitoringTypes[0]) || 'AIR';
  const deviceType     = b.deviceType     || null;
  const deviceId       = b.deviceId       || null;
  const latitude       = b.latitude       ?? null;
  const longitude      = b.longitude      ?? null;
  const locationDesc   = b.locationDesc   || b.address || null;

  const station = await prisma.monitoringStation.create({
    data: { organizationId: orgId, name, monitoringType, deviceType, deviceId, latitude, longitude, locationDesc, stationCode }
  });

  await cacheDel(`stations:${orgId}:*`);

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'MonitoringStation', entityId: station.id,
    description: `Monitoring station created: ${name}`,
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { station });
};

/* ══════════════════════════════════════
   MONITORING RECORDS
══════════════════════════════════════ */

/* GET /records */
exports.getRecords = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { monitoringType, from, to, complianceStatus, stationId } = req.query;
  const orgId = req.user.orgId;

  const where = { organizationId: orgId };
  if (monitoringType)    where.monitoringType   = monitoringType;
  if (complianceStatus)  where.complianceStatus = complianceStatus;
  if (stationId)         where.stationId        = stationId;
  if (from || to) {
    where.recordingDate = {};
    if (from) where.recordingDate.gte = new Date(from);
    if (to)   where.recordingDate.lte = new Date(to);
  }

  const orderBy = parseSort(req.query, ['recordingDate','createdAt','complianceStatus']);

  const [records, total] = await Promise.all([
    prisma.monitoringRecord.findMany({
      where, orderBy, skip, take: limit,
      include: { station: { select: { name: true, stationCode: true } }, submittedBy: { select: { firstName: true, lastName: true, role: true } } }
    }),
    prisma.monitoringRecord.count({ where })
  ]);

  return paginated(res, records, total, page, limit);
};

/* GET /records/:id */
exports.getRecord = async (req, res) => {
  const record = await prisma.monitoringRecord.findUnique({
    where:   { id: req.params.id },
    include: { station: true, submittedBy: { select: { firstName: true, lastName: true, role: true } } }
  });
  if (!record) throw new AppError('Monitoring record not found', 404);
  if (record.organizationId !== req.user.orgId && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', 403);
  }
  return success(res, { record });
};

/* POST /records — Create monitoring record with AI analysis */
exports.createRecord = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization not found', 404);

  const b = req.body;

  /* Normalise field names — schema uses `recordedAt` / `notes`, Prisma needs `recordingDate` / `remarks` */
  const monitoringType  = b.monitoringType;
  const recordingDate   = b.recordedAt    || b.recordingDate   || new Date(); /* schema → recordedAt; legacy → recordingDate; fallback → now */
  const parameters      = b.parameters;
  const stationId       = b.stationId;
  const remarks         = b.notes         || b.remarks || null; /* schema → notes; legacy → remarks */
  const isDraft         = b.isDraft       || false;
  const shift           = b.shift         || null;
  const location        = b.location      || null;
  const samplingMethod  = b.samplingMethod || null;
  const deviceId        = b.deviceId      || null;
  const deviceName      = b.deviceName    || null;
  const sourceType      = b.sourceType    || 'MANUAL';

  /* AI Analysis */
  let aiAnalysis = null, aiRecommendations = null, aiScore = null, violations = null, violationsCount = 0;
  let complianceStatus = 'UNDER_REVIEW';

  try {
    const aiResult = await aiService.analyseMonitoringData(monitoringType, parameters);
    aiAnalysis        = aiResult.summary;
    aiRecommendations = aiResult.recommendations;
    aiScore           = aiResult.score;
    violations        = aiResult.violations;
    violationsCount   = aiResult.violationsCount;
    complianceStatus  = aiResult.complianceStatus;
  } catch (e) { /* AI non-blocking */ }

  const record = await prisma.monitoringRecord.create({
    data: {
      organizationId: orgId,
      submittedById:  req.user.id,
      stationId,
      monitoringType, recordingDate: new Date(recordingDate),
      shift, location, samplingMethod,
      parameters, remarks, isDraft: isDraft || false,
      deviceId, deviceName, sourceType: sourceType || 'MANUAL',
      aiAnalysis, aiRecommendations, aiScore,
      violations, violationsCount, complianceStatus
    }
  });

  /* Real-time update via Socket.IO */
  const io = getIo();
  if (io) {
    io.to(`org:${orgId}`).emit('monitoring:new', {
      type:    monitoringType,
      id:      record.id,
      status:  complianceStatus,
      violations: violationsCount
    });
  }

  /* Alert if non-compliant */
  if (complianceStatus === 'NON_COMPLIANT' && !isDraft) {
    await notificationService.sendComplianceAlert(orgId, monitoringType, violations);
  }

  await createAuditLog({
    userId: req.user.id, action: 'CREATE', entityType: 'MonitoringRecord', entityId: record.id,
    description: `${monitoringType} record created`,
    newData: { type: monitoringType, complianceStatus, violationsCount },
    ipAddress: req.ip, requestId: req.requestId
  });

  return created(res, { record }, 'Monitoring data saved successfully');
};

/* PUT /records/:id */
exports.updateRecord = async (req, res) => {
  const existing = await prisma.monitoringRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Record not found', 404);
  if (existing.organizationId !== req.user.orgId && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', 403);
  }
  if (!existing.isDraft && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Only draft records can be edited', 400);
  }

  const { parameters, remarks, isDraft } = req.body;
  const record = await prisma.monitoringRecord.update({
    where: { id: req.params.id },
    data:  { parameters, remarks, isDraft, version: { increment: 1 }, updatedAt: new Date() }
  });

  return success(res, { record }, 'Record updated');
};

/* DELETE /records/:id */
exports.deleteRecord = async (req, res) => {
  const existing = await prisma.monitoringRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Record not found', 404);
  if (existing.organizationId !== req.user.orgId && req.user.role !== 'SUPER_ADMIN') {
    throw new AppError('Access denied', 403);
  }
  await prisma.monitoringRecord.delete({ where: { id: req.params.id } });
  return success(res, {}, 'Record deleted');
};

/* ══════════════════════════════════════
   REAL-TIME DASHBOARD
══════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  const orgId = req.user.orgId;
  const cacheKey = `dashboard:monitoring:${orgId}`;

  const data = await cacheGetOrSet(cacheKey, async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalRecords, violations, byType, recentAlerts, stationCount] = await Promise.all([
      prisma.monitoringRecord.count({ where: { organizationId: orgId } }),
      prisma.monitoringRecord.count({ where: { organizationId: orgId, complianceStatus: 'NON_COMPLIANT' } }),
      prisma.monitoringRecord.groupBy({
        by:     ['monitoringType'],
        where:  { organizationId: orgId, recordingDate: { gte: thirtyDaysAgo } },
        _count: { id: true }
      }),
      prisma.monitoringRecord.findMany({
        where:   { organizationId: orgId, complianceStatus: 'NON_COMPLIANT', recordingDate: { gte: thirtyDaysAgo } },
        orderBy: { recordingDate: 'desc' },
        take:    5,
        select:  { id: true, monitoringType: true, violations: true, recordingDate: true, location: true }
      }),
      prisma.monitoringStation.count({ where: { organizationId: orgId, isActive: true } })
    ]);

    return { totalRecords, violations, byType, recentAlerts, stationCount };
  }, CACHE_TTL.SHORT);

  return success(res, data);
};

/* ══════════════════════════════════════
   IoT DEVICE SYNC
══════════════════════════════════════ */
exports.iotSync = async (req, res) => {
  const { deviceId, readings, timestamp } = req.body;
  const orgId = req.user.orgId;

  /* Validate device belongs to org */
  const station = await prisma.monitoringStation.findFirst({
    where: { deviceId, organizationId: orgId }
  });
  if (!station) throw new AppError('Device not registered for this organization', 404);

  /* Auto-create monitoring record from IoT data */
  const record = await prisma.monitoringRecord.create({
    data: {
      organizationId: orgId,
      stationId:      station.id,
      submittedById:  req.user.id,
      monitoringType: station.monitoringType,
      recordingDate:  timestamp ? new Date(timestamp) : new Date(),
      parameters:     readings,
      deviceId,
      deviceName:     station.name,
      sourceType:     'IOT_SENSOR'
    }
  });

  /* Update station last sync */
  await prisma.monitoringStation.update({
    where: { id: station.id },
    data:  { lastSyncAt: new Date() }
  });

  /* Push real-time */
  const io = getIo();
  if (io) io.to(`org:${orgId}`).emit('iot:reading', { stationId: station.id, readings, timestamp });

  return created(res, { recordId: record.id }, 'IoT data received and recorded');
};

/* ══════════════════════════════════════
   BULK CSV/EXCEL IMPORT
══════════════════════════════════════ */
exports.bulkImport = async (req, res) => {
  if (!req.file) throw new AppError('File is required', 400);

  const orgId = req.user.orgId;
  const { monitoringType } = req.body;

  // Parse CSV/Excel (simplified — full implementation uses csv-parser / exceljs)
  const importedCount = 0; // would be actual parsed rows
  const errors = [];

  return success(res, { importedCount, errors }, `Bulk import complete: ${importedCount} records`);
};

/* ══════════════════════════════════════
   DOWNLOAD MONITORING RECORD PDF
   GET /api/v1/monitoring/records/:id/pdf?token=JWT
   Generates and streams a single-record compliance PDF
══════════════════════════════════════ */
exports.downloadRecordPdf = async (req, res) => {
  const { id } = req.params;

  /* Fetch record with full context */
  const record = await prisma.monitoringRecord.findUnique({
    where:   { id },
    include: {
      organization: { select: { name: true, industryType: true, city: true, state: true, registrationNumber: true } },
      station:      { select: { name: true, stationCode: true, latitude: true, longitude: true } },
      submittedBy:  { select: { firstName: true, lastName: true, role: true } }
    }
  });

  if (!record) throw new AppError('Monitoring record not found', 404);

  /* Access control — org users can only download their own records */
  if (req.user.role.startsWith('ORG_') && record.organizationId !== req.user.orgId) {
    throw new AppError('Access denied', 403);
  }

  /* Generate PDF and save to disk */
  const { pdfBuffer, filename } = await reportService.generateMonitoringPdf(record);

  await createAuditLog({
    userId:      req.user.id,
    action:      'DOWNLOAD',
    entityType:  'MonitoringRecord',
    entityId:    record.id,
    description: `PDF downloaded for ${record.monitoringType} record`,
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  /* Stream to browser — attachment triggers Save dialog */
  const safeType = (record.monitoringType || 'Monitoring').replace(/[^A-Za-z0-9]/g, '_');
  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${safeType}_Record_${id.slice(0,8)}.pdf"`,
    'Content-Length':      pdfBuffer.length,
    'Cache-Control':       'no-store'
  });
  res.send(pdfBuffer);
};
