'use strict';

/**
 * Image & Evidence Engine Service — Phase 12
 * Metadata-based analysis: categorisation, quality scoring, duplicate detection,
 * caption generation, section mapping, and best-image selection.
 * No CV libraries required — all logic is rules-based on stored metadata.
 */

const { prisma } = require('../config/database');

/* ── MIME sets ───────────────────────────────────────────────────────────── */
const IMAGE_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/bmp', 'image/gif', 'image/tiff', 'image/svg+xml',
]);
const DOC_MIMES = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

/* ── Section labels ──────────────────────────────────────────────────────── */
const ESG_SECTION_LABELS = {
  energy: 'Energy Management', water: 'Water Stewardship',
  emissions: 'GHG Emissions', waste: 'Waste Management',
  biodiversity: 'Biodiversity', employees: 'Human Capital',
  safety: 'Occupational Safety', governance: 'Corporate Governance',
  csr: 'Corporate Social Responsibility', profile: 'Organisation Profile',
};

const EIA_MODULE_LABELS = {
  air: 'Ambient Air Quality', water: 'Water Quality',
  soil: 'Soil Quality', noise: 'Noise Levels',
  impacts: 'Impact Assessment', mitigations: 'Mitigation Measures',
  evidence: 'General Evidence', program: 'Monitoring Programme',
};

/* ══════════════════════════════════════════════════════════════════════════
   PART 1: IMAGE CATEGORISATION
══════════════════════════════════════════════════════════════════════════ */

const CATEGORY_KEYWORDS = {
  MONITORING_EQUIPMENT: ['monitor','sensor','instrument','gauge','probe','analyzer','analyser','aqm','caaqm','station','cpcb','sampler','stack sampler'],
  SAMPLING_ACTIVITY:    ['sampl','collect','field visit','site visit','survey','testing','test','assessment'],
  MITIGATION_MEASURE:   ['mitigation','etp','stp','scrubber','barrier','plantation','tree planting','green belt','zld','dust suppression','netting','effluent'],
  BASELINE_SURVEY:      ['baseline','pre-','before','initial','reference','background','pre construction'],
  IMPACT_DOCUMENTATION: ['impact','damage','affected','change','degradation','erosion','contamination','deforestation'],
  COMPLIANCE_RECORD:    ['compliance','certificate','permit','noc','consent','authorization','clearance','audit','inspection','report'],
  AERIAL_VIEW:          ['aerial','drone','satellite','top view','bird eye','overview'],
  SITE_PHOTO:           ['site','plant','facility','unit','area','zone','location','view','campus','floor'],
};

function categorizeEvidence(item) {
  const mime     = (item.mimeType || '').toLowerCase();
  const name     = (item.originalName || item.fileName || '').toLowerCase().replace(/[-_]/g, ' ');
  const desc     = (item.description || '').toLowerCase();
  const docType  = (item.documentType || '').toLowerCase();
  const combined = name + ' ' + desc + ' ' + docType;

  if (DOC_MIMES.has(mime) || (mime && !IMAGE_MIMES.has(mime))) return 'DOCUMENT';

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(kw => combined.includes(kw))) return cat;
  }

  return IMAGE_MIMES.has(mime) ? 'SITE_PHOTO' : 'OTHER';
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 1: QUALITY SCORING  (0–100)
══════════════════════════════════════════════════════════════════════════ */

function calculateQualityScore(item) {
  let score = 0;

  // File size — 25 pts (larger = typically better quality for photos)
  const sizeBytes = item.sizeBytes || item.fileSize || 0;
  if      (sizeBytes > 2_000_000) score += 25;
  else if (sizeBytes > 1_000_000) score += 22;
  else if (sizeBytes > 500_000)   score += 18;
  else if (sizeBytes > 200_000)   score += 13;
  else if (sizeBytes > 50_000)    score += 7;
  else if (sizeBytes > 0)         score += 3;

  // MIME quality — 20 pts
  const mime = (item.mimeType || '').toLowerCase();
  const mimeScore = {
    'image/jpeg': 20, 'image/jpg': 20, 'image/png': 20,
    'image/webp': 19, 'image/tiff': 15, 'image/bmp': 12,
    'image/gif': 7,   'application/pdf': 16,
  };
  score += mimeScore[mime] || 5;

  // Name descriptiveness — 20 pts
  const cleanName = (item.originalName || item.fileName || '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  const nameLen   = cleanName.length;
  if      (nameLen >= 40) score += 20;
  else if (nameLen >= 25) score += 16;
  else if (nameLen >= 15) score += 11;
  else if (nameLen >= 8)  score += 6;
  else                    score += 2;

  // Description — 20 pts
  const descLen = (item.description || '').trim().length;
  if      (descLen > 100) score += 20;
  else if (descLen > 30)  score += 14;
  else if (descLen > 0)   score += 7;

  // Tags — 10 pts
  const tags     = item.tags;
  const tagCount = Array.isArray(tags) ? tags.length : (tags ? 1 : 0);
  if      (tagCount >= 3) score += 10;
  else if (tagCount > 0)  score += 5;

  // ESG-only verified bonus — 5 pts
  if (item.isVerified === true) score += 5;

  return Math.min(100, score);
}

function qualityGrade(score) {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'GOOD';
  if (score >= 35) return 'FAIR';
  return 'POOR';
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 1: DUPLICATE DETECTION
══════════════════════════════════════════════════════════════════════════ */

function detectDuplicates(evidenceList) {
  const s3Groups   = {};  // s3Key → [ids]  (exact storage duplicate)
  const nameGroups = {};  // normName_sizeBucket → [ids]  (likely duplicate)

  evidenceList.forEach(item => {
    if (item.s3Key) {
      s3Groups[item.s3Key] = s3Groups[item.s3Key] || [];
      s3Groups[item.s3Key].push(item.id);
    }

    const normName  = (item.originalName || item.fileName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sizeBkt   = Math.floor((item.sizeBytes || item.fileSize || 0) / 100_000);  // 100 KB buckets
    const nameKey   = normName + '_' + sizeBkt;
    if (normName.length >= 4) {
      nameGroups[nameKey] = nameGroups[nameKey] || [];
      nameGroups[nameKey].push(item.id);
    }
  });

  const duplicateOf = {};

  Object.values(s3Groups).forEach(ids => {
    if (ids.length > 1) ids.slice(1).forEach(id => { duplicateOf[id] = ids[0]; });
  });

  Object.values(nameGroups).forEach(ids => {
    if (ids.length > 1) ids.slice(1).forEach(id => { if (!duplicateOf[id]) duplicateOf[id] = ids[0]; });
  });

  return duplicateOf;
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 2: AUTOMATIC CAPTION GENERATION
══════════════════════════════════════════════════════════════════════════ */

function generateCaption(item, sectionLabel) {
  const raw    = (item.originalName || item.fileName || '').replace(/\.[^.]+$/, '');
  const clean  = raw.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const titled = clean.replace(/\b([a-z])/g, c => c.toUpperCase());

  // Date suffix
  let dateCtx = '';
  if (item.monitoringDate) {
    try {
      const d = new Date(item.monitoringDate);
      dateCtx = ' (' + d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + ')';
    } catch {}
  } else if (item.reportingYear) {
    dateCtx = ' (' + item.reportingYear + ')';
  } else if (item.createdAt) {
    try {
      const d = new Date(item.createdAt);
      dateCtx = ' (' + d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) + ')';
    } catch {}
  }

  if (titled && sectionLabel) return `${titled} — ${sectionLabel}${dateCtx}`;
  if (titled)                  return titled + dateCtx;
  if (sectionLabel)            return sectionLabel + ' Evidence' + dateCtx;
  return 'Evidence Document' + dateCtx;
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 2: ESG SECTION MAPPING
══════════════════════════════════════════════════════════════════════════ */

const ESG_KEYWORDS = {
  energy:       ['energy','solar','wind','renewable','electricity','power','fuel','generator','kwh','mwh','gj','diesel','lpg','coal','steam','boiler'],
  water:        ['water','effluent','etp','stp','zld','wtp','sewage','drainage','rainwater','harvest','aquifer','groundwater','river','lake','canal','wqi'],
  emissions:    ['emission','ghg','carbon','co2','scope','flue','stack','aqm','caaqm','pm2.5','pm10','so2','nox','voc','greenhouse'],
  waste:        ['waste','hazardous','disposal','landfill','recycl','compost','scrap','ewaste','pchwm','msw','incinerat','biomedical','debris'],
  biodiversity: ['tree','plant','green','biodiversity','species','flora','fauna','habitat','forest','nursery','garden','ecology'],
  employees:    ['employee','worker','workforce','training','hr','human','staff','gender','diversity','hire','attrition','headcount'],
  safety:       ['safety','ppe','accident','incident','fire','first aid','ohs','iso 45001','ltir','drill','evacuation','hazard','near miss'],
  governance:   ['board','governance','audit','compliance','policy','committee','legal','agm','director','csr committee'],
  csr:          ['csr','community','beneficiary','charity','welfare','sdg','school','hospital','rural','social','ngos','villager'],
};

function mapToESGSection(item) {
  const stored = (item.section || '').toLowerCase().trim();
  if (stored && ESG_SECTION_LABELS[stored]) return { section: stored, confidence: 1.0 };

  const combined = [item.originalName, item.fileName, item.description, item.fieldReference]
    .filter(Boolean).join(' ').toLowerCase();

  let bestSec = null, bestCnt = 0;
  for (const [sec, kws] of Object.entries(ESG_KEYWORDS)) {
    const cnt = kws.filter(kw => combined.includes(kw)).length;
    if (cnt > bestCnt) { bestCnt = cnt; bestSec = sec; }
  }

  if (bestSec && bestCnt >= 1) {
    return { section: bestSec, confidence: Math.min(0.95, 0.45 + bestCnt * 0.12) };
  }
  return { section: null, confidence: 0 };
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 2: EIA SECTION MAPPING
══════════════════════════════════════════════════════════════════════════ */

const EIA_KEYWORDS = {
  air:         ['air','pm2.5','pm10','so2','nox','co','dust','smoke','particulate','aqm','caaqm','ambient air','stack','flue','emission'],
  water:       ['water quality','effluent','tds','ph','bod','cod','turbidity','coliform','groundwater','surface water','drainage','leachate'],
  soil:        ['soil','land','contamination','sediment','sludge','remediation','heavy metal','topsoil','erosion'],
  noise:       ['noise','sound','decibel','dba','vibration','acoustic','ambient noise'],
  impacts:     ['impact','habitat','flora','fauna','tree cutting','displacement','biodiversity','ecolog','sensitive','buffer zone'],
  mitigations: ['mitigation','control','measure','barrier','scrubber','plantation','netting','bunding','leachate collection'],
};

function mapToEIASection(item) {
  const stored = (item.module || '').toLowerCase().trim();
  if (stored && EIA_MODULE_LABELS[stored]) return { section: stored, confidence: 1.0 };

  const combined = [item.originalName, item.fileName, item.description, item.documentType]
    .filter(Boolean).join(' ').toLowerCase();

  let bestSec = null, bestCnt = 0;
  for (const [sec, kws] of Object.entries(EIA_KEYWORDS)) {
    const cnt = kws.filter(kw => combined.includes(kw)).length;
    if (cnt > bestCnt) { bestCnt = cnt; bestSec = sec; }
  }

  if (bestSec && bestCnt >= 1) {
    return { section: bestSec, confidence: Math.min(0.95, 0.45 + bestCnt * 0.12) };
  }
  return { section: null, confidence: 0 };
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 3: BEST IMAGE SELECTION
══════════════════════════════════════════════════════════════════════════ */

function selectBestImages(analyzedItems, maxPerSection = 3) {
  const bySection = {};

  analyzedItems
    .filter(i => i.isImage && !i.isDuplicate)
    .forEach(item => {
      const sec = item.esgSection || item.eiaSection || '_general';
      bySection[sec] = bySection[sec] || [];
      bySection[sec].push(item);
    });

  const recommendations = {};
  for (const [sec, items] of Object.entries(bySection)) {
    recommendations[sec] = items
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, maxPerSection)
      .map(i => ({
        id:           i.id,
        source:       i.source,
        qualityScore: i.qualityScore,
        qualityGrade: i.qualityGrade,
        autoCaption:  i.autoCaption,
        originalName: i.originalName,
        s3Key:        i.s3Key,
        sectionLabel: i.source === 'ESG'
          ? (ESG_SECTION_LABELS[i.esgSection] || null)
          : (EIA_MODULE_LABELS[i.eiaSection]  || null),
      }));
  }

  return recommendations;
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 3: REPORT IMAGE PLACEMENT LOGIC
══════════════════════════════════════════════════════════════════════════ */

function buildReportPlacementMap(analyzedItems, sectionOrder) {
  const placements = {};

  sectionOrder.forEach(secKey => {
    const candidates = analyzedItems
      .filter(i => i.isImage && !i.isDuplicate && (i.esgSection === secKey || i.eiaSection === secKey))
      .sort((a, b) => b.qualityScore - a.qualityScore);

    if (candidates.length > 0) {
      placements[secKey] = {
        primary: candidates[0],
        supporting: candidates.slice(1, 4),
        total: candidates.length,
      };
    }
  });

  return placements;
}

/* ══════════════════════════════════════════════════════════════════════════
   PART 3: EVIDENCE GALLERY ORGANISATION
══════════════════════════════════════════════════════════════════════════ */

function organiseGallery(analyzedItems) {
  const sections   = {};
  const categories = {};
  const quality    = { EXCELLENT: [], GOOD: [], FAIR: [], POOR: [] };

  analyzedItems.forEach(item => {
    // By section
    const sec = item.esgSection || item.eiaSection || 'unclassified';
    sections[sec] = sections[sec] || [];
    sections[sec].push(item);

    // By category
    categories[item.category] = categories[item.category] || [];
    categories[item.category].push(item);

    // By quality
    quality[item.qualityGrade].push(item);
  });

  // Sort each section's items by quality descending, cover images first
  Object.keys(sections).forEach(sec => {
    sections[sec].sort((a, b) => {
      if (a.isCoverImage && !b.isCoverImage) return -1;
      if (!a.isCoverImage && b.isCoverImage) return 1;
      return b.qualityScore - a.qualityScore;
    });
  });

  return { sections, categories, quality };
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN ORCHESTRATOR
══════════════════════════════════════════════════════════════════════════ */

async function analyzeEvidence(orgId, year, projectId) {
  const currentYear = Number(year) || new Date().getFullYear();

  const [esgEvidence, eiaEvidence] = await Promise.all([
    prisma.esgEvidence.findMany({
      where:   { organizationId: orgId, reportingYear: currentYear },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.eiaEvidence.findMany({
      where: projectId
        ? { projectId, project: { organizationId: orgId } }
        : { project: { organizationId: orgId } },
      orderBy: { createdAt: 'asc' },
    }).catch(() => []),
  ]);

  // Unified list for duplicate detection
  const allRaw = [
    ...esgEvidence.map(e => ({ ...e, _src: 'ESG' })),
    ...eiaEvidence.map(e => ({ ...e, _src: 'EIA' })),
  ];

  const duplicateMap = detectDuplicates(allRaw);

  // Analyse each item
  const analyzed = allRaw.map(item => {
    const source   = item._src;
    const mime     = (item.mimeType || '').toLowerCase();
    const isImage  = IMAGE_MIMES.has(mime);
    const category = categorizeEvidence(item);

    // Prefer stored qualityScore for ESG evidence (manually curated)
    const qScore = (source === 'ESG' && item.qualityScore != null)
      ? Number(item.qualityScore)
      : calculateQualityScore(item);

    const esgMap = mapToESGSection(item);
    const eiaMap = mapToEIASection(item);

    const sectionLabel = source === 'ESG'
      ? (ESG_SECTION_LABELS[esgMap.section] || null)
      : (EIA_MODULE_LABELS[eiaMap.section]  || null);

    return {
      id:            item.id,
      source,
      fileName:      item.fileName || item.originalName || '',
      originalName:  item.originalName || item.fileName || '',
      mimeType:      mime,
      sizeBytes:     item.sizeBytes || item.fileSize || 0,
      s3Key:         item.s3Key || null,
      description:   item.description || null,
      tags:          item.tags || [],
      section:       item.section || item.module || null,
      documentType:  item.documentType || null,
      monitoringDate: item.monitoringDate || null,
      createdAt:     item.createdAt,
      // Part 1
      isImage,
      isDocument:    !isImage,
      category,
      qualityScore:  qScore,
      qualityGrade:  qualityGrade(qScore),
      isDuplicate:   !!duplicateMap[item.id],
      duplicateOf:   duplicateMap[item.id] || null,
      // Part 2
      esgSection:      esgMap.section,
      esgConfidence:   esgMap.confidence,
      eiaSection:      eiaMap.section,
      eiaConfidence:   eiaMap.confidence,
      autoCaption:     generateCaption(item, sectionLabel),
      sectionLabel,
      // ESG-specific
      isVerified:    item.isVerified    || false,
      isCoverImage:  item.isCoverImage  || false,
      displayOrder:  item.displayOrder  || 0,
    };
  });

  // Part 3
  const recommendations  = selectBestImages(analyzed);
  const gallery          = organiseGallery(analyzed);

  const esgSections = Object.keys(ESG_SECTION_LABELS);
  const eiaSections = Object.keys(EIA_MODULE_LABELS);
  const reportPlacements = buildReportPlacementMap(analyzed, [...esgSections, ...eiaSections]);

  // Summary
  const images    = analyzed.filter(i => i.isImage);
  const docs      = analyzed.filter(i => i.isDocument);
  const dups      = analyzed.filter(i => i.isDuplicate);
  const highQual  = analyzed.filter(i => i.qualityGrade === 'EXCELLENT' || i.qualityGrade === 'GOOD');

  const sectionCounts = {};
  analyzed.forEach(i => {
    const sec = i.esgSection || i.eiaSection || 'unclassified';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
  });

  return {
    orgId,
    year:        currentYear,
    projectId:   projectId || null,
    generatedAt: new Date().toISOString(),
    evidence:    analyzed,
    summary: {
      total:        analyzed.length,
      images:       images.length,
      documents:    docs.length,
      duplicates:   dups.length,
      highQuality:  highQual.length,
      unclassified: analyzed.filter(i => !i.esgSection && !i.eiaSection).length,
      perSection:   sectionCounts,
    },
    recommendations,
    reportPlacements,
    gallery,
  };
}

async function updateQualityScore(orgId, evidenceId, computedScore) {
  return prisma.esgEvidence.updateMany({
    where: { id: evidenceId, organizationId: orgId },
    data:  { qualityScore: Math.min(100, Math.max(0, Math.round(computedScore))) },
  });
}

module.exports = { analyzeEvidence, updateQualityScore };
