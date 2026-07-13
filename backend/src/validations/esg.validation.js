'use strict';

/**
 * ESG Module — Joi Validation Schemas
 * Phase 2 | GRI 2021 · BRSR · TCFD · SASB · UNGC
 */

const Joi = require('joi');

/* ── Reusable helpers ──────────────────────────────────────────── */
const num    = () => Joi.number().allow(null);
const pct    = () => Joi.number().min(0).max(100).allow(null);
const pos    = () => Joi.number().min(0).allow(null);
const str    = (max = 500) => Joi.string().max(max).allow(null, '').trim();
const text   = () => str(10000);
const bool   = () => Joi.boolean().allow(null);
const int    = () => Joi.number().integer().min(0).allow(null);
const arr    = (item = Joi.string()) => Joi.array().items(item).allow(null);
const isoDate = () => Joi.date().iso().allow(null);
const year   = () => Joi.string().pattern(/^(FY\s)?\d{4}(-\d{2,4})?$/).max(20);

const SECTION_STATUS = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'];
const ESG_SECTIONS   = ['PROFILE','ENERGY','WATER','EMISSIONS','WASTE','BIODIVERSITY','EMPLOYEES','SAFETY','GOVERNANCE','CSR'];

/* ── Common base schema (query params) ────────────────────────── */
exports.yearQuerySchema = Joi.object({
  year:  year().required(),
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

exports.yearOnlySchema = Joi.object({
  year: year().required()
});

/* ═══════════════════════════════════════════════════════════════
   1. ESG PROFILE
═══════════════════════════════════════════════════════════════ */
exports.esgProfileSchema = Joi.object({
  reportingYear:         year().required(),
  periodFrom:            isoDate(),
  periodTo:              isoDate(),
  status:                Joi.string().valid(...SECTION_STATUS),

  // Scope & Boundary
  siteName:              str(),
  facilityLocation:      str(),
  operationalBoundary:   Joi.string().valid('Operational Control','Financial Control','Equity Share').allow(null,''),
  reportingScope:        Joi.string().valid('All Operations','Single Site','Multi-Site').allow(null,''),
  reportingStandards:    arr(),
  materialTopics:        arr(),

  // Leadership
  ceoName:               str(),
  ceoTitle:              str(200),
  ceoMessage:            text(),
  sustainHeadName:       str(),
  sustainHeadTitle:      str(200),
  sustainabilityTheme:   str(),
  vision:                text(),
  mission:               text(),

  // Business Context
  revenueCurr:           num(),
  revenuePrev:           num(),
  revenueUnit:           Joi.string().valid('INR','USD','EUR').default('INR'),
  totalEmployeesCurr:    int(),
  totalEmployeesPrev:    int(),
  countriesPresent:      int(),
  facilitiesCount:       int(),

  // Assurance
  assuranceProvider:     str(),
  assuranceLevel:        Joi.string().valid('Limited','Reasonable','None').allow(null,''),
  assuranceStandard:     str(200),
  assuranceYear:         str(20),

  // Contact
  esgContactName:        str(),
  esgContactEmail:       Joi.string().email().allow(null,''),
  esgContactPhone:       str(20),

  // Stakeholder
  stakeholderEngaged:    arr(),
  engagementMethods:     arr(),
  grievanceMechanism:    bool(),

  notes:                 text(),
  submittedById:         Joi.string().uuid().allow(null),
  verifiedById:          Joi.string().uuid().allow(null),
  verifiedAt:            isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   2. ESG ENERGY
═══════════════════════════════════════════════════════════════ */
exports.esgEnergySchema = Joi.object({
  reportingYear:         year().required(),
  periodFrom:            isoDate(),
  periodTo:              isoDate(),
  status:                Joi.string().valid(...SECTION_STATUS),

  // Non-Renewable (Current Year)
  gridElecKwh:           pos(),
  dieselLitres:          pos(),
  furnaceOilLitres:      pos(),
  lpgKg:                 pos(),
  natGasM3:              pos(),
  coalTonne:             pos(),
  petCokeTonne:          pos(),
  otherFuelGj:           pos(),
  purchasedSteamGj:      pos(),
  nonRenewableTotalGj:   pos(),

  // Renewable (Current Year)
  solarKwh:              pos(),
  windKwh:               pos(),
  biomassGj:             pos(),
  biogasM3:              pos(),
  hydroKwh:              pos(),
  greenH2Kg:             pos(),
  otherRenewableGj:      pos(),
  renewableTotalGj:      pos(),

  // Sold / Exported
  energySoldGj:          pos(),

  // Aggregates
  totalEnergyConsumedGj: pos(),
  renewablePct:          pct(),

  // Previous Year
  gridElecKwhPrev:       pos(),
  dieselLitresPrev:      pos(),
  solarKwhPrev:          pos(),
  windKwhPrev:           pos(),
  totalEnergyGjPrev:     pos(),
  renewablePctPrev:      pct(),

  // Intensity
  energyIntensityUnit:   str(100),
  intensityDenomCurr:    pos(),
  intensityDenomPrev:    pos(),
  energyIntensityCurr:   pos(),
  energyIntensityPrev:   pos(),
  yoyIntensityChangePct: num(),

  // Targets
  reductionTargetPct:    pct(),
  renewableTargetPct:    pct(),
  targetYear:            str(20),
  reTargetMw:            pos(),

  energyInitiatives:     text(),
  notes:                 text(),
  submittedById:         Joi.string().uuid().allow(null),
  verifiedById:          Joi.string().uuid().allow(null),
  verifiedAt:            isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   3. ESG WATER
═══════════════════════════════════════════════════════════════ */
exports.esgWaterSchema = Joi.object({
  reportingYear:         year().required(),
  periodFrom:            isoDate(),
  periodTo:              isoDate(),
  status:                Joi.string().valid(...SECTION_STATUS),

  // Withdrawal (Current Year)
  groundwaterKl:         pos(),
  surfaceWaterKl:        pos(),
  municipalKl:           pos(),
  rainwaterKl:           pos(),
  thirdPartyKl:          pos(),
  seawaterKl:            pos(),
  otherWithdrawalKl:     pos(),
  totalWithdrawalKl:     pos(),

  // Discharge (Current Year)
  dischargeSewerKl:      pos(),
  dischargeSurfaceKl:    pos(),
  dischargeGroundKl:     pos(),
  dischargeSTPKl:        pos(),
  dischargeOtherKl:      pos(),
  totalDischargeKl:      pos(),
  totalConsumedKl:       pos(),

  // Recycled
  recycledKl:            pos(),
  treatedReusedKl:       pos(),
  zetpKl:                pos(),
  recyclingRatePct:      pct(),
  zldAchieved:           bool(),

  // Previous Year
  totalWithdrawalKlPrev: pos(),
  totalConsumedKlPrev:   pos(),
  recyclingRatePctPrev:  pct(),

  // Stress
  waterStressArea:       bool(),
  waterStressSource:     str(100),
  stressLevel:           Joi.string().valid('High','Extremely High','Medium-High','Low').allow(null,''),

  // Intensity
  waterIntensityUnit:    str(100),
  intensityDenomCurr:    pos(),
  intensityDenomPrev:    pos(),
  waterIntensityCurr:    pos(),
  waterIntensityPrev:    pos(),
  yoyIntensityChangePct: num(),

  // Targets
  reductionTargetPct:    pct(),
  recyclingTargetPct:    pct(),
  targetYear:            str(20),

  waterInitiatives:      text(),
  notes:                 text(),
  submittedById:         Joi.string().uuid().allow(null),
  verifiedById:          Joi.string().uuid().allow(null),
  verifiedAt:            isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   4. ESG EMISSIONS
═══════════════════════════════════════════════════════════════ */
exports.esgEmissionsSchema = Joi.object({
  reportingYear:         year().required(),
  periodFrom:            isoDate(),
  periodTo:              isoDate(),
  status:                Joi.string().valid(...SECTION_STATUS),

  // Scope 1
  sc1StationaryKgco2e:   pos(),
  sc1MobileKgco2e:       pos(),
  sc1FugitiveKgco2e:     pos(),
  sc1ProcessKgco2e:      pos(),
  sc1BiogenicKgco2e:     pos(),
  scope1TotalTco2e:      pos(),

  // Scope 2
  sc2MarketBasedTco2e:   pos(),
  sc2LocationBasedTco2e: pos(),
  sc2SteamTco2e:         pos(),
  scope2TotalTco2e:      pos(),

  // Scope 3 (15 categories)
  sc3Cat1PurchasedGoods: pos(),
  sc3Cat2CapGoods:       pos(),
  sc3Cat3FuelEnergy:     pos(),
  sc3Cat4UpstreamTransp: pos(),
  sc3Cat5WasteOps:       pos(),
  sc3Cat6BusinessTravel: pos(),
  sc3Cat7EmpCommute:     pos(),
  sc3Cat8UpstreamAssets: pos(),
  sc3Cat9DownstreamTrp:  pos(),
  sc3Cat10ProcProducts:  pos(),
  sc3Cat11UseSoldProd:   pos(),
  sc3Cat12EOLSoldProd:   pos(),
  sc3Cat13DownAssets:    pos(),
  sc3Cat14Franchises:    pos(),
  sc3Cat15Investments:   pos(),
  scope3TotalTco2e:      pos(),

  // GHG by gas
  co2Tonne:              pos(),
  ch4Tonne:              pos(),
  n2oTonne:              pos(),
  hfcsTonne:             pos(),
  pfcsTonne:             pos(),
  sf6Tonne:              pos(),
  nf3Tonne:              pos(),

  // Combined
  scope12TotalTco2e:     pos(),
  scope123TotalTco2e:    pos(),

  // Previous Year
  scope1TotalPrev:       pos(),
  scope2TotalPrev:       pos(),
  scope3TotalPrev:       pos(),
  scope123TotalPrev:     pos(),

  // Emission factors
  scope1FactorSource:    str(200),
  scope2GridFactor:      pos(),
  scope2GridSource:      str(100),

  // Intensity
  emissionsIntensityUnit:   str(100),
  intensityDenomCurr:       pos(),
  intensityDenomPrev:       pos(),
  emissionsIntensityCurr:   pos(),
  emissionsIntensityPrev:   pos(),
  yoyIntensityChangePct:    num(),

  // Base year
  baseYear:              str(20),
  baseYearScope1:        pos(),
  baseYearScope2:        pos(),
  baseYearScope3:        pos(),
  baseYearTotal:         pos(),
  baseYearReason:        str(),

  // Offsets
  offsetsTco2e:          pos(),
  offsetProvider:        str(),
  offsetStandard:        str(100),
  netEmissionsTco2e:     pos(),

  // Targets
  scienceBasedTarget:    bool(),
  sbtiCommitted:         bool(),
  sbtiStatus:            Joi.string().valid('Committed','Validated','Achieved').allow(null,''),
  nzeTarget:             bool(),
  nzeTargetYear:         str(20),
  reductionTargetPct:    pct(),
  reductionTargetYear:   str(20),
  carbonNeutralTarget:   bool(),
  carbonNeutralYear:     str(20),

  // Verification
  thirdPartyVerified:    bool(),
  verifierOrg:           str(),
  verificationStandard:  str(100),
  verificationYear:      str(20),

  ghgInitiatives:        text(),
  notes:                 text(),
  submittedById:         Joi.string().uuid().allow(null),
  verifiedById:          Joi.string().uuid().allow(null),
  verifiedAt:            isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   5. ESG WASTE
═══════════════════════════════════════════════════════════════ */
exports.esgWasteSchema = Joi.object({
  reportingYear:          year().required(),
  periodFrom:             isoDate(),
  periodTo:               isoDate(),
  status:                 Joi.string().valid(...SECTION_STATUS),

  // Hazardous (Current Year)
  hazIncinTonne:          pos(),
  hazLandfillTonne:       pos(),
  hazRecycleTonne:        pos(),
  hazCoProcessTonne:      pos(),
  hazStoredOnSiteTonne:   pos(),
  hazOtherTonne:          pos(),
  hazWasteTotalTonne:     pos(),

  // Non-Hazardous (Current Year)
  nhRecycleTonne:         pos(),
  nhCompostTonne:         pos(),
  nhLandfillTonne:        pos(),
  nhIncinTonne:           pos(),
  nhReuseOrRepairTonne:   pos(),
  nhOtherTonne:           pos(),
  nhWasteTotalTonne:      pos(),

  // Specific streams
  ewasteKg:               pos(),
  plasticTonne:           pos(),
  plasticRecycledTonne:   pos(),
  biomedicalTonne:        pos(),
  constructionWasteTonne: pos(),
  foodWasteTonne:         pos(),

  // Aggregates
  totalWasteTonne:        pos(),
  diversionFromLandfill:  pos(),
  diversionRatePct:       pct(),
  recyclingRatePct:       pct(),

  // Previous Year
  hazWasteTotalPrev:      pos(),
  nhWasteTotalPrev:       pos(),
  totalWastePrev:         pos(),
  recyclingRatePrev:      pct(),

  // Intensity
  wasteIntensityUnit:     str(100),
  intensityDenomCurr:     pos(),
  intensityDenomPrev:     pos(),
  wasteIntensityCurr:     pos(),
  wasteIntensityPrev:     pos(),
  yoyIntensityChangePct:  num(),

  // Compliance
  pchwmAuthorized:        bool(),
  pchwmAuthorizationNo:   str(100),
  pchwmExpiry:            isoDate(),
  authorizedTransporters: arr(),
  authorizedDisposalSites:arr(),

  // Targets
  reductionTargetPct:     pct(),
  diversionTargetPct:     pct(),
  targetYear:             str(20),
  zeroWasteToLandfill:    bool(),

  wasteInitiatives:       text(),
  notes:                  text(),
  submittedById:          Joi.string().uuid().allow(null),
  verifiedById:           Joi.string().uuid().allow(null),
  verifiedAt:             isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   6. ESG BIODIVERSITY
═══════════════════════════════════════════════════════════════ */
exports.esgBiodiversitySchema = Joi.object({
  reportingYear:            year().required(),
  periodFrom:               isoDate(),
  periodTo:                 isoDate(),
  status:                   Joi.string().valid(...SECTION_STATUS),

  nearProtectedArea:        bool(),
  protectedAreaName:        str(),
  distanceToProtAreaKm:     pos(),
  protectedAreaType:        str(100),
  ecoSensitiveZone:         bool(),
  eszDistanceKm:            pos(),
  criticalHabitat:          bool(),

  facilityAreaHa:           pos(),
  greenCoverHa:             pos(),
  greenCoverPct:            pct(),
  totalTreesPlanted:        int(),
  treeSurvivalRatePct:      pct(),
  landRehabilitatedHa:      pos(),
  newLandClearedHa:         pos(),

  keySpeciesPresent:        arr(),
  threatenedSpeciesCount:   int(),
  endemicSpeciesCount:      int(),
  invasiveSpeciesRisk:      bool(),
  invasiveSpeciesNotes:     text(),
  migratoryCorridor:        bool(),
  waterBodyAffected:        bool(),
  waterBodyDetails:         str(),

  eiaCompleted:             bool(),
  lastEiaYear:              str(20),
  biodivAssessmentDone:     bool(),
  lastBiodivAssessDate:     isoDate(),
  assessedBy:               str(),
  majorImpactsIdentified:   text(),

  afforestationPlanActive:  bool(),
  mitigationHierarchyApplied: bool(),
  biodivOffsets:            bool(),
  offsetSiteDetails:        str(),
  conservationPartnerships: arr(),

  totalTreesPrev:           int(),
  greenCoverHaPrev:         pos(),

  notes:                    text(),
  submittedById:            Joi.string().uuid().allow(null),
  verifiedById:             Joi.string().uuid().allow(null),
  verifiedAt:               isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   7. ESG EMPLOYEES
═══════════════════════════════════════════════════════════════ */
exports.esgEmployeesSchema = Joi.object({
  reportingYear:               year().required(),
  periodFrom:                  isoDate(),
  periodTo:                    isoDate(),
  status:                      Joi.string().valid(...SECTION_STATUS),

  permanentMale:               int(),
  permanentFemale:             int(),
  permanentOther:              int(),
  contractMale:                int(),
  contractFemale:              int(),
  contractOther:               int(),
  casualWorkers:               int(),
  apprentices:                 int(),
  interns:                     int(),
  seniorMgmtMale:              int(),
  seniorMgmtFemale:            int(),
  midMgmtMale:                 int(),
  midMgmtFemale:               int(),
  juniorMale:                  int(),
  juniorFemale:                int(),
  totalPermanent:              int(),
  totalContract:               int(),
  totalWorkforce:              int(),

  permanentMalePrev:           int(),
  permanentFemalePrev:         int(),
  contractMalePrev:            int(),
  contractFemalePrev:          int(),
  totalWorkforcePrev:          int(),

  womenLeadershipPct:          pct(),
  womenBoardPct:               pct(),
  pwdCount:                    int(),
  lgbtqCount:                  int(),
  scStCount:                   int(),
  obcCount:                    int(),
  nationalityDiversity:        arr(),

  womenLeadershipPrev:         pct(),
  womenBoardPrev:              pct(),

  newHiresMale:                int(),
  newHiresFemale:              int(),
  newHiresTotal:               int(),
  newHireRatePct:              pct(),
  attritionMale:               int(),
  attritionFemale:             int(),
  attritionTotal:              int(),
  voluntaryAttritionPct:       pct(),
  involuntaryAttritionPct:     pct(),

  medianSalaryMale:            pos(),
  medianSalaryFemale:          pos(),
  ceoToMedianPayRatio:         pos(),
  livingWageAdherence:         bool(),
  equalPayAuditDone:           bool(),
  pfCoveredPct:                pct(),
  esicCoveredPct:              pct(),
  gratuityProvisionInr:        pos(),
  healthInsurancePct:          pct(),

  avgTrainingHrsMale:          pos(),
  avgTrainingHrsFemale:        pos(),
  avgTrainingHrsTotal:         pos(),
  trainingInvestmentInr:       pos(),
  skillUpgradedCount:          int(),
  performanceReviewPct:        pct(),

  parentalLeaveEligibleMale:   int(),
  parentalLeaveEligibleFemale: int(),
  parentalLeaveTakenMale:      int(),
  parentalLeaveTakenFemale:    int(),
  parentalReturnRatePct:       pct(),

  unionizedPct:                pct(),
  collectiveBargaining:        bool(),
  rightToOrganize:             bool(),
  noticePeriodDays:            int(),

  humanRightsDueDiligence:     bool(),
  childLaborRisk:              bool(),
  forcedLaborRisk:             bool(),
  supplyChainHRAssessed:       bool(),

  hrInitiatives:               text(),
  notes:                       text(),
  submittedById:               Joi.string().uuid().allow(null),
  verifiedById:                Joi.string().uuid().allow(null),
  verifiedAt:                  isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   8. ESG SAFETY
═══════════════════════════════════════════════════════════════ */
exports.esgSafetySchema = Joi.object({
  reportingYear:             year().required(),
  periodFrom:                isoDate(),
  periodTo:                  isoDate(),
  status:                    Joi.string().valid(...SECTION_STATUS),

  manHoursEmp:               pos(),
  manHoursCon:               pos(),
  manHoursTotal:             pos(),

  fatalitiesEmp:             int(),
  ltiEmp:                    int(),
  recordableIncidentsEmp:    int(),
  medicalCasesEmp:           int(),
  restrictedWorkCasesEmp:    int(),
  nearMissEmp:               int(),
  firstAidCasesEmp:          int(),
  lostDaysEmp:               int(),

  fatalitiesCon:             int(),
  ltiCon:                    int(),
  recordableIncidentsCon:    int(),
  medicalCasesCon:           int(),
  nearMissCon:               int(),
  lostDaysCon:               int(),

  ltirEmp:                   pos(),
  trirEmp:                   pos(),
  sirEmp:                    pos(),
  ltirCon:                   pos(),
  trirCon:                   pos(),
  ltirTotal:                 pos(),
  trirTotal:                 pos(),

  fatalitiesEmpPrev:         int(),
  ltiEmpPrev:                int(),
  ltirEmpPrev:               pos(),
  trirEmpPrev:               pos(),
  manHoursEmpPrev:           pos(),
  fatalitiesConPrev:         int(),
  ltiConPrev:                int(),

  occDiseasesCasesEmp:       int(),
  occDiseasesTypeEmp:        arr(),
  occDiseasesCasesCon:       int(),

  iso45001Certified:         bool(),
  ohsmsImplemented:          bool(),
  safetyPolicyPublished:     bool(),
  safetyCommitteeActive:     bool(),
  workerSafetyRightKnown:    bool(),

  safetyTrainingHrsAvg:      pos(),
  safetyTrainingCovPct:      pct(),
  firstAidTrainedPct:        pct(),
  emergencyDrillsCount:      int(),
  ppeCompliancePct:          pct(),

  internalSafetyAudits:      int(),
  externalSafetyAudits:      int(),
  regulatoryInspections:     int(),
  ncRaisedCount:             int(),
  ncClosedCount:             int(),

  mentalHealthProgram:       bool(),
  ergonomicsAssessed:        bool(),
  ergoImprovementsDone:      bool(),
  employeeAssistanceProg:    bool(),

  safetyInitiatives:         text(),
  notes:                     text(),
  submittedById:             Joi.string().uuid().allow(null),
  verifiedById:              Joi.string().uuid().allow(null),
  verifiedAt:                isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   9. ESG GOVERNANCE
═══════════════════════════════════════════════════════════════ */
exports.esgGovernanceSchema = Joi.object({
  reportingYear:               year().required(),
  periodFrom:                  isoDate(),
  periodTo:                    isoDate(),
  status:                      Joi.string().valid(...SECTION_STATUS),

  boardSizeTotal:              int(),
  boardIndependentCount:       int(),
  boardIndependentPct:         pct(),
  boardWomenCount:             int(),
  boardWomenPct:               pct(),
  boardDiverseCount:           int(),
  boardAvgAgencyYrs:           pos(),
  executiveDirectors:          int(),
  nonExecDirectors:            int(),
  nomineeDirectors:            int(),
  boardMeetingsCount:          int(),
  avgBoardAttendancePct:       pct(),

  auditCommittee:              bool(),
  riskCommittee:               bool(),
  esgSustainCommittee:         bool(),
  nominationRemunCommittee:    bool(),
  csrCommittee:                bool(),
  stakeholderRelCommittee:     bool(),

  boardEsgOversight:           bool(),
  esgInBoardCharter:           bool(),
  esgKpisLinkedPay:            bool(),
  esgBoardMeetingsCount:       int(),
  chiefSustainabilityOfficer:  bool(),

  codeOfConductPublished:      bool(),
  whistleblowerPolicy:         bool(),
  supplierCodeOfConduct:       bool(),
  antiCorruptionPolicy:        bool(),
  antiCompetitionPolicy:       bool(),
  conflictOfInterestPolicy:    bool(),
  giftAndEntertainPolicy:      bool(),
  ethicsTrainingCovPct:        pct(),
  ethicsComplaintsReceived:    int(),
  ethicsComplaintsResolved:    int(),
  corruptionIncidents:         int(),
  legalProceedingsCount:       int(),

  erpFrameworkImplemented:     bool(),
  climateRiskAssessed:         bool(),
  tcfdAligned:                 bool(),
  physicalClimateRisksId:      arr(),
  transitionClimateRisksId:    arr(),
  cyberRiskAssessed:           bool(),
  supplyChainRiskAssessed:     bool(),

  annualReportPublished:       bool(),
  griIndex:                    bool(),
  brsrFiled:                   bool(),
  tcfdReport:                  bool(),
  sasbDisclosure:              bool(),
  ungcCop:                     bool(),
  integratedReporting:         bool(),

  dataPrivacyPolicyPublished:  bool(),
  gdprComplianceApplicable:    bool(),
  gdprCompliant:               bool(),
  itSecurityAuditDone:         bool(),
  dataBreachIncidents:         int(),
  dataBreachNotifications:     int(),

  govInitiatives:              text(),
  notes:                       text(),
  submittedById:               Joi.string().uuid().allow(null),
  verifiedById:                Joi.string().uuid().allow(null),
  verifiedAt:                  isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   10. ESG CSR
═══════════════════════════════════════════════════════════════ */
exports.esgCsrSchema = Joi.object({
  reportingYear:            year().required(),
  periodFrom:               isoDate(),
  periodTo:                 isoDate(),
  status:                   Joi.string().valid(...SECTION_STATUS),

  netProfitAvgInr:          pos(),
  csrObligationInr:         pos(),
  csrSpentInr:              pos(),
  csrOngoingProjectInr:     pos(),
  csrUnspentTransferInr:    pos(),
  csrCarriedForwardInr:     pos(),
  csrSpendingPct:           pct(),

  csrObligationPrev:        pos(),
  csrSpentPrev:             pos(),

  focusEducation:           bool(),
  focusHealthcare:          bool(),
  focusWomenEmpowerment:    bool(),
  focusRuralDev:            bool(),
  focusEnvSustainability:   bool(),
  focusDrinkingWater:       bool(),
  focusLivelihoods:         bool(),
  focusDisasterRelief:      bool(),
  focusArtsCulture:         bool(),
  focusSportsNutrition:     bool(),
  focusPmFunds:             bool(),
  focusOther:               bool(),
  focusOtherDescription:    str(),

  directBeneficiaries:      int(),
  indirectBeneficiaries:    int(),
  beneficiaryWomen:         int(),
  beneficiaryChildren:      int(),
  beneficiaryPwd:           int(),

  villagesCovered:          int(),
  districtsCovered:         int(),
  statesCovered:            int(),
  aspirationalDistricts:    int(),

  directImplementation:     bool(),
  throughOwnFoundation:     bool(),
  throughTrust:             bool(),
  throughNgo:               bool(),
  throughSection8:          bool(),
  implementationPartners:   arr(),

  impactAssessmentDone:     bool(),
  impactAssessmentBy:       str(),
  impactAssessmentYear:     str(20),
  impactAssessmentKey:      str(),

  sdgsAddressed:            arr(),

  keyInitiatives:           text(),
  notes:                    text(),
  submittedById:            Joi.string().uuid().allow(null),
  verifiedById:             Joi.string().uuid().allow(null),
  verifiedAt:               isoDate()
});

/* ═══════════════════════════════════════════════════════════════
   11. EVIDENCE UPLOAD
═══════════════════════════════════════════════════════════════ */
exports.evidenceMetaSchema = Joi.object({
  reportingYear:   year().required(),
  section:         Joi.string().valid(...ESG_SECTIONS).required(),
  fieldReference:  str(200),
  description:     str(),
  tags:            arr(),
  qualityScore:    Joi.number().integer().min(1).max(100).allow(null),
  isCoverImage:    bool().default(false),
  displayOrder:    int()
});

exports.evidenceQuerySchema = Joi.object({
  year:    year(),
  section: Joi.string().valid(...ESG_SECTIONS),
  page:    Joi.number().integer().min(1).default(1),
  limit:   Joi.number().integer().min(1).max(100).default(20)
});

/* ═══════════════════════════════════════════════════════════════
   12. ESG SCORE
═══════════════════════════════════════════════════════════════ */
exports.scoreComputeSchema = Joi.object({
  year:           year().required(),
  forceRecompute: Joi.boolean().default(false),
  useAi:          Joi.boolean().default(false)
});

/* ═══════════════════════════════════════════════════════════════
   13. ESG REPORT HISTORY
═══════════════════════════════════════════════════════════════ */
const ESG_FORMATS  = ['GRI_2021','BRSR','TCFD','SASB','UNGC','INTEGRATED','CUSTOM'];
const HIST_STATUSES = ['GENERATED','SHARED','DOWNLOADED','ARCHIVED'];

exports.reportHistorySchema = Joi.object({
  reportingYear:   year().required(),
  periodFrom:      isoDate(),
  periodTo:        isoDate(),
  reportFormat:    Joi.string().valid(...ESG_FORMATS).default('CUSTOM'),
  reportTitle:     str(),
  templateVersion: str(20),
  reportLanguage:  str(5).default('en'),
  s3Key:           str(),
  s3Bucket:        str(100),
  fileName:        str(),
  fileSizeBytes:   int(),
  mimeType:        str(100).default('application/pdf'),
  sectionsIncluded:arr(Joi.string().valid(...ESG_SECTIONS)),
  notes:           text()
});

exports.reportHistoryUpdateSchema = Joi.object({
  status:       Joi.string().valid(...HIST_STATUSES),
  sharedWith:   arr(Joi.string().email()),
  accessCount:  int(),
  notes:        text()
});
