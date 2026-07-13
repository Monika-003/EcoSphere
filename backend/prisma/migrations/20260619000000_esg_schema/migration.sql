-- CreateEnum
CREATE TYPE "EsgSectionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "EsgSection" AS ENUM ('PROFILE', 'ENERGY', 'WATER', 'EMISSIONS', 'WASTE', 'BIODIVERSITY', 'EMPLOYEES', 'SAFETY', 'GOVERNANCE', 'CSR');

-- CreateEnum
CREATE TYPE "EsgReportFormat" AS ENUM ('GRI_2021', 'BRSR', 'TCFD', 'SASB', 'UNGC', 'INTEGRATED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EsgScoreRating" AS ENUM ('A_PLUS', 'A', 'B_PLUS', 'B', 'C_PLUS', 'C', 'D');

-- CreateEnum
CREATE TYPE "EsgScoreTrend" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "EsgHistoryStatus" AS ENUM ('GENERATED', 'SHARED', 'DOWNLOADED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "esg_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "siteName" TEXT,
    "facilityLocation" TEXT,
    "operationalBoundary" TEXT,
    "reportingScope" TEXT,
    "reportingStandards" TEXT[],
    "materialTopics" TEXT[],
    "ceoName" TEXT,
    "ceoTitle" TEXT,
    "ceoMessage" TEXT,
    "sustainHeadName" TEXT,
    "sustainHeadTitle" TEXT,
    "sustainabilityTheme" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "revenueCurr" DECIMAL(18,2),
    "revenuePrev" DECIMAL(18,2),
    "revenueUnit" TEXT DEFAULT 'INR',
    "totalEmployeesCurr" INTEGER,
    "totalEmployeesPrev" INTEGER,
    "countriesPresent" INTEGER,
    "facilitiesCount" INTEGER,
    "assuranceProvider" TEXT,
    "assuranceLevel" TEXT,
    "assuranceStandard" TEXT,
    "assuranceYear" TEXT,
    "esgContactName" TEXT,
    "esgContactEmail" TEXT,
    "esgContactPhone" TEXT,
    "stakeholderEngaged" TEXT[],
    "engagementMethods" TEXT[],
    "grievanceMechanism" BOOLEAN,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_energy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "gridElecKwh" DECIMAL(18,2),
    "dieselLitres" DECIMAL(18,2),
    "furnaceOilLitres" DECIMAL(18,2),
    "lpgKg" DECIMAL(18,2),
    "natGasM3" DECIMAL(18,2),
    "coalTonne" DECIMAL(18,2),
    "petCokeTonne" DECIMAL(18,2),
    "otherFuelGj" DECIMAL(18,2),
    "purchasedSteamGj" DECIMAL(18,2),
    "nonRenewableTotalGj" DECIMAL(18,4),
    "solarKwh" DECIMAL(18,2),
    "windKwh" DECIMAL(18,2),
    "biomassGj" DECIMAL(18,2),
    "biogasM3" DECIMAL(18,2),
    "hydroKwh" DECIMAL(18,2),
    "greenH2Kg" DECIMAL(18,2),
    "otherRenewableGj" DECIMAL(18,2),
    "renewableTotalGj" DECIMAL(18,4),
    "energySoldGj" DECIMAL(18,4),
    "totalEnergyConsumedGj" DECIMAL(18,4),
    "renewablePct" DECIMAL(6,2),
    "gridElecKwhPrev" DECIMAL(18,2),
    "dieselLitresPrev" DECIMAL(18,2),
    "solarKwhPrev" DECIMAL(18,2),
    "windKwhPrev" DECIMAL(18,2),
    "totalEnergyGjPrev" DECIMAL(18,4),
    "renewablePctPrev" DECIMAL(6,2),
    "energyIntensityUnit" TEXT,
    "intensityDenomCurr" DECIMAL(18,4),
    "intensityDenomPrev" DECIMAL(18,4),
    "energyIntensityCurr" DECIMAL(18,6),
    "energyIntensityPrev" DECIMAL(18,6),
    "yoyIntensityChangePct" DECIMAL(6,2),
    "reductionTargetPct" DECIMAL(6,2),
    "renewableTargetPct" DECIMAL(6,2),
    "targetYear" TEXT,
    "reTargetMw" DECIMAL(10,2),
    "energyInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_energy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_water" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "groundwaterKl" DECIMAL(18,2),
    "surfaceWaterKl" DECIMAL(18,2),
    "municipalKl" DECIMAL(18,2),
    "rainwaterKl" DECIMAL(18,2),
    "thirdPartyKl" DECIMAL(18,2),
    "seawaterKl" DECIMAL(18,2),
    "otherWithdrawalKl" DECIMAL(18,2),
    "totalWithdrawalKl" DECIMAL(18,4),
    "dischargeSewerKl" DECIMAL(18,2),
    "dischargeSurfaceKl" DECIMAL(18,2),
    "dischargeGroundKl" DECIMAL(18,2),
    "dischargeSTPKl" DECIMAL(18,2),
    "dischargeOtherKl" DECIMAL(18,2),
    "totalDischargeKl" DECIMAL(18,4),
    "totalConsumedKl" DECIMAL(18,4),
    "recycledKl" DECIMAL(18,2),
    "treatedReusedKl" DECIMAL(18,2),
    "zetpKl" DECIMAL(18,2),
    "recyclingRatePct" DECIMAL(6,2),
    "zldAchieved" BOOLEAN,
    "totalWithdrawalKlPrev" DECIMAL(18,4),
    "totalConsumedKlPrev" DECIMAL(18,4),
    "recyclingRatePctPrev" DECIMAL(6,2),
    "waterStressArea" BOOLEAN,
    "waterStressSource" TEXT,
    "stressLevel" TEXT,
    "waterIntensityUnit" TEXT,
    "intensityDenomCurr" DECIMAL(18,4),
    "intensityDenomPrev" DECIMAL(18,4),
    "waterIntensityCurr" DECIMAL(18,6),
    "waterIntensityPrev" DECIMAL(18,6),
    "yoyIntensityChangePct" DECIMAL(6,2),
    "reductionTargetPct" DECIMAL(6,2),
    "recyclingTargetPct" DECIMAL(6,2),
    "targetYear" TEXT,
    "waterInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_water_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_emissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "sc1StationaryKgco2e" DECIMAL(18,4),
    "sc1MobileKgco2e" DECIMAL(18,4),
    "sc1FugitiveKgco2e" DECIMAL(18,4),
    "sc1ProcessKgco2e" DECIMAL(18,4),
    "sc1BiogenicKgco2e" DECIMAL(18,4),
    "scope1TotalTco2e" DECIMAL(18,4),
    "sc2MarketBasedTco2e" DECIMAL(18,4),
    "sc2LocationBasedTco2e" DECIMAL(18,4),
    "sc2SteamTco2e" DECIMAL(18,4),
    "scope2TotalTco2e" DECIMAL(18,4),
    "sc3Cat1PurchasedGoods" DECIMAL(18,4),
    "sc3Cat2CapGoods" DECIMAL(18,4),
    "sc3Cat3FuelEnergy" DECIMAL(18,4),
    "sc3Cat4UpstreamTransp" DECIMAL(18,4),
    "sc3Cat5WasteOps" DECIMAL(18,4),
    "sc3Cat6BusinessTravel" DECIMAL(18,4),
    "sc3Cat7EmpCommute" DECIMAL(18,4),
    "sc3Cat8UpstreamAssets" DECIMAL(18,4),
    "sc3Cat9DownstreamTrp" DECIMAL(18,4),
    "sc3Cat10ProcProducts" DECIMAL(18,4),
    "sc3Cat11UseSoldProd" DECIMAL(18,4),
    "sc3Cat12EOLSoldProd" DECIMAL(18,4),
    "sc3Cat13DownAssets" DECIMAL(18,4),
    "sc3Cat14Franchises" DECIMAL(18,4),
    "sc3Cat15Investments" DECIMAL(18,4),
    "scope3TotalTco2e" DECIMAL(18,4),
    "co2Tonne" DECIMAL(18,4),
    "ch4Tonne" DECIMAL(18,4),
    "n2oTonne" DECIMAL(18,4),
    "hfcsTonne" DECIMAL(18,4),
    "pfcsTonne" DECIMAL(18,4),
    "sf6Tonne" DECIMAL(18,4),
    "nf3Tonne" DECIMAL(18,4),
    "scope12TotalTco2e" DECIMAL(18,4),
    "scope123TotalTco2e" DECIMAL(18,4),
    "scope1TotalPrev" DECIMAL(18,4),
    "scope2TotalPrev" DECIMAL(18,4),
    "scope3TotalPrev" DECIMAL(18,4),
    "scope123TotalPrev" DECIMAL(18,4),
    "scope1FactorSource" TEXT,
    "scope2GridFactor" DECIMAL(10,6),
    "scope2GridSource" TEXT,
    "emissionsIntensityUnit" TEXT,
    "intensityDenomCurr" DECIMAL(18,4),
    "intensityDenomPrev" DECIMAL(18,4),
    "emissionsIntensityCurr" DECIMAL(18,6),
    "emissionsIntensityPrev" DECIMAL(18,6),
    "yoyIntensityChangePct" DECIMAL(6,2),
    "baseYear" TEXT,
    "baseYearScope1" DECIMAL(18,4),
    "baseYearScope2" DECIMAL(18,4),
    "baseYearScope3" DECIMAL(18,4),
    "baseYearTotal" DECIMAL(18,4),
    "baseYearReason" TEXT,
    "offsetsTco2e" DECIMAL(18,4),
    "offsetProvider" TEXT,
    "offsetStandard" TEXT,
    "netEmissionsTco2e" DECIMAL(18,4),
    "scienceBasedTarget" BOOLEAN,
    "sbtiCommitted" BOOLEAN,
    "sbtiStatus" TEXT,
    "nzeTarget" BOOLEAN,
    "nzeTargetYear" TEXT,
    "reductionTargetPct" DECIMAL(6,2),
    "reductionTargetYear" TEXT,
    "carbonNeutralTarget" BOOLEAN,
    "carbonNeutralYear" TEXT,
    "thirdPartyVerified" BOOLEAN,
    "verifierOrg" TEXT,
    "verificationStandard" TEXT,
    "verificationYear" TEXT,
    "ghgInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_waste" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "hazIncinTonne" DECIMAL(18,4),
    "hazLandfillTonne" DECIMAL(18,4),
    "hazRecycleTonne" DECIMAL(18,4),
    "hazCoProcessTonne" DECIMAL(18,4),
    "hazStoredOnSiteTonne" DECIMAL(18,4),
    "hazOtherTonne" DECIMAL(18,4),
    "hazWasteTotalTonne" DECIMAL(18,4),
    "nhRecycleTonne" DECIMAL(18,4),
    "nhCompostTonne" DECIMAL(18,4),
    "nhLandfillTonne" DECIMAL(18,4),
    "nhIncinTonne" DECIMAL(18,4),
    "nhReuseOrRepairTonne" DECIMAL(18,4),
    "nhOtherTonne" DECIMAL(18,4),
    "nhWasteTotalTonne" DECIMAL(18,4),
    "ewasteKg" DECIMAL(18,4),
    "plasticTonne" DECIMAL(18,4),
    "plasticRecycledTonne" DECIMAL(18,4),
    "biomedicalTonne" DECIMAL(18,4),
    "constructionWasteTonne" DECIMAL(18,4),
    "foodWasteTonne" DECIMAL(18,4),
    "totalWasteTonne" DECIMAL(18,4),
    "diversionFromLandfill" DECIMAL(18,4),
    "diversionRatePct" DECIMAL(6,2),
    "recyclingRatePct" DECIMAL(6,2),
    "hazWasteTotalPrev" DECIMAL(18,4),
    "nhWasteTotalPrev" DECIMAL(18,4),
    "totalWastePrev" DECIMAL(18,4),
    "recyclingRatePrev" DECIMAL(6,2),
    "wasteIntensityUnit" TEXT,
    "intensityDenomCurr" DECIMAL(18,4),
    "intensityDenomPrev" DECIMAL(18,4),
    "wasteIntensityCurr" DECIMAL(18,6),
    "wasteIntensityPrev" DECIMAL(18,6),
    "yoyIntensityChangePct" DECIMAL(6,2),
    "pchwmAuthorized" BOOLEAN,
    "pchwmAuthorizationNo" TEXT,
    "pchwmExpiry" TIMESTAMP(3),
    "authorizedTransporters" TEXT[],
    "authorizedDisposalSites" TEXT[],
    "reductionTargetPct" DECIMAL(6,2),
    "diversionTargetPct" DECIMAL(6,2),
    "targetYear" TEXT,
    "zeroWasteToLandfill" BOOLEAN,
    "wasteInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_waste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_biodiversity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "nearProtectedArea" BOOLEAN,
    "protectedAreaName" TEXT,
    "distanceToProtAreaKm" DECIMAL(8,2),
    "protectedAreaType" TEXT,
    "ecoSensitiveZone" BOOLEAN,
    "eszDistanceKm" DECIMAL(8,2),
    "criticalHabitat" BOOLEAN,
    "facilityAreaHa" DECIMAL(10,4),
    "greenCoverHa" DECIMAL(10,4),
    "greenCoverPct" DECIMAL(6,2),
    "totalTreesPlanted" INTEGER,
    "treeSurvivalRatePct" DECIMAL(6,2),
    "landRehabilitatedHa" DECIMAL(10,4),
    "newLandClearedHa" DECIMAL(10,4),
    "keySpeciesPresent" TEXT[],
    "threatenedSpeciesCount" INTEGER,
    "endemicSpeciesCount" INTEGER,
    "invasiveSpeciesRisk" BOOLEAN,
    "invasiveSpeciesNotes" TEXT,
    "migratoryCorridor" BOOLEAN,
    "waterBodyAffected" BOOLEAN,
    "waterBodyDetails" TEXT,
    "eiaCompleted" BOOLEAN,
    "lastEiaYear" TEXT,
    "biodivAssessmentDone" BOOLEAN,
    "lastBiodivAssessDate" TIMESTAMP(3),
    "assessedBy" TEXT,
    "majorImpactsIdentified" TEXT,
    "afforestationPlanActive" BOOLEAN,
    "mitigationHierarchyApplied" BOOLEAN,
    "biodivOffsets" BOOLEAN,
    "offsetSiteDetails" TEXT,
    "conservationPartnerships" TEXT[],
    "totalTreesPrev" INTEGER,
    "greenCoverHaPrev" DECIMAL(10,4),
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_biodiversity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_employees" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "permanentMale" INTEGER,
    "permanentFemale" INTEGER,
    "permanentOther" INTEGER,
    "contractMale" INTEGER,
    "contractFemale" INTEGER,
    "contractOther" INTEGER,
    "casualWorkers" INTEGER,
    "apprentices" INTEGER,
    "interns" INTEGER,
    "seniorMgmtMale" INTEGER,
    "seniorMgmtFemale" INTEGER,
    "midMgmtMale" INTEGER,
    "midMgmtFemale" INTEGER,
    "juniorMale" INTEGER,
    "juniorFemale" INTEGER,
    "totalPermanent" INTEGER,
    "totalContract" INTEGER,
    "totalWorkforce" INTEGER,
    "permanentMalePrev" INTEGER,
    "permanentFemalePrev" INTEGER,
    "contractMalePrev" INTEGER,
    "contractFemalePrev" INTEGER,
    "totalWorkforcePrev" INTEGER,
    "womenLeadershipPct" DECIMAL(6,2),
    "womenBoardPct" DECIMAL(6,2),
    "pwdCount" INTEGER,
    "lgbtqCount" INTEGER,
    "scStCount" INTEGER,
    "obcCount" INTEGER,
    "nationalityDiversity" TEXT[],
    "womenLeadershipPrev" DECIMAL(6,2),
    "womenBoardPrev" DECIMAL(6,2),
    "newHiresMale" INTEGER,
    "newHiresFemale" INTEGER,
    "newHiresTotal" INTEGER,
    "newHireRatePct" DECIMAL(6,2),
    "attritionMale" INTEGER,
    "attritionFemale" INTEGER,
    "attritionTotal" INTEGER,
    "voluntaryAttritionPct" DECIMAL(6,2),
    "involuntaryAttritionPct" DECIMAL(6,2),
    "medianSalaryMale" DECIMAL(15,2),
    "medianSalaryFemale" DECIMAL(15,2),
    "ceoToMedianPayRatio" DECIMAL(8,2),
    "livingWageAdherence" BOOLEAN,
    "equalPayAuditDone" BOOLEAN,
    "pfCoveredPct" DECIMAL(6,2),
    "esicCoveredPct" DECIMAL(6,2),
    "gratuityProvisionInr" DECIMAL(18,2),
    "healthInsurancePct" DECIMAL(6,2),
    "avgTrainingHrsMale" DECIMAL(8,2),
    "avgTrainingHrsFemale" DECIMAL(8,2),
    "avgTrainingHrsTotal" DECIMAL(8,2),
    "trainingInvestmentInr" DECIMAL(18,2),
    "skillUpgradedCount" INTEGER,
    "performanceReviewPct" DECIMAL(6,2),
    "parentalLeaveEligibleMale" INTEGER,
    "parentalLeaveEligibleFemale" INTEGER,
    "parentalLeaveTakenMale" INTEGER,
    "parentalLeaveTakenFemale" INTEGER,
    "parentalReturnRatePct" DECIMAL(6,2),
    "unionizedPct" DECIMAL(6,2),
    "collectiveBargaining" BOOLEAN,
    "rightToOrganize" BOOLEAN,
    "noticePeriodDays" INTEGER,
    "humanRightsDueDiligence" BOOLEAN,
    "childLaborRisk" BOOLEAN,
    "forcedLaborRisk" BOOLEAN,
    "supplyChainHRAssessed" BOOLEAN,
    "hrInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_safety" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "manHoursEmp" DECIMAL(18,2),
    "manHoursCon" DECIMAL(18,2),
    "manHoursTotal" DECIMAL(18,2),
    "fatalitiesEmp" INTEGER,
    "ltiEmp" INTEGER,
    "recordableIncidentsEmp" INTEGER,
    "medicalCasesEmp" INTEGER,
    "restrictedWorkCasesEmp" INTEGER,
    "nearMissEmp" INTEGER,
    "firstAidCasesEmp" INTEGER,
    "lostDaysEmp" INTEGER,
    "fatalitiesCon" INTEGER,
    "ltiCon" INTEGER,
    "recordableIncidentsCon" INTEGER,
    "medicalCasesCon" INTEGER,
    "nearMissCon" INTEGER,
    "lostDaysCon" INTEGER,
    "ltirEmp" DECIMAL(10,4),
    "trirEmp" DECIMAL(10,4),
    "sirEmp" DECIMAL(10,4),
    "ltirCon" DECIMAL(10,4),
    "trirCon" DECIMAL(10,4),
    "ltirTotal" DECIMAL(10,4),
    "trirTotal" DECIMAL(10,4),
    "fatalitiesEmpPrev" INTEGER,
    "ltiEmpPrev" INTEGER,
    "ltirEmpPrev" DECIMAL(10,4),
    "trirEmpPrev" DECIMAL(10,4),
    "manHoursEmpPrev" DECIMAL(18,2),
    "fatalitiesConPrev" INTEGER,
    "ltiConPrev" INTEGER,
    "occDiseasesCasesEmp" INTEGER,
    "occDiseasesTypeEmp" TEXT[],
    "occDiseasesCasesCon" INTEGER,
    "iso45001Certified" BOOLEAN,
    "ohsmsImplemented" BOOLEAN,
    "safetyPolicyPublished" BOOLEAN,
    "safetyCommitteeActive" BOOLEAN,
    "workerSafetyRightKnown" BOOLEAN,
    "safetyTrainingHrsAvg" DECIMAL(8,2),
    "safetyTrainingCovPct" DECIMAL(6,2),
    "firstAidTrainedPct" DECIMAL(6,2),
    "emergencyDrillsCount" INTEGER,
    "ppeCompliancePct" DECIMAL(6,2),
    "internalSafetyAudits" INTEGER,
    "externalSafetyAudits" INTEGER,
    "regulatoryInspections" INTEGER,
    "ncRaisedCount" INTEGER,
    "ncClosedCount" INTEGER,
    "mentalHealthProgram" BOOLEAN,
    "ergonomicsAssessed" BOOLEAN,
    "ergoImprovementsDone" BOOLEAN,
    "employeeAssistanceProg" BOOLEAN,
    "safetyInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_safety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_governance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "boardSizeTotal" INTEGER,
    "boardIndependentCount" INTEGER,
    "boardIndependentPct" DECIMAL(6,2),
    "boardWomenCount" INTEGER,
    "boardWomenPct" DECIMAL(6,2),
    "boardDiverseCount" INTEGER,
    "boardAvgAgencyYrs" DECIMAL(5,1),
    "executiveDirectors" INTEGER,
    "nonExecDirectors" INTEGER,
    "nomineeDirectors" INTEGER,
    "boardMeetingsCount" INTEGER,
    "avgBoardAttendancePct" DECIMAL(6,2),
    "auditCommittee" BOOLEAN,
    "riskCommittee" BOOLEAN,
    "esgSustainCommittee" BOOLEAN,
    "nominationRemunCommittee" BOOLEAN,
    "csrCommittee" BOOLEAN,
    "stakeholderRelCommittee" BOOLEAN,
    "boardEsgOversight" BOOLEAN,
    "esgInBoardCharter" BOOLEAN,
    "esgKpisLinkedPay" BOOLEAN,
    "esgBoardMeetingsCount" INTEGER,
    "chiefSustainabilityOfficer" BOOLEAN,
    "codeOfConductPublished" BOOLEAN,
    "whistleblowerPolicy" BOOLEAN,
    "supplierCodeOfConduct" BOOLEAN,
    "antiCorruptionPolicy" BOOLEAN,
    "antiCompetitionPolicy" BOOLEAN,
    "conflictOfInterestPolicy" BOOLEAN,
    "giftAndEntertainPolicy" BOOLEAN,
    "ethicsTrainingCovPct" DECIMAL(6,2),
    "ethicsComplaintsReceived" INTEGER,
    "ethicsComplaintsResolved" INTEGER,
    "corruptionIncidents" INTEGER,
    "legalProceedingsCount" INTEGER,
    "erpFrameworkImplemented" BOOLEAN,
    "climateRiskAssessed" BOOLEAN,
    "tcfdAligned" BOOLEAN,
    "physicalClimateRisksId" TEXT[],
    "transitionClimateRisksId" TEXT[],
    "cyberRiskAssessed" BOOLEAN,
    "supplyChainRiskAssessed" BOOLEAN,
    "annualReportPublished" BOOLEAN,
    "griIndex" BOOLEAN,
    "brsrFiled" BOOLEAN,
    "tcfdReport" BOOLEAN,
    "sasbDisclosure" BOOLEAN,
    "ungcCop" BOOLEAN,
    "integratedReporting" BOOLEAN,
    "dataPrivacyPolicyPublished" BOOLEAN,
    "gdprComplianceApplicable" BOOLEAN,
    "gdprCompliant" BOOLEAN,
    "itSecurityAuditDone" BOOLEAN,
    "dataBreachIncidents" INTEGER,
    "dataBreachNotifications" INTEGER,
    "govInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_governance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_csr" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EsgSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "netProfitAvgInr" DECIMAL(18,2),
    "csrObligationInr" DECIMAL(18,2),
    "csrSpentInr" DECIMAL(18,2),
    "csrOngoingProjectInr" DECIMAL(18,2),
    "csrUnspentTransferInr" DECIMAL(18,2),
    "csrCarriedForwardInr" DECIMAL(18,2),
    "csrSpendingPct" DECIMAL(6,2),
    "csrObligationPrev" DECIMAL(18,2),
    "csrSpentPrev" DECIMAL(18,2),
    "focusEducation" BOOLEAN,
    "focusHealthcare" BOOLEAN,
    "focusWomenEmpowerment" BOOLEAN,
    "focusRuralDev" BOOLEAN,
    "focusEnvSustainability" BOOLEAN,
    "focusDrinkingWater" BOOLEAN,
    "focusLivelihoods" BOOLEAN,
    "focusDisasterRelief" BOOLEAN,
    "focusArtsCulture" BOOLEAN,
    "focusSportsNutrition" BOOLEAN,
    "focusPmFunds" BOOLEAN,
    "focusOther" BOOLEAN,
    "focusOtherDescription" TEXT,
    "directBeneficiaries" INTEGER,
    "indirectBeneficiaries" INTEGER,
    "beneficiaryWomen" INTEGER,
    "beneficiaryChildren" INTEGER,
    "beneficiaryPwd" INTEGER,
    "villagesCovered" INTEGER,
    "districtsCovered" INTEGER,
    "statesCovered" INTEGER,
    "aspirationalDistricts" INTEGER,
    "directImplementation" BOOLEAN,
    "throughOwnFoundation" BOOLEAN,
    "throughTrust" BOOLEAN,
    "throughNgo" BOOLEAN,
    "throughSection8" BOOLEAN,
    "implementationPartners" TEXT[],
    "impactAssessmentDone" BOOLEAN,
    "impactAssessmentBy" TEXT,
    "impactAssessmentYear" TEXT,
    "impactAssessmentKey" TEXT,
    "sdgsAddressed" TEXT[],
    "keyInitiatives" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_csr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_evidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "section" "EsgSection" NOT NULL,
    "fieldReference" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "presignedUrlExpiry" TIMESTAMP(3),
    "description" TEXT,
    "tags" TEXT[],
    "uploadedById" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "qualityScore" INTEGER,
    "isCoverImage" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_scores" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "envScore" DECIMAL(6,2),
    "socialScore" DECIMAL(6,2),
    "govScore" DECIMAL(6,2),
    "overallScore" DECIMAL(6,2),
    "esgRating" "EsgScoreRating",
    "energyScore" DECIMAL(6,2),
    "waterScore" DECIMAL(6,2),
    "emissionsScore" DECIMAL(6,2),
    "wasteScore" DECIMAL(6,2),
    "biodiversityScore" DECIMAL(6,2),
    "employeeScore" DECIMAL(6,2),
    "safetyScore" DECIMAL(6,2),
    "csrScore" DECIMAL(6,2),
    "boardScore" DECIMAL(6,2),
    "ethicsScore" DECIMAL(6,2),
    "transparencyScore" DECIMAL(6,2),
    "envCompletenessP" DECIMAL(6,2),
    "socialCompletenessP" DECIMAL(6,2),
    "govCompletenessP" DECIMAL(6,2),
    "overallCompletenessP" DECIMAL(6,2),
    "industryAvgEnv" DECIMAL(6,2),
    "industryAvgSocial" DECIMAL(6,2),
    "industryAvgGov" DECIMAL(6,2),
    "industryAvgOverall" DECIMAL(6,2),
    "industryRank" INTEGER,
    "prevYearEnv" DECIMAL(6,2),
    "prevYearSocial" DECIMAL(6,2),
    "prevYearGov" DECIMAL(6,2),
    "prevYearOverall" DECIMAL(6,2),
    "envTrend" "EsgScoreTrend",
    "socialTrend" "EsgScoreTrend",
    "govTrend" "EsgScoreTrend",
    "overallTrend" "EsgScoreTrend",
    "yoyOverallChangePts" DECIMAL(6,2),
    "materialTopics" TEXT[],
    "reportingGaps" TEXT[],
    "computedAt" TIMESTAMP(3),
    "computedByModel" TEXT,
    "scoringVersion" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_report_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportingYear" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "reportFormat" "EsgReportFormat" NOT NULL DEFAULT 'CUSTOM',
    "reportTitle" TEXT,
    "templateVersion" TEXT,
    "reportLanguage" TEXT NOT NULL DEFAULT 'en',
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generationDurationMs" INTEGER,
    "s3Key" TEXT,
    "s3Bucket" TEXT,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "envScoreSnapshot" DECIMAL(6,2),
    "socialScoreSnapshot" DECIMAL(6,2),
    "govScoreSnapshot" DECIMAL(6,2),
    "overallScoreSnapshot" DECIMAL(6,2),
    "esgRatingSnapshot" "EsgScoreRating",
    "sectionsIncluded" "EsgSection"[],
    "status" "EsgHistoryStatus" NOT NULL DEFAULT 'GENERATED',
    "sharedWith" TEXT[],
    "sharedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_report_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "esg_profiles_organizationId_idx" ON "esg_profiles"("organizationId");

-- CreateIndex
CREATE INDEX "esg_profiles_reportingYear_idx" ON "esg_profiles"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_profiles_organizationId_reportingYear_key" ON "esg_profiles"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_energy_organizationId_idx" ON "esg_energy"("organizationId");

-- CreateIndex
CREATE INDEX "esg_energy_reportingYear_idx" ON "esg_energy"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_energy_organizationId_reportingYear_key" ON "esg_energy"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_water_organizationId_idx" ON "esg_water"("organizationId");

-- CreateIndex
CREATE INDEX "esg_water_reportingYear_idx" ON "esg_water"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_water_organizationId_reportingYear_key" ON "esg_water"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_emissions_organizationId_idx" ON "esg_emissions"("organizationId");

-- CreateIndex
CREATE INDEX "esg_emissions_reportingYear_idx" ON "esg_emissions"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_emissions_organizationId_reportingYear_key" ON "esg_emissions"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_waste_organizationId_idx" ON "esg_waste"("organizationId");

-- CreateIndex
CREATE INDEX "esg_waste_reportingYear_idx" ON "esg_waste"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_waste_organizationId_reportingYear_key" ON "esg_waste"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_biodiversity_organizationId_idx" ON "esg_biodiversity"("organizationId");

-- CreateIndex
CREATE INDEX "esg_biodiversity_reportingYear_idx" ON "esg_biodiversity"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_biodiversity_organizationId_reportingYear_key" ON "esg_biodiversity"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_employees_organizationId_idx" ON "esg_employees"("organizationId");

-- CreateIndex
CREATE INDEX "esg_employees_reportingYear_idx" ON "esg_employees"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_employees_organizationId_reportingYear_key" ON "esg_employees"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_safety_organizationId_idx" ON "esg_safety"("organizationId");

-- CreateIndex
CREATE INDEX "esg_safety_reportingYear_idx" ON "esg_safety"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_safety_organizationId_reportingYear_key" ON "esg_safety"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_governance_organizationId_idx" ON "esg_governance"("organizationId");

-- CreateIndex
CREATE INDEX "esg_governance_reportingYear_idx" ON "esg_governance"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_governance_organizationId_reportingYear_key" ON "esg_governance"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_csr_organizationId_idx" ON "esg_csr"("organizationId");

-- CreateIndex
CREATE INDEX "esg_csr_reportingYear_idx" ON "esg_csr"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_csr_organizationId_reportingYear_key" ON "esg_csr"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_evidence_organizationId_idx" ON "esg_evidence"("organizationId");

-- CreateIndex
CREATE INDEX "esg_evidence_organizationId_reportingYear_idx" ON "esg_evidence"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_evidence_organizationId_section_idx" ON "esg_evidence"("organizationId", "section");

-- CreateIndex
CREATE INDEX "esg_evidence_reportingYear_idx" ON "esg_evidence"("reportingYear");

-- CreateIndex
CREATE INDEX "esg_scores_organizationId_idx" ON "esg_scores"("organizationId");

-- CreateIndex
CREATE INDEX "esg_scores_reportingYear_idx" ON "esg_scores"("reportingYear");

-- CreateIndex
CREATE UNIQUE INDEX "esg_scores_organizationId_reportingYear_key" ON "esg_scores"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_report_history_organizationId_idx" ON "esg_report_history"("organizationId");

-- CreateIndex
CREATE INDEX "esg_report_history_organizationId_reportingYear_idx" ON "esg_report_history"("organizationId", "reportingYear");

-- CreateIndex
CREATE INDEX "esg_report_history_reportingYear_idx" ON "esg_report_history"("reportingYear");

-- CreateIndex
CREATE INDEX "esg_report_history_generatedAt_idx" ON "esg_report_history"("generatedAt");

-- AddForeignKey
ALTER TABLE "esg_profiles" ADD CONSTRAINT "esg_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_energy" ADD CONSTRAINT "esg_energy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_water" ADD CONSTRAINT "esg_water_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_emissions" ADD CONSTRAINT "esg_emissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_waste" ADD CONSTRAINT "esg_waste_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_biodiversity" ADD CONSTRAINT "esg_biodiversity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_employees" ADD CONSTRAINT "esg_employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_safety" ADD CONSTRAINT "esg_safety_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_governance" ADD CONSTRAINT "esg_governance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_csr" ADD CONSTRAINT "esg_csr_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_evidence" ADD CONSTRAINT "esg_evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_scores" ADD CONSTRAINT "esg_scores_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_report_history" ADD CONSTRAINT "esg_report_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

