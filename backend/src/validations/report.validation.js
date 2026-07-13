'use strict';

/**
 * report.validation.js — Joi schemas for report endpoints
 */

const Joi = require('joi');

/* ── Valid report types (from Prisma ReportType enum) ── */
const REPORT_TYPES = [
  'ENVIRONMENTAL_MONITORING',
  'ESG_REPORT',
  'CARBON_EMISSION',
  'SUSTAINABILITY',
  'ISO14001_COMPLIANCE',
  'EIA_REPORT',
  'WATER_AUDIT',
  'ENERGY_AUDIT',
  'WASTE_AUDIT',
  'ANNUAL_ENVIRONMENTAL'
];

/* ════════════════════════════════════════════════════
   CREATE REPORT
   Accepts both naming conventions:
     • type          (frontend sends this)
     • reportType    (legacy alias)
   Period dates can be sent as:
     • flat fields   periodStartDate / periodEndDate
     • nested object reportingPeriod.{ startDate, endDate }
════════════════════════════════════════════════════ */
exports.createReportSchema = Joi.object({
  title:           Joi.string().trim().min(5).max(300).required()
                    .messages({
                      'any.required': 'Report title is required',
                      'string.min':   'Title must be at least 5 characters',
                      'string.max':   'Title cannot exceed 300 characters'
                    }),

  /* Accept both `type` (primary) and `reportType` (legacy alias) */
  type:            Joi.string().valid(...REPORT_TYPES).optional()
                    .messages({ 'any.only': `Type must be one of: ${REPORT_TYPES.join(', ')}` }),
  reportType:      Joi.string().valid(...REPORT_TYPES).optional(),

  description:     Joi.string().trim().max(2000).optional().allow('', null),

  /* period label — required by Prisma model */
  period:          Joi.string().trim().max(50).optional().default('MONTHLY'),

  /* Period dates — accept both flat and nested */
  periodStartDate: Joi.date().iso().optional().allow(null),
  periodEndDate:   Joi.date().iso().optional().allow(null),

  reportingPeriod: Joi.object({
    startDate: Joi.date().iso().optional().allow(null),
    endDate:   Joi.date().iso().optional().allow(null)
  }).optional(),

  monitoringRecordIds: Joi.array().items(Joi.string().uuid()).optional(),

  methodology:     Joi.string().trim().max(1000).optional().allow('', null),
  executiveSummary: Joi.string().trim().max(5000).optional().allow('', null),
  recommendations:  Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
  attachments:      Joi.array().items(Joi.string().uri()).max(20).optional(),
  tags:             Joi.array().items(Joi.string().trim().max(50)).max(15).optional(),
  isPublic:         Joi.boolean().default(false),

  notes:            Joi.string().trim().max(2000).optional().allow('', null),
  isDraft:          Joi.boolean().default(false)
});

/* ════════════════════════════════════════════════════
   QUICK PDF (single-record report)
   Accepts both naming conventions:
     • type   / label       (used by pdf-download.js and the controller)
     • reportType / title   (legacy alias — kept for backward compat)
════════════════════════════════════════════════════ */
exports.quickPdfSchema = Joi.object({
  /* Primary field names (match controller + frontend) */
  type:           Joi.string().valid(...REPORT_TYPES).optional()
                   .messages({ 'any.only': `type must be one of: ${REPORT_TYPES.join(', ')}` }),

  label:          Joi.string().trim().min(1).max(300).optional(),

  /* Legacy aliases — ignored by controller but accepted so Joi doesn't reject them */
  reportType:     Joi.string().valid(...REPORT_TYPES).optional(),
  title:          Joi.string().trim().min(1).max(300).optional(),

  organizationId: Joi.string().uuid().optional().allow(null),

  startDate:      Joi.date().iso().optional().allow(null),
  endDate:        Joi.date().iso().optional().allow(null),

  parameters:     Joi.object().optional(),

  includeCharts:  Joi.boolean().default(true),
  includeRawData: Joi.boolean().default(true)
});

/* ════════════════════════════════════════════════════
   QUERY FILTERS — GET /reports
════════════════════════════════════════════════════ */
exports.listReportsQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
  type:      Joi.string().valid(...REPORT_TYPES).optional(),
  status:    Joi.string().valid(
               'DRAFT','SUBMITTED','LAB_REVIEW','LAB_APPROVED','LAB_REJECTED',
               'REGULATORY_REVIEW','REGULATORY_APPROVED','REGULATORY_REJECTED',
               'CORRECTION_REQUIRED','CERTIFIED','ARCHIVED','CANCELLED'
             ).optional(),
  startDate: Joi.date().iso().optional(),
  endDate:   Joi.date().iso().min(Joi.ref('startDate')).optional()
              .messages({ 'date.min': 'endDate must be after startDate' }),
  search:    Joi.string().trim().max(100).optional(),
  sortBy:    Joi.string().valid('createdAt','updatedAt','title','status','type').default('createdAt'),
  sortOrder: Joi.string().valid('asc','desc').default('desc')
});

/* ════════════════════════════════════════════════════
   SUBMIT REPORT
════════════════════════════════════════════════════ */
exports.submitReportSchema = Joi.object({
  notes: Joi.string().trim().max(1000).optional().allow('', null)
});

/* ════════════════════════════════════════════════════
   LAB REVIEW DECISION
════════════════════════════════════════════════════ */
exports.labReviewSchema = Joi.object({
  decision:        Joi.string().valid('APPROVED','REJECTED','CORRECTION_REQUIRED').required()
                    .messages({
                      'any.required': 'Review decision is required',
                      'any.only':     'Decision must be APPROVED, REJECTED, or CORRECTION_REQUIRED'
                    }),

  reviewNotes:     Joi.string().trim().max(3000).optional().allow('', null),

  correctionNotes: Joi.when('decision', {
                     is:        'CORRECTION_REQUIRED',
                     then:      Joi.string().trim().min(10).max(3000).required()
                                  .messages({ 'any.required': 'Correction notes are required when requesting corrections', 'string.min': 'Correction notes must be at least 10 characters' }),
                     otherwise: Joi.string().trim().max(3000).optional().allow('', null)
                   })
});

/* ════════════════════════════════════════════════════
   REGULATORY REVIEW DECISION
════════════════════════════════════════════════════ */
exports.regReviewSchema = Joi.object({
  decision:        Joi.string().valid('APPROVED','REJECTED').required()
                    .messages({
                      'any.required': 'Regulatory decision is required',
                      'any.only':     'Decision must be APPROVED or REJECTED'
                    }),

  reviewNotes:     Joi.string().trim().max(3000).optional().allow('', null),

  complianceScore: Joi.number().min(0).max(100).optional().allow(null),

  conditions:      Joi.array().items(Joi.string().trim().max(500)).max(20).optional()
                    .messages({ 'array.max': 'Cannot specify more than 20 conditions' })
});
