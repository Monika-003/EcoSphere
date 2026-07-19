'use strict';

const { logger } = require('../config/logger');
const { prisma } = require('../config/database');

let _claude = null;
function getClaude() {
  if (_claude) return _claude;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    _claude = new (Anthropic.default || Anthropic)({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch (e) { logger.warn('[AI] Claude SDK init failed:', e.message); _claude = null; }
  return _claude;
}

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

const COMPLIANCE_STANDARDS = {
  air: {
    PM10:   { limit: 100,  unit: 'ug/m3', standard: 'CPCB NAAQS' },
    PM2_5:  { limit: 60,   unit: 'ug/m3', standard: 'CPCB NAAQS' },
    SO2:    { limit: 80,   unit: 'ug/m3', standard: 'CPCB NAAQS' },
    NO2:    { limit: 80,   unit: 'ug/m3', standard: 'CPCB NAAQS' },
    CO:     { limit: 2000, unit: 'ug/m3', standard: 'CPCB NAAQS' },
    Ozone:  { limit: 180,  unit: 'ug/m3', standard: 'CPCB NAAQS' }
  },
  water: {
    pH:     { min: 6.5, max: 8.5, unit: '', standard: 'BIS 10500' },
    BOD:    { limit: 30,  unit: 'mg/L', standard: 'CPCB Effluent Standards' },
    COD:    { limit: 250, unit: 'mg/L', standard: 'CPCB Effluent Standards' },
    TSS:    { limit: 100, unit: 'mg/L', standard: 'CPCB Effluent Standards' }
  },
  noise: {
    day:   { limit: 55, unit: 'dB(A)', standard: 'CPCB Noise Standards - Industrial' },
    night: { limit: 45, unit: 'dB(A)', standard: 'CPCB Noise Standards - Industrial' }
  }
};

exports.analyseMonitoringData = async (monitoringType, parameters) => {
  const violations = [];
  const standards  = COMPLIANCE_STANDARDS[monitoringType?.toLowerCase()] || {};
  let violationsCount = 0;
  if (parameters && typeof parameters === 'object') {
    for (const [param, standard] of Object.entries(standards)) {
      const value  = parameters[param] || parameters[param.toLowerCase()];
      if (value === undefined || value === null) continue;
      const numVal = parseFloat(value);
      if (isNaN(numVal)) continue;
      if (standard.min !== undefined && numVal < standard.min) {
        violations.push({ parameter: param, value: numVal, limit: standard.min + '-' + standard.max, unit: standard.unit, standard: standard.standard });
        violationsCount++;
      } else if (standard.max !== undefined && numVal > standard.max) {
        violations.push({ parameter: param, value: numVal, limit: standard.min + '-' + standard.max, unit: standard.unit, standard: standard.standard });
        violationsCount++;
      } else if (standard.limit !== undefined && numVal > standard.limit) {
        violations.push({ parameter: param, value: numVal, limit: standard.limit, unit: standard.unit, standard: standard.standard });
        violationsCount++;
      }
    }
  }
  const complianceStatus = violationsCount === 0 ? 'COMPLIANT' : violationsCount <= 2 ? 'MARGINAL' : 'NON_COMPLIANT';
  const score = Math.max(0, 100 - (violationsCount * 20));
  let summary = monitoringType + ' monitoring: ' + violationsCount + ' violation(s). Status: ' + complianceStatus + '.';
  let recommendations = violations.length
    ? violations.map(v => 'Reduce ' + v.parameter + ' below ' + v.limit + ' ' + v.unit).join('; ')
    : 'All parameters within acceptable limits.';
  return { summary, recommendations, score, violations, violationsCount, complianceStatus };
};

exports.generateReportAnalysis = async (reportType, monitoringRecords, org) => {
  const base = {
    summary: reportType + ' report for ' + (org && org.name ? org.name : 'organization') + '.',
    recommendations: 'Review monitoring data for compliance improvements.',
    riskScore: 30, esgScore: 72, envScore: 70, socialScore: 75, govScore: 71,
    complianceScore: 80, scope1: 120.5, scope2: 45.2, scope3: 22.8, totalCarbon: 188.5
  };
  if (!monitoringRecords || !monitoringRecords.length) return base;
  const total     = monitoringRecords.length;
  const compliant = monitoringRecords.filter(r => r.complianceStatus === 'COMPLIANT').length;
  const violations= monitoringRecords.filter(r => r.complianceStatus === 'NON_COMPLIANT').length;
  const complianceScore = total > 0 ? Math.round((compliant / total) * 100) : 80;
  const riskScore = violations > 0 ? Math.min(100, violations * 15 + 20) : 10;
  return { ...base, complianceScore, riskScore };
};

exports.ecobotQuery = async (userId, orgId, message, conversationHistory, context) => {
  if (!conversationHistory) conversationHistory = [];
  if (!context) context = {};

  let orgContext = '';
  if (orgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, industryType: true, city: true, state: true }
      });
      if (org) orgContext = 'Organisation: ' + org.name + ' (' + org.industryType + '), ' + org.city + ', ' + org.state + '.';
    } catch (e) { /* skip */ }
  }

  const ROLE_INSTR = {
    ORG_ADMIN:   'You assist an Organisation Administrator. Focus on their org monitoring, compliance, ESG, and report submissions.',
    ENV_OFFICER: 'You assist an Environmental Officer. Focus on monitoring exceedances, corrective actions, and regulatory submissions.',
    LAB_USER:    'You assist a Laboratory Officer. Help with report review and compliance verification against CPCB/SPCB standards.',
    REG_OFFICER: 'You assist a Regulatory/Government Officer. Help with approvals, certificate issuance, compliance notices, and sector analysis.',
    SUPER_ADMIN: 'You assist a Super Administrator with full platform access.'
  };

  const effectiveRole = context.role || context.userRole || 'ORG_ADMIN';
  const roleInstr = ROLE_INSTR[effectiveRole] || ROLE_INSTR['ORG_ADMIN'];
  const sectionCtx = context.section
    ? 'The user is currently viewing the "' + context.section + '" section of the ' + (context.portal || 'organisation') + ' portal.'
    : '';

  const systemPrompt = [
    'You are EcoBot, the AI Environmental Compliance Assistant for EcoSphere — India\'s leading Environmental Management and ESG Compliance SaaS Platform.',
    '',
    roleInstr,
    orgContext,
    sectionCtx,
    '',
    'EXPERTISE:',
    '- Indian Regulations: CPCB, SPCB, MoEFCC, Environment Protection Act 1986',
    '- Air Quality (CPCB NAAQS): PM2.5 <=60 ug/m3, PM10 <=100 ug/m3, SO2 <=80 ug/m3, NO2 <=80 ug/m3',
    '- Water Quality (CPCB): BOD <=30 mg/L, COD <=250 mg/L, TSS <=100 mg/L, pH 6.5-8.5',
    '- ESG Frameworks: GRI Standards, SEBI BRSR, ISO 14001, ISO 50001, UN SDGs',
    '- Carbon Accounting: GHG Protocol, Scope 1/2/3 emissions',
    '- Laboratory: NABL, ISO 17025, CPCB approved parameters',
    '- EIA Process: Baseline surveys, impact assessment, EMP, MoEFCC clearances',
    '',
    'NAVIGATION: When user asks to open/navigate to a portal section, include [NAV:section_id] in your response.',
    'Valid section_ids: monitoring, reports, esg, carbon, eia, alerts, modules, history, chat',
    '',
    'RESPONSE RULES:',
    '- Be concise and actionable (2-3 paragraphs max unless detailed analysis requested)',
    '- Use bullet points for parameter lists and recommendations',
    '- Cite specific limit values when discussing standards',
    '- For violations, always suggest corrective action',
    '- Format responses in HTML using <strong>, <br>, bullet points',
    '- Respond in the same language the user uses (English, Hindi, or Tamil)',
    '- Never invent specific monitoring data - guide user to the relevant portal section'
  ].filter(Boolean).join('\n');

  const claude = getClaude();
  if (claude) {
    try {
      const messages = conversationHistory.slice(-10).concat([{ role: 'user', content: message }]);
      const response = await claude.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages: messages
      });
      const reply  = (response.content || []).find(function(b){ return b.type === 'text'; });
      const tokens = (response.usage ? response.usage.input_tokens + response.usage.output_tokens : 0);
      return { reply: reply ? reply.text : 'I could not generate a response. Please try again.', tokens: tokens, model: 'claude-opus-4-8' };
    } catch (err) {
      logger.error('[EcoBot] Claude error:', err.message);
    }
  }

  const openai = getOpenAI();
  if (openai) {
    try {
      const msgs = [{ role: 'system', content: systemPrompt }]
        .concat(conversationHistory.slice(-10))
        .concat([{ role: 'user', content: message }]);
      const completion = await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages: msgs, max_tokens: 500, temperature: 0.7 });
      return { reply: completion.choices[0].message.content || 'No response.', tokens: completion.usage ? completion.usage.total_tokens : 0, model: 'gpt-3.5-turbo' };
    } catch (err) { logger.error('[EcoBot] OpenAI error:', err.message); }
  }

  return { reply: getEcoBotFallbackReply(message), tokens: 0, model: 'fallback' };
};

function getEcoBotFallbackReply(message) {
  const msg = message.toLowerCase();
  if (msg.indexOf('cpcb') >= 0 || msg.indexOf('standard') >= 0)
    return '<strong>CPCB Standards:</strong><br>• Air (NAAQS): PM10 ≤100 µg/m³, PM2.5 ≤60 µg/m³, SO₂ ≤80 µg/m³, NO₂ ≤80 µg/m³<br>• Water (Effluent): BOD ≤30 mg/L, COD ≤250 mg/L, TSS ≤100 mg/L, pH 6.5–8.5<br>• Noise (Industrial): Day ≤75 dB(A), Night ≤70 dB(A)';
  if (msg.indexOf('esg') >= 0)
    return '<strong>ESG Reporting</strong> covers Environmental, Social, and Governance dimensions.<br>• Environmental: GHG emissions, water, waste, biodiversity<br>• Social: Labour, community, health & safety<br>• Governance: Board, anti-corruption, transparency<br>Use the <strong>ESG Wizard</strong> in your portal.';
  if (msg.indexOf('carbon') >= 0 || msg.indexOf('emission') >= 0)
    return '<strong>Carbon Accounting (GHG Protocol):</strong><br>• Scope 1: Direct emissions from owned sources<br>• Scope 2: Indirect from purchased energy<br>• Scope 3: Value chain emissions<br>Navigate to the <strong>Carbon module</strong> in EcoBot AI Workspace.';
  if (msg.indexOf('etp') >= 0 || msg.indexOf('wastewater') >= 0)
    return '<strong>ETP Standards (CPCB):</strong><br>• pH: 6.5–8.5<br>• BOD: &lt;30 mg/L<br>• COD: &lt;250 mg/L<br>• TSS: &lt;100 mg/L<br>Regular CEMS calibration and logbook maintenance are mandatory.';
  if (msg.indexOf('hello') >= 0 || msg.indexOf('hi') >= 0 || msg.indexOf('hey') >= 0)
    return 'Hello! I\'m <strong>EcoBot</strong>, your AI Environmental Compliance Assistant.<br><br>I can help with CPCB standards, ESG reporting (GRI/BRSR), carbon accounting, ETP/STP operations, EIA process, and regulatory compliance.<br><br>To enable full AI responses, add your <code>ANTHROPIC_API_KEY</code> to <code>backend/.env</code>.';
  return 'I\'m <strong>EcoBot</strong>, your environmental compliance assistant for EcoSphere.<br><br>I can help with CPCB standards, ESG reporting, carbon accounting, monitoring compliance, EIA process, and regulatory requirements.<br><br><em>Add your <code>ANTHROPIC_API_KEY</code> to <code>backend/.env</code> for full AI responses.</em>';
}
