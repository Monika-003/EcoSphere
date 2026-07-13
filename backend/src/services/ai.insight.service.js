'use strict';

/**
 * AI Insight Service — Phase 11
 * Generates data-driven narratives from ESG and EIA collected data.
 * RULE: All text is conditional on actual stored values. Zero fabrication.
 */

const { prisma } = require('../config/database');
const { computeAnalytics } = require('./eia.analytics.service');

/* ── Numeric helpers ─────────────────────────────────────────────────────── */
const safe  = v => (v != null && !isNaN(Number(v))) ? Number(v) : null;
const n     = (v, d = 2) => safe(v) != null ? Number(v).toFixed(d) : null;
const fmt   = (v, d = 0) => safe(v) != null ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: d }) : 'N/A';

function scoreToSeverity(score) {
  if (score == null) return 'MODERATE';
  if (score >= 80)   return 'EXCELLENT';
  if (score >= 60)   return 'GOOD';
  if (score >= 40)   return 'MODERATE';
  if (score >= 20)   return 'CONCERN';
  return 'CRITICAL';
}

/* ══════════════════════════════════════════════════════════════════════════
   ESG NARRATIVE GENERATORS
══════════════════════════════════════════════════════════════════════════ */

function narrateExecutiveSummary(score, prevScore, safety, year) {
  if (!score) {
    return {
      id: 'esg_summary', title: 'ESG Executive Summary',
      narrative: `ESG data for ${year} has been partially collected. A composite score could not be computed due to incomplete submissions. The available data provides a preliminary view of sustainability performance.`,
      severity: 'MODERATE', dataAvailable: false
    };
  }

  const overall  = safe(score.overallScore);
  const grade    = score.grade || '—';
  const envScore = safe(score.envScore);
  const socScore = safe(score.socialScore);
  const govScore = safe(score.govScore);

  let opening;
  if (overall >= 80)      opening = `The organisation delivers strong ESG performance for ${year}, achieving an overall score of ${overall}/100 (Grade ${grade}).`;
  else if (overall >= 60) opening = `The organisation's ESG performance for ${year} reflects a developing maturity, with an overall score of ${overall}/100 (Grade ${grade}) indicating measurable progress alongside persistent improvement areas.`;
  else if (overall >= 40) opening = `The organisation's ESG score for ${year} stands at ${overall}/100 (Grade ${grade}), indicating an early-stage sustainability journey with material gaps requiring systematic attention.`;
  else                    opening = `The organisation's ESG performance for ${year} (Score: ${overall}/100, Grade ${grade}) reveals significant capacity-building requirements across Environmental, Social, and Governance dimensions.`;

  const pillars = [
    { name: 'Environmental', score: envScore },
    { name: 'Social',        score: socScore },
    { name: 'Governance',    score: govScore }
  ].filter(p => p.score != null).sort((a, b) => b.score - a.score);

  let pillarLine = '';
  if (pillars.length >= 2) {
    pillarLine = ` ${pillars[0].name} is the strongest pillar at ${pillars[0].score}/100, while ${pillars[pillars.length - 1].name} (${pillars[pillars.length - 1].score}/100) presents the primary improvement opportunity.`;
  }

  let trendLine = '';
  const prevOverall = safe(prevScore?.overallScore);
  if (prevOverall != null && overall != null) {
    const delta = overall - prevOverall;
    if (delta > 2)       trendLine = ` Year-on-year performance has improved by ${delta.toFixed(0)} points (from ${prevOverall}/100), reflecting positive momentum.`;
    else if (delta < -2) trendLine = ` This represents a decline of ${Math.abs(delta).toFixed(0)} points from the previous year (${prevOverall}/100), warranting a review of data quality and commitment delivery.`;
    else                 trendLine = ` Performance remains broadly stable compared to the prior year (${prevOverall}/100).`;
  }

  let safetyLine = '';
  if (safe(safety?.fatalities) > 0) {
    safetyLine = ` CRITICAL: ${safety.fatalities} workplace fatality/fatalities reported — immediate investigation protocols must be activated per statutory requirements.`;
  }

  return {
    id: 'esg_summary', title: 'ESG Executive Summary',
    narrative: opening + pillarLine + trendLine + safetyLine,
    severity: scoreToSeverity(overall),
    overall, grade, envScore, socScore, govScore,
    dataAvailable: true, year
  };
}

function narrateEnergy(energy, score) {
  if (!energy) return null;

  const reRaw  = safe(energy.renewable) || 0;
  const fossil = (safe(energy.gridElectricity) || 0) + (safe(energy.dieselConsumption) || 0) +
                 (safe(energy.naturalGas) || 0) + (safe(energy.lpg) || 0) +
                 (safe(energy.coal) || 0) + (safe(energy.steam) || 0);
  const total  = reRaw + fossil;

  if (total === 0) {
    return {
      id: 'energy', title: 'Energy Consumption',
      narrative: 'Energy consumption data has not been reported for this period.',
      severity: 'CONCERN', category: 'ENERGY', pillar: 'ENVIRONMENTAL', metric: null
    };
  }

  const rePct  = safe(energy.renewablePercent) ?? (total > 0 ? (reRaw / total * 100) : null);
  const reTgt  = safe(energy.renewableTarget);
  const intVal = safe(energy.intensityValue);
  const intU   = energy.intensityMetricUnit || 'unit';

  let narrative;
  if (rePct != null) {
    if (rePct >= 75)      narrative = `The organisation has achieved an exceptional renewable energy share of ${n(rePct, 1)}% of total consumption, demonstrating clean energy leadership.`;
    else if (rePct >= 50) narrative = `The organisation has achieved a renewable energy share of ${n(rePct, 1)}%, reflecting substantial progress in decarbonising the energy mix.`;
    else if (rePct >= 25) narrative = `Renewable energy constitutes ${n(rePct, 1)}% of total energy consumption, indicating a transitioning portfolio with room for further scale-up.`;
    else                  narrative = `The current renewable energy share stands at ${n(rePct, 1)}%, indicating significant dependence on fossil-fuel-based sources.`;

    if (reTgt != null && reTgt > rePct) {
      narrative += ` A gap of ${(reTgt - rePct).toFixed(1)} percentage points remains against the stated target of ${reTgt}%, requiring accelerated renewable procurement or on-site generation investments.`;
    } else if (reTgt != null && rePct >= reTgt) {
      narrative += ` The organisation has met or exceeded its renewable energy target of ${reTgt}%.`;
    }
  } else {
    narrative = `Total energy consumption of ${fmt(total)} GJ has been reported. Renewable energy breakdown was not separately classified.`;
  }

  if (intVal != null) {
    narrative += ` Energy intensity is reported at ${n(intVal, 2)} GJ per ${intU}.`;
  }

  const subscore = safe(score?.energyScore);
  const sev = subscore != null ? scoreToSeverity(subscore) : (rePct == null ? 'MODERATE' : rePct >= 50 ? 'GOOD' : rePct >= 25 ? 'MODERATE' : 'CONCERN');

  return {
    id: 'energy', title: 'Energy Consumption & Renewable Transition', narrative, severity: sev,
    metric: { value: rePct != null ? n(rePct, 1) : fmt(total), unit: rePct != null ? '%' : 'GJ', label: rePct != null ? 'Renewable Share' : 'Total Energy' },
    category: 'ENERGY', pillar: 'ENVIRONMENTAL'
  };
}

function narrateEmissions(emissions, score) {
  if (!emissions) return null;

  const s1 = (safe(emissions.scope1Stationary) || 0) + (safe(emissions.scope1Mobile) || 0) +
             (safe(emissions.scope1Fugitive)   || 0) + (safe(emissions.scope1Process) || 0);
  const s2 = safe(emissions.scope2MarketBased) ?? safe(emissions.scope2LocationBased) ?? 0;
  const s3 = safe(emissions.scope3Total);
  const total12 = s1 + s2;

  if (total12 === 0 && s3 == null) {
    return {
      id: 'emissions', title: 'GHG Emissions',
      narrative: 'GHG emissions data has not been reported for this period.',
      severity: 'CONCERN', category: 'EMISSIONS', pillar: 'ENVIRONMENTAL', metric: null
    };
  }

  let narrative = `Combined Scope 1 and Scope 2 GHG emissions total ${fmt(total12)} tCO₂e.`;

  if (s1 > 0 && s2 > 0) {
    narrative += ` Scope 1 direct emissions account for ${(s1 / total12 * 100).toFixed(1)}% (${fmt(s1)} tCO₂e) of the combined total.`;
  }

  if (s3 != null && s3 > 0) {
    const s3ratio = (s3 / (total12 + s3) * 100).toFixed(1);
    narrative += ` Scope 3 value-chain emissions of ${fmt(s3)} tCO₂e represent ${s3ratio}% of total reported emissions, highlighting downstream decarbonisation opportunities.`;
  }

  const baseYr  = safe(emissions.baseYear);
  const baseEm  = safe(emissions.baseYearEmissions);
  if (baseYr && baseEm && total12 > 0) {
    const chgPct = ((baseEm - total12) / baseEm * 100).toFixed(1);
    if (Number(chgPct) > 0) narrative += ` Compared to the ${baseYr} baseline (${fmt(baseEm)} tCO₂e), a reduction of ${chgPct}% has been achieved.`;
    else                    narrative += ` Emissions are ${Math.abs(chgPct)}% above the ${baseYr} baseline of ${fmt(baseEm)} tCO₂e, requiring a review of the decarbonisation roadmap.`;
  }

  const intVal = safe(emissions.intensityValue);
  const intU   = emissions.intensityMetricUnit || 'unit';
  if (intVal != null) narrative += ` Emissions intensity: ${n(intVal, 3)} tCO₂e per ${intU}.`;
  if (emissions.sbtiStatus)   narrative += ` Science-Based Target status: ${emissions.sbtiStatus}.`;
  if (safe(emissions.netZeroYear)) narrative += ` Net-zero commitment year: ${emissions.netZeroYear}.`;

  return {
    id: 'emissions', title: 'GHG Emissions & Decarbonisation', narrative,
    severity: scoreToSeverity(safe(score?.emissionsScore)),
    metric: { value: fmt(total12), unit: 'tCO₂e', label: 'Scope 1+2 Emissions' },
    category: 'EMISSIONS', pillar: 'ENVIRONMENTAL'
  };
}

function narrateWater(water, score) {
  if (!water) return null;

  const total    = safe(water.totalWithdrawal);
  const recycled = safe(water.recycledWater);
  const recycPct = safe(water.recyclingRate) ?? (total > 0 && recycled != null ? (recycled / total * 100) : null);
  const zld      = water.zldAchieved;

  if (!total && recycPct == null) {
    return {
      id: 'water', title: 'Water Stewardship',
      narrative: 'Water consumption and recycling data has not been reported for this period.',
      severity: 'CONCERN', category: 'WATER', pillar: 'ENVIRONMENTAL', metric: null
    };
  }

  let narrative = total ? `Total water withdrawal: ${fmt(total)} KL.` : 'Water withdrawal volumes have been partially reported.';

  if (recycPct != null) {
    if (recycPct >= 50)      narrative += ` Recycling and reuse account for ${n(recycPct, 1)}% of withdrawal, reflecting strong circular water management.`;
    else if (recycPct >= 25) narrative += ` The water recycling rate of ${n(recycPct, 1)}% indicates moderate progress in reducing freshwater dependency.`;
    else                     narrative += ` The water recycling rate of ${n(recycPct, 1)}% is below optimal, representing a material improvement opportunity.`;
  }

  if (zld === true  || zld === 'true')  narrative += ' Zero Liquid Discharge (ZLD) has been achieved.';
  if (zld === false || zld === 'false') narrative += ' ZLD has not yet been achieved; effluent treatment capacity enhancements may be warranted.';

  if (water.waterStressAssessment) narrative += ` Water stress context: ${water.waterStressAssessment}.`;

  return {
    id: 'water', title: 'Water Stewardship', narrative,
    severity: scoreToSeverity(safe(score?.waterScore)),
    metric: { value: recycPct != null ? n(recycPct, 1) : fmt(total), unit: recycPct != null ? '%' : 'KL', label: recycPct != null ? 'Recycling Rate' : 'Total Withdrawal' },
    category: 'WATER', pillar: 'ENVIRONMENTAL'
  };
}

function narrateWaste(waste, score) {
  if (!waste) return null;

  const totalW = safe(waste.totalWaste);
  const hazW   = safe(waste.totalHazardousWaste);
  const divPct = safe(waste.diversionRate);

  if (!totalW && divPct == null) {
    return {
      id: 'waste', title: 'Waste Management',
      narrative: 'Waste generation and diversion data has not been reported for this period.',
      severity: 'CONCERN', category: 'WASTE', pillar: 'ENVIRONMENTAL', metric: null
    };
  }

  let narrative = totalW ? `Total waste generated: ${fmt(totalW)} MT.` : 'Waste generation volumes have been partially reported.';

  if (hazW != null && totalW > 0) {
    narrative += ` Hazardous waste constitutes ${(hazW / totalW * 100).toFixed(1)}% (${fmt(hazW)} MT), requiring strict PCHWM Rules 2016 compliance.`;
  }

  if (divPct != null) {
    if (divPct >= 80)      narrative += ` Waste diversion rate of ${n(divPct, 1)}% demonstrates near-zero-waste operations.`;
    else if (divPct >= 60) narrative += ` A diversion rate of ${n(divPct, 1)}% indicates good waste recovery performance.`;
    else if (divPct >= 40) narrative += ` Diversion rate of ${n(divPct, 1)}% indicates room to improve recycling, composting, and co-processing channels.`;
    else                   narrative += ` Diversion rate of ${n(divPct, 1)}% suggests the majority of waste reaches landfill or incineration — a significant improvement opportunity.`;
  }

  if (waste.pchwmAuthorization) {
    narrative += ` PCHWM authorisation is confirmed${waste.pchwmNo ? ' (Reg. No. ' + waste.pchwmNo + ')' : ''}.`;
  }

  return {
    id: 'waste', title: 'Waste Generation & Diversion', narrative,
    severity: scoreToSeverity(safe(score?.wasteScore)),
    metric: { value: divPct != null ? n(divPct, 1) : fmt(totalW), unit: divPct != null ? '%' : 'MT', label: divPct != null ? 'Diversion Rate' : 'Total Waste' },
    category: 'WASTE', pillar: 'ENVIRONMENTAL'
  };
}

function narratateBiodiversity(bio, score) {
  if (!bio) return null;

  const green   = safe(bio.greenCoverArea);
  const trees   = safe(bio.treesPlanted);
  const species = safe(bio.speciesMonitored ?? bio.speciesProtected);
  const paProx  = bio.protectedAreaProximity ?? bio.nearProtectedArea;

  if (!green && !trees) {
    return {
      id: 'biodiversity', title: 'Biodiversity & Green Cover',
      narrative: 'Biodiversity and green cover data has not been reported for this period.',
      severity: 'MODERATE', category: 'BIODIVERSITY', pillar: 'ENVIRONMENTAL', metric: null
    };
  }

  let narrative = '';
  if (green)   narrative += `Green cover area: ${fmt(green, 2)} hectares.`;
  if (trees)   narrative += (narrative ? ' ' : '') + `${fmt(trees)} trees planted during the reporting period.`;
  if (species) narrative += ` ${species} species are actively monitored.`;
  if (paProx === true || paProx === 'true') {
    narrative += ' The site is proximate to a protected/ecologically sensitive area, necessitating enhanced biodiversity safeguards.';
  }

  return {
    id: 'biodiversity', title: 'Biodiversity & Green Cover',
    narrative: narrative || 'Partial biodiversity data is on record.',
    severity: scoreToSeverity(safe(score?.biodiversityScore)),
    metric: { value: green ? n(green, 2) : fmt(trees), unit: green ? 'ha' : 'trees', label: green ? 'Green Cover' : 'Trees Planted' },
    category: 'BIODIVERSITY', pillar: 'ENVIRONMENTAL'
  };
}

function narrateEmployees(emp, score) {
  if (!emp) return null;

  const permM  = safe(emp.totalPermanentMale)   || 0;
  const permF  = safe(emp.totalPermanentFemale) || 0;
  const contrM = safe(emp.totalContractMale)    || 0;
  const contrF = safe(emp.totalContractFemale)  || 0;
  const casM   = safe(emp.totalCasualMale)      || 0;
  const casF   = safe(emp.totalCasualFemale)    || 0;
  const total  = permM + permF + contrM + contrF + casM + casF;
  const females = permF + contrF + casF;

  if (total === 0) {
    return {
      id: 'employees', title: 'Workforce Profile',
      narrative: 'Workforce data has not been reported for this period.',
      severity: 'CONCERN', category: 'EMPLOYEES', pillar: 'SOCIAL', metric: null
    };
  }

  const genderPct  = total > 0 ? (females / total * 100) : null;
  const snrMgmt    = safe(emp.seniorMgmtTotal);
  const snrF       = safe(emp.seniorMgmtFemale);
  const attrition  = safe(emp.attritionRate);
  const training   = safe(emp.avgTrainingHours);

  let narrative = `Total workforce: ${fmt(total)} employees${(permM + permF) > 0 ? ` (${fmt(permM + permF)} permanent)` : ''}.`;

  if (genderPct != null) {
    if (genderPct >= 30)      narrative += ` Women represent ${n(genderPct, 1)}% of the workforce, reflecting positive gender inclusion.`;
    else if (genderPct >= 15) narrative += ` Female representation of ${n(genderPct, 1)}% indicates room for improved gender diversity.`;
    else                      narrative += ` Female representation stands at ${n(genderPct, 1)}%, highlighting a significant gender diversity gap requiring targeted interventions.`;
  }

  if (snrMgmt && snrF != null) {
    narrative += ` Women hold ${(snrF / snrMgmt * 100).toFixed(1)}% of senior management positions (${snrF} of ${snrMgmt}).`;
  }

  if (training != null) narrative += ` Average training: ${n(training, 1)} hours per employee.`;

  if (attrition != null) {
    if (attrition <= 10)      narrative += ` Attrition rate of ${n(attrition, 1)}% indicates strong employee retention.`;
    else if (attrition <= 20) narrative += ` Attrition rate of ${n(attrition, 1)}% is within industry norms.`;
    else                      narrative += ` Attrition rate of ${n(attrition, 1)}% is elevated and may indicate engagement or retention challenges.`;
  }

  return {
    id: 'employees', title: 'Workforce & Diversity', narrative,
    severity: scoreToSeverity(safe(score?.employeeScore)),
    metric: { value: fmt(total), unit: 'employees', label: 'Total Workforce' },
    category: 'EMPLOYEES', pillar: 'SOCIAL'
  };
}

function narrateSafety(safety, score) {
  if (!safety) return null;

  const fatalities = safe(safety.fatalities);
  const ltir       = safe(safety.lostTimeInjuryRate);
  const trir       = safe(safety.totalRecordableInjuryRate);
  const hours      = safe(safety.totalManHours);
  const iso45001   = safety.iso45001Certified;
  const nearMiss   = safe(safety.nearMissReported);

  if (fatalities == null && ltir == null && hours == null) {
    return {
      id: 'safety', title: 'Occupational Health & Safety',
      narrative: 'Safety performance data has not been reported for this period.',
      severity: 'CONCERN', category: 'SAFETY', pillar: 'SOCIAL', metric: null
    };
  }

  let severity = scoreToSeverity(safe(score?.safetyScore));
  let narrative = '';

  if (fatalities > 0) {
    narrative = `CRITICAL: ${fatalities} workplace fatality/fatalities recorded. This requires immediate investigation, regulatory notification per Factories Act 1948, and systemic corrective action.`;
    severity = 'CRITICAL';
  } else if (fatalities === 0) {
    narrative = 'Zero fatalities recorded during the reporting period.';
  }

  if (hours != null) narrative += (narrative ? ' ' : '') + `Total man-hours worked: ${fmt(hours)}.`;

  if (ltir != null) {
    if (ltir === 0)       narrative += ' LTIR is zero — ideal safety performance.';
    else if (ltir <= 0.5) narrative += ` LTIR of ${n(ltir, 2)} per million man-hours is within acceptable benchmarks.`;
    else if (ltir <= 1.0) narrative += ` LTIR of ${n(ltir, 2)} warrants enhanced hazard identification programmes.`;
    else                  narrative += ` LTIR of ${n(ltir, 2)} is above acceptable benchmarks, indicating systemic safety risks requiring root-cause analysis.`;
  }

  if (trir != null) narrative += ` TRIR: ${n(trir, 2)}.`;

  if (nearMiss > 0) narrative += ` ${nearMiss} near-miss incidents reported, demonstrating a proactive safety culture.`;

  if (iso45001 === true || iso45001 === 'true') narrative += ' ISO 45001:2018 certification is in place.';

  return {
    id: 'safety', title: 'Occupational Health & Safety', narrative, severity,
    metric: { value: ltir != null ? n(ltir, 2) : (fatalities != null ? fatalities : '—'), unit: ltir != null ? 'LTIR' : 'fatalities', label: ltir != null ? 'Lost Time Injury Rate' : 'Fatalities' },
    category: 'SAFETY', pillar: 'SOCIAL'
  };
}

function narrateCSR(csr, score) {
  if (!csr) return null;

  const obligtn  = safe(csr.obligatoryAmount ?? csr.obligation ?? csr.mandatorySpend ?? csr.csrObligation);
  const spent    = safe(csr.actualSpend ?? csr.spentAmount ?? csr.csrSpend ?? csr.totalSpend);
  const benefic  = safe(csr.totalBeneficiaries ?? csr.beneficiaries);
  const projects = safe(csr.projectsCompleted ?? csr.projects ?? csr.totalProjects);

  if (!spent && !obligtn) {
    return {
      id: 'csr', title: 'Corporate Social Responsibility',
      narrative: 'CSR expenditure and programme data has not been reported for this period.',
      severity: 'MODERATE', category: 'CSR', pillar: 'SOCIAL', metric: null
    };
  }

  let narrative = '';
  if (obligtn && spent) {
    const utilPct = (spent / obligtn * 100).toFixed(1);
    if (Number(utilPct) >= 100) {
      narrative = `The organisation has met its statutory CSR obligation, utilising ₹${fmt(spent, 2)} lakh out of ₹${fmt(obligtn, 2)} lakh required (${utilPct}% utilisation).`;
    } else {
      narrative = `CSR expenditure stands at ₹${fmt(spent, 2)} lakh against a statutory obligation of ₹${fmt(obligtn, 2)} lakh (${utilPct}% utilised). A shortfall of ₹${(obligtn - spent).toFixed(2)} lakh may attract compliance risk under the Companies Act 2013.`;
    }
  } else if (spent) {
    narrative = `CSR investment of ₹${fmt(spent, 2)} lakh deployed during the reporting year.`;
  }

  if (benefic) narrative += ` ${fmt(benefic)} beneficiaries reached.`;
  if (projects) narrative += ` ${projects} CSR project(s) completed or under execution.`;

  return {
    id: 'csr', title: 'Corporate Social Responsibility',
    narrative: narrative || 'Partial CSR data is on record.',
    severity: scoreToSeverity(safe(score?.csrScore)),
    metric: { value: spent ? fmt(spent, 2) : '—', unit: '₹ Lakh', label: 'CSR Spend' },
    category: 'CSR', pillar: 'SOCIAL'
  };
}

function narrateGovernance(gov, score) {
  if (!gov) return null;

  const boardTotal = safe(gov.boardTotal);
  const boardIndep = safe(gov.boardIndependent);
  const boardFem   = safe(gov.boardFemale);
  const indepPct   = (boardTotal > 0 && boardIndep != null) ? (boardIndep / boardTotal * 100) : null;
  const femBdPct   = (boardTotal > 0 && boardFem   != null) ? (boardFem   / boardTotal * 100) : null;
  const compRate   = safe(gov.regulatoryComplianceRate);
  const penalties  = safe(gov.penalties);
  const legalNot   = safe(gov.legalNotices);
  const ethics     = safe(gov.ethicsTrainingCoverage);

  if (!boardTotal && compRate == null) {
    return {
      id: 'governance', title: 'Corporate Governance',
      narrative: 'Governance data has not been reported for this period.',
      severity: 'MODERATE', category: 'GOVERNANCE', pillar: 'GOVERNANCE', metric: null
    };
  }

  let narrative = '';

  if (boardTotal) {
    narrative = `Board of Directors: ${boardTotal} members.`;
    if (indepPct != null) {
      narrative += indepPct >= 50
        ? ` Board independence of ${n(indepPct, 1)}% meets SEBI LODR requirements.`
        : ` Board independence of ${n(indepPct, 1)}% may not fully meet SEBI LODR independent director requirements.`;
    }
    if (femBdPct != null) {
      narrative += ` Women hold ${n(femBdPct, 1)}% of board positions (${boardFem} director${boardFem !== 1 ? 's' : ''}).`;
    }
  }

  if (compRate != null) {
    if (compRate >= 95)      narrative += ` Regulatory compliance rate of ${n(compRate, 1)}% indicates robust governance systems.`;
    else if (compRate >= 80) narrative += ` Regulatory compliance rate of ${n(compRate, 1)}% is satisfactory with minor gaps.`;
    else                     narrative += ` Regulatory compliance rate of ${n(compRate, 1)}% warrants a governance gap assessment.`;
  }

  if (penalties > 0)  narrative += ` ${penalties} financial penalty/penalties levied — root-cause and corrective action review required.`;
  if (legalNot > 0)   narrative += ` ${legalNot} regulatory notice(s) received; formal tracking of responses is advised.`;

  const policies = [gov.codeOfConduct && 'Code of Conduct', gov.whistleblowerPolicy && 'Whistleblower Policy', gov.antiCorruptionPolicy && 'Anti-Corruption Policy'].filter(Boolean);
  if (policies.length > 0) narrative += ` Governance policies in place: ${policies.join(', ')}.`;
  if (ethics != null) narrative += ` Ethics training coverage: ${n(ethics, 1)}%.`;

  return {
    id: 'governance', title: 'Corporate Governance & Ethics',
    narrative: narrative || 'Partial governance data is on record.',
    severity: scoreToSeverity(safe(score?.govScore)),
    metric: { value: compRate != null ? n(compRate, 1) : (indepPct != null ? n(indepPct, 1) : '—'), unit: '%', label: compRate != null ? 'Compliance Rate' : 'Board Independence' },
    category: 'GOVERNANCE', pillar: 'GOVERNANCE'
  };
}

/* ── ESG Recommendations ─────────────────────────────────────────────────── */
function generateESGRecommendations(score, { energy, water, emissions, waste, safety, employees, governance, csr }) {
  const recs = [];
  const push = (id, priority, category, title, action) => recs.push({ id, priority, category, title, action });

  if (safe(safety?.fatalities) > 0) {
    push('rec_safety_fatal', 'CRITICAL', 'Safety', 'Investigate and remediate workplace fatalities',
      'Activate incident investigation per Factories Act 1948. Notify the relevant inspectorate within prescribed timelines. Commission an independent safety audit and implement systemic corrective actions.');
  }

  if (safe(safety?.lostTimeInjuryRate) > 0.5) {
    push('rec_safety_ltir', 'HIGH', 'Safety', 'Reduce Lost Time Injury Rate',
      `Current LTIR of ${n(safety.lostTimeInjuryRate, 2)} exceeds benchmark. Implement behaviour-based safety (BBS), strengthen permit-to-work systems, and increase frequency of hazard identification audits.`);
  }

  const rePct = safe(energy?.renewablePercent);
  const reTgt = safe(energy?.renewableTarget);
  if (rePct != null && reTgt != null && rePct < reTgt) {
    push('rec_energy_re', 'HIGH', 'Energy', `Close the ${(reTgt - rePct).toFixed(1)}pp renewable energy gap`,
      `Current share: ${n(rePct, 1)}%. Target: ${reTgt}%. Evaluate rooftop solar capacity additions, Power Purchase Agreements (PPAs), and Renewable Energy Certificate (REC) procurement.`);
  } else if (rePct != null && rePct < 25) {
    push('rec_energy_re', 'HIGH', 'Energy', 'Scale up renewable energy procurement',
      'Fossil-fuel dependence carries Scope 2 emissions risk. Commission a renewable energy feasibility study and set a time-bound RE target.');
  }

  if (safe(emissions?.scope1Stationary) > 0 && !emissions?.sbtiStatus) {
    push('rec_sbti', 'MEDIUM', 'Emissions', 'Set Science-Based Emissions Reduction Targets',
      'Align with the SBTi 1.5°C pathway. Define near-term (2030) and long-term (2050) reduction targets. Quantify Scope 3 hotspots for value-chain decarbonisation planning.');
  }

  const recycPct = safe(water?.recyclingRate);
  if (recycPct != null && recycPct < 50) {
    push('rec_water', 'MEDIUM', 'Water', 'Improve water recycling and reuse rates',
      `Current recycling rate: ${n(recycPct, 1)}%. Install or upgrade STP/ETP with water recycling capacity. Evaluate ZLD feasibility for high water-stress units.`);
  }

  const divPct = safe(waste?.diversionRate);
  if (divPct != null && divPct < 60) {
    push('rec_waste', 'MEDIUM', 'Waste', 'Increase waste diversion from landfill/incineration',
      `Current diversion rate: ${n(divPct, 1)}%. Explore co-processing with cement kilns, enhanced composting for organic waste, and dry waste segregation to improve the rate.`);
  }

  if (employees) {
    const totEmp = (safe(employees.totalPermanentMale)||0) + (safe(employees.totalPermanentFemale)||0) + (safe(employees.totalContractMale)||0) + (safe(employees.totalContractFemale)||0);
    const femEmp = (safe(employees.totalPermanentFemale)||0) + (safe(employees.totalContractFemale)||0);
    const gPct   = totEmp > 0 ? femEmp / totEmp * 100 : null;
    if (gPct != null && gPct < 15) {
      push('rec_diversity', 'MEDIUM', 'Social', 'Strengthen gender diversity and inclusion',
        `Female representation: ${n(gPct, 1)}%. Implement targeted hiring, returnship programmes, and leadership development for women. Set measurable gender diversity KPIs and report progress in BRSR.`);
    }
  }

  const compRate = safe(governance?.regulatoryComplianceRate);
  if (compRate != null && compRate < 90) {
    push('rec_governance', 'HIGH', 'Governance', 'Strengthen regulatory compliance management',
      `Compliance rate of ${n(compRate, 1)}% indicates gaps. Implement a digital compliance calendar, assign department-level compliance champions, and conduct quarterly internal audits.`);
  }

  if (safe(governance?.penalties) > 0) {
    push('rec_penalties', 'HIGH', 'Governance', 'Address outstanding regulatory penalties',
      `${governance.penalties} penalty/penalties on record. Engage legal counsel to resolve, appeal if appropriate, and implement preventive controls to avoid recurrence.`);
  }

  const obligtn = safe(csr?.obligatoryAmount ?? csr?.obligation ?? csr?.csrObligation);
  const spent   = safe(csr?.actualSpend ?? csr?.spentAmount ?? csr?.csrSpend);
  if (obligtn && spent && spent < obligtn) {
    push('rec_csr', 'MEDIUM', 'Governance', 'Close CSR obligation shortfall',
      `Shortfall of ₹${(obligtn - spent).toFixed(2)} lakh against statutory obligation. Identify eligible projects in Schedule VII, accelerate disbursements, and maintain proper documentation for Board reporting.`);
  }

  return recs;
}

/* ══════════════════════════════════════════════════════════════════════════
   EIA NARRATIVE GENERATORS
══════════════════════════════════════════════════════════════════════════ */

function narrateEIAExecutiveSummary(analytics, project) {
  if (!analytics) {
    return {
      id: 'eia_summary', title: 'EIA Executive Summary',
      narrative: 'EIA analytics could not be computed. Ensure monitoring data has been submitted for the project.',
      severity: 'CONCERN', dataAvailable: false
    };
  }

  const ps     = analytics.performanceScore || {};
  const comp   = analytics.compliance || {};
  const risk   = analytics.riskMatrix || {};
  const mit    = analytics.mitigation || {};
  const eps    = safe(ps.overall);

  const projectName = project?.projectName || project?.name || 'the project';

  let opening;
  if (eps >= 80)      opening = `Environmental performance for ${projectName} is strong, with an Environmental Performance Score (EPS) of ${eps}/100.`;
  else if (eps >= 60) opening = `Environmental performance for ${projectName} shows a developing compliance profile, with an EPS of ${eps}/100 indicating progress alongside improvement areas.`;
  else if (eps >= 40) opening = `Environmental performance for ${projectName} (EPS: ${eps}/100) reveals compliance gaps across one or more monitoring media requiring immediate attention.`;
  else if (eps != null) opening = `Environmental performance for ${projectName} (EPS: ${eps}/100) indicates significant non-compliance requiring urgent corrective action.`;
  else opening = `Environmental performance data has been collected for ${projectName}. Full scoring requires complete monitoring datasets.`;

  const components = ['air', 'water', 'soil', 'noise'].map(k => ({
    key: k, label: k.charAt(0).toUpperCase() + k.slice(1),
    score: safe(ps[k] ?? comp[k]?.score)
  })).filter(c => c.score != null).sort((a, b) => a.score - b.score);

  let compLine = '';
  if (components.length > 0) {
    const worst = components[0];
    const best  = components[components.length - 1];
    if (worst.score < 70) {
      compLine = ` ${worst.label} quality monitoring shows the weakest compliance score at ${worst.score}/100.`;
    }
    if (best.score >= 80 && best.key !== worst.key) {
      compLine += ` ${best.label} quality performance is satisfactory at ${best.score}/100.`;
    }
  }

  const highRiskCount = (risk.HIGH || 0) + (risk.VERY_HIGH || 0);
  let riskLine = '';
  if (highRiskCount > 0) {
    riskLine = ` ${highRiskCount} high/very-high significance impact(s) identified requiring priority mitigation.`;
  }

  const mitPct = safe(mit.completionRate ?? mit.overallCompletion);
  let mitLine = '';
  if (mitPct != null) {
    mitLine = mitPct >= 80
      ? ` Mitigation measure implementation stands at ${n(mitPct, 1)}%, demonstrating strong EMP delivery.`
      : ` Mitigation implementation is at ${n(mitPct, 1)}%, indicating gaps in Environmental Management Plan execution.`;
  }

  return {
    id: 'eia_summary', title: 'EIA Executive Summary',
    narrative: opening + compLine + riskLine + mitLine,
    severity: scoreToSeverity(eps),
    eps, dataAvailable: true,
    projectName
  };
}

function narrateAirFindings(analytics) {
  const comp   = analytics?.compliance?.air || analytics?.compliance?.AIR || {};
  const trends = analytics?.trends?.air     || {};
  const mon    = analytics?.monitoring?.air || {};

  const score    = safe(comp.score);
  const status   = comp.status;
  const violns   = safe(comp.violations ?? comp.exceedanceCount);
  const total    = safe(comp.total ?? comp.totalRecords);
  const topViol  = comp.topViolations || [];
  const trend    = trends.direction || trends.trend;

  if (score == null && !status) {
    return {
      id: 'eia_air', title: 'Ambient Air Quality',
      narrative: 'Air quality monitoring data has not been submitted or computed.',
      severity: 'CONCERN', category: 'AIR'
    };
  }

  let narrative;
  if (status === 'COMPLIANT' || (violns === 0 && total > 0)) {
    narrative = `Ambient air quality monitoring across all ${total || 'sampled'} records demonstrates full compliance with CPCB NAAQMS 2009 standards.`;
    if (trend === 'IMPROVING') narrative += ' Parameter trends show an improving trajectory.';
    else if (trend === 'STABLE') narrative += ' Monitoring parameters remain stable.';
  } else if (status === 'AT_RISK' || (score >= 60 && score < 85)) {
    const params = topViol.slice(0, 3).map(v => v.param).join(', ');
    narrative = `Air quality monitoring shows ${violns || 'some'} exceedance(s) across ${total || 'surveyed'} records (${score}/100 compliance score).`;
    if (params) narrative += ` Primary parameters of concern: ${params}.`;
    if (trend === 'DEGRADING') narrative += ' The trend direction is degrading — enhanced dust suppression and source control measures are recommended.';
  } else {
    const params = topViol.slice(0, 3).map(v => v.param).join(', ');
    narrative = `Significant air quality non-compliance detected: ${violns || 'multiple'} exceedances recorded (compliance score: ${score}/100).`;
    if (params) narrative += ` Exceeded parameters: ${params}.`;
    narrative += ' Immediate source identification and corrective measures are required under the Air (Prevention and Control of Pollution) Act 1981.';
  }

  return {
    id: 'eia_air', title: 'Ambient Air Quality',
    narrative, severity: scoreToSeverity(score),
    metric: { value: score != null ? score : '—', unit: '/100', label: 'Compliance Score' },
    category: 'AIR', trend
  };
}

function narrateWaterFindings(analytics) {
  const comp   = analytics?.compliance?.water || analytics?.compliance?.WATER || {};
  const trends = analytics?.trends?.water     || {};

  const score   = safe(comp.score);
  const status  = comp.status;
  const violns  = safe(comp.violations ?? comp.exceedanceCount);
  const total   = safe(comp.total ?? comp.totalRecords);
  const topViol = comp.topViolations || [];
  const trend   = trends.direction || trends.trend;

  if (score == null && !status) {
    return {
      id: 'eia_water', title: 'Water Quality',
      narrative: 'Water quality monitoring data has not been submitted or computed.',
      severity: 'CONCERN', category: 'WATER'
    };
  }

  let narrative;
  if (status === 'COMPLIANT' || violns === 0) {
    narrative = `Water quality monitoring confirms compliance with IS 10500:2012 drinking water standards across ${total || 'sampled'} records.`;
    if (trend === 'IMPROVING') narrative += ' Parameter trends are improving.';
  } else {
    const params = topViol.slice(0, 3).map(v => v.param).join(', ');
    narrative = `Water quality analysis reveals ${violns || 'multiple'} exceedance(s) across ${total || 'surveyed'} records (compliance score: ${score}/100).`;
    if (params) narrative += ` Parameters exceeding IS 10500:2012 limits: ${params}.`;
    if (topViol.some(v => ['As', 'Pb', 'Hg', 'Cd'].includes(v.param))) {
      narrative += ' Heavy metal exceedances detected — potential health risk requiring immediate source investigation and effluent control.';
    }
    if (trend === 'DEGRADING') narrative += ' The degrading trend necessitates enhanced effluent treatment and upstream source control.';
  }

  return {
    id: 'eia_water', title: 'Water Quality',
    narrative, severity: scoreToSeverity(score),
    metric: { value: score != null ? score : '—', unit: '/100', label: 'Compliance Score' },
    category: 'WATER', trend
  };
}

function narratateSoilFindings(analytics) {
  const comp   = analytics?.compliance?.soil || analytics?.compliance?.SOIL || {};
  const trends = analytics?.trends?.soil     || {};

  const score   = safe(comp.score);
  const violns  = safe(comp.violations ?? comp.exceedanceCount);
  const total   = safe(comp.total ?? comp.totalRecords);
  const topViol = comp.topViolations || [];
  const trend   = trends.direction || trends.trend;

  if (score == null) {
    return {
      id: 'eia_soil', title: 'Soil Quality',
      narrative: 'Soil quality monitoring data has not been submitted or computed.',
      severity: 'CONCERN', category: 'SOIL'
    };
  }

  let narrative;
  if (violns === 0 || score >= 90) {
    narrative = `Soil quality monitoring confirms all tested parameters are within CPCB generic soil remediation standards across ${total || 'surveyed'} records.`;
  } else {
    const params = topViol.slice(0, 3).map(v => v.param).join(', ');
    narrative = `Soil quality analysis identifies ${violns} exceedance(s) against CPCB remediation thresholds (compliance score: ${score}/100).`;
    if (params) narrative += ` Exceeded parameters: ${params}.`;
    if (topViol.some(v => ['As', 'Pb', 'Hg', 'Cd'].includes(v.param))) {
      narrative += ' Heavy metal contamination indicates potential legacy pollution or process leakage — site assessment and remediation planning are advised.';
    }
    if (trend === 'DEGRADING') narrative += ' Degrading soil quality trends indicate active contamination sources requiring source investigation.';
  }

  return {
    id: 'eia_soil', title: 'Soil Quality',
    narrative, severity: scoreToSeverity(score),
    metric: { value: score != null ? score : '—', unit: '/100', label: 'Compliance Score' },
    category: 'SOIL', trend
  };
}

function narrateNoiseFindings(analytics) {
  const comp   = analytics?.compliance?.noise || analytics?.compliance?.NOISE || {};
  const trends = analytics?.trends?.noise     || {};

  const score   = safe(comp.score);
  const violns  = safe(comp.violations ?? comp.exceedanceCount);
  const total   = safe(comp.total ?? comp.totalRecords);
  const topViol = comp.topViolations || [];
  const trend   = trends.direction || trends.trend;

  if (score == null) {
    return {
      id: 'eia_noise', title: 'Noise Levels',
      narrative: 'Noise monitoring data has not been submitted or computed.',
      severity: 'CONCERN', category: 'NOISE'
    };
  }

  let narrative;
  if (violns === 0 || score >= 90) {
    narrative = `Noise monitoring across ${total || 'surveyed'} records confirms compliance with CPCB Noise Pollution Rules 2000 prescribed limits.`;
  } else {
    const zones = topViol.slice(0, 3).map(v => v.param || v.zone || v.location).filter(Boolean).join(', ');
    narrative = `Noise monitoring identifies ${violns} exceedance(s) across ${total || 'surveyed'} records (compliance score: ${score}/100).`;
    if (zones) narrative += ` Impacted zones/locations: ${zones}.`;
    narrative += ' Noise barriers, equipment enclosures, and schedule-based operational controls should be evaluated.';
    if (trend === 'DEGRADING') narrative += ' Increasing noise trend requires priority attention.';
  }

  return {
    id: 'eia_noise', title: 'Noise Levels',
    narrative, severity: scoreToSeverity(score),
    metric: { value: score != null ? score : '—', unit: '/100', label: 'Compliance Score' },
    category: 'NOISE', trend
  };
}

function narrateImpactRisk(analytics) {
  const risk   = analytics?.riskMatrix || {};
  const impacts = analytics?.impacts || [];

  const vhCount  = safe(risk.VERY_HIGH) || 0;
  const hCount   = safe(risk.HIGH)      || 0;
  const mCount   = safe(risk.MODERATE)  || 0;
  const total    = vhCount + hCount + mCount + (safe(risk.LOW) || 0) + (safe(risk.NEGLIGIBLE) || 0);

  if (total === 0) {
    return {
      id: 'eia_risk', title: 'Environmental Risk Analysis',
      narrative: 'Impact assessment and risk matrix data has not been submitted.',
      severity: 'MODERATE', category: 'RISK'
    };
  }

  let narrative = `Impact assessment covers ${total} evaluated impact(s) across project components.`;

  if (vhCount > 0) {
    narrative += ` ${vhCount} very-high significance impact(s) identified — these require priority mitigation and enhanced monitoring in the Environmental Management Plan (EMP).`;
  }

  if (hCount > 0) {
    narrative += ` ${hCount} high significance impact(s) require targeted mitigation measures with defined implementation timelines.`;
  }

  if (mCount > 0) {
    narrative += ` ${mCount} moderate significance impacts are manageable through standard EMP measures.`;
  }

  if (vhCount === 0 && hCount === 0) {
    narrative += ' No high or very-high significance impacts were identified, indicating effective project planning and impact minimisation.';
  }

  const severity = vhCount > 0 ? 'CRITICAL' : hCount > 2 ? 'CONCERN' : hCount > 0 ? 'MODERATE' : 'GOOD';

  return {
    id: 'eia_risk', title: 'Environmental Risk Analysis',
    narrative, severity,
    metric: { value: vhCount + hCount, unit: 'high-risk impacts', label: 'High/VH Impacts' },
    category: 'RISK'
  };
}

function narratateMitigation(analytics) {
  const mit = analytics?.mitigation || {};

  const completion = safe(mit.completionRate ?? mit.overallCompletion);
  const total      = safe(mit.total ?? mit.totalMeasures);
  const completed  = safe(mit.completed ?? mit.implementedCount);
  const overdue    = safe(mit.overdue ?? mit.overdueCount);

  if (completion == null && total == null) {
    return {
      id: 'eia_mit', title: 'Mitigation Measures',
      narrative: 'Mitigation measure data has not been submitted.',
      severity: 'MODERATE', category: 'MITIGATION'
    };
  }

  let narrative = total ? `${total} mitigation measures are prescribed in the Environmental Management Plan (EMP).` : 'Mitigation measures have been defined in the EMP.';

  if (completion != null) {
    if (completion >= 90)      narrative += ` Implementation completion of ${n(completion, 1)}% demonstrates strong EMP execution.`;
    else if (completion >= 70) narrative += ` Implementation completion stands at ${n(completion, 1)}%, with the remaining measures requiring monitoring and follow-up.`;
    else if (completion >= 50) narrative += ` Only ${n(completion, 1)}% of prescribed measures have been implemented — accelerated execution is needed to meet EMP commitments.`;
    else                       narrative += ` Implementation completion of ${n(completion, 1)}% is significantly below expectations, indicating material EMP delivery risk.`;
  }

  if (overdue > 0) {
    narrative += ` ${overdue} measure(s) are overdue — immediate review with the project proponent and implementing agency is required.`;
  }

  const severity = completion == null ? 'MODERATE' : completion >= 80 ? 'GOOD' : completion >= 60 ? 'MODERATE' : 'CONCERN';

  return {
    id: 'eia_mit', title: 'Mitigation Measures',
    narrative, severity,
    metric: { value: completion != null ? n(completion, 1) : '—', unit: '%', label: 'Implementation Rate' },
    category: 'MITIGATION'
  };
}

function generateEIARecommendations(analytics) {
  const recs   = [];
  const push   = (id, priority, category, title, action) => recs.push({ id, priority, category, title, action });
  const comp   = analytics?.compliance || {};
  const risk   = analytics?.riskMatrix || {};
  const mit    = analytics?.mitigation || {};
  const ps     = analytics?.performanceScore || {};

  const airScore   = safe(comp?.air?.score    ?? ps?.air);
  const waterScore = safe(comp?.water?.score  ?? ps?.water);
  const soilScore  = safe(comp?.soil?.score   ?? ps?.soil);
  const noiseScore = safe(comp?.noise?.score  ?? ps?.noise);

  if (airScore != null && airScore < 70) {
    push('rec_eia_air', 'HIGH', 'Air Quality', 'Implement targeted air quality control measures',
      'Exceedances identified against NAAQMS 2009 standards. Enhance dust suppression systems, install online ambient air quality monitors (CAAQMS where applicable), and review fugitive emission control measures.');
  }

  if (waterScore != null && waterScore < 70) {
    push('rec_eia_water', 'HIGH', 'Water Quality', 'Strengthen water quality management',
      'IS 10500:2012 exceedances detected. Review effluent discharge points, upgrade ETP performance, and conduct source tracing for heavy metal contamination.');
  }

  if (soilScore != null && soilScore < 70) {
    push('rec_eia_soil', 'HIGH', 'Soil Quality', 'Initiate soil remediation assessment',
      'CPCB remediation threshold exceedances observed. Commission a soil contamination source assessment and develop a time-bound remediation plan per CPCB guidelines.');
  }

  if (noiseScore != null && noiseScore < 70) {
    push('rec_eia_noise', 'MEDIUM', 'Noise', 'Implement noise control measures',
      'CPCB Noise Pollution Rules 2000 limits exceeded. Install noise barriers at boundary walls, enclose high-noise equipment, and enforce noise-hour restrictions for residential proximity areas.');
  }

  const vhCount = (safe(risk.VERY_HIGH) || 0);
  const hCount  = (safe(risk.HIGH)      || 0);
  if (vhCount + hCount > 0) {
    push('rec_eia_risk', 'HIGH', 'Risk Management', 'Prioritise mitigation for high-significance impacts',
      `${vhCount + hCount} high/very-high significance impact(s) identified. Each must have an assigned responsible party, budget, and completion timeline in the EMP. Progress should be reported at each compliance review meeting.`);
  }

  const mitPct = safe(mit.completionRate ?? mit.overallCompletion);
  if (mitPct != null && mitPct < 70) {
    push('rec_eia_mit', 'HIGH', 'Mitigation', 'Accelerate EMP implementation',
      `EMP implementation is at ${n(mitPct, 1)}%. Convene a project review meeting to identify bottlenecks, assign accountability for overdue measures, and set monthly implementation milestones.`);
  }

  const overdue = safe(mit.overdue ?? mit.overdueCount);
  if (overdue > 0) {
    push('rec_eia_overdue', 'CRITICAL', 'EMP Compliance', 'Resolve overdue mitigation measures',
      `${overdue} overdue EMP measure(s) identified. Immediate escalation to project management is required. Each overdue item must have a revised completion date and documented justification for delay.`);
  }

  return recs;
}

/* ══════════════════════════════════════════════════════════════════════════
   STRATEGIC INSIGHTS (Part 3)
══════════════════════════════════════════════════════════════════════════ */

function generateRiskNarrative(esgInsights, eiaInsights) {
  const criticalItems = [];
  const highItems     = [];

  const checkNarrative = (items) => {
    [...(esgInsights?.performanceNarratives || []), ...(eiaInsights?.findingsNarratives || [])].forEach(n => {
      if (n?.severity === 'CRITICAL') criticalItems.push(n.title);
      else if (n?.severity === 'CONCERN') highItems.push(n.title);
    });
    [...(esgInsights?.recommendations || []), ...(eiaInsights?.recommendations || [])].forEach(r => {
      if (r?.priority === 'CRITICAL') criticalItems.push(r.title);
      else if (r?.priority === 'HIGH') highItems.push(r.title);
    });
  };

  checkNarrative();
  const unique = arr => [...new Set(arr)];
  const crits  = unique(criticalItems).slice(0, 5);
  const highs  = unique(highItems).slice(0, 5);

  let narrative = '';
  if (crits.length > 0) {
    narrative += `CRITICAL risks requiring immediate escalation: ${crits.join('; ')}. `;
  }
  if (highs.length > 0) {
    narrative += `High-priority improvement areas: ${highs.join('; ')}.`;
  }
  if (!narrative) {
    narrative = 'No critical or high-priority risk flags have been raised across the ESG and EIA assessments. This indicates a broadly sound sustainability and compliance profile for the current reporting period.';
  }

  const severity = crits.length > 0 ? 'CRITICAL' : highs.length > 3 ? 'CONCERN' : highs.length > 0 ? 'MODERATE' : 'GOOD';

  return {
    id: 'strategic_risk', title: 'Integrated Risk Summary',
    narrative, severity,
    criticalCount: crits.length,
    highCount: highs.length
  };
}

function generateSustainabilityRoadmap(score, esgInsights, eiaInsights) {
  const milestones = [];
  const push = (horizon, category, action, basis) => milestones.push({ horizon, category, action, basis });

  const { energy, emissions, water, waste, safety, governance } = esgInsights?._rawData || {};

  // Immediate (0–3 months)
  if (safe(safety?.fatalities) > 0) {
    push('IMMEDIATE', 'Safety', 'Complete incident investigation and corrective action plan for reported fatalities', 'Fatalities reported in current year');
  }
  const mitPct = safe(eiaInsights?.mitigation?.completionRate ?? eiaInsights?.mitigation?.overallCompletion);
  if (mitPct != null && mitPct < 60) {
    push('IMMEDIATE', 'EIA Compliance', 'Convene EMP review meeting and resolve all overdue mitigation measures', `EMP implementation at ${n(mitPct, 1)}%`);
  }
  if (safe(governance?.regulatoryComplianceRate) < 80) {
    push('IMMEDIATE', 'Governance', 'Implement compliance calendar and appoint department compliance officers', `Compliance rate: ${n(governance?.regulatoryComplianceRate, 1)}%`);
  }

  // Short-term (3–12 months)
  const rePct = safe(energy?.renewablePercent);
  const reTgt = safe(energy?.renewableTarget);
  if (rePct != null && rePct < (reTgt || 50)) {
    push('SHORT_TERM', 'Energy', 'Commission renewable energy feasibility study and initiate PPA/rooftop solar contracting', `Current RE share: ${n(rePct, 1)}%`);
  }
  const recycPct = safe(water?.recyclingRate);
  if (recycPct != null && recycPct < 50) {
    push('SHORT_TERM', 'Water', 'Upgrade ETP/STP with water recycling loop and set ZLD roadmap', `Recycling rate: ${n(recycPct, 1)}%`);
  }
  const airScore = safe(eiaInsights?.findingsNarratives?.find(n => n.id === 'eia_air')?.metric?.value);
  if (airScore != null && airScore < 70) {
    push('SHORT_TERM', 'Air Quality', 'Install online ambient air quality monitors and review dust suppression systems', `Air compliance score: ${airScore}/100`);
  }

  // Medium-term (1–2 years)
  if (!emissions?.sbtiStatus && safe(emissions?.scope1Stationary) > 0) {
    push('MEDIUM_TERM', 'Emissions', 'Develop and submit Science-Based Targets (SBTi) commitment', 'No SBTi status recorded');
  }
  const divPct = safe(waste?.diversionRate);
  if (divPct != null && divPct < 60) {
    push('MEDIUM_TERM', 'Waste', 'Achieve >75% waste diversion rate through co-processing and recycling partnerships', `Current diversion: ${n(divPct, 1)}%`);
  }

  // Long-term (3–5 years)
  const nzy = safe(emissions?.netZeroYear);
  if (nzy) {
    push('LONG_TERM', 'Decarbonisation', `Execute net-zero decarbonisation pathway towards ${nzy} commitment`, 'Net-zero commitment on record');
  } else {
    push('LONG_TERM', 'Decarbonisation', 'Develop and publish net-zero roadmap aligned with 1.5°C science-based pathway', 'No net-zero commitment recorded');
  }

  push('LONG_TERM', 'Reporting', 'Achieve BRSR Core assured disclosure and initiate third-party ESG rating process', 'Ongoing BRSR compliance requirement');

  return milestones;
}

function generateImprovementRecommendations(esgInsights, eiaInsights) {
  const allRecs = [
    ...(esgInsights?.recommendations || []),
    ...(eiaInsights?.recommendations || [])
  ];

  const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  allRecs.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

  const grouped = {};
  priorityOrder.forEach(p => { grouped[p] = allRecs.filter(r => r.priority === p); });

  return {
    total: allRecs.length,
    critical: grouped.CRITICAL.length,
    high: grouped.HIGH.length,
    medium: grouped.MEDIUM.length,
    low: grouped.LOW.length,
    grouped,
    all: allRecs
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN ORCHESTRATOR
══════════════════════════════════════════════════════════════════════════ */

async function computeInsights(orgId, year, projectId) {
  const currentYear = Number(year) || new Date().getFullYear();
  const prevYear    = currentYear - 1;

  const [
    profile, energy, water, emissions, waste, bio,
    emp, safety, gov, csr, score, prevScore
  ] = await Promise.all([
    prisma.esgProfile.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgEnergy.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgWater.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgEmissions.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgWaste.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgBiodiversity.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgEmployees.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgSafety.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgGovernance.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgCsr.findFirst({ where: { orgId, reportingYear: currentYear } }),
    prisma.esgScore.findFirst({ where: { orgId, reportingYear: currentYear }, orderBy: { computedAt: 'desc' } }),
    prisma.esgScore.findFirst({ where: { orgId, reportingYear: prevYear },     orderBy: { computedAt: 'desc' } }),
  ]);

  let eiaAnalytics = null;
  let eiaProject   = null;
  if (projectId) {
    [eiaAnalytics, eiaProject] = await Promise.all([
      computeAnalytics(projectId).catch(() => null),
      prisma.eiaProject.findUnique({ where: { id: projectId } }).catch(() => null),
    ]);
  }

  /* ── ESG narratives ──────────────────────────────────────────────────── */
  const perfNarratives = [
    narrateEnergy(energy, score),
    narrateEmissions(emissions, score),
    narrateWater(water, score),
    narrateWaste(waste, score),
    narratateBiodiversity(bio, score),
    narrateEmployees(emp, score),
    narrateSafety(safety, score),
    narrateCSR(csr, score),
    narrateGovernance(gov, score),
  ].filter(Boolean);

  const rawData = { energy, water, emissions, waste, safety, governance: gov, csr };
  const esgRecs = generateESGRecommendations(score, rawData);

  const esgInsights = {
    executiveSummary:    narrateExecutiveSummary(score, prevScore, safety, currentYear),
    performanceNarratives: perfNarratives,
    recommendations:     esgRecs,
    _rawData:            rawData,
  };

  /* ── EIA narratives ──────────────────────────────────────────────────── */
  let eiaInsights = null;
  if (projectId) {
    const findingsNarratives = [
      narrateAirFindings(eiaAnalytics),
      narrateWaterFindings(eiaAnalytics),
      narratateSoilFindings(eiaAnalytics),
      narrateNoiseFindings(eiaAnalytics),
      narrateImpactRisk(eiaAnalytics),
      narratateMitigation(eiaAnalytics),
    ].filter(Boolean);

    const eiaRecs = generateEIARecommendations(eiaAnalytics);

    eiaInsights = {
      executiveSummary:    narrateEIAExecutiveSummary(eiaAnalytics, eiaProject),
      findingsNarratives,
      recommendations:     eiaRecs,
      mitigation:          eiaAnalytics?.mitigation || null,
    };
  }

  /* ── Strategic insights ──────────────────────────────────────────────── */
  const strategicInsights = {
    riskNarrative:              generateRiskNarrative(esgInsights, eiaInsights),
    sustainabilityRoadmap:      generateSustainabilityRoadmap(score, esgInsights, eiaInsights),
    improvementRecommendations: generateImprovementRecommendations(esgInsights, eiaInsights),
  };

  /* ── Data completeness ───────────────────────────────────────────────── */
  const dataPoints = [energy, water, emissions, waste, bio, emp, safety, gov, csr].filter(Boolean).length;

  return {
    orgId, year: currentYear,
    projectId: projectId || null,
    generatedAt: new Date().toISOString(),
    esg: esgInsights,
    eia: eiaInsights,
    strategic: strategicInsights,
    meta: {
      dataPoints,
      sectionsCompleted: dataPoints,
      totalSections: 9,
      hasEIA: !!projectId,
      scoreAvailable: !!score,
      grade: score?.grade || null,
    }
  };
}

module.exports = { computeInsights };
