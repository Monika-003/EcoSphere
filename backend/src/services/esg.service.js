'use strict';

/**
 * ESG Module — Service Layer
 * Phase 2 | Business logic, scoring engine, S3 evidence management
 */

const { PrismaClient } = require('@prisma/client');
const { getSignedUrl, deleteFromS3 } = require('../middleware/upload');
const { AppError }    = require('../middleware/errorHandler');

const prisma = new PrismaClient();

/* ── Map section name → Prisma model key ─────────────────────── */
const SECTION_MODEL = {
  profile:      'esgProfile',
  energy:       'esgEnergy',
  water:        'esgWater',
  emissions:    'esgEmissions',
  waste:        'esgWaste',
  biodiversity: 'esgBiodiversity',
  employees:    'esgEmployees',
  safety:       'esgSafety',
  governance:   'esgGovernance',
  csr:          'esgCsr'
};

/* ── Derive period from fiscal / calendar year string ─────────── */
function derivePeriod(reportingYear) {
  // "FY 2024-25"  → Apr 1 2024 – Mar 31 2025
  // "FY2024-25"   → same
  // "2024"        → Jan 1 2024 – Dec 31 2024
  const fyMatch = String(reportingYear).match(/FY\s*(\d{4})-(\d{2,4})/i);
  if (fyMatch) {
    const sy = parseInt(fyMatch[1]);
    const ey = fyMatch[2].length === 2 ? sy + 1 : parseInt(fyMatch[2]);
    return { periodFrom: new Date(`${sy}-04-01`), periodTo: new Date(`${ey}-03-31`) };
  }
  const cyMatch = String(reportingYear).match(/^(\d{4})$/);
  if (cyMatch) {
    const y = parseInt(cyMatch[1]);
    return { periodFrom: new Date(`${y}-01-01`), periodTo: new Date(`${y}-12-31`) };
  }
  return null;
}

/* ── Validate org access for the calling user ─────────────────── */
function assertOrgAccess(user, orgId, readOnly = false) {
  const externalRoles = [
    'SUPER_ADMIN','REG_OFFICER','REG_INSPECTOR',
    'REG_REGIONAL_OFFICER','REG_GOVERNMENT_AUTHORITY',
    'AUDITOR','CONSULTANT'
  ];
  if (externalRoles.includes(user.role)) return; // these roles can read any org
  if (!readOnly) {
    // Write: user must belong to the org
    const writeOrgRoles = [
      'ORG_ADMIN','ORG_ANALYST','ORG_ENGINEER',
      'ORG_PRODUCTION_HEAD','ORG_QUALITY_HEAD',
      'ORG_HR_HEAD','ORG_PURCHASE_HEAD','ORG_MAINTENANCE_HEAD'
    ];
    if (!writeOrgRoles.includes(user.role)) {
      throw new AppError('Insufficient permissions to modify ESG data', 403, 'FORBIDDEN');
    }
  }
  if (user.orgId !== orgId) {
    throw new AppError('Access denied to this organization', 403, 'ORG_ACCESS_DENIED');
  }
}

/* ════════════════════════════════════════════════════════════════
   SECTION CRUD (generic — works for all 10 data sections)
═══════════════════════════════════════════════════════════════ */

/**
 * Get a single ESG section record for a given org + year.
 */
async function getSection(section, orgId, reportingYear) {
  const model = SECTION_MODEL[section];
  if (!model) throw new AppError(`Unknown ESG section: ${section}`, 400, 'INVALID_SECTION');

  return prisma[model].findUnique({
    where: {
      organizationId_reportingYear: { organizationId: orgId, reportingYear }
    }
  });
}

/**
 * Create or update a single ESG section record.
 * periodFrom/periodTo are derived from reportingYear if not supplied.
 */
async function upsertSection(section, orgId, reportingYear, inputData, userId) {
  const model = SECTION_MODEL[section];
  if (!model) throw new AppError(`Unknown ESG section: ${section}`, 400, 'INVALID_SECTION');

  const { periodFrom: pf, periodTo: pt, reportingYear: _ry, ...data } = inputData;

  const period = { periodFrom: pf, periodTo: pt };
  if (!period.periodFrom || !period.periodTo) {
    const derived = derivePeriod(reportingYear);
    if (!derived) throw new AppError('Could not derive period from reportingYear; supply periodFrom and periodTo', 400, 'INVALID_YEAR');
    period.periodFrom = period.periodFrom || derived.periodFrom;
    period.periodTo   = period.periodTo   || derived.periodTo;
  }

  // Track who submitted
  if (userId && !data.submittedById) data.submittedById = userId;

  return prisma[model].upsert({
    where: {
      organizationId_reportingYear: { organizationId: orgId, reportingYear }
    },
    update:  { ...data, updatedAt: new Date() },
    create:  {
      organizationId: orgId,
      reportingYear,
      ...period,
      ...data
    }
  });
}

/**
 * Get summary status of all 10 sections for one org + year.
 */
async function getSectionSummary(orgId, reportingYear) {
  const sections = Object.keys(SECTION_MODEL);
  const results  = await Promise.all(
    sections.map(async (section) => {
      const model  = SECTION_MODEL[section];
      const record = await prisma[model].findUnique({
        where: { organizationId_reportingYear: { organizationId: orgId, reportingYear } },
        select: { status: true, updatedAt: true, submittedById: true }
      });
      return {
        section,
        exists:   !!record,
        status:   record?.status  || 'DRAFT',
        updatedAt: record?.updatedAt || null
      };
    })
  );

  const score = await prisma.esgScore.findUnique({
    where: { organizationId_reportingYear: { organizationId: orgId, reportingYear } },
    select: { overallScore: true, esgRating: true, computedAt: true }
  });

  return { sections: results, score: score || null, reportingYear };
}

/* ════════════════════════════════════════════════════════════════
   EVIDENCE MANAGEMENT
═══════════════════════════════════════════════════════════════ */

/**
 * Persist evidence record after a successful Multer-S3 upload.
 * The controller calls this after the upload middleware has run.
 */
async function createEvidenceRecord(orgId, uploadedFile, metaData, userId) {
  const { reportingYear, section, fieldReference, description, tags, qualityScore, isCoverImage, displayOrder } = metaData;

  // uploadedFile from multer-s3 has: key, bucket, size, mimetype, originalname
  // uploadedFile from multer disk has: filename, path, size, mimetype, originalname
  const isS3   = !!uploadedFile.key;
  const s3Key  = isS3 ? uploadedFile.key : `local/${uploadedFile.filename}`;
  const bucket = isS3 ? uploadedFile.bucket : (process.env.AWS_S3_BUCKET || 'local');

  return prisma.esgEvidence.create({
    data: {
      organizationId:  orgId,
      reportingYear,
      section,
      fieldReference:  fieldReference  || null,
      fileName:        isS3 ? uploadedFile.key.split('/').pop() : uploadedFile.filename,
      originalName:    uploadedFile.originalname,
      mimeType:        uploadedFile.mimetype,
      sizeBytes:       uploadedFile.size,
      s3Key,
      s3Bucket:        bucket,
      description:     description  || null,
      tags:            tags         || [],
      uploadedById:    userId       || null,
      qualityScore:    qualityScore || null,
      isCoverImage:    isCoverImage || false,
      displayOrder:    displayOrder || null
    }
  });
}

/**
 * List evidence for an org with optional filters.
 */
async function listEvidence(orgId, { reportingYear, section, page = 1, limit = 20 } = {}) {
  const where = { organizationId: orgId };
  if (reportingYear) where.reportingYear = reportingYear;
  if (section)       where.section = section;

  const skip  = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.esgEvidence.findMany({
      where,
      orderBy: [{ reportingYear: 'desc' }, { section: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit
    }),
    prisma.esgEvidence.count({ where })
  ]);

  return { items, total, page, limit };
}

/**
 * Get a single evidence record (validates ownership).
 */
async function getEvidenceById(evidenceId, orgId) {
  const record = await prisma.esgEvidence.findUnique({ where: { id: evidenceId } });
  if (!record) throw new AppError('Evidence not found', 404, 'NOT_FOUND');
  if (record.organizationId !== orgId) {
    throw new AppError('Access denied to this evidence', 403, 'ORG_ACCESS_DENIED');
  }
  return record;
}

/**
 * Generate a 1-hour presigned S3 URL for downloading evidence.
 */
async function getEvidenceSignedUrl(evidenceId, orgId) {
  const record = await getEvidenceById(evidenceId, orgId);
  const url    = await getSignedUrl(record.s3Key, 3600);
  // Update expiry timestamp
  await prisma.esgEvidence.update({
    where: { id: evidenceId },
    data:  { presignedUrlExpiry: new Date(Date.now() + 3600 * 1000) }
  });
  return { url, expiresIn: 3600, fileName: record.originalName, mimeType: record.mimeType };
}

/**
 * Delete evidence from S3 + database.
 */
async function deleteEvidence(evidenceId, orgId) {
  const record = await getEvidenceById(evidenceId, orgId);
  try {
    await deleteFromS3(record.s3Key);
  } catch (e) {
    // S3 delete failure should not block DB cleanup
  }
  await prisma.esgEvidence.delete({ where: { id: evidenceId } });
  return { deleted: true, id: evidenceId };
}

/* ════════════════════════════════════════════════════════════════
   ESG SCORING ENGINE
═══════════════════════════════════════════════════════════════ */

/** Score a numeric value on 0–maxPts scale given a series of thresholds */
function scoreByThreshold(value, thresholds, maxPts) {
  if (value == null) return 0;
  for (const [threshold, pts] of thresholds) {
    if (value >= threshold) return Math.min(pts, maxPts);
  }
  return 0;
}

/** Count how many non-null fields exist from a list */
function completenessScore(record, keys, maxPts) {
  if (!record) return 0;
  const filled = keys.filter(k => record[k] != null && record[k] !== '').length;
  return Math.round((filled / keys.length) * maxPts);
}

/* ── Energy Score (0-100) ─────────────────────────────── */
function scoreEnergy(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'gridElecKwh','totalEnergyConsumedGj','renewablePct',
    'energyIntensityCurr','gridElecKwhPrev','totalEnergyGjPrev'
  ], 30);

  const performance = scoreByThreshold(Number(r.renewablePct) || 0, [
    [50, 50], [30, 35], [20, 25], [10, 15], [1, 8]
  ], 50);

  let bestPractice = 0;
  if (r.reductionTargetPct)  bestPractice += 8;
  if (r.renewableTargetPct)  bestPractice += 8;
  if (r.status === 'VERIFIED') bestPractice += 4;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Emissions Score (0-100) ──────────────────────────── */
function scoreEmissions(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'scope1TotalTco2e','scope2TotalTco2e','scope3TotalTco2e',
    'emissionsIntensityCurr','baseYear','co2Tonne'
  ], 30);

  let performance = 0;
  if (r.sbtiCommitted || r.scienceBasedTarget) performance += 20;
  if (r.thirdPartyVerified) performance += 10;
  if (r.scope3TotalTco2e != null) performance += 10; // Scope 3 disclosed
  const prevTotal = Number(r.scope123TotalPrev);
  const currTotal = Number(r.scope123TotalTco2e);
  if (prevTotal > 0 && currTotal > 0 && currTotal < prevTotal) performance += 10;
  performance = Math.min(50, performance);

  let bestPractice = 0;
  if (r.nzeTarget)           bestPractice += 8;
  if (r.carbonNeutralTarget) bestPractice += 7;
  if (r.status === 'VERIFIED') bestPractice += 5;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Water Score (0-100) ──────────────────────────────── */
function scoreWater(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'totalWithdrawalKl','totalConsumedKl','recycledKl',
    'waterIntensityCurr','totalWithdrawalKlPrev'
  ], 30);

  let performance = 0;
  if (r.zldAchieved) performance += 20;
  performance += scoreByThreshold(Number(r.recyclingRatePct) || 0, [
    [60, 15], [40, 10], [20, 6]
  ], 15);
  const prevW = Number(r.totalWithdrawalKlPrev);
  const currW = Number(r.totalWithdrawalKl);
  if (prevW > 0 && currW > 0 && currW < prevW) performance += 15;
  performance = Math.min(50, performance);

  let bestPractice = 0;
  if (r.reductionTargetPct) bestPractice += 10;
  if (r.status === 'VERIFIED') bestPractice += 5;
  if (r.waterStressArea === true) bestPractice += 5; // acknowledged risk
  if (r.waterStressArea === false) bestPractice += 5; // documented no-risk

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Waste Score (0-100) ──────────────────────────────── */
function scoreWaste(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'hazWasteTotalTonne','nhWasteTotalTonne','totalWasteTonne',
    'diversionRatePct','recyclingRatePct'
  ], 30);

  const performance = scoreByThreshold(Number(r.diversionRatePct) || 0, [
    [80, 50], [60, 35], [40, 25], [20, 15], [1, 8]
  ], 50);

  let bestPractice = 0;
  if (r.pchwmAuthorized)     bestPractice += 10;
  if (r.zeroWasteToLandfill) bestPractice += 5;
  if (r.status === 'VERIFIED') bestPractice += 5;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Biodiversity Score (0-100) ───────────────────────── */
function scoreBiodiversity(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'facilityAreaHa','greenCoverHa','totalTreesPlanted',
    'eiaCompleted','nearProtectedArea'
  ], 30);

  let performance = 0;
  if (r.nearProtectedArea === false) performance += 20; // no sensitive site
  if (r.nearProtectedArea === true && r.eiaCompleted) performance += 10;
  performance += scoreByThreshold(Number(r.greenCoverPct) || 0, [
    [30, 15], [20, 10], [10, 6]
  ], 15);
  if (r.totalTreesPlanted > 0 && Number(r.treeSurvivalRatePct) >= 70) performance += 10;
  if (r.biodivAssessmentDone) performance += 5;
  performance = Math.min(50, performance);

  let bestPractice = 0;
  if (r.afforestationPlanActive) bestPractice += 10;
  if (r.conservationPartnerships?.length > 0) bestPractice += 5;
  if (r.status === 'VERIFIED') bestPractice += 5;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Employee Score (0-100) ───────────────────────────── */
function scoreEmployees(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'totalWorkforce','permanentMale','permanentFemale',
    'womenLeadershipPct','avgTrainingHrsTotal','voluntaryAttritionPct'
  ], 30);

  let performance = 0;
  performance += scoreByThreshold(Number(r.womenLeadershipPct) || 0, [
    [30, 15], [20, 10], [10, 6]
  ], 15);
  performance += scoreByThreshold(Number(r.avgTrainingHrsTotal) || 0, [
    [20, 15], [10, 10], [5, 6]
  ], 15);
  const attrition = Number(r.voluntaryAttritionPct);
  if (attrition > 0 && attrition < 10) performance += 10;
  else if (attrition < 15) performance += 6;
  if (Number(r.pfCoveredPct) >= 100) performance += 10;
  performance = Math.min(50, performance);

  let bestPractice = 0;
  if (r.equalPayAuditDone)         bestPractice += 8;
  if (r.humanRightsDueDiligence)   bestPractice += 7;
  if (r.collectiveBargaining)      bestPractice += 5;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Safety Score (0-100) ─────────────────────────────── */
function scoreSafety(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'manHoursEmp','ltirEmp','trirEmp','fatalitiesEmp',
    'safetyTrainingCovPct','emergencyDrillsCount'
  ], 30);

  let performance = 0;
  // Fatalities are a major negative signal
  if (r.fatalitiesEmp === 0 && r.fatalitiesCon === 0) performance += 20;
  else if (r.fatalitiesEmp > 0 || r.fatalitiesCon > 0) performance -= 10;

  performance += scoreByThreshold(Number(r.ltirEmp) || 99, [
    // lower LTIR is better — invert
    [0, 15],  // handled below
  ], 15);
  const ltir = Number(r.ltirEmp);
  if (ltir < 0.5)      performance += 15;
  else if (ltir < 1.0) performance += 10;
  else if (ltir < 2.0) performance += 5;

  if (Number(r.emergencyDrillsCount) >= 4) performance += 10;
  if (Number(r.ppeCompliancePct) >= 95)    performance += 5;
  performance = Math.max(0, Math.min(50, performance));

  let bestPractice = 0;
  if (r.iso45001Certified)         bestPractice += 12;
  if (Number(r.ppeCompliancePct) >= 95) bestPractice += 8;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── CSR Score (0-100) ────────────────────────────────── */
function scoreCsr(r) {
  if (!r) return 0;
  const dataQuality = completenessScore(r, [
    'csrObligationInr','csrSpentInr','directBeneficiaries','sdgsAddressed'
  ], 30);

  const performance = scoreByThreshold(Number(r.csrSpendingPct) || 0, [
    [100, 50], [80, 35], [60, 25], [40, 15], [1, 8]
  ], 50);

  let bestPractice = 0;
  if (r.impactAssessmentDone)          bestPractice += 10;
  if ((r.sdgsAddressed?.length || 0) >= 4) bestPractice += 10;

  return Math.min(100, dataQuality + performance + bestPractice);
}

/* ── Governance Score (0-100) ─────────────────────────── */
function scoreGovernance(r) {
  if (!r) return 0;

  // Board sub-score (0-40)
  let boardScore = 0;
  boardScore += scoreByThreshold(Number(r.boardIndependentPct) || 0, [
    [50, 15], [40, 10], [33, 7]
  ], 15);
  boardScore += scoreByThreshold(Number(r.boardWomenPct) || 0, [
    [33, 15], [25, 10], [10, 5]
  ], 15);
  if (r.esgInBoardCharter) boardScore += 5;
  if (r.esgKpisLinkedPay)  boardScore += 5;
  boardScore = Math.min(40, boardScore);

  // Ethics sub-score (0-35)
  let ethicsScore = 0;
  if (r.codeOfConductPublished) ethicsScore += 8;
  if (r.whistleblowerPolicy)    ethicsScore += 8;
  if (r.antiCorruptionPolicy)   ethicsScore += 8;
  if (r.supplierCodeOfConduct)  ethicsScore += 6;
  if (Number(r.ethicsTrainingCovPct) >= 90) ethicsScore += 5;
  ethicsScore = Math.min(35, ethicsScore);

  // Transparency sub-score (0-25)
  let transparencyScore = 0;
  if (r.annualReportPublished) transparencyScore += 7;
  if (r.griIndex)              transparencyScore += 6;
  if (r.brsrFiled)             transparencyScore += 5;
  if (r.tcfdReport)            transparencyScore += 4;
  if (r.sasbDisclosure || r.ungcCop) transparencyScore += 3;
  transparencyScore = Math.min(25, transparencyScore);

  return Math.min(100, boardScore + ethicsScore + transparencyScore);
}

/* ── Pillar & Overall Scores ──────────────────────────── */
function computePillarScores(sections) {
  const env = sections.energy.score * 0.20
            + sections.emissions.score * 0.30
            + sections.water.score * 0.15
            + sections.waste.score * 0.20
            + sections.biodiversity.score * 0.15;

  const social = sections.employees.score * 0.40
               + sections.safety.score * 0.35
               + sections.csr.score * 0.25;

  const gov = sections.governance.score;

  const overall = env * 0.40 + social * 0.35 + gov * 0.25;

  return {
    envScore:     Math.round(env * 10) / 10,
    socialScore:  Math.round(social * 10) / 10,
    govScore:     Math.round(gov * 10) / 10,
    overallScore: Math.round(overall * 10) / 10,
    energyScore:      sections.energy.score,
    waterScore:       sections.water.score,
    emissionsScore:   sections.emissions.score,
    wasteScore:       sections.waste.score,
    biodiversityScore: sections.biodiversity.score,
    employeeScore:    sections.employees.score,
    safetyScore:      sections.safety.score,
    csrScore:         sections.csr.score,
    boardScore:       sections.governance.boardScore,
    ethicsScore:      sections.governance.ethicsScore,
    transparencyScore: sections.governance.transparencyScore
  };
}

function deriveRating(score) {
  if (score >= 90) return 'A_PLUS';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B_PLUS';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C_PLUS';
  if (score >= 40) return 'C';
  return 'D';
}

/**
 * Compute and persist ESG scores for an org + year.
 */
async function computeScore(orgId, reportingYear, userId) {
  // Load all data sections in parallel
  const [energy, water, emissions, waste, biodiversity, employees, safety, csr, governance, prevScore] =
    await Promise.all([
      getSection('energy',      orgId, reportingYear),
      getSection('water',       orgId, reportingYear),
      getSection('emissions',   orgId, reportingYear),
      getSection('waste',       orgId, reportingYear),
      getSection('biodiversity',orgId, reportingYear),
      getSection('employees',   orgId, reportingYear),
      getSection('safety',      orgId, reportingYear),
      getSection('csr',         orgId, reportingYear),
      getSection('governance',  orgId, reportingYear),
      prisma.esgScore.findUnique({
        where: { organizationId_reportingYear: { organizationId: orgId, reportingYear } }
      })
    ]);

  // Run section scorers
  const govDetails = scoreGovernanceDetailed(governance);
  const sections = {
    energy:      { score: scoreEnergy(energy) },
    water:       { score: scoreWater(water) },
    emissions:   { score: scoreEmissions(emissions) },
    waste:       { score: scoreWaste(waste) },
    biodiversity:{ score: scoreBiodiversity(biodiversity) },
    employees:   { score: scoreEmployees(employees) },
    safety:      { score: scoreSafety(safety) },
    csr:         { score: scoreCsr(csr) },
    governance:  { score: govDetails.total, boardScore: govDetails.board, ethicsScore: govDetails.ethics, transparencyScore: govDetails.transparency }
  };

  const pillar = computePillarScores(sections);
  const rating = deriveRating(pillar.overallScore);

  // Period
  const derived = derivePeriod(reportingYear) || {};

  const scoreData = {
    organizationId: orgId,
    reportingYear,
    periodFrom:     derived.periodFrom,
    periodTo:       derived.periodTo,
    ...pillar,
    esgRating: rating,
    prevYearEnv:     prevScore?.envScore     || null,
    prevYearSocial:  prevScore?.socialScore  || null,
    prevYearGov:     prevScore?.govScore     || null,
    prevYearOverall: prevScore?.overallScore || null,
    envTrend:    getTrend(pillar.envScore,     prevScore?.envScore),
    socialTrend: getTrend(pillar.socialScore,  prevScore?.socialScore),
    govTrend:    getTrend(pillar.govScore,     prevScore?.govScore),
    overallTrend:getTrend(pillar.overallScore, prevScore?.overallScore),
    yoyOverallChangePts: prevScore?.overallScore != null
      ? Math.round((pillar.overallScore - Number(prevScore.overallScore)) * 10) / 10
      : null,
    computedAt:     new Date(),
    computedByModel: 'rules-engine-v1',
    scoringVersion: 'phase2-v1.0'
  };

  const saved = await prisma.esgScore.upsert({
    where: { organizationId_reportingYear: { organizationId: orgId, reportingYear } },
    update: { ...scoreData, updatedAt: new Date() },
    create: scoreData
  });

  return saved;
}

function scoreGovernanceDetailed(r) {
  if (!r) return { total: 0, board: 0, ethics: 0, transparency: 0 };
  let board = 0;
  board += scoreByThreshold(Number(r.boardIndependentPct)||0, [[50,15],[40,10],[33,7]], 15);
  board += scoreByThreshold(Number(r.boardWomenPct)||0, [[33,15],[25,10],[10,5]], 15);
  if (r.esgInBoardCharter) board += 5;
  if (r.esgKpisLinkedPay)  board += 5;
  board = Math.min(40, board);

  let ethics = 0;
  if (r.codeOfConductPublished) ethics += 8;
  if (r.whistleblowerPolicy)    ethics += 8;
  if (r.antiCorruptionPolicy)   ethics += 8;
  if (r.supplierCodeOfConduct)  ethics += 6;
  if (Number(r.ethicsTrainingCovPct) >= 90) ethics += 5;
  ethics = Math.min(35, ethics);

  let transparency = 0;
  if (r.annualReportPublished) transparency += 7;
  if (r.griIndex)              transparency += 6;
  if (r.brsrFiled)             transparency += 5;
  if (r.tcfdReport)            transparency += 4;
  if (r.sasbDisclosure || r.ungcCop) transparency += 3;
  transparency = Math.min(25, transparency);

  return { total: board + ethics + transparency, board, ethics, transparency };
}

function getTrend(current, previous) {
  if (previous == null || current == null) return null;
  const diff = current - Number(previous);
  if (diff >= 2)  return 'IMPROVING';
  if (diff <= -2) return 'DECLINING';
  return 'STABLE';
}

/**
 * Retrieve an already-computed score record.
 */
async function getScore(orgId, reportingYear) {
  return prisma.esgScore.findUnique({
    where: { organizationId_reportingYear: { organizationId: orgId, reportingYear } }
  });
}

/* ════════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

async function createReportHistory(orgId, data, userId) {
  const { reportingYear, periodFrom: pf, periodTo: pt, ...rest } = data;
  const period = { periodFrom: pf, periodTo: pt };
  if (!period.periodFrom || !period.periodTo) {
    const d = derivePeriod(reportingYear);
    if (d) { period.periodFrom = period.periodFrom || d.periodFrom; period.periodTo = period.periodTo || d.periodTo; }
  }

  // Snapshot current scores if available
  const score = await prisma.esgScore.findUnique({
    where: { organizationId_reportingYear: { organizationId: orgId, reportingYear } }
  });

  return prisma.esgReportHistory.create({
    data: {
      organizationId:       orgId,
      reportingYear,
      ...period,
      ...rest,
      generatedById:        userId || null,
      generatedAt:          new Date(),
      envScoreSnapshot:     score?.envScore     || null,
      socialScoreSnapshot:  score?.socialScore  || null,
      govScoreSnapshot:     score?.govScore     || null,
      overallScoreSnapshot: score?.overallScore || null,
      esgRatingSnapshot:    score?.esgRating    || null
    }
  });
}

async function listReportHistory(orgId, { reportingYear, page = 1, limit = 20 } = {}) {
  const where = { organizationId: orgId };
  if (reportingYear) where.reportingYear = reportingYear;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.esgReportHistory.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.esgReportHistory.count({ where })
  ]);
  return { items, total, page, limit };
}

async function getReportHistoryById(reportId, orgId) {
  const record = await prisma.esgReportHistory.findUnique({ where: { id: reportId } });
  if (!record) throw new AppError('Report history not found', 404, 'NOT_FOUND');
  if (record.organizationId !== orgId) throw new AppError('Access denied', 403, 'ORG_ACCESS_DENIED');
  // Increment access count
  await prisma.esgReportHistory.update({
    where: { id: reportId },
    data:  { accessCount: { increment: 1 }, lastAccessedAt: new Date() }
  });
  return record;
}

async function updateReportHistory(reportId, orgId, data) {
  const record = await getReportHistoryById(reportId, orgId);

  const updateData = {};
  if (data.status)      updateData.status    = data.status;
  if (data.sharedWith)  updateData.sharedWith = data.sharedWith;
  if (data.notes != null) updateData.notes   = data.notes;
  if (data.status === 'SHARED') updateData.sharedAt = new Date();
  if (data.status === 'ARCHIVED') updateData.archivedAt = new Date();

  return prisma.esgReportHistory.update({
    where: { id: reportId },
    data:  updateData
  });
}

async function deleteReportHistory(reportId, orgId) {
  await getReportHistoryById(reportId, orgId);
  await prisma.esgReportHistory.update({
    where: { id: reportId },
    data:  { status: 'ARCHIVED', archivedAt: new Date() }
  });
  return { archived: true, id: reportId };
}

/* ════════════════════════════════════════════════════════════════
   REPORT DATA AGGREGATOR (Phase 5)
   Returns all sections + score + evidence in a single query batch.
═══════════════════════════════════════════════════════════════ */

async function getReportData(orgId, reportingYear) {
  const sectionKeys = Object.keys(SECTION_MODEL);

  const [
    ...sectionRecords
  ] = await Promise.all(sectionKeys.map(s => getSection(s, orgId, reportingYear)));

  const [score, evidenceResult, org] = await Promise.all([
    getScore(orgId, reportingYear),
    listEvidence(orgId, { reportingYear, page: 1, limit: 100 }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, industry: true, description: true, logoUrl: true }
    })
  ]);

  const sections = {};
  sectionKeys.forEach((k, i) => { sections[k] = sectionRecords[i]; });

  // Attach presigned URLs for image evidence
  const imageEvidence = evidenceResult.items.filter(e =>
    e.mimeType && e.mimeType.startsWith('image/')
  );
  const signedImages = await Promise.all(
    imageEvidence.slice(0, 20).map(async e => {
      try {
        const result = await getEvidenceSignedUrl(e.id, orgId);
        return { ...e, signedUrl: result.url };
      } catch { return null; }
    })
  );

  return {
    org,
    reportingYear,
    sections,
    score,
    evidence: evidenceResult.items,
    signedImages: signedImages.filter(Boolean)
  };
}

/* ── Exports ─────────────────────────────────────────────────── */
module.exports = {
  // Helpers
  assertOrgAccess,
  derivePeriod,

  // Section CRUD
  getSection,
  upsertSection,
  getSectionSummary,

  // Evidence
  createEvidenceRecord,
  listEvidence,
  getEvidenceById,
  getEvidenceSignedUrl,
  deleteEvidence,

  // Scoring
  computeScore,
  getScore,

  // Report History
  createReportHistory,
  listReportHistory,
  getReportHistoryById,
  updateReportHistory,
  deleteReportHistory,

  // Report Data Aggregator (Phase 5)
  getReportData
};
