'use strict';

/**
 * EIA Module — Service Layer
 * Phase 7 | All business logic, DB access, S3 evidence management
 */

const { PrismaClient } = require('@prisma/client');
const { AppError }     = require('../middleware/errorHandler');
const { getSignedUrl, deleteFromS3 } = require('../middleware/upload');

const prisma = new PrismaClient();

/* ── Roles that may read across any org ────────────────────── */
const CROSS_ORG_READ_ROLES = new Set([
  'SUPER_ADMIN', 'REG_OFFICER', 'REG_INSPECTOR',
  'REG_REGIONAL_OFFICER', 'REG_GOVERNMENT_AUTHORITY',
  'AUDITOR', 'CONSULTANT'
]);

/* ── Helpers ───────────────────────────────────────────────── */

/**
 * Enforce org isolation.
 * @param {object} user        - req.user from authenticate middleware
 * @param {string} organizationId - target org from route param
 * @param {boolean} readOnly   - true = cross-org roles allowed; false = must own the org
 */
function assertOrgAccess(user, organizationId, readOnly = false) {
  if (user.role === 'SUPER_ADMIN') return;
  if (readOnly && CROSS_ORG_READ_ROLES.has(user.role)) return;
  if (user.organizationId !== organizationId) {
    throw new AppError('Access denied to this organisation', 403, 'ORG_ACCESS_DENIED');
  }
}

function paginate(page = 1, limit = 20) {
  const take = Math.min(parseInt(limit) || 20, 100);
  const skip = ((parseInt(page) || 1) - 1) * take;
  return { take, skip };
}

function toPage(items, total, page, limit) {
  return { items, total, page: parseInt(page) || 1, limit: parseInt(limit) || 20 };
}

/* ═══════════════════════════════════════════════════════════════
   PROJECTS
═══════════════════════════════════════════════════════════════ */

async function listProjects(organizationId, { status, reportingYear, state, page, limit } = {}) {
  const where = {
    organizationId,
    ...(status        && { status }),
    ...(reportingYear && { reportingYear }),
    ...(state         && { state })
  };
  const { take, skip } = paginate(page, limit);
  const [items, total] = await Promise.all([
    prisma.eiaProject.findMany({
      where, take, skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, projectName: true, projectNumber: true, projectType: true,
        projectCategory: true, status: true, industry: true, state: true,
        district: true, reportingYear: true, ecGranted: true, ecNumber: true,
        studyPeriodFrom: true, studyPeriodTo: true, createdAt: true,
        _count: { select: { airMonitoring: true, waterMonitoring: true, soilMonitoring: true, noiseMonitoring: true, impactAssessments: true, mitigationMeasures: true } }
      }
    }),
    prisma.eiaProject.count({ where })
  ]);
  return toPage(items, total, page, limit);
}

async function getProjectById(projectId, organizationId) {
  const project = await prisma.eiaProject.findFirst({
    where: { id: projectId, organizationId }
  });
  if (!project) throw new AppError('EIA project not found', 404, 'EIA_PROJECT_NOT_FOUND');
  return project;
}

async function createProject(organizationId, data, userId) {
  return prisma.eiaProject.create({
    data: { ...data, organizationId, createdBy: userId }
  });
}

async function updateProject(projectId, organizationId, data) {
  await getProjectById(projectId, organizationId);
  return prisma.eiaProject.update({
    where: { id: projectId },
    data:  { ...data, updatedAt: new Date() }
  });
}

async function deleteProject(projectId, organizationId) {
  await getProjectById(projectId, organizationId);
  await prisma.eiaProject.delete({ where: { id: projectId } });
  return { deleted: true };
}

/* ═══════════════════════════════════════════════════════════════
   GENERIC MONITORING CRUD FACTORY
   Used by Air, Water, Soil, Noise modules
═══════════════════════════════════════════════════════════════ */

function monitoringService(model, notFoundCode) {
  async function assertProject(projectId, organizationId) {
    const project = await prisma.eiaProject.findFirst({ where: { id: projectId, organizationId }, select: { id: true } });
    if (!project) throw new AppError('EIA project not found', 404, 'EIA_PROJECT_NOT_FOUND');
  }

  async function list(projectId, organizationId, filters = {}) {
    await assertProject(projectId, organizationId);
    const { from, to, exceedanceOnly, page, limit, ...rest } = filters;
    const where = {
      projectId,
      ...(from           && { monitoringDate: { gte: new Date(from) } }),
      ...(to             && { monitoringDate: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } }),
      ...(exceedanceOnly && { anyExceedance: true }),
      ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))
    };
    const { take, skip } = paginate(page, limit);
    const [items, total] = await Promise.all([
      prisma[model].findMany({ where, take, skip, orderBy: { monitoringDate: 'desc' } }),
      prisma[model].count({ where })
    ]);
    return toPage(items, total, page, limit);
  }

  async function create(projectId, organizationId, data) {
    await assertProject(projectId, organizationId);
    /* Auto-compute exceedance flags where standards are provided */
    const processed = computeExceedance(model, data);
    return prisma[model].create({ data: { ...processed, projectId } });
  }

  async function getById(id, projectId, organizationId) {
    await assertProject(projectId, organizationId);
    const record = await prisma[model].findFirst({ where: { id, projectId } });
    if (!record) throw new AppError('Record not found', 404, notFoundCode);
    return record;
  }

  async function update(id, projectId, organizationId, data) {
    await getById(id, projectId, organizationId);
    const processed = computeExceedance(model, data);
    return prisma[model].update({ where: { id }, data: { ...processed, updatedAt: new Date() } });
  }

  async function remove(id, projectId, organizationId) {
    await getById(id, projectId, organizationId);
    await prisma[model].delete({ where: { id } });
    return { deleted: true };
  }

  return { list, create, getById, update, remove };
}

/* ── Exceedance auto-computation ──────────────────────────── */
function computeExceedance(model, data) {
  if (model === 'eiaAirMonitoring') {
    const d = { ...data };
    if (d.pm25 !== undefined && d.pm25Std)  d.pm25Exceedance = parseFloat(d.pm25) > parseFloat(d.pm25Std);
    if (d.pm10 !== undefined && d.pm10Std)  d.pm10Exceedance = parseFloat(d.pm10) > parseFloat(d.pm10Std);
    if (d.so2  !== undefined && d.so2Std)   d.so2Exceedance  = parseFloat(d.so2)  > parseFloat(d.so2Std);
    if (d.nox  !== undefined && d.noxStd)   d.noxExceedance  = parseFloat(d.nox)  > parseFloat(d.noxStd);
    d.anyExceedance = !!(d.pm25Exceedance || d.pm10Exceedance || d.so2Exceedance || d.noxExceedance);
    return d;
  }
  if (model === 'eiaNoiseMonitoring') {
    const d = { ...data };
    if (d.dayAvgDb   !== undefined && d.daytimeStd)   d.dayExceedance   = parseFloat(d.dayAvgDb)   > parseFloat(d.daytimeStd);
    if (d.nightAvgDb !== undefined && d.nighttimeStd) d.nightExceedance = parseFloat(d.nightAvgDb) > parseFloat(d.nighttimeStd);
    d.anyExceedance = !!(d.dayExceedance || d.nightExceedance);
    return d;
  }
  return data;
}

/* ── Instantiate monitoring services ─────────────────────── */
const airService   = monitoringService('eiaAirMonitoring',   'AIR_RECORD_NOT_FOUND');
const waterService = monitoringService('eiaWaterMonitoring', 'WATER_RECORD_NOT_FOUND');
const soilService  = monitoringService('eiaSoilMonitoring',  'SOIL_RECORD_NOT_FOUND');
const noiseService = monitoringService('eiaNoiseMonitoring', 'NOISE_RECORD_NOT_FOUND');

/* ═══════════════════════════════════════════════════════════════
   IMPACT ASSESSMENT
═══════════════════════════════════════════════════════════════ */

async function listImpacts(projectId, organizationId, filters = {}) {
  await getProjectById(projectId, organizationId);
  const { component, impactType, significance, page, limit } = filters;
  const where = {
    projectId,
    ...(component   && { component }),
    ...(impactType  && { impactType }),
    ...(significance && { significance })
  };
  const { take, skip } = paginate(page, limit);
  const [items, total] = await Promise.all([
    prisma.eiaImpactAssessment.findMany({ where, take, skip, orderBy: { createdAt: 'desc' }, include: { mitigations: { select: { id: true, measureTitle: true, status: true } } } }),
    prisma.eiaImpactAssessment.count({ where })
  ]);
  return toPage(items, total, page, limit);
}

async function createImpact(projectId, organizationId, data) {
  await getProjectById(projectId, organizationId);
  const score = (data.magnitude && data.sensitivity) ? data.magnitude * data.sensitivity : undefined;
  return prisma.eiaImpactAssessment.create({
    data: { ...data, projectId, ...(score !== undefined && { significance_score: score }) }
  });
}

async function getImpactById(id, projectId, organizationId) {
  await getProjectById(projectId, organizationId);
  const record = await prisma.eiaImpactAssessment.findFirst({
    where: { id, projectId },
    include: { mitigations: true }
  });
  if (!record) throw new AppError('Impact assessment not found', 404, 'IMPACT_NOT_FOUND');
  return record;
}

async function updateImpact(id, projectId, organizationId, data) {
  await getImpactById(id, projectId, organizationId);
  const score = (data.magnitude && data.sensitivity) ? data.magnitude * data.sensitivity : undefined;
  return prisma.eiaImpactAssessment.update({
    where: { id },
    data:  { ...data, ...(score !== undefined && { significance_score: score }), updatedAt: new Date() }
  });
}

async function deleteImpact(id, projectId, organizationId) {
  await getImpactById(id, projectId, organizationId);
  await prisma.eiaImpactAssessment.delete({ where: { id } });
  return { deleted: true };
}

/* ═══════════════════════════════════════════════════════════════
   MITIGATION MEASURES
═══════════════════════════════════════════════════════════════ */

async function listMitigations(projectId, organizationId, filters = {}) {
  await getProjectById(projectId, organizationId);
  const { component, status, impactId, page, limit } = filters;
  const where = {
    projectId,
    ...(component && { component }),
    ...(status    && { status }),
    ...(impactId  && { impactId })
  };
  const { take, skip } = paginate(page, limit);
  const [items, total] = await Promise.all([
    prisma.eiaMitigationMeasure.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
    prisma.eiaMitigationMeasure.count({ where })
  ]);
  return toPage(items, total, page, limit);
}

async function createMitigation(projectId, organizationId, data) {
  await getProjectById(projectId, organizationId);
  if (data.impactId) {
    const impact = await prisma.eiaImpactAssessment.findFirst({ where: { id: data.impactId, projectId } });
    if (!impact) throw new AppError('Impact assessment not found for this project', 404, 'IMPACT_NOT_FOUND');
  }
  return prisma.eiaMitigationMeasure.create({ data: { ...data, projectId } });
}

async function getMitigationById(id, projectId, organizationId) {
  await getProjectById(projectId, organizationId);
  const record = await prisma.eiaMitigationMeasure.findFirst({ where: { id, projectId } });
  if (!record) throw new AppError('Mitigation measure not found', 404, 'MITIGATION_NOT_FOUND');
  return record;
}

async function updateMitigation(id, projectId, organizationId, data) {
  await getMitigationById(id, projectId, organizationId);
  return prisma.eiaMitigationMeasure.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
}

async function deleteMitigation(id, projectId, organizationId) {
  await getMitigationById(id, projectId, organizationId);
  await prisma.eiaMitigationMeasure.delete({ where: { id } });
  return { deleted: true };
}

/* ═══════════════════════════════════════════════════════════════
   MONITORING PROGRAM  (upsert — one per project)
═══════════════════════════════════════════════════════════════ */

async function getMonitoringProgram(projectId, organizationId) {
  await getProjectById(projectId, organizationId);
  return prisma.eiaMonitoringProgram.findUnique({ where: { projectId } });
}

async function upsertMonitoringProgram(projectId, organizationId, data) {
  await getProjectById(projectId, organizationId);
  return prisma.eiaMonitoringProgram.upsert({
    where:  { projectId },
    create: { ...data, projectId },
    update: { ...data, updatedAt: new Date() }
  });
}

/* ═══════════════════════════════════════════════════════════════
   EVIDENCE MANAGEMENT
═══════════════════════════════════════════════════════════════ */

async function createEvidence(projectId, organizationId, file, meta, userId) {
  await getProjectById(projectId, organizationId);

  const s3Key    = file.key    || file.path || `eia-evidence/${projectId}/${file.filename}`;
  const s3Bucket = file.bucket || process.env.AWS_S3_BUCKET || 'ecosphere';

  return prisma.eiaEvidence.create({
    data: {
      projectId,
      module:         meta.module,
      documentType:   meta.documentType || null,
      originalName:   file.originalname,
      fileName:       file.filename     || file.key?.split('/').pop() || file.originalname,
      mimeType:       file.mimetype,
      fileSize:       file.size         || null,
      s3Key,
      s3Bucket,
      description:    meta.description  || null,
      tags:           meta.tags         || null,
      monitoringDate: meta.monitoringDate ? new Date(meta.monitoringDate) : null,
      uploadedBy:     userId
    }
  });
}

async function listEvidence(projectId, organizationId, { module, docType, page, limit } = {}) {
  await getProjectById(projectId, organizationId);
  const where = {
    projectId,
    ...(module  && { module }),
    ...(docType && { documentType: docType })
  };
  const { take, skip } = paginate(page, limit);
  const [items, total] = await Promise.all([
    prisma.eiaEvidence.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
    prisma.eiaEvidence.count({ where })
  ]);
  return toPage(items, total, page, limit);
}

async function getEvidenceById(evidenceId, projectId, organizationId) {
  await getProjectById(projectId, organizationId);
  const record = await prisma.eiaEvidence.findFirst({ where: { id: evidenceId, projectId } });
  if (!record) throw new AppError('Evidence not found', 404, 'EVIDENCE_NOT_FOUND');
  return record;
}

async function getEvidenceSignedUrl(evidenceId, projectId, organizationId) {
  const record = await getEvidenceById(evidenceId, projectId, organizationId);
  const signedUrl = await getSignedUrl(record.s3Key, 3600);
  return { ...record, signedUrl, expiresIn: 3600 };
}

async function deleteEvidence(evidenceId, projectId, organizationId) {
  const record = await getEvidenceById(evidenceId, projectId, organizationId);
  try { await deleteFromS3(record.s3Key); } catch { /* non-blocking */ }
  await prisma.eiaEvidence.delete({ where: { id: evidenceId } });
  return { deleted: true };
}

/* ═══════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

async function listReportHistory(projectId, organizationId, { reportType, status, page, limit } = {}) {
  await getProjectById(projectId, organizationId);
  const where = {
    projectId,
    ...(reportType && { reportType }),
    ...(status     && { status })
  };
  const { take, skip } = paginate(page, limit);
  const [items, total] = await Promise.all([
    prisma.eiaReportHistory.findMany({ where, take, skip, orderBy: { generatedAt: 'desc' } }),
    prisma.eiaReportHistory.count({ where })
  ]);
  return toPage(items, total, page, limit);
}

async function createReportHistory(projectId, organizationId, data, userId) {
  await getProjectById(projectId, organizationId);
  return prisma.eiaReportHistory.create({
    data: { ...data, projectId, generatedBy: userId }
  });
}

async function getReportHistoryById(reportId, projectId, organizationId) {
  await getProjectById(projectId, organizationId);
  const record = await prisma.eiaReportHistory.findFirst({ where: { id: reportId, projectId } });
  if (!record) throw new AppError('Report history not found', 404, 'REPORT_NOT_FOUND');
  return record;
}

async function updateReportHistory(reportId, projectId, organizationId, data) {
  await getReportHistoryById(reportId, projectId, organizationId);
  return prisma.eiaReportHistory.update({ where: { id: reportId }, data: { ...data, updatedAt: new Date() } });
}

async function archiveReportHistory(reportId, projectId, organizationId) {
  await getReportHistoryById(reportId, projectId, organizationId);
  return prisma.eiaReportHistory.update({
    where: { id: reportId },
    data:  { status: 'ARCHIVED', updatedAt: new Date() }
  });
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD SUMMARY
═══════════════════════════════════════════════════════════════ */

async function getProjectSummary(projectId, organizationId) {
  const project = await getProjectById(projectId, organizationId);

  const [
    airCount, waterCount, soilCount, noiseCount,
    impactCount, mitigationCount, evidenceCount, reportCount,
    airExceedance, waterExceedance, noiseExceedance,
    impactBySig, mitigationByStatus,
    program
  ] = await Promise.all([
    prisma.eiaAirMonitoring.count({ where: { projectId } }),
    prisma.eiaWaterMonitoring.count({ where: { projectId } }),
    prisma.eiaSoilMonitoring.count({ where: { projectId } }),
    prisma.eiaNoiseMonitoring.count({ where: { projectId } }),
    prisma.eiaImpactAssessment.count({ where: { projectId } }),
    prisma.eiaMitigationMeasure.count({ where: { projectId } }),
    prisma.eiaEvidence.count({ where: { projectId } }),
    prisma.eiaReportHistory.count({ where: { projectId } }),
    prisma.eiaAirMonitoring.count({ where: { projectId, anyExceedance: true } }),
    prisma.eiaWaterMonitoring.count({ where: { projectId, exceedanceFlag: true } }),
    prisma.eiaNoiseMonitoring.count({ where: { projectId, anyExceedance: true } }),
    prisma.eiaImpactAssessment.groupBy({ by: ['significance'], where: { projectId }, _count: true }),
    prisma.eiaMitigationMeasure.groupBy({ by: ['status'], where: { projectId }, _count: true }),
    prisma.eiaMonitoringProgram.findUnique({ where: { projectId }, select: { nextMonitoringDate: true, labName: true } })
  ]);

  return {
    project,
    monitoring: {
      air:   { total: airCount,   exceedances: airExceedance },
      water: { total: waterCount, exceedances: waterExceedance },
      soil:  { total: soilCount },
      noise: { total: noiseCount, exceedances: noiseExceedance }
    },
    impactsBySignificance: Object.fromEntries(impactBySig.map(r => [r.significance, r._count])),
    mitigationsByStatus:   Object.fromEntries(mitigationByStatus.map(r => [r.status, r._count])),
    totals: { impacts: impactCount, mitigations: mitigationCount, evidence: evidenceCount, reports: reportCount },
    monitoringProgram: program
  };
}

/* ═══════════════════════════════════════════════════════════════
   REPORT DATA AGGREGATOR
   Single endpoint that gathers everything for a report
═══════════════════════════════════════════════════════════════ */

async function getReportData(projectId, organizationId) {
  const project = await getProjectById(projectId, organizationId);

  const [
    airRecords, waterRecords, soilRecords, noiseRecords,
    impacts, mitigations, program, evidenceResult
  ] = await Promise.all([
    prisma.eiaAirMonitoring.findMany({ where: { projectId }, orderBy: { monitoringDate: 'asc' }, take: 500 }),
    prisma.eiaWaterMonitoring.findMany({ where: { projectId }, orderBy: { monitoringDate: 'asc' }, take: 500 }),
    prisma.eiaSoilMonitoring.findMany({ where: { projectId }, orderBy: { monitoringDate: 'asc' }, take: 500 }),
    prisma.eiaNoiseMonitoring.findMany({ where: { projectId }, orderBy: { monitoringDate: 'asc' }, take: 500 }),
    prisma.eiaImpactAssessment.findMany({ where: { projectId }, include: { mitigations: true } }),
    prisma.eiaMitigationMeasure.findMany({ where: { projectId }, orderBy: { component: 'asc' } }),
    prisma.eiaMonitoringProgram.findUnique({ where: { projectId } }),
    prisma.eiaEvidence.findMany({ where: { projectId }, take: 100, orderBy: { createdAt: 'desc' } })
  ]);

  /* Attach presigned URLs to image evidence */
  const imageEvidence = evidenceResult.filter(e => e.mimeType?.startsWith('image/'));
  const signedImages  = await Promise.all(
    imageEvidence.slice(0, 20).map(async ev => {
      try {
        const signedUrl = await getSignedUrl(ev.s3Key, 3600);
        return { ...ev, signedUrl };
      } catch { return { ...ev, signedUrl: null }; }
    })
  );

  return {
    project,
    monitoring: { air: airRecords, water: waterRecords, soil: soilRecords, noise: noiseRecords },
    impacts,
    mitigations,
    program,
    evidence:    evidenceResult,
    signedImages
  };
}

/* ═══════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════ */

module.exports = {
  assertOrgAccess,

  /* Projects */
  listProjects, getProjectById, createProject, updateProject, deleteProject,

  /* Air */
  listAir:    airService.list,
  createAir:  airService.create,
  getAirById: airService.getById,
  updateAir:  airService.update,
  deleteAir:  airService.remove,

  /* Water */
  listWater:    waterService.list,
  createWater:  waterService.create,
  getWaterById: waterService.getById,
  updateWater:  waterService.update,
  deleteWater:  waterService.remove,

  /* Soil */
  listSoil:    soilService.list,
  createSoil:  soilService.create,
  getSoilById: soilService.getById,
  updateSoil:  soilService.update,
  deleteSoil:  soilService.remove,

  /* Noise */
  listNoise:    noiseService.list,
  createNoise:  noiseService.create,
  getNoiseById: noiseService.getById,
  updateNoise:  noiseService.update,
  deleteNoise:  noiseService.remove,

  /* Impacts */
  listImpacts, createImpact, getImpactById, updateImpact, deleteImpact,

  /* Mitigations */
  listMitigations, createMitigation, getMitigationById, updateMitigation, deleteMitigation,

  /* Monitoring Program */
  getMonitoringProgram, upsertMonitoringProgram,

  /* Evidence */
  createEvidence, listEvidence, getEvidenceById, getEvidenceSignedUrl, deleteEvidence,

  /* Reports */
  listReportHistory, createReportHistory, getReportHistoryById, updateReportHistory, archiveReportHistory,

  /* Aggregators */
  getProjectSummary, getReportData
};
