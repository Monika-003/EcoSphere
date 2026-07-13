'use strict';

/**
 * monitoring.validation.js — Joi schemas for monitoring endpoints
 */

const Joi = require('joi');

/* ── Valid monitoring types — MUST match Prisma MonitoringType enum exactly ── */
const MONITORING_TYPES = [
  'AIR',
  'WATER',
  'NOISE',
  'SOIL',
  'TEMPERATURE',
  'HUMIDITY',
  'WASTE',
  'STACK_EMISSION',
  'GROUNDWATER',
  'METEOROLOGICAL',
  'ETP',
  'STP'
];

/* ── Valid units of measurement — permissive to accept µ (U+00B5), ³, ², °, etc. ── */
const UNIT_PATTERN = /^[\w%°\/µμ³²·.\-\s]{0,25}$/u;

/* ════════════════════════════════════════════════════
   CREATE MONITORING STATION
════════════════════════════════════════════════════ */
exports.createStationSchema = Joi.object({
  name:           Joi.string().trim().min(2).max(150).required()
                   .messages({ 'any.required': 'Station name is required' }),

  /* Accept both `code` (schema name) and `stationCode` (Prisma/controller name) */
  code:           Joi.string().trim().uppercase().min(2).max(20).optional(),
  stationCode:    Joi.string().trim().uppercase().min(2).max(20).optional(),

  latitude:       Joi.number().min(-90).max(90).optional().allow(null)
                   .messages({ 'number.min': 'Latitude must be between -90 and 90', 'number.max': 'Latitude must be between -90 and 90' }),

  longitude:      Joi.number().min(-180).max(180).optional().allow(null)
                   .messages({ 'number.min': 'Longitude must be between -180 and 180', 'number.max': 'Longitude must be between -180 and 180' }),

  altitude:       Joi.number().optional().allow(null),

  address:        Joi.string().trim().max(500).optional().allow('', null),

  stationType:    Joi.string().valid('CONTINUOUS','MANUAL','AUTOMATIC','PORTABLE').optional(),

  /* Accept both `monitoringType` (singular, Prisma) and `monitoringTypes` (plural array, legacy) */
  monitoringType:  Joi.string().valid(...MONITORING_TYPES).optional(),
  monitoringTypes: Joi.array().items(Joi.string().valid(...MONITORING_TYPES)).min(1).optional(),

  isActive:       Joi.boolean().default(true),

  description:    Joi.string().trim().max(1000).optional().allow('', null),
});

/* ════════════════════════════════════════════════════
   CREATE MONITORING RECORD
════════════════════════════════════════════════════ */

/* Each measurement parameter value */
const parameterValueSchema = Joi.object({
  value:      Joi.alternatives().try(Joi.number(), Joi.string()).required()
               .messages({ 'any.required': 'Parameter value is required' }),
  unit:       Joi.string().trim().pattern(UNIT_PATTERN).allow('').optional().default('-')
               .messages({ 'string.pattern.base': 'Unit contains unsupported characters (max 25 chars)' }),
  min:        Joi.number().optional().allow(null),
  max:        Joi.number().optional().allow(null),
  limit:      Joi.number().optional().allow(null),     // regulatory threshold
  status:     Joi.string().valid('NORMAL','WARNING','CRITICAL','COMPLIANT','NON_COMPLIANT').optional(),
  instrument: Joi.string().trim().max(100).optional().allow('', null),
  method:     Joi.string().trim().max(100).optional().allow('', null)
});

exports.createRecordSchema = Joi.object({
  stationId:      Joi.string().uuid().required()
                   .messages({ 'any.required': 'Monitoring station is required', 'string.guid': 'Station ID must be a valid UUID' }),

  monitoringType: Joi.string().valid(...MONITORING_TYPES).required()
                   .messages({ 'any.required': 'Monitoring type is required', 'any.only': `Must be one of: ${MONITORING_TYPES.join(', ')}` }),

  /* Accept both `recordedAt` (schema name) and `recordingDate` (controller/Prisma name) */
  recordedAt:     Joi.date().iso().optional()
                   .messages({ 'date.max': 'Recording date cannot be in the future' }),
  recordingDate:  Joi.date().iso().optional(),

  parameters:     Joi.object().pattern(
                    Joi.string().min(1).max(80),
                    parameterValueSchema
                  ).min(1).required()
                   .messages({ 'any.required': 'At least one parameter measurement is required', 'object.min': 'At least one parameter is required' }),

  weatherConditions: Joi.object({
    temperature: Joi.number().min(-100).max(100).optional(),
    humidity:    Joi.number().min(0).max(100).optional(),
    windSpeed:   Joi.number().min(0).max(500).optional(),
    windDir:     Joi.string().valid('N','NE','E','SE','S','SW','W','NW').optional(),
    pressure:    Joi.number().min(800).max(1200).optional(),
    description: Joi.string().trim().max(200).optional()
  }).optional(),

  /* Accept both `notes` (schema/service name) and `remarks` (controller/Prisma name) */
  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  remarks:        Joi.string().trim().max(2000).optional().allow('', null),

  isCompliant:    Joi.boolean().optional(),

  attachments:    Joi.array().items(Joi.string().uri()).max(10).optional()
});

/* ════════════════════════════════════════════════════
   UPDATE MONITORING RECORD (PATCH — all fields optional)
════════════════════════════════════════════════════ */
exports.updateRecordSchema = Joi.object({
  parameters:     Joi.object().pattern(
                    Joi.string().min(1).max(80),
                    parameterValueSchema
                  ).min(1).optional(),

  weatherConditions: Joi.object({
    temperature: Joi.number().optional(),
    humidity:    Joi.number().min(0).max(100).optional(),
    windSpeed:   Joi.number().min(0).optional(),
    windDir:     Joi.string().valid('N','NE','E','SE','S','SW','W','NW').optional(),
    pressure:    Joi.number().optional(),
    description: Joi.string().trim().max(200).optional()
  }).optional(),

  notes:          Joi.string().trim().max(2000).optional().allow('', null),
  isCompliant:    Joi.boolean().optional(),
  attachments:    Joi.array().items(Joi.string().uri()).max(10).optional()
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });

/* ════════════════════════════════════════════════════
   QUERY FILTERS — GET /records
════════════════════════════════════════════════════ */
exports.listRecordsQuerySchema = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  limit:          Joi.number().integer().min(1).max(100).default(20),
  monitoringType: Joi.string().valid(...MONITORING_TYPES).optional(),
  stationId:      Joi.string().uuid().optional(),
  status:         Joi.string().valid('DRAFT','SUBMITTED','VERIFIED','REJECTED').optional(),
  startDate:      Joi.date().iso().optional(),
  endDate:        Joi.date().iso().min(Joi.ref('startDate')).optional()
                   .messages({ 'date.min': 'End date must be after start date' }),
  search:         Joi.string().trim().max(100).optional(),
  sortBy:         Joi.string().valid('recordedAt','createdAt','monitoringType','status').default('recordedAt'),
  sortOrder:      Joi.string().valid('asc','desc').default('desc')
});
