-- =====================================================================
-- EIA Module — Phase 6 Database Schema
-- Migration: 20260619000001_eia_schema
-- Tables: eia_projects, eia_air_monitoring, eia_water_monitoring,
--         eia_soil_monitoring, eia_noise_monitoring,
--         eia_impact_assessments, eia_mitigation_measures,
--         eia_monitoring_programs, eia_evidence, eia_report_history
-- =====================================================================

-- ── Enums ─────────────────────────────────────────────────────────

CREATE TYPE "EiaProjectStatus"       AS ENUM ('DRAFT','ACTIVE','UNDER_REVIEW','APPROVED','REJECTED','CLOSED');
CREATE TYPE "EiaProjectType"         AS ENUM ('GREENFIELD','BROWNFIELD','EXPANSION','MODERNISATION','DECOMMISSIONING');
CREATE TYPE "EiaProjectCategory"     AS ENUM ('CATEGORY_A','CATEGORY_B1','CATEGORY_B2');
CREATE TYPE "EiaMonitoringFrequency" AS ENUM ('DAILY','WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','HALF_YEARLY','ANNUALLY');
CREATE TYPE "EiaImpactSignificance"  AS ENUM ('NEGLIGIBLE','LOW','MODERATE','HIGH','VERY_HIGH');
CREATE TYPE "EiaImpactType"          AS ENUM ('POSITIVE','NEGATIVE','NEUTRAL');
CREATE TYPE "EiaImpactDuration"      AS ENUM ('SHORT_TERM','MEDIUM_TERM','LONG_TERM','PERMANENT');
CREATE TYPE "EiaMitigationStatus"    AS ENUM ('PLANNED','IN_PROGRESS','COMPLETED','NOT_APPLICABLE','DEFERRED');
CREATE TYPE "EiaReportStatus"        AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ARCHIVED');
CREATE TYPE "EiaReportType"          AS ENUM ('BASELINE','MONITORING','COMPLIANCE','HALF_YEARLY','ANNUAL','FINAL_EIA','CLOSURE');

-- ── 1. eia_projects ───────────────────────────────────────────────

CREATE TABLE "eia_projects" (
  "id"                  TEXT          NOT NULL,
  "organizationId"      TEXT          NOT NULL,
  "projectName"         TEXT          NOT NULL,
  "projectNumber"       TEXT,
  "projectType"         "EiaProjectType"      NOT NULL,
  "projectCategory"     "EiaProjectCategory"  NOT NULL,
  "status"              "EiaProjectStatus"    NOT NULL DEFAULT 'DRAFT',
  "description"         TEXT,
  "industry"            TEXT,
  "activity"            TEXT,
  "location"            TEXT,
  "state"               TEXT,
  "district"            TEXT,
  "village"             TEXT,
  "latitude"            DECIMAL(10,8),
  "longitude"           DECIMAL(11,8),
  "areaHectares"        DECIMAL(12,4),
  "investmentCrores"    DECIMAL(15,2),
  "proposedCapacity"    TEXT,
  "projectProponent"    TEXT,
  "consultantName"      TEXT,
  "consultantAccNo"     TEXT,
  "eiaNotificationYear" TEXT,
  "tocGranted"          BOOLEAN       NOT NULL DEFAULT FALSE,
  "tocDate"             TIMESTAMP(3),
  "ecGranted"           BOOLEAN       NOT NULL DEFAULT FALSE,
  "ecDate"              TIMESTAMP(3),
  "ecNumber"            TEXT,
  "ecIssuingAuthority"  TEXT,
  "cteGranted"          BOOLEAN       NOT NULL DEFAULT FALSE,
  "cteNumber"           TEXT,
  "ctoGranted"          BOOLEAN       NOT NULL DEFAULT FALSE,
  "ctoNumber"           TEXT,
  "publicHearingDone"   BOOLEAN       NOT NULL DEFAULT FALSE,
  "publicHearingDate"   TIMESTAMP(3),
  "publicHearingVenue"  TEXT,
  "studyPeriodFrom"     TIMESTAMP(3),
  "studyPeriodTo"       TIMESTAMP(3),
  "reportingYear"       TEXT          NOT NULL,
  "createdBy"           TEXT,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_projects_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "eia_projects_organizationId_fk" FOREIGN KEY ("organizationId")
    REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_projects_organizationId_idx"      ON "eia_projects"("organizationId");
CREATE INDEX "eia_projects_org_year_idx"            ON "eia_projects"("organizationId","reportingYear");
CREATE INDEX "eia_projects_status_idx"              ON "eia_projects"("status");
CREATE INDEX "eia_projects_reportingYear_idx"       ON "eia_projects"("reportingYear");

-- ── 2. eia_air_monitoring ─────────────────────────────────────────

CREATE TABLE "eia_air_monitoring" (
  "id"               TEXT          NOT NULL,
  "projectId"        TEXT          NOT NULL,
  "stationName"      TEXT          NOT NULL,
  "stationCode"      TEXT,
  "monitoringDate"   TIMESTAMP(3)  NOT NULL,
  "monitoringPeriod" TEXT,
  "location"         TEXT,
  "phase"            TEXT,
  "pm25"             DECIMAL(8,3),
  "pm10"             DECIMAL(8,3),
  "rspm"             DECIMAL(8,3),
  "spm"              DECIMAL(8,3),
  "so2"              DECIMAL(8,3),
  "nox"              DECIMAL(8,3),
  "no2"              DECIMAL(8,3),
  "co"               DECIMAL(8,3),
  "o3"               DECIMAL(8,3),
  "nh3"              DECIMAL(8,3),
  "pb"               DECIMAL(8,3),
  "benzene"          DECIMAL(8,3),
  "benzoPyrene"      DECIMAL(8,3),
  "hc"               DECIMAL(8,3),
  "windSpeed"        DECIMAL(6,2),
  "windDirection"    TEXT,
  "temperature"      DECIMAL(5,2),
  "relHumidity"      DECIMAL(5,2),
  "stability"        TEXT,
  "pm25Std"          DECIMAL(8,3),
  "pm10Std"          DECIMAL(8,3),
  "so2Std"           DECIMAL(8,3),
  "noxStd"           DECIMAL(8,3),
  "pm25Exceedance"   BOOLEAN       NOT NULL DEFAULT FALSE,
  "pm10Exceedance"   BOOLEAN       NOT NULL DEFAULT FALSE,
  "so2Exceedance"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "noxExceedance"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "anyExceedance"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "labName"          TEXT,
  "labAccreditation" TEXT,
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_air_monitoring_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_air_monitoring_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_air_monitoring_projectId_idx"       ON "eia_air_monitoring"("projectId");
CREATE INDEX "eia_air_monitoring_proj_date_idx"       ON "eia_air_monitoring"("projectId","monitoringDate");
CREATE INDEX "eia_air_monitoring_exceedance_idx"      ON "eia_air_monitoring"("anyExceedance");

-- ── 3. eia_water_monitoring ───────────────────────────────────────

CREATE TABLE "eia_water_monitoring" (
  "id"               TEXT          NOT NULL,
  "projectId"        TEXT          NOT NULL,
  "sourceType"       TEXT          NOT NULL,
  "sourceName"       TEXT          NOT NULL,
  "monitoringDate"   TIMESTAMP(3)  NOT NULL,
  "location"         TEXT,
  "depth"            DECIMAL(6,2),
  "phase"            TEXT,
  "pH"               DECIMAL(5,2),
  "temperature"      DECIMAL(5,2),
  "turbidity"        DECIMAL(8,2),
  "tds"              DECIMAL(8,2),
  "tss"              DECIMAL(8,2),
  "conductivity"     DECIMAL(8,2),
  "dissolvedO2"      DECIMAL(6,2),
  "colour"           TEXT,
  "bod"              DECIMAL(8,2),
  "cod"              DECIMAL(8,2),
  "hardness"         DECIMAL(8,2),
  "alkalinity"       DECIMAL(8,2),
  "chlorides"        DECIMAL(8,2),
  "sulfates"         DECIMAL(8,2),
  "nitrates"         DECIMAL(8,2),
  "nitrites"         DECIMAL(8,2),
  "phosphates"       DECIMAL(8,2),
  "fluorides"        DECIMAL(8,2),
  "silica"           DECIMAL(8,2),
  "arsenic"          DECIMAL(8,4),
  "cadmium"          DECIMAL(8,4),
  "chromium"         DECIMAL(8,4),
  "copper"           DECIMAL(8,4),
  "iron"             DECIMAL(8,4),
  "lead"             DECIMAL(8,4),
  "manganese"        DECIMAL(8,4),
  "mercury"          DECIMAL(8,4),
  "nickel"           DECIMAL(8,4),
  "zinc"             DECIMAL(8,4),
  "coliformTotal"    DECIMAL(10,0),
  "coliformFecal"    DECIMAL(10,0),
  "exceedanceFlag"   BOOLEAN       NOT NULL DEFAULT FALSE,
  "exceedanceParams" TEXT,
  "labName"          TEXT,
  "labAccreditation" TEXT,
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_water_monitoring_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_water_monitoring_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_water_monitoring_projectId_idx"  ON "eia_water_monitoring"("projectId");
CREATE INDEX "eia_water_monitoring_proj_date_idx"  ON "eia_water_monitoring"("projectId","monitoringDate");
CREATE INDEX "eia_water_monitoring_sourceType_idx" ON "eia_water_monitoring"("sourceType");

-- ── 4. eia_soil_monitoring ────────────────────────────────────────

CREATE TABLE "eia_soil_monitoring" (
  "id"               TEXT          NOT NULL,
  "projectId"        TEXT          NOT NULL,
  "sampleId"         TEXT,
  "sampleLocation"   TEXT          NOT NULL,
  "monitoringDate"   TIMESTAMP(3)  NOT NULL,
  "depth"            TEXT,
  "soilType"         TEXT,
  "landUse"          TEXT,
  "phase"            TEXT,
  "pH"               DECIMAL(5,2),
  "electricalCond"   DECIMAL(8,3),
  "organicCarbon"    DECIMAL(7,3),
  "organicMatter"    DECIMAL(7,3),
  "bulkDensity"      DECIMAL(6,3),
  "moisture"         DECIMAL(6,2),
  "texture"          TEXT,
  "waterHolding"     DECIMAL(6,2),
  "nitrogen"         DECIMAL(8,2),
  "phosphorus"       DECIMAL(8,2),
  "potassium"        DECIMAL(8,2),
  "sulfur"           DECIMAL(8,2),
  "arsenic"          DECIMAL(8,3),
  "cadmium"          DECIMAL(8,3),
  "chromium"         DECIMAL(8,3),
  "copper"           DECIMAL(8,3),
  "iron"             DECIMAL(8,3),
  "lead"             DECIMAL(8,3),
  "manganese"        DECIMAL(8,3),
  "nickel"           DECIMAL(8,3),
  "zinc"             DECIMAL(8,3),
  "mercury"          DECIMAL(8,3),
  "exceedanceFlag"   BOOLEAN       NOT NULL DEFAULT FALSE,
  "exceedanceParams" TEXT,
  "labName"          TEXT,
  "labAccreditation" TEXT,
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_soil_monitoring_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_soil_monitoring_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_soil_monitoring_projectId_idx"  ON "eia_soil_monitoring"("projectId");
CREATE INDEX "eia_soil_monitoring_proj_date_idx"  ON "eia_soil_monitoring"("projectId","monitoringDate");

-- ── 5. eia_noise_monitoring ───────────────────────────────────────

CREATE TABLE "eia_noise_monitoring" (
  "id"               TEXT          NOT NULL,
  "projectId"        TEXT          NOT NULL,
  "locationName"     TEXT          NOT NULL,
  "locationType"     TEXT,
  "monitoringDate"   TIMESTAMP(3)  NOT NULL,
  "phase"            TEXT,
  "dayAvgDb"         DECIMAL(5,2),
  "nightAvgDb"       DECIMAL(5,2),
  "dayMinDb"         DECIMAL(5,2),
  "dayMaxDb"         DECIMAL(5,2),
  "nightMinDb"       DECIMAL(5,2),
  "nightMaxDb"       DECIMAL(5,2),
  "leq"              DECIMAL(5,2),
  "l10"              DECIMAL(5,2),
  "l50"              DECIMAL(5,2),
  "l90"              DECIMAL(5,2),
  "lmax"             DECIMAL(5,2),
  "lmin"             DECIMAL(5,2),
  "ldn"              DECIMAL(5,2),
  "daytimeStd"       DECIMAL(5,2),
  "nighttimeStd"     DECIMAL(5,2),
  "dayExceedance"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "nightExceedance"  BOOLEAN       NOT NULL DEFAULT FALSE,
  "anyExceedance"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "instrumentModel"  TEXT,
  "calibrated"       BOOLEAN       NOT NULL DEFAULT FALSE,
  "calibrationDate"  TIMESTAMP(3),
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_noise_monitoring_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_noise_monitoring_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_noise_monitoring_projectId_idx"  ON "eia_noise_monitoring"("projectId");
CREATE INDEX "eia_noise_monitoring_proj_date_idx"  ON "eia_noise_monitoring"("projectId","monitoringDate");

-- ── 6. eia_impact_assessments ─────────────────────────────────────

CREATE TABLE "eia_impact_assessments" (
  "id"                  TEXT                   NOT NULL,
  "projectId"           TEXT                   NOT NULL,
  "component"           TEXT                   NOT NULL,
  "impactType"          "EiaImpactType"         NOT NULL,
  "significance"        "EiaImpactSignificance" NOT NULL,
  "duration"            "EiaImpactDuration",
  "description"         TEXT                   NOT NULL,
  "reversibility"       TEXT,
  "probability"         TEXT,
  "spatialExtent"       TEXT,
  "magnitude"           INTEGER,
  "sensitivity"         INTEGER,
  "significance_score"  INTEGER,
  "constructionPhase"   BOOLEAN                NOT NULL DEFAULT FALSE,
  "operationPhase"      BOOLEAN                NOT NULL DEFAULT TRUE,
  "decommPhase"         BOOLEAN                NOT NULL DEFAULT FALSE,
  "cumulativeImpact"    BOOLEAN                NOT NULL DEFAULT FALSE,
  "cumulativeDesc"      TEXT,
  "residualImpact"      TEXT,
  "mitigationPossible"  BOOLEAN                NOT NULL DEFAULT TRUE,
  "remarks"             TEXT,
  "createdAt"           TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)           NOT NULL,

  CONSTRAINT "eia_impact_assessments_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_impact_assessments_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_impact_assessments_projectId_idx"     ON "eia_impact_assessments"("projectId");
CREATE INDEX "eia_impact_assessments_proj_comp_idx"     ON "eia_impact_assessments"("projectId","component");
CREATE INDEX "eia_impact_assessments_significance_idx"  ON "eia_impact_assessments"("significance");

-- ── 7. eia_mitigation_measures ────────────────────────────────────

CREATE TABLE "eia_mitigation_measures" (
  "id"               TEXT                  NOT NULL,
  "projectId"        TEXT                  NOT NULL,
  "impactId"         TEXT,
  "component"        TEXT                  NOT NULL,
  "measureTitle"     TEXT                  NOT NULL,
  "description"      TEXT                  NOT NULL,
  "measureType"      TEXT,
  "implementedBy"    TEXT,
  "timeline"         TEXT,
  "estimatedCost"    DECIMAL(12,2),
  "status"           "EiaMitigationStatus" NOT NULL DEFAULT 'PLANNED',
  "kpi"              TEXT,
  "targetValue"      TEXT,
  "actualValue"      TEXT,
  "performanceNote"  TEXT,
  "constructionPhase" BOOLEAN              NOT NULL DEFAULT FALSE,
  "operationPhase"   BOOLEAN               NOT NULL DEFAULT TRUE,
  "decommPhase"      BOOLEAN               NOT NULL DEFAULT FALSE,
  "completionDate"   TIMESTAMP(3),
  "verifiedBy"       TEXT,
  "verifiedAt"       TIMESTAMP(3),
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)          NOT NULL,

  CONSTRAINT "eia_mitigation_measures_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_mitigation_measures_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "eia_mitigation_measures_impact_fk"  FOREIGN KEY ("impactId")
    REFERENCES "eia_impact_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "eia_mitigation_measures_projectId_idx" ON "eia_mitigation_measures"("projectId");
CREATE INDEX "eia_mitigation_measures_status_idx"    ON "eia_mitigation_measures"("projectId","status");
CREATE INDEX "eia_mitigation_measures_component_idx" ON "eia_mitigation_measures"("component");

-- ── 8. eia_monitoring_programs ────────────────────────────────────

CREATE TABLE "eia_monitoring_programs" (
  "id"                  TEXT          NOT NULL,
  "projectId"           TEXT          NOT NULL,
  "airFrequency"        "EiaMonitoringFrequency",
  "airParameters"       TEXT,
  "airStationsCount"    INTEGER,
  "airSamplingMethod"   TEXT,
  "waterFrequency"      "EiaMonitoringFrequency",
  "waterParameters"     TEXT,
  "waterSourcesCount"   INTEGER,
  "waterSamplingMethod" TEXT,
  "soilFrequency"       "EiaMonitoringFrequency",
  "soilParameters"      TEXT,
  "soilLocationsCount"  INTEGER,
  "noiseFrequency"      "EiaMonitoringFrequency",
  "noiseParameters"     TEXT,
  "noiseLocationsCount" INTEGER,
  "ecologyMonitoring"   BOOLEAN       NOT NULL DEFAULT FALSE,
  "ecologyFrequency"    "EiaMonitoringFrequency",
  "ecologyParameters"   TEXT,
  "labName"             TEXT,
  "labNablNo"           TEXT,
  "labContact"          TEXT,
  "emcName"             TEXT,
  "emcAccreditation"    TEXT,
  "emcContact"          TEXT,
  "annualBudgetLakhs"   DECIMAL(10,2),
  "nextMonitoringDate"  TIMESTAMP(3),
  "lastMonitoringDate"  TIMESTAMP(3),
  "spcbSubmission"      BOOLEAN       NOT NULL DEFAULT FALSE,
  "spcbFrequency"       "EiaMonitoringFrequency",
  "moefccSubmission"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "remarks"             TEXT,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_monitoring_programs_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_monitoring_programs_project_uk" UNIQUE ("projectId"),
  CONSTRAINT "eia_monitoring_programs_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ── 9. eia_evidence ───────────────────────────────────────────────

CREATE TABLE "eia_evidence" (
  "id"             TEXT          NOT NULL,
  "projectId"      TEXT          NOT NULL,
  "module"         TEXT          NOT NULL,
  "documentType"   TEXT,
  "originalName"   TEXT          NOT NULL,
  "fileName"       TEXT          NOT NULL,
  "mimeType"       TEXT          NOT NULL,
  "fileSize"       INTEGER,
  "s3Key"          TEXT          NOT NULL,
  "s3Bucket"       TEXT          NOT NULL,
  "description"    TEXT,
  "tags"           TEXT,
  "monitoringDate" TIMESTAMP(3),
  "uploadedBy"     TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "eia_evidence_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_evidence_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_evidence_projectId_idx"     ON "eia_evidence"("projectId");
CREATE INDEX "eia_evidence_proj_module_idx"   ON "eia_evidence"("projectId","module");

-- ── 10. eia_report_history ────────────────────────────────────────

CREATE TABLE "eia_report_history" (
  "id"               TEXT              NOT NULL,
  "projectId"        TEXT              NOT NULL,
  "reportTitle"      TEXT              NOT NULL,
  "reportType"       "EiaReportType"   NOT NULL,
  "reportPeriod"     TEXT,
  "reportFormat"     TEXT              NOT NULL DEFAULT 'PDF',
  "status"           "EiaReportStatus" NOT NULL DEFAULT 'DRAFT',
  "generatedBy"      TEXT,
  "generatedAt"      TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "s3Key"            TEXT,
  "s3Bucket"         TEXT,
  "fileName"         TEXT,
  "fileSizeBytes"    INTEGER,
  "submittedTo"      TEXT,
  "submissionDate"   TIMESTAMP(3),
  "submissionRefNo"  TEXT,
  "approvalDate"     TIMESTAMP(3),
  "approvalNumber"   TEXT,
  "approvedBy"       TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)      NOT NULL,

  CONSTRAINT "eia_report_history_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "eia_report_history_project_fk" FOREIGN KEY ("projectId")
    REFERENCES "eia_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "eia_report_history_projectId_idx"      ON "eia_report_history"("projectId");
CREATE INDEX "eia_report_history_proj_type_idx"      ON "eia_report_history"("projectId","reportType");
CREATE INDEX "eia_report_history_status_idx"         ON "eia_report_history"("status");
