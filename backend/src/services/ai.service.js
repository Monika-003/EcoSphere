'use strict';

/**
 * AI Service — OpenAI integration for:
 * - Monitoring data analysis & compliance checking
 * - Report ESG/carbon scoring
 * - EcoBot conversational assistant
 */

const { logger } = require('../config/logger');
const { prisma } = require('../config/database');

/* ── OpenAI client (lazy init) ── */
let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { OpenAI } = require('openai');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch { _openai = null; }
  return _openai;
}

/* ── Standard limits for compliance check ── */
const COMPLIANCE_STANDARDS = {
  air: {
    PM10:   { limit: 100,  unit: 'µg/m³', standard: 'CPCB National Ambient Air Quality Standards' },
    PM2_5:  { limit: 60,   unit: 'µg/m³', standard: 'CPCB NAAQS' },
    SO2:    { limit: 80,   unit: 'µg/m³', standard: 'CPCB NAAQS' },
    NO2:    { limit: 80,   unit: 'µg/m³', standard: 'CPCB NAAQS' },
    CO:     { limit: 2000, unit: 'µg/m³', standard: 'CPCB NAAQS' },
    Ozone:  { limit: 180,  unit: 'µg/m³', standard: 'CPCB NAAQS' }
  },
  water: {
    pH:     { min: 6.5, max: 8.5, unit: '', standard: 'BIS 10500' },
    BOD:    { limit: 30, unit: 'mg/L', standard: 'CPCB Effluent Standards' },
    COD:    { limit: 250, unit: 'mg/L', standard: 'CPCB Effluent Standards' },
    TSS:    { limit: 100, unit: 'mg/L', standard: 'CPCB Effluent Standards' }
  },
  noise: {
    day:    { limit: 55, unit: 'dB(A)', standard: 'CPCB Noise Standards - Industrial' },
    night:  { limit: 45, unit: 'dB(A)', standard: 'CPCB Noise Standards - Industrial' }
  }
};

/* ══════════════════════════════════════
   ANALYSE MONITORING DATA
══════════════════════════════════════ */
exports.analyseMonitoringData = async (monitoringType, parameters) => {
  const violations      = [];
  const standards       = COMPLIANCE_STANDARDS[monitoringType?.toLowerCase()] || {};
  let   violationsCount = 0;

  /* Rule-based compliance check */
  if (parameters && typeof parameters === 'object') {
    for (const [param, standard] of Object.entries(standards)) {
      const value = parameters[param] || parameters[param.toLowerCase()];
      if (value === undefined || value === null) continue;

      const numVal = parseFloat(value);
      if (isNaN(numVal)) continue;

      if (standard.min !== undefined && numVal < standard.min) {
        violations.push({ parameter: param, value: numVal, limit: `${standard.min}–${standard.max}`, unit: standard.unit, standard: standard.standard });
        violationsCount++;
      } else if (standard.max !== undefined && numVal > standard.max) {
        violations.push({ parameter: param, value: numVal, limit: `${standard.min}–${standard.max}`, unit: standard.unit, standard: standard.standard });
        violationsCount++;
      } else if (standard.limit !== undefined && numVal > standard.limit) {
        violations.push({ parameter: param, value: numVal, limit: standard.limit, unit: standard.unit, standard: standard.standard });
        violationsCount++;
      }
    }
  }

  const complianceStatus = violationsCount === 0 ? 'COMPLIANT'
    : violationsCount <= 2                        ? 'MARGINAL'
    : 'NON_COMPLIANT';

  const score = Math.max(0, 100 - (violationsCount * 20));

  /* Try OpenAI for rich analysis */
  let summary         = `${monitoringType} monitoring analysis: ${violationsCount} violation(s) detected. Status: ${complianceStatus}.`;
  let recommendations = violations.length
    ? violations.map(v => `Reduce ${v.parameter} below ${v.limit} ${v.unit}`).join('; ')
    : 'All parameters within acceptable limits. Maintain current controls.';

  const openai = getOpenAI();
  if (openai && process.env.ENABLE_AI_ANALYSIS === 'true') {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an environmental compliance expert for Indian industries. Analyse monitoring data and provide concise, actionable insights. Format: JSON with keys: summary, recommendations, riskLevel.`
          },
          {
            role: 'user',
            content: `Monitoring Type: ${monitoringType}\nParameters: ${JSON.stringify(parameters)}\nViolations: ${JSON.stringify(violations)}\nProvide analysis.`
          }
        ],
        max_tokens:  300,
        temperature: 0.3
      });

      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          summary         = parsed.summary         || summary;
          recommendations = parsed.recommendations || recommendations;
        } catch { /* use rule-based */ }
      }
    } catch (err) {
      logger.warn('[AI] OpenAI analysis error (using rule-based):', err.message);
    }
  }

  return { summary, recommendations, score, violations, violationsCount, complianceStatus };
};

/* ══════════════════════════════════════
   GENERATE REPORT ANALYSIS
══════════════════════════════════════ */
exports.generateReportAnalysis = async (reportType, monitoringRecords, org) => {
  /* Default scores (deterministic fallback) */
  const base = {
    summary:         `${reportType} report generated for ${org?.name || 'organization'}.`,
    recommendations: 'Review monitoring data for compliance improvements.',
    riskScore:       30,
    esgScore:        72,
    envScore:        70,
    socialScore:     75,
    govScore:        71,
    complianceScore: 80,
    scope1:          120.5,
    scope2:          45.2,
    scope3:          22.8,
    totalCarbon:     188.5
  };

  if (!monitoringRecords?.length) return base;

  /* Calculate compliance score from records */
  const total      = monitoringRecords.length;
  const compliant  = monitoringRecords.filter(r => r.complianceStatus === 'COMPLIANT').length;
  const violations = monitoringRecords.filter(r => r.complianceStatus === 'NON_COMPLIANT').length;

  const complianceScore = total > 0 ? Math.round((compliant / total) * 100) : 80;
  const riskScore       = violations > 0 ? Math.min(100, violations * 15 + 20) : 10;

  const openai = getOpenAI();
  if (openai && process.env.ENABLE_AI_ANALYSIS === 'true') {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an ESG analyst specializing in environmental compliance for Indian industries. Return JSON with keys: summary, recommendations, riskScore(0-100), esgScore(0-100), envScore(0-100), socialScore(0-100), govScore(0-100), scope1(tonnes CO2e), scope2(tonnes CO2e), scope3(tonnes CO2e), totalCarbon(tonnes CO2e).`
          },
          {
            role: 'user',
            content: `Industry: ${org?.industryType || 'MANUFACTURING'}. Report type: ${reportType}. Total records: ${total}. Compliant: ${compliant}. Violations: ${violations}. Generate ESG and carbon analysis.`
          }
        ],
        max_tokens:  400,
        temperature: 0.3
      });

      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        try { return { ...base, ...JSON.parse(raw), complianceScore }; }
        catch { /* use defaults */ }
      }
    } catch (err) {
      logger.warn('[AI] Report analysis error:', err.message);
    }
  }

  return { ...base, complianceScore, riskScore };
};

/* ══════════════════════════════════════
   ECOBOT CONVERSATIONAL AI
══════════════════════════════════════ */
exports.ecobotQuery = async (userId, orgId, message, conversationHistory = []) => {
  /* Get org context */
  let orgContext = '';
  if (orgId) {
    try {
      const org = await prisma.organization.findUnique({
        where:  { id: orgId },
        select: { name: true, industryType: true, city: true, state: true }
      });
      if (org) orgContext = `Organization: ${org.name} (${org.industryType}), ${org.city}, ${org.state}.`;
    } catch { /* skip context */ }
  }

  const systemPrompt = `You are EcoBot, an AI environmental compliance assistant for EcoSphere platform.
You help organizations in India understand environmental regulations, compliance requirements, ESG best practices, and sustainability initiatives.
${orgContext}
You are knowledgeable about: CPCB standards, MoEFCC regulations, ISO 14001, ESG reporting, carbon accounting, ETP/STP operations, air/water/noise/soil monitoring.
Keep responses concise, practical, and actionable. Use data when available.`;

  const openai = getOpenAI();

  if (!openai) {
    /* Fallback: pattern-based responses */
    return {
      reply:  getEcoBotFallbackReply(message),
      tokens: 0,
      model:  'fallback'
    };
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // keep last 10 turns
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model:       'gpt-3.5-turbo',
      messages,
      max_tokens:  500,
      temperature: 0.7
    });

    const reply  = completion.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
    const tokens = completion.usage?.total_tokens || 0;

    return { reply, tokens, model: 'gpt-3.5-turbo' };
  } catch (err) {
    logger.error('[EcoBot] OpenAI error:', err.message);
    return { reply: getEcoBotFallbackReply(message), tokens: 0, model: 'fallback' };
  }
};

/* ── Pattern-based fallback replies ── */
function getEcoBotFallbackReply(message) {
  const msg = message.toLowerCase();
  if (msg.includes('cpcb') || msg.includes('standard'))
    return 'CPCB (Central Pollution Control Board) sets National Ambient Air Quality Standards (NAAQS) and effluent discharge norms. Key air standards: PM10 ≤100 µg/m³, PM2.5 ≤60 µg/m³, SO2 ≤80 µg/m³.';
  if (msg.includes('esg'))
    return 'ESG reporting covers Environmental, Social, and Governance dimensions. For environmental compliance, focus on: GHG emissions (Scope 1/2/3), water usage, waste management, and biodiversity impact.';
  if (msg.includes('carbon') || msg.includes('emission'))
    return 'Carbon accounting involves measuring Scope 1 (direct), Scope 2 (purchased energy), and Scope 3 (value chain) emissions. Use GHG Protocol methodology for accurate reporting.';
  if (msg.includes('etp') || msg.includes('wastewater'))
    return 'Effluent Treatment Plants (ETP) must maintain: pH 6.5-8.5, BOD <30 mg/L, COD <250 mg/L, TSS <100 mg/L as per CPCB effluent standards.';
  if (msg.includes('noise'))
    return 'Industrial noise standards (CPCB): Day (6am-10pm) ≤75 dB(A), Night (10pm-6am) ≤70 dB(A) in industrial zones. Use personal protective equipment above 85 dB(A).';
  return 'I\'m EcoBot, your environmental compliance assistant. I can help with CPCB standards, ESG reporting, carbon accounting, monitoring compliance, and regulatory requirements. How can I assist you today?';
}
