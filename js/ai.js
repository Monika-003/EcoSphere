/* ══════════════════════════════════════════════════════════════
   EcoSphere — AI Analysis Engine (Simulated)
   ══════════════════════════════════════════════════════════════ */

'use strict';

const EcoAI = {

  /* Analyse submitted form data and return insights */
  analyseMonitoringData(type, values) {
    const thresholds = {
      air:      { 'PM2.5': 60, 'PM10': 100, 'CO₂': 1000, 'NOₓ': 40 },
      water:    { pH: [6.5, 8.5], TDS: 600, BOD: 30, DO: [4, null] },
      noise:    { Day: 75, Night: 70, Peak: 100 },
      temp:     { Process: 80, Effluent: 35 },
      humidity: { Relative: 80 },
      waste:    { Hazardous: 50 },
    };

    const alerts = [];
    const cfg = thresholds[type];
    if (cfg) {
      Object.entries(values).forEach(([key, val]) => {
        const limit = cfg[key];
        if (Array.isArray(limit)) {
          if (limit[0] && val < limit[0]) alerts.push({ level: 'warn', msg: `${key} (${val}) is below minimum threshold (${limit[0]})` });
          if (limit[1] && val > limit[1]) alerts.push({ level: 'danger', msg: `${key} (${val}) exceeds maximum threshold (${limit[1]})` });
        } else if (limit && val > limit) {
          alerts.push({ level: 'danger', msg: `${key} (${val}) exceeds limit (${limit})` });
        }
      });
    }
    return { alerts, summary: alerts.length ? `${alerts.length} threshold violation(s) detected` : 'All parameters within permissible limits' };
  },

  /* Calculate ESG score from submitted values */
  calculateESG(data) {
    let envScore = 100;
    if (data.ghg > 1000) envScore -= 10;
    if (data.energy > 2000) envScore -= 8;
    if (data.water > 10000) envScore -= 5;
    if (data.waste > 20) envScore -= 7;

    let socScore = 100;
    if (data.training < 10) socScore -= 10;
    if (data.incidents > 2) socScore -= 15;
    if (data.women < 20) socScore -= 5;

    let govScore = 100;
    if (data.boardIndep < 50) govScore -= 10;
    if (data.violations > 0) govScore -= data.violations * 5;

    const overall = Math.round((envScore * 0.4 + socScore * 0.35 + govScore * 0.25));
    return {
      environmental: Math.max(0, Math.min(100, envScore)),
      social: Math.max(0, Math.min(100, socScore)),
      governance: Math.max(0, Math.min(100, govScore)),
      overall: Math.max(0, Math.min(100, overall)),
      grade: overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B+' : overall >= 60 ? 'B' : 'C',
    };
  },

  /* Calculate carbon footprint */
  calculateCarbon(data) {
    const EF = {
      gridElec:    0.82,   // tCO2e per MWh (India grid average)
      diesel:      2.68,   // kg CO2e per litre → tonne
      lpg:         2.98,   // kg CO2e per kg
      naturalGas:  1.96,   // kg CO2e per m³
      coal:        2400,   // kg CO2e per tonne
      road:        0.00021,// tCO2e per tonne-km
      air:         0.00102,// tCO2e per tonne-km
    };
    const scope1 = ((data.diesel || 0) * EF.diesel / 1000) +
                   ((data.lpg || 0) * EF.lpg / 1000) +
                   ((data.naturalGas || 0) * EF.naturalGas / 1000) +
                   ((data.coal || 0) * EF.coal / 1000);
    const scope2 = ((data.gridElec || 0) / 1000) * EF.gridElec;
    const scope3 = ((data.road || 0) * EF.road) + ((data.air || 0) * EF.air);
    const total = scope1 + scope2 + scope3;

    return {
      scope1: +scope1.toFixed(2),
      scope2: +scope2.toFixed(2),
      scope3: +scope3.toFixed(2),
      total:  +total.toFixed(2),
      credibilityScore: Math.max(0, Math.round(100 - (total / 30))),
    };
  },

  /* Sustainability index */
  calculateSustainability(env, esg, carbon, compliance) {
    const score = Math.round(env * 0.3 + esg * 0.3 + carbon * 0.25 + compliance * 0.15);
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'A-' : score >= 60 ? 'B+' : 'B';
    return { score: Math.min(100, score), grade };
  },

  /* Generate AI recommendations */
  getRecommendations(scores) {
    const recs = [];
    if (scores.carbon < 80) recs.push({ priority: 'HIGH', text: 'Switch 30% electricity to renewable energy — reduce Scope 2 by ~180 tCO₂e/yr' });
    if (scores.water > 10000) recs.push({ priority: 'HIGH', text: 'Implement water recycling system — reduce freshwater by 25%' });
    if (scores.esg < 75) recs.push({ priority: 'MED', text: 'Enhance supplier ESG screening process and employee training hours' });
    if (scores.noise > 85) recs.push({ priority: 'HIGH', text: 'Immediate noise source inspection required — boundary levels exceed CPCB norms' });
    recs.push({ priority: 'LOW', text: 'Optimise logistics routes to reduce Scope 3 transport emissions by ~12%' });
    return recs;
  },

  /* Generate monthly report content */
  generateReportContent(type, period) {
    const templates = {
      esg: {
        title: `ESG Performance Report — ${period}`,
        sections: ['Executive Summary', 'Environmental Performance', 'Social Performance', 'Governance Overview', 'ESG Score Trend', 'Compliance Status', 'Recommendations'],
        highlights: ['ESG Score: 74/100 (B+)', 'Environmental: 78/100', 'Carbon reduction: 8% MoM', 'Zero major compliance violations'],
      },
      carbon: {
        title: `Carbon Emission Report — ${period}`,
        sections: ['Total Footprint', 'Scope 1 Breakdown', 'Scope 2 Breakdown', 'Scope 3 Breakdown', 'Trend Analysis', 'Offset Credits', 'Reduction Pathway'],
        highlights: ['Total: 1,847 tCO₂e', 'Credibility Score: 82/100', '8% reduction vs last month', 'On track for annual target'],
      },
      iso: {
        title: `ISO 14001 Compliance Report — ${period}`,
        sections: ['Context of Organisation', 'Environmental Policy', 'Objectives & Targets', 'Operational Control', 'Emergency Preparedness', 'Performance Evaluation', 'Corrective Actions'],
        highlights: ['ISO 14001:2015 aligned', '92% of objectives on track', '1 corrective action open', 'Internal audit completed'],
      },
    };
    return templates[type] || templates.esg;
  },
};

/* Attach to window for use from app.js */
window.EcoAI = EcoAI;

/* ── Auto-alert system ── */
(function autoAlert() {
  const alerts = [
    { delay: 12000, msg: '⚠️ Noise alert: Boundary Point 3 at 88 dB — exceeds 85 dB limit' },
    { delay: 25000, msg: '✅ Air quality normalised — PM10 back within limits' },
    { delay: 40000, msg: 'ℹ️ Reminder: June monthly data collection due in 5 days' },
  ];
  alerts.forEach(a => setTimeout(() => window.showToast?.(a.msg), a.delay));
})();
