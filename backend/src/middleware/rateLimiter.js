'use strict';

const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 min

/* ── General API rate limit ── */
const generalLimiter = rateLimit({
  windowMs,
  max:     parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { success: false, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests — please try again later' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

/* ── Auth endpoints — stricter ── */
const authLimiter = rateLimit({
  windowMs: 900000,
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
  message:  { success: false, code: 'AUTH_RATE_LIMIT', message: 'Too many authentication attempts — locked for 15 minutes' },
  standardHeaders: true,
  legacyHeaders:   false,
});

/* ── File upload limiter ── */
const uploadLimiter = rateLimit({
  windowMs: 3600000,
  max:      50,
  message:  { success: false, code: 'UPLOAD_RATE_LIMIT', message: 'Upload limit reached — try again in 1 hour' },
});

/* ── Report generation ── */
const reportGenLimiter = rateLimit({
  windowMs: 3600000,
  max:      20,
  message:  { success: false, code: 'REPORT_GEN_LIMIT', message: 'Report generation limit reached' },
});

/* ── AI/EcoBot limiter ── */
const aiLimiter = rateLimit({
  windowMs: 60000,
  max:      20,
  message:  { success: false, code: 'AI_RATE_LIMIT', message: 'AI query limit reached — wait 60 seconds' },
});

module.exports = { generalLimiter, authLimiter, uploadLimiter, reportGenLimiter, aiLimiter };
