'use strict';

/**
 * EIA Analytics Service — Phase 9
 * Computes risk analysis, compliance, trends, mitigation effectiveness,
 * performance score, and AI recommendations from EIA monitoring data.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ── Environmental Standards ─────────────────────────────────────── */

const AIR_STD = {
  pm25: 60, pm10: 100, so2: 80, nox: 80, no2: 80,
  co: 2000, o3: 100, nh3: 400, pb: 0.5, benzene: 5
};

const WATER_STD_UPPER = {
  tds: 500, turbidity: 1,
  arsenic: 0.01, cadmium: 0.003, chromium: 0.05, copper: 0.05,
  iron: 0.3, lead: 0.01, manganese: 0.1, mercury: 0.001,
  nitrates: 45, fluorides: 1.0, coliformTotal: 0
};
const WATER_PH_RANGE = { min: 6.5, max: 8.5 };

const SOIL_STD_UPPER = {
  arsenic: 20, cadmium: 3, chromium: 100, copper: 60,
  iron: 50000, lead: 250, manganese: 2000, nickel: 75,
  zinc: 300, mercury: 5
};
const SOIL_PH_RANGE = { min: 5.5, max: 8.5 };

/* Performance score component weights */
const SCORE_WEIGHTS = { compliance: 0.35, mitigation: 0.30, monitoring: 0.20, trend: 0.15 };

/* ── Utilities ───────────────────────────────────────────────────── */

const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct    = (n, d)       => d === 0 ? 100 : Math.round((n / d) * 1000) / 10;
const round1 = v             => Math.round(v * 10) / 10;

function complianceStatus(score) {
  if (score === null) return 'NO_DATA';
  if (score >= 95)    return 'COMPLIANT';
  if (score >= 80)    return 'AT_RISK';
  return 'NON_COMPLIANT';
}

function trendDirection(recentRate, earlyRate) {
  if (recentRate === null || earlyRate === null) return 'UNKNOWN';
  const delta = recentRate - earlyRate;
  if (delta < -5)  return 'IMPROVING';
  if (delta >  5)  return 'DEGRADING';
  return 'STABLE';
}

function topViolations(counts, total) {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([param, count]) => ({ param, count, rate: round1(pct(count, total)) }));
}

/* ── 1. Compliance Analysis ──────────────────────────────────────── */

function analyzeAirCompliance(records) {
  const total = records.length;
  if (total === 0) return { status: 'NO_DATA', score: null, violations: 0, total: 0, topViolations: [] };

  const violations = records.filter(r => r.anyExceedance).length;
  const score      = round1(pct(total - violations, total));

  const counts = {};
  records.forEach(r => {
    if (r.pm25Exceedance) counts['PM2.5'] = (counts['PM2.5'] || 0) + 1;
    if (r.pm10Exceedance) counts['PM10']  = (counts['PM10']  || 0) + 1;
    if (r.so2Exceedance)  counts['SO₂']   = (counts['SO₂']   || 0) + 1;
    if (r.noxExceedance)  counts['NOₓ']   = (counts['NOₓ']   || 0) + 1;
  });

  return { status: complianceStatus(score), score, violations, total, topViolations: topViolations(counts, total) };
}

function analyzeWaterCompliance(records) {
  const total = records.length;
  if (total === 0) return { status: 'NO_DATA', score: null, violations: 0, total: 0, topViolations: [] };

  const violations = records.filter(r => r.exceedanceFlag).length;
  const score      = round1(pct(total - violations, total));

  const counts = {};
  records.forEach(r => {
    Object.keys(WATER_STD_UPPER).forEach(p => {
      if (r[p] == null) return;
      const exceeded = p === 'coliformTotal' ? r[p] > 0 : r[p] > WATER_STD_UPPER[p];
      if (exceeded) counts[p] = (counts[p] || 0) + 1;
    });
    if (r.pH != null && (r.pH < WATER_PH_RANGE.min || r.pH > WATER_PH_RANGE.max)) {
      counts['pH'] = (counts['pH'] || 0) + 1;
    }
  });

  return { status: complianceStatus(score), score, violations, total, topViolations: topViolations(counts, total) };
}

function analyzeSoilCompliance(records) {
  const total = records.length;
  if (total === 0) return { status: 'NO_DATA', score: null, violations: 0, total: 0, topViolations: [] };

  const violations = records.filter(r => r.exceedanceFlag).length;
  const score      = round1(pct(total - violations, total));

  const counts = {};
  records.forEach(r => {
    Object.keys(SOIL_STD_UPPER).forEach(p => {
      if (r[p] != null && r[p] > SOIL_STD_UPPER[p]) counts[p] = (counts[p] || 0) + 1;
    });
    if (r.pH != null && (r.pH < SOIL_PH_RANGE.min || r.pH > SOIL_PH_RANGE.max)) {
      counts['pH'] = (counts['pH'] || 0) + 1;
    }
  });

  return { status: complianceStatus(score), score, violations, total, topViolations: topViolations(counts, total) };
}

function analyzeNoiseCompliance(records) {
  const total = records.length;
  if (total === 0) return { status: 'NO_DATA', score: null, violations: 0, total: 0, topViolations: [] };

  const violations = records.filter(r => r.anyExceedance).length;
  const score      = round1(pct(total - violations, total));

  const counts = {};
  records.forEach(r => {
    if (r.dayExceedance)   counts['Daytime']   = (counts['Daytime']   || 0) + 1;
    if (r.nightExceedance) counts['Nighttime'] = (counts['Nighttime'] || 0) + 1;
  });

  return { status: complianceStatus(score), score, violations, total, topViolations: topViolations(counts, total) };
}

/* ── 2. Environmental Risk Matrix ────────────────────────────────── */

const SIG_LEVELS = ['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'NEGLIGIBLE'];
const SIG_SCORE  = { VERY_HIGH: 5, HIGH: 4, MODERATE: 3, LOW: 2, NEGLIGIBLE: 1 };

function computeRiskMatrix(impacts) {
  const summary    = { VERY_HIGH: 0, HIGH: 0, MODERATE: 0, LOW: 0, NEGLIGIBLE: 0 };
  const byComponent = {};
  const topRisks   = [];

  /* Significance × ImpactType matrix */
  const matrix = {};
  SIG_LEVELS.forEach(s => { matrix[s] = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 }; });

  impacts.forEach(imp => {
    const sig  = imp.significance  || 'LOW';
    const type = imp.impactType    || 'NEGATIVE';
    const comp = imp.component     || 'Other';

    summary[sig] = (summary[sig] || 0) + 1;

    if (matrix[sig] && matrix[sig][type] !== undefined) matrix[sig][type]++;

    if (!byComponent[comp]) byComponent[comp] = { VERY_HIGH: 0, HIGH: 0, MODERATE: 0, LOW: 0, NEGLIGIBLE: 0 };
    byComponent[comp][sig] = (byComponent[comp][sig] || 0) + 1;

    if (SIG_SCORE[sig] >= 4) {
      topRisks.push({
        component:         comp,
        significance:      sig,
        score:             SIG_SCORE[sig],
        impactType:        type,
        description:       imp.description       || '',
        mitigationPossible: imp.mitigationPossible !== false,
        hasMitigation:     Array.isArray(imp.mitigations) && imp.mitigations.length > 0
      });
    }
  });

  topRisks.sort((a, b) => b.score - a.score);

  const byCmp = Object.entries(byComponent)
    .map(([component, counts]) => ({ component, ...counts, totalHigh: counts.VERY_HIGH + counts.HIGH }))
    .sort((a, b) => b.totalHigh - a.totalHigh);

  return { summary, matrix, topRisks: topRisks.slice(0, 10), byComponent: byCmp, totalImpacts: impacts.length };
}

/* ── 3. Monitoring Trends ────────────────────────────────────────── */

function buildTrend(records, exceedanceKey) {
  if (records.length === 0) return { dates: [], series: [], trend: 'UNKNOWN', exceedanceRates: { early: null, recent: null } };

  const sorted = [...records].sort((a, b) => new Date(a.monitoringDate) - new Date(b.monitoringDate));
  const dates  = sorted.map(r => r.monitoringDate.toISOString().split('T')[0]);

  const half       = Math.floor(sorted.length / 2) || 1;
  const earlySlice  = sorted.slice(0, half);
  const recentSlice = sorted.slice(half);
  const earlyRate   = round1(earlySlice.filter(r => r[exceedanceKey]).length / earlySlice.length * 100);
  const recentRate  = round1(recentSlice.filter(r => r[exceedanceKey]).length / (recentSlice.length || 1) * 100);

  return {
    dates,
    sorted,
    trend: trendDirection(recentRate, earlyRate),
    exceedanceRates: { early: earlyRate, recent: recentRate }
  };
}

function computeAirTrends(records) {
  const base = buildTrend(records, 'anyExceedance');
  if (!base.sorted) return base;

  base.series = [
    { key: 'pm25',   label: 'PM2.5', unit: 'µg/m³', std: AIR_STD.pm25,  color: '#0d9488' },
    { key: 'pm10',   label: 'PM10',  unit: 'µg/m³', std: AIR_STD.pm10,  color: '#059669' },
    { key: 'so2',    label: 'SO₂',   unit: 'µg/m³', std: AIR_STD.so2,   color: '#d97706' },
    { key: 'nox',    label: 'NOₓ',   unit: 'µg/m³', std: AIR_STD.nox,   color: '#7c3aed' },
  ].map(p => ({ ...p, data: base.sorted.map(r => r[p.key] != null ? round1(r[p.key]) : null) }));

  delete base.sorted;
  return base;
}

function computeWaterTrends(records) {
  const base = buildTrend(records, 'exceedanceFlag');
  if (!base.sorted) return base;

  base.series = [
    { key: 'pH',        label: 'pH',      unit: '',       std: null,                     color: '#0d9488' },
    { key: 'tds',       label: 'TDS',     unit: 'mg/L',   std: WATER_STD_UPPER.tds,      color: '#059669' },
    { key: 'arsenic',   label: 'Arsenic', unit: 'mg/L',   std: WATER_STD_UPPER.arsenic,  color: '#ef4444' },
    { key: 'lead',      label: 'Lead',    unit: 'mg/L',   std: WATER_STD_UPPER.lead,     color: '#f97316' },
    { key: 'bod',       label: 'BOD',     unit: 'mg/L',   std: null,                     color: '#8b5cf6' },
    { key: 'dissolvedO2', label: 'DO',    unit: 'mg/L',   std: null,                     color: '#06b6d4' },
  ].map(p => ({ ...p, data: base.sorted.map(r => r[p.key] != null ? round1(r[p.key]) : null) }));

  delete base.sorted;
  return base;
}

function computeSoilTrends(records) {
  const base = buildTrend(records, 'exceedanceFlag');
  if (!base.sorted) return base;

  base.series = [
    { key: 'pH',          label: 'pH',           unit: '',         std: null,                       color: '#0d9488' },
    { key: 'arsenic',     label: 'Arsenic',      unit: 'mg/kg',    std: SOIL_STD_UPPER.arsenic,    color: '#ef4444' },
    { key: 'lead',        label: 'Lead',         unit: 'mg/kg',    std: SOIL_STD_UPPER.lead,       color: '#f97316' },
    { key: 'chromium',    label: 'Chromium',     unit: 'mg/kg',    std: SOIL_STD_UPPER.chromium,   color: '#7c3aed' },
    { key: 'organicCarbon', label: 'Organic C',  unit: '%',        std: null,                       color: '#059669' },
  ].map(p => ({ ...p, data: base.sorted.map(r => r[p.key] != null ? round1(r[p.key]) : null) }));

  delete base.sorted;
  return base;
}

function computeNoiseTrends(records) {
  const base = buildTrend(records, 'anyExceedance');
  if (!base.sorted) return base;

  base.series = [
    { key: 'dayAvgDb',   label: 'Day Avg',   unit: 'dB(A)', stdKey: 'daytimeStd',  color: '#0d9488' },
    { key: 'nightAvgDb', label: 'Night Avg', unit: 'dB(A)', stdKey: 'nighttimeStd', color: '#7c3aed' },
    { key: 'leq',        label: 'Leq',       unit: 'dB(A)', stdKey: null,           color: '#d97706' },
  ].map(p => ({
    key:     p.key,
    label:   p.label,
    unit:    p.unit,
    color:   p.color,
    std:     null,
    data:    base.sorted.map(r => r[p.key] != null ? round1(r[p.key]) : null),
    stdData: p.stdKey ? base.sorted.map(r => r[p.stdKey] != null ? r[p.stdKey] : null) : null
  }));

  delete base.sorted;
  return base;
}

/* ── 4. Mitigation Effectiveness ────────────────────────────────── */

function computeMitigationEffectiveness(mitigations, impacts) {
  const total = mitigations.length;
  if (total === 0) {
    return { overallRate: 0, byStatus: { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0, NOT_APPLICABLE: 0, DEFERRED: 0 }, byComponent: [], achievementRate: null, criticalGaps: [], eligible: 0, total: 0 };
  }

  const byStatus = { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0, NOT_APPLICABLE: 0, DEFERRED: 0 };
  mitigations.forEach(m => { if (byStatus[m.status] !== undefined) byStatus[m.status]++; });

  const eligible      = total - byStatus.NOT_APPLICABLE - byStatus.DEFERRED;
  const overallRate   = eligible > 0 ? round1(pct(byStatus.COMPLETED, eligible)) : 100;

  /* By component */
  const compMap = {};
  mitigations.forEach(m => {
    const comp = m.component || 'General';
    if (!compMap[comp]) compMap[comp] = { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0, NOT_APPLICABLE: 0, DEFERRED: 0 };
    if (compMap[comp][m.status] !== undefined) compMap[comp][m.status]++;
  });
  const byComponent = Object.entries(compMap).map(([component, counts]) => {
    const e    = counts.PLANNED + counts.IN_PROGRESS + counts.COMPLETED;
    const rate = e > 0 ? round1(pct(counts.COMPLETED, e)) : 100;
    return { component, ...counts, completionRate: rate };
  }).sort((a, b) => a.completionRate - b.completionRate);

  /* Quantitative achievement rate */
  const withTargets = mitigations.filter(m => m.targetValue != null && m.actualValue != null && Number(m.targetValue) > 0);
  const achievementRate = withTargets.length > 0
    ? round1(withTargets.reduce((s, m) => s + Math.min(100, (Number(m.actualValue) / Number(m.targetValue)) * 100), 0) / withTargets.length)
    : null;

  /* Critical gaps: HIGH/VERY_HIGH impacts without a COMPLETED mitigation */
  const criticalGaps = impacts
    .filter(imp => (imp.significance === 'HIGH' || imp.significance === 'VERY_HIGH') && imp.mitigationPossible !== false)
    .filter(imp => {
      const linked = mitigations.filter(m => m.impactId === imp.id);
      return linked.length === 0 || linked.every(m => m.status !== 'COMPLETED');
    })
    .slice(0, 5)
    .map(imp => ({ component: imp.component, significance: imp.significance, description: imp.description || '' }));

  return { overallRate, byStatus, byComponent, achievementRate, criticalGaps, eligible, total };
}

/* ── 5. Monitoring Completeness ─────────────────────────────────── */

function computeMonitoringCompleteness(program, airCount, waterCount, soilCount, noiseCount) {
  const actual = airCount + waterCount + soilCount + noiseCount;

  if (!program) {
    return { completeness: actual > 0 ? 55 : 30, hasProgramDefined: false, expected: null, actual };
  }

  const expected =
    (Number(program.airStationsCount)    || 0) +
    (Number(program.waterSourcesCount)   || 0) +
    (Number(program.soilLocationsCount)  || 0) +
    (Number(program.noiseLocationsCount) || 0);

  const completeness = expected > 0
    ? Math.min(100, round1(pct(actual, expected)))
    : actual > 0 ? 80 : 40;

  return { completeness, hasProgramDefined: true, expected, actual };
}

/* ── 6. Environmental Performance Score ─────────────────────────── */

function computePerformanceScore(compliance, mitigation, monitoring, trends) {
  /* Compliance: record-count-weighted average across mediums that have data */
  const mediums      = ['air', 'water', 'soil', 'noise'];
  const datamediums  = mediums.filter(m => compliance[m].score !== null);
  let complianceScore;
  if (datamediums.length === 0) {
    complianceScore = 50;
  } else {
    const totalRecs = datamediums.reduce((s, m) => s + compliance[m].total, 0);
    complianceScore = totalRecs > 0
      ? round1(datamediums.reduce((s, m) => s + compliance[m].score * compliance[m].total, 0) / totalRecs)
      : round1(datamediums.reduce((s, m) => s + compliance[m].score, 0) / datamediums.length);
  }

  /* Mitigation */
  const mitigationScore = round1(
    mitigation.overallRate * 0.7 +
    (mitigation.achievementRate != null ? mitigation.achievementRate : 70) * 0.3
  );

  /* Monitoring completeness */
  const monitoringScore = round1(monitoring.completeness);

  /* Trend */
  const trendMap    = { IMPROVING: 90, STABLE: 65, DEGRADING: 20, UNKNOWN: 50 };
  const trendScore  = round1(mediums.reduce((s, m) => s + (trendMap[trends[m].trend] || 50), 0) / mediums.length);

  const overall = round1(
    clamp(complianceScore, 0, 100) * SCORE_WEIGHTS.compliance +
    clamp(mitigationScore, 0, 100) * SCORE_WEIGHTS.mitigation +
    clamp(monitoringScore, 0, 100) * SCORE_WEIGHTS.monitoring +
    clamp(trendScore,      0, 100) * SCORE_WEIGHTS.trend
  );

  const grade      = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';
  const gradeLabel = { A: 'Excellent', B: 'Good', C: 'Moderate', D: 'Poor', F: 'Critical' }[grade];

  return {
    overall: clamp(overall, 0, 100),
    grade,
    gradeLabel,
    components: {
      compliance:  clamp(complianceScore, 0, 100),
      mitigation:  clamp(mitigationScore, 0, 100),
      monitoring:  clamp(monitoringScore, 0, 100),
      trend:       clamp(trendScore,      0, 100)
    },
    weights: SCORE_WEIGHTS
  };
}

/* ── 7. AI Recommendations ──────────────────────────────────────── */

const CAP = s => s.charAt(0).toUpperCase() + s.slice(1);

function generateRecommendations(compliance, riskMatrix, mitigation, trends, monitoring, score) {
  const recs    = [];
  let   recId   = 1;
  const ORDER   = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const add = (priority, category, title, description, action) =>
    recs.push({ id: recId++, priority, category, title, description, action });

  /* — Compliance alerts — */
  ['air', 'water', 'soil', 'noise'].forEach(med => {
    const c = compliance[med];
    if (c.status === 'NON_COMPLIANT') {
      const top = c.topViolations[0]?.param || 'multiple parameters';
      add('HIGH', 'COMPLIANCE',
        `${CAP(med)} Quality Non-Compliance Detected`,
        `${c.violations} of ${c.total} records show exceedances (${round1(100 - c.score)}% violation rate). Top parameter: ${top} (${c.topViolations[0]?.rate || 0}% of records).`,
        `Investigate pollution sources contributing to ${top} exceedances. Implement source reduction controls and increase monitoring frequency to fortnightly.`
      );
    } else if (c.status === 'AT_RISK') {
      const params = c.topViolations.map(v => v.param).join(', ') || 'key parameters';
      add('MEDIUM', 'COMPLIANCE',
        `${CAP(med)} Quality At Risk`,
        `${c.violations} exceedance(s) detected. Compliance score: ${c.score}%. Affected parameters: ${params}.`,
        `Review control measures for ${params}. Maintain current monitoring frequency and investigate exceedance root causes.`
      );
    }
  });

  /* — High-risk unmitigated impacts — */
  const unmitigated = riskMatrix.topRisks.filter(r => !r.hasMitigation && r.mitigationPossible);
  if (unmitigated.length > 0) {
    const comps = [...new Set(unmitigated.map(r => r.component))].slice(0, 3).join(', ');
    add('CRITICAL', 'RISK',
      `${unmitigated.length} High-Significance Impact(s) Have No Mitigation`,
      `Components with unmitigated HIGH/VERY_HIGH significance impacts: ${comps}. These require immediate action under EIA notification requirements.`,
      `Develop and implement mitigation measures for ${comps} within 15 days. Register measures in the EIA monitoring system with KPIs and target dates.`
    );
  }

  /* — Mitigation critical gaps — */
  if (mitigation.criticalGaps.length > 0) {
    const gapComps = mitigation.criticalGaps.slice(0, 2).map(g => g.component).join(', ');
    add('HIGH', 'MITIGATION',
      `Critical Mitigation Gaps: ${mitigation.criticalGaps.length} Item(s)`,
      `High-significance impact(s) at ${gapComps} lack completed mitigation measures. This poses regulatory and environmental risk.`,
      `Prioritise completion of pending mitigation measures for ${gapComps}. Target completion within 30 days and verify with site inspection.`
    );
  }

  if (mitigation.total > 0 && mitigation.overallRate < 50) {
    add('HIGH', 'MITIGATION',
      `Low Mitigation Completion Rate: ${mitigation.overallRate}%`,
      `Only ${mitigation.byStatus.COMPLETED} of ${mitigation.eligible} eligible mitigation measures are completed (${mitigation.byStatus.IN_PROGRESS} in progress, ${mitigation.byStatus.PLANNED} planned).`,
      `Establish weekly progress tracking for all in-progress measures. Set completion milestones for each component. Escalate to management if behind schedule.`
    );
  } else if (mitigation.total > 0 && mitigation.overallRate < 75) {
    add('MEDIUM', 'MITIGATION',
      `Mitigation Completion at ${mitigation.overallRate}% — Below 75% Target`,
      `${mitigation.byStatus.IN_PROGRESS} measure(s) are in progress and ${mitigation.byStatus.PLANNED} are planned. Completion target of 75% not yet achieved.`,
      `Accelerate in-progress measures. Review deferred items and assess if any can be reactivated based on current project status.`
    );
  }

  /* — Degrading trends — */
  ['air', 'water', 'soil', 'noise'].forEach(med => {
    const t = trends[med];
    if (t.trend === 'DEGRADING') {
      add('HIGH', 'TREND',
        `Degrading ${CAP(med)} Quality Trend`,
        `${CAP(med)} quality is worsening: exceedance rate increased from ${t.exceedanceRates?.early || 0}% (earlier period) to ${t.exceedanceRates?.recent || 0}% (recent period).`,
        `Conduct root-cause analysis of ${med} quality degradation. Check for recent operational changes, equipment failures, or seasonal factors. Implement corrective actions immediately.`
      );
    } else if (t.trend === 'IMPROVING') {
      add('LOW', 'TREND',
        `${CAP(med)} Quality Trend Improving`,
        `${CAP(med)} exceedance rate declined from ${t.exceedanceRates?.early || 0}% to ${t.exceedanceRates?.recent || 0}%. Current controls are effective.`,
        `Document the successful control measures for ${med} quality. Maintain current management practices and continue monitoring at established frequency.`
      );
    }
  });

  /* — Monitoring program gaps — */
  if (!monitoring.hasProgramDefined) {
    add('MEDIUM', 'MONITORING',
      'No Formal Environmental Monitoring Program Defined',
      'An Environmental Monitoring Program (EMP) has not been established for this project. This is a regulatory requirement under MoEFCC guidelines.',
      'Define a comprehensive EMP specifying monitoring frequencies, parameters, station counts, laboratory details, and budget for all environmental mediums.'
    );
  } else if (monitoring.completeness < 70) {
    const gap = monitoring.expected - monitoring.actual;
    add('MEDIUM', 'MONITORING',
      `Monitoring Coverage at ${monitoring.completeness}% of Planned Target`,
      `${monitoring.actual} monitoring stations are active versus ${monitoring.expected} planned in the approved EMP. ${gap} station(s) are not yet contributing data.`,
      `Activate the ${gap} remaining monitoring station(s) per the approved program. Ensure data is recorded and uploaded in the EIA system for all active stations.`
    );
  }

  /* — Overall performance — */
  if (score.overall < 50) {
    add('CRITICAL', 'PERFORMANCE',
      `Environmental Performance Critical: Grade ${score.grade} (${score.overall}/100)`,
      `The project's Environmental Performance Score of ${score.overall}/100 indicates critical deficiencies across compliance (${score.components.compliance}), mitigation (${score.components.mitigation}), and monitoring (${score.components.monitoring}).`,
      `Invoke an Emergency Environmental Action Plan. Convene an EIA review meeting with all department heads within 7 days. Submit a corrective action schedule to SPCB if violations persist.`
    );
  } else if (score.overall >= 90) {
    add('LOW', 'PERFORMANCE',
      `Excellent Environmental Performance: Grade ${score.grade} (${score.overall}/100)`,
      `The project demonstrates excellent environmental management with a score of ${score.overall}/100. All major indicators are on track.`,
      `Maintain current management practices. Consider pursuing ISO 14001 certification or submitting for an environmental excellence award. Schedule a third-party audit for independent verification.`
    );
  }

  recs.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  return recs;
}

/* ── Main Entry Point ────────────────────────────────────────────── */

async function computeAnalytics(projectId) {
  const [airRecords, waterRecords, soilRecords, noiseRecords, impacts, mitigations, program] =
    await Promise.all([
      prisma.eiaAirMonitoring.findMany({   where: { projectId }, orderBy: { monitoringDate: 'asc' } }),
      prisma.eiaWaterMonitoring.findMany({ where: { projectId }, orderBy: { monitoringDate: 'asc' } }),
      prisma.eiaSoilMonitoring.findMany({  where: { projectId }, orderBy: { monitoringDate: 'asc' } }),
      prisma.eiaNoiseMonitoring.findMany({ where: { projectId }, orderBy: { monitoringDate: 'asc' } }),
      prisma.eiaImpactAssessment.findMany({
        where:   { projectId },
        include: { mitigations: { select: { id: true, status: true, impactId: true } } }
      }),
      prisma.eiaMitigationMeasure.findMany({ where: { projectId } }),
      prisma.eiaMonitoringProgram.findUnique({ where: { projectId } }),
    ]);

  const compliance = {
    air:   analyzeAirCompliance(airRecords),
    water: analyzeWaterCompliance(waterRecords),
    soil:  analyzeSoilCompliance(soilRecords),
    noise: analyzeNoiseCompliance(noiseRecords),
  };

  const riskMatrix = computeRiskMatrix(impacts);

  const trends = {
    air:   computeAirTrends(airRecords),
    water: computeWaterTrends(waterRecords),
    soil:  computeSoilTrends(soilRecords),
    noise: computeNoiseTrends(noiseRecords),
  };

  const mitigation = computeMitigationEffectiveness(mitigations, impacts);

  const monitoring = computeMonitoringCompleteness(
    program, airRecords.length, waterRecords.length, soilRecords.length, noiseRecords.length
  );

  const performanceScore = computePerformanceScore(compliance, mitigation, monitoring, trends);

  const recommendations = generateRecommendations(
    compliance, riskMatrix, mitigation, trends, monitoring, performanceScore
  );

  return {
    performanceScore,
    compliance,
    riskMatrix,
    trends,
    mitigation,
    monitoring,
    recommendations,
    meta: {
      projectId,
      computedAt: new Date().toISOString(),
      recordCounts: {
        air:         airRecords.length,
        water:       waterRecords.length,
        soil:        soilRecords.length,
        noise:       noiseRecords.length,
        impacts:     impacts.length,
        mitigations: mitigations.length
      }
    }
  };
}

module.exports = { computeAnalytics };
