'use strict';

/**
 * EIA Module — Joi Validation Schemas
 * Phase 7 | All request bodies and query strings
 */

const Joi = require('joi');

/* ── Reusable primitives ──────────────────────────────────────── */
const paginationSchema = {
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
};

const projectIdParam = Joi.string().required();

/* ═══════════════════════════════════════════════════════════════
   PROJECT
═══════════════════════════════════════════════════════════════ */

exports.createProjectSchema = Joi.object({
  projectName:         Joi.string().min(2).max(255).required(),
  projectNumber:       Joi.string().max(100).optional(),
  projectType:         Joi.string().valid('GREENFIELD','BROWNFIELD','EXPANSION','MODERNISATION','DECOMMISSIONING').required(),
  projectCategory:     Joi.string().valid('CATEGORY_A','CATEGORY_B1','CATEGORY_B2').required(),
  description:         Joi.string().max(5000).optional(),
  industry:            Joi.string().max(200).optional(),
  activity:            Joi.string().max(500).optional(),
  location:            Joi.string().max(500).optional(),
  state:               Joi.string().max(100).optional(),
  district:            Joi.string().max(100).optional(),
  village:             Joi.string().max(100).optional(),
  latitude:            Joi.number().min(-90).max(90).optional(),
  longitude:           Joi.number().min(-180).max(180).optional(),
  areaHectares:        Joi.number().min(0).optional(),
  investmentCrores:    Joi.number().min(0).optional(),
  proposedCapacity:    Joi.string().max(300).optional(),
  projectProponent:    Joi.string().max(300).optional(),
  consultantName:      Joi.string().max(300).optional(),
  consultantAccNo:     Joi.string().max(100).optional(),
  eiaNotificationYear: Joi.string().max(20).optional(),
  tocGranted:          Joi.boolean().optional(),
  tocDate:             Joi.date().iso().optional(),
  ecGranted:           Joi.boolean().optional(),
  ecDate:              Joi.date().iso().optional(),
  ecNumber:            Joi.string().max(100).optional(),
  ecIssuingAuthority:  Joi.string().max(200).optional(),
  cteGranted:          Joi.boolean().optional(),
  cteNumber:           Joi.string().max(100).optional(),
  ctoGranted:          Joi.boolean().optional(),
  ctoNumber:           Joi.string().max(100).optional(),
  publicHearingDone:   Joi.boolean().optional(),
  publicHearingDate:   Joi.date().iso().optional(),
  publicHearingVenue:  Joi.string().max(500).optional(),
  studyPeriodFrom:     Joi.date().iso().optional(),
  studyPeriodTo:       Joi.date().iso().optional(),
  reportingYear:       Joi.string().max(20).required()
});

exports.updateProjectSchema = exports.createProjectSchema
  .fork(Object.keys(exports.createProjectSchema.describe().keys), k => k.optional())
  .concat(Joi.object({ status: Joi.string().valid('DRAFT','ACTIVE','UNDER_REVIEW','APPROVED','REJECTED','CLOSED').optional() }));

exports.listProjectsSchema = Joi.object({
  status:        Joi.string().valid('DRAFT','ACTIVE','UNDER_REVIEW','APPROVED','REJECTED','CLOSED').optional(),
  reportingYear: Joi.string().max(20).optional(),
  state:         Joi.string().max(100).optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   AIR MONITORING
═══════════════════════════════════════════════════════════════ */

exports.airMonitoringSchema = Joi.object({
  stationName:      Joi.string().max(255).required(),
  stationCode:      Joi.string().max(50).optional(),
  monitoringDate:   Joi.date().iso().required(),
  monitoringPeriod: Joi.string().max(50).optional(),
  location:         Joi.string().max(500).optional(),
  phase:            Joi.string().valid('PRE_CONSTRUCTION','CONSTRUCTION','OPERATION','POST_OPERATION').optional(),
  pm25:             Joi.number().min(0).optional(),
  pm10:             Joi.number().min(0).optional(),
  rspm:             Joi.number().min(0).optional(),
  spm:              Joi.number().min(0).optional(),
  so2:              Joi.number().min(0).optional(),
  nox:              Joi.number().min(0).optional(),
  no2:              Joi.number().min(0).optional(),
  co:               Joi.number().min(0).optional(),
  o3:               Joi.number().min(0).optional(),
  nh3:              Joi.number().min(0).optional(),
  pb:               Joi.number().min(0).optional(),
  benzene:          Joi.number().min(0).optional(),
  benzoPyrene:      Joi.number().min(0).optional(),
  hc:               Joi.number().min(0).optional(),
  windSpeed:        Joi.number().min(0).optional(),
  windDirection:    Joi.string().max(50).optional(),
  temperature:      Joi.number().min(-50).max(60).optional(),
  relHumidity:      Joi.number().min(0).max(100).optional(),
  stability:        Joi.string().valid('A','B','C','D','E','F').optional(),
  pm25Std:          Joi.number().min(0).optional(),
  pm10Std:          Joi.number().min(0).optional(),
  so2Std:           Joi.number().min(0).optional(),
  noxStd:           Joi.number().min(0).optional(),
  labName:          Joi.string().max(300).optional(),
  labAccreditation: Joi.string().max(100).optional(),
  remarks:          Joi.string().max(2000).optional()
});

exports.listAirSchema = Joi.object({
  from:             Joi.date().iso().optional(),
  to:               Joi.date().iso().optional(),
  stationName:      Joi.string().max(255).optional(),
  phase:            Joi.string().optional(),
  exceedanceOnly:   Joi.boolean().optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   WATER MONITORING
═══════════════════════════════════════════════════════════════ */

exports.waterMonitoringSchema = Joi.object({
  sourceType:      Joi.string().valid('SURFACE_WATER','GROUNDWATER','EFFLUENT','DRINKING_WATER','RAINWATER').required(),
  sourceName:      Joi.string().max(255).required(),
  monitoringDate:  Joi.date().iso().required(),
  location:        Joi.string().max(500).optional(),
  depth:           Joi.number().min(0).optional(),
  phase:           Joi.string().valid('PRE_CONSTRUCTION','CONSTRUCTION','OPERATION','POST_OPERATION').optional(),
  pH:              Joi.number().min(0).max(14).optional(),
  temperature:     Joi.number().min(0).max(100).optional(),
  turbidity:       Joi.number().min(0).optional(),
  tds:             Joi.number().min(0).optional(),
  tss:             Joi.number().min(0).optional(),
  conductivity:    Joi.number().min(0).optional(),
  dissolvedO2:     Joi.number().min(0).optional(),
  colour:          Joi.string().max(50).optional(),
  bod:             Joi.number().min(0).optional(),
  cod:             Joi.number().min(0).optional(),
  hardness:        Joi.number().min(0).optional(),
  alkalinity:      Joi.number().min(0).optional(),
  chlorides:       Joi.number().min(0).optional(),
  sulfates:        Joi.number().min(0).optional(),
  nitrates:        Joi.number().min(0).optional(),
  nitrites:        Joi.number().min(0).optional(),
  phosphates:      Joi.number().min(0).optional(),
  fluorides:       Joi.number().min(0).optional(),
  silica:          Joi.number().min(0).optional(),
  arsenic:         Joi.number().min(0).optional(),
  cadmium:         Joi.number().min(0).optional(),
  chromium:        Joi.number().min(0).optional(),
  copper:          Joi.number().min(0).optional(),
  iron:            Joi.number().min(0).optional(),
  lead:            Joi.number().min(0).optional(),
  manganese:       Joi.number().min(0).optional(),
  mercury:         Joi.number().min(0).optional(),
  nickel:          Joi.number().min(0).optional(),
  zinc:            Joi.number().min(0).optional(),
  coliformTotal:   Joi.number().min(0).optional(),
  coliformFecal:   Joi.number().min(0).optional(),
  labName:         Joi.string().max(300).optional(),
  labAccreditation:Joi.string().max(100).optional(),
  remarks:         Joi.string().max(2000).optional()
});

exports.listWaterSchema = Joi.object({
  from:           Joi.date().iso().optional(),
  to:             Joi.date().iso().optional(),
  sourceType:     Joi.string().optional(),
  phase:          Joi.string().optional(),
  exceedanceOnly: Joi.boolean().optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   SOIL MONITORING
═══════════════════════════════════════════════════════════════ */

exports.soilMonitoringSchema = Joi.object({
  sampleId:        Joi.string().max(50).optional(),
  sampleLocation:  Joi.string().max(500).required(),
  monitoringDate:  Joi.date().iso().required(),
  depth:           Joi.string().max(50).optional(),
  soilType:        Joi.string().valid('CLAY','SANDY','LOAMY','SILT','PEAT','CHALKY','SILTY').optional(),
  landUse:         Joi.string().max(200).optional(),
  phase:           Joi.string().valid('PRE_CONSTRUCTION','CONSTRUCTION','OPERATION','POST_OPERATION').optional(),
  pH:              Joi.number().min(0).max(14).optional(),
  electricalCond:  Joi.number().min(0).optional(),
  organicCarbon:   Joi.number().min(0).max(100).optional(),
  organicMatter:   Joi.number().min(0).max(100).optional(),
  bulkDensity:     Joi.number().min(0).optional(),
  moisture:        Joi.number().min(0).max(100).optional(),
  texture:         Joi.string().max(100).optional(),
  waterHolding:    Joi.number().min(0).max(100).optional(),
  nitrogen:        Joi.number().min(0).optional(),
  phosphorus:      Joi.number().min(0).optional(),
  potassium:       Joi.number().min(0).optional(),
  sulfur:          Joi.number().min(0).optional(),
  arsenic:         Joi.number().min(0).optional(),
  cadmium:         Joi.number().min(0).optional(),
  chromium:        Joi.number().min(0).optional(),
  copper:          Joi.number().min(0).optional(),
  iron:            Joi.number().min(0).optional(),
  lead:            Joi.number().min(0).optional(),
  manganese:       Joi.number().min(0).optional(),
  nickel:          Joi.number().min(0).optional(),
  zinc:            Joi.number().min(0).optional(),
  mercury:         Joi.number().min(0).optional(),
  labName:         Joi.string().max(300).optional(),
  labAccreditation:Joi.string().max(100).optional(),
  remarks:         Joi.string().max(2000).optional()
});

exports.listSoilSchema = Joi.object({
  from:           Joi.date().iso().optional(),
  to:             Joi.date().iso().optional(),
  phase:          Joi.string().optional(),
  exceedanceOnly: Joi.boolean().optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   NOISE MONITORING
═══════════════════════════════════════════════════════════════ */

exports.noiseMonitoringSchema = Joi.object({
  locationName:    Joi.string().max(255).required(),
  locationType:    Joi.string().valid('RESIDENTIAL','COMMERCIAL','INDUSTRIAL','SILENCE_ZONE').optional(),
  monitoringDate:  Joi.date().iso().required(),
  phase:           Joi.string().valid('PRE_CONSTRUCTION','CONSTRUCTION','OPERATION','POST_OPERATION').optional(),
  dayAvgDb:        Joi.number().min(0).max(200).optional(),
  nightAvgDb:      Joi.number().min(0).max(200).optional(),
  dayMinDb:        Joi.number().min(0).max(200).optional(),
  dayMaxDb:        Joi.number().min(0).max(200).optional(),
  nightMinDb:      Joi.number().min(0).max(200).optional(),
  nightMaxDb:      Joi.number().min(0).max(200).optional(),
  leq:             Joi.number().min(0).max(200).optional(),
  l10:             Joi.number().min(0).max(200).optional(),
  l50:             Joi.number().min(0).max(200).optional(),
  l90:             Joi.number().min(0).max(200).optional(),
  lmax:            Joi.number().min(0).max(200).optional(),
  lmin:            Joi.number().min(0).max(200).optional(),
  ldn:             Joi.number().min(0).max(200).optional(),
  daytimeStd:      Joi.number().min(0).max(200).optional(),
  nighttimeStd:    Joi.number().min(0).max(200).optional(),
  instrumentModel: Joi.string().max(200).optional(),
  calibrated:      Joi.boolean().optional(),
  calibrationDate: Joi.date().iso().optional(),
  remarks:         Joi.string().max(2000).optional()
});

exports.listNoiseSchema = Joi.object({
  from:           Joi.date().iso().optional(),
  to:             Joi.date().iso().optional(),
  locationType:   Joi.string().optional(),
  phase:          Joi.string().optional(),
  exceedanceOnly: Joi.boolean().optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   IMPACT ASSESSMENT
═══════════════════════════════════════════════════════════════ */

exports.impactAssessmentSchema = Joi.object({
  component:          Joi.string().valid('AIR','WATER','SOIL','NOISE','ECOLOGY','SOCIOECONOMIC','HERITAGE','HYDROLOGY','WASTE','LAND').required(),
  impactType:         Joi.string().valid('POSITIVE','NEGATIVE','NEUTRAL').required(),
  significance:       Joi.string().valid('NEGLIGIBLE','LOW','MODERATE','HIGH','VERY_HIGH').required(),
  duration:           Joi.string().valid('SHORT_TERM','MEDIUM_TERM','LONG_TERM','PERMANENT').optional(),
  description:        Joi.string().min(10).max(5000).required(),
  reversibility:      Joi.string().valid('REVERSIBLE','IRREVERSIBLE').optional(),
  probability:        Joi.string().valid('LOW','MEDIUM','HIGH','CERTAIN').optional(),
  spatialExtent:      Joi.string().valid('LOCAL','REGIONAL','NATIONAL','TRANSBOUNDARY').optional(),
  magnitude:          Joi.number().integer().min(1).max(10).optional(),
  sensitivity:        Joi.number().integer().min(1).max(5).optional(),
  constructionPhase:  Joi.boolean().optional(),
  operationPhase:     Joi.boolean().optional(),
  decommPhase:        Joi.boolean().optional(),
  cumulativeImpact:   Joi.boolean().optional(),
  cumulativeDesc:     Joi.string().max(3000).optional(),
  residualImpact:     Joi.string().max(2000).optional(),
  mitigationPossible: Joi.boolean().optional(),
  remarks:            Joi.string().max(2000).optional()
});

exports.listImpactSchema = Joi.object({
  component:    Joi.string().optional(),
  impactType:   Joi.string().valid('POSITIVE','NEGATIVE','NEUTRAL').optional(),
  significance: Joi.string().valid('NEGLIGIBLE','LOW','MODERATE','HIGH','VERY_HIGH').optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   MITIGATION MEASURES
═══════════════════════════════════════════════════════════════ */

exports.mitigationMeasureSchema = Joi.object({
  impactId:          Joi.string().optional(),
  component:         Joi.string().valid('AIR','WATER','SOIL','NOISE','ECOLOGY','SOCIOECONOMIC','HERITAGE','WASTE','LAND').required(),
  measureTitle:      Joi.string().min(3).max(500).required(),
  description:       Joi.string().min(5).max(5000).required(),
  measureType:       Joi.string().valid('PREVENTIVE','CONTROL','REMEDIAL','COMPENSATORY').optional(),
  implementedBy:     Joi.string().max(300).optional(),
  timeline:          Joi.string().max(200).optional(),
  estimatedCost:     Joi.number().min(0).optional(),
  status:            Joi.string().valid('PLANNED','IN_PROGRESS','COMPLETED','NOT_APPLICABLE','DEFERRED').optional(),
  kpi:               Joi.string().max(500).optional(),
  targetValue:       Joi.string().max(200).optional(),
  actualValue:       Joi.string().max(200).optional(),
  performanceNote:   Joi.string().max(2000).optional(),
  constructionPhase: Joi.boolean().optional(),
  operationPhase:    Joi.boolean().optional(),
  decommPhase:       Joi.boolean().optional(),
  completionDate:    Joi.date().iso().optional(),
  verifiedBy:        Joi.string().max(200).optional(),
  verifiedAt:        Joi.date().iso().optional(),
  remarks:           Joi.string().max(2000).optional()
});

exports.listMitigationSchema = Joi.object({
  component:  Joi.string().optional(),
  status:     Joi.string().valid('PLANNED','IN_PROGRESS','COMPLETED','NOT_APPLICABLE','DEFERRED').optional(),
  impactId:   Joi.string().optional(),
  ...paginationSchema
});

exports.updateMitigationStatusSchema = Joi.object({
  status:         Joi.string().valid('PLANNED','IN_PROGRESS','COMPLETED','NOT_APPLICABLE','DEFERRED').required(),
  actualValue:    Joi.string().max(200).optional(),
  performanceNote:Joi.string().max(2000).optional(),
  verifiedBy:     Joi.string().max(200).optional(),
  completionDate: Joi.date().iso().optional()
});

/* ═══════════════════════════════════════════════════════════════
   MONITORING PROGRAM
═══════════════════════════════════════════════════════════════ */

const freqEnum = Joi.string().valid('DAILY','WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','HALF_YEARLY','ANNUALLY').optional();

exports.monitoringProgramSchema = Joi.object({
  airFrequency:         freqEnum,
  airParameters:        Joi.string().max(2000).optional(),
  airStationsCount:     Joi.number().integer().min(0).optional(),
  airSamplingMethod:    Joi.string().max(500).optional(),
  waterFrequency:       freqEnum,
  waterParameters:      Joi.string().max(2000).optional(),
  waterSourcesCount:    Joi.number().integer().min(0).optional(),
  waterSamplingMethod:  Joi.string().max(500).optional(),
  soilFrequency:        freqEnum,
  soilParameters:       Joi.string().max(2000).optional(),
  soilLocationsCount:   Joi.number().integer().min(0).optional(),
  noiseFrequency:       freqEnum,
  noiseParameters:      Joi.string().max(2000).optional(),
  noiseLocationsCount:  Joi.number().integer().min(0).optional(),
  ecologyMonitoring:    Joi.boolean().optional(),
  ecologyFrequency:     freqEnum,
  ecologyParameters:    Joi.string().max(2000).optional(),
  labName:              Joi.string().max(300).optional(),
  labNablNo:            Joi.string().max(100).optional(),
  labContact:           Joi.string().max(300).optional(),
  emcName:              Joi.string().max(300).optional(),
  emcAccreditation:     Joi.string().max(200).optional(),
  emcContact:           Joi.string().max(300).optional(),
  annualBudgetLakhs:    Joi.number().min(0).optional(),
  nextMonitoringDate:   Joi.date().iso().optional(),
  lastMonitoringDate:   Joi.date().iso().optional(),
  spcbSubmission:       Joi.boolean().optional(),
  spcbFrequency:        freqEnum,
  moefccSubmission:     Joi.boolean().optional(),
  remarks:              Joi.string().max(2000).optional()
});

/* ═══════════════════════════════════════════════════════════════
   EVIDENCE
═══════════════════════════════════════════════════════════════ */

exports.evidenceMetaSchema = Joi.object({
  module:          Joi.string().valid('air','water','soil','noise','impact','mitigation','general').required(),
  documentType:    Joi.string().valid('LAB_REPORT','SITE_PHOTO','MAP','CERTIFICATE','EC_LETTER','MONITORING_PLAN','OTHER').optional(),
  description:     Joi.string().max(1000).optional(),
  tags:            Joi.string().max(500).optional(),
  monitoringDate:  Joi.date().iso().optional()
});

exports.listEvidenceSchema = Joi.object({
  module:   Joi.string().optional(),
  docType:  Joi.string().optional(),
  ...paginationSchema
});

/* ═══════════════════════════════════════════════════════════════
   REPORT HISTORY
═══════════════════════════════════════════════════════════════ */

exports.createReportSchema = Joi.object({
  reportTitle:     Joi.string().min(3).max(500).required(),
  reportType:      Joi.string().valid('BASELINE','MONITORING','COMPLIANCE','HALF_YEARLY','ANNUAL','FINAL_EIA','CLOSURE').required(),
  reportPeriod:    Joi.string().max(100).optional(),
  reportFormat:    Joi.string().valid('PDF','WORD','EXCEL').default('PDF'),
  submittedTo:     Joi.string().max(200).optional(),
  submissionDate:  Joi.date().iso().optional(),
  submissionRefNo: Joi.string().max(200).optional(),
  approvalDate:    Joi.date().iso().optional(),
  approvalNumber:  Joi.string().max(200).optional(),
  approvedBy:      Joi.string().max(200).optional(),
  notes:           Joi.string().max(3000).optional()
});

exports.updateReportSchema = Joi.object({
  status:          Joi.string().valid('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ARCHIVED').required(),
  submittedTo:     Joi.string().max(200).optional(),
  submissionDate:  Joi.date().iso().optional(),
  submissionRefNo: Joi.string().max(200).optional(),
  approvalDate:    Joi.date().iso().optional(),
  approvalNumber:  Joi.string().max(200).optional(),
  approvedBy:      Joi.string().max(200).optional(),
  notes:           Joi.string().max(3000).optional()
});

exports.listReportSchema = Joi.object({
  reportType: Joi.string().valid('BASELINE','MONITORING','COMPLIANCE','HALF_YEARLY','ANNUAL','FINAL_EIA','CLOSURE').optional(),
  status:     Joi.string().valid('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ARCHIVED').optional(),
  ...paginationSchema
});
