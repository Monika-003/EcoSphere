/**
 * esg-schema.js
 * EcoSphere — ESG & EIA Data Schema
 *
 * Defines all localStorage keys, data models, versioning,
 * and CRUD helpers for the ESG and EIA modules.
 *
 * Rules:
 *  - Never overwrite existing daily entries (append-only log)
 *  - Maintain full audit trail with timestamps
 *  - Support date-range filtering on all collections
 *  - All sections store data independently (not one flat object)
 *  - Evidence/images stored per section with metadata
 */

/* ═══════════════════════════════════════════════════════════
   SCHEMA VERSION
   ═══════════════════════════════════════════════════════════ */
const ESG_SCHEMA_VERSION = '3.0.0';

/* ═══════════════════════════════════════════════════════════
   STORAGE KEYS
   ═══════════════════════════════════════════════════════════ */
const KEYS = {
  // Schema meta
  SCHEMA_VERSION:   'eco_schema_version',

  // Company / Org profile (shared across ESG + EIA)
  COMPANY:          'eco_company_v3',

  // ESG — per-section wizard data (current draft)
  ESG_S1_PROFILE:   'eco_esg_s1_profile',      // Organization Profile
  ESG_S2_ENERGY:    'eco_esg_s2_energy',        // Energy Management
  ESG_S3_WATER:     'eco_esg_s3_water',         // Water Management
  ESG_S4_GHG:       'eco_esg_s4_ghg',           // GHG Emissions
  ESG_S5_WASTE:     'eco_esg_s5_waste',         // Waste Management
  ESG_S6_BIO:       'eco_esg_s6_biodiversity',  // Biodiversity
  ESG_S7_SOCIAL:    'eco_esg_s7_social',        // Social & Employees
  ESG_S8_SAFETY:    'eco_esg_s8_safety',        // Health & Safety
  ESG_S9_GOV:       'eco_esg_s9_governance',    // Governance
  ESG_S10_CSR:      'eco_esg_s10_csr',          // Community & CSR

  // ESG — evidence/images per section (arrays of EvidenceItem)
  ESG_EVIDENCE:     'eco_esg_evidence',

  // ESG — append-only daily/periodic entries
  ESG_ENTRIES:      'eco_esg_entries',

  // ESG — computed analytics cache (rebuilt on demand)
  ESG_ANALYTICS:    'eco_esg_analytics',

  // ESG — report configuration
  ESG_REPORT_CFG:   'eco_esg_report_cfg',

  // EIA — per-section wizard data
  EIA_S1_PROJECT:   'eco_eia_s1_project',       // Project Information
  EIA_S2_BASELINE:  'eco_eia_s2_baseline',      // Baseline Environment
  EIA_S3_IMPACT:    'eco_eia_s3_impact',        // Impact Assessment
  EIA_S4_MITIGATION:'eco_eia_s4_mitigation',   // Mitigation Measures
  EIA_S5_MONITORING:'eco_eia_s5_monitoring',   // Environmental Monitoring plan

  // EIA — append-only monitoring log entries
  EIA_ENTRIES:      'eco_eia_entries',

  // EIA — evidence/images
  EIA_EVIDENCE:     'eco_eia_evidence',

  // Shared — legacy key (read-only for backward compat)
  LEGACY_REPORT:    'eco_report_v2',
  LEGACY_BRAND:     'eco_company_brand',
  LEGACY_ESG_FULL:  'eco_esg_full',
  LEGACY_EIA_V1:    'eco_eia_v1',
};

/* ═══════════════════════════════════════════════════════════
   EMISSION FACTORS  (GHG Protocol / IPCC AR6)
   ═══════════════════════════════════════════════════════════ */
const EMISSION_FACTORS = {
  // Scope 1 — fuel combustion (kgCO2e per unit)
  diesel_liter:       2.68,   // kgCO2e / litre
  petrol_liter:       2.31,
  lpg_kg:             1.51,
  natural_gas_m3:     2.02,
  coal_kg:            2.42,
  hsd_liter:          2.68,
  furnace_oil_liter:  3.15,

  // Scope 2 — purchased electricity (kgCO2e per kWh)
  grid_kwh_india:     0.82,   // India CEA average FY24
  grid_kwh_global:    0.49,

  // Scope 3 — transport (kgCO2e per tonne-km)
  road_freight_tkm:   0.062,
  rail_freight_tkm:   0.028,
  sea_freight_tkm:    0.010,
  air_freight_tkm:    0.602,

  // Energy conversions (GJ per unit)
  kwh_to_gj:          0.0036,
  diesel_liter_gj:    0.0386,
  petrol_liter_gj:    0.0342,
  lpg_kg_gj:          0.0468,
  natural_gas_m3_gj:  0.0378,
};

/* ═══════════════════════════════════════════════════════════
   SECTION MODELS
   Each model defines field names, types, defaults, and labels.
   ═══════════════════════════════════════════════════════════ */

/**
 * SECTION 1 — Organization Profile
 */
const MODEL_ESG_S1 = {
  _section: 'esg_s1_profile',
  _version: 1,
  _updatedAt: null,

  // Identity
  orgName:           { type: 'text',   label: 'Organization Name',         required: true,  default: '' },
  siteName:          { type: 'text',   label: 'Site / Facility Name',      required: true,  default: '' },
  facilityLocation:  { type: 'text',   label: 'Facility Location',         required: true,  default: '' },
  industryType:      { type: 'select', label: 'Industry Type',             required: true,  default: '',
    options: ['Pharmaceuticals','Chemicals','Textiles','Steel & Metals','Cement','Power Generation',
              'Information Technology','FMCG','Automotive','Infrastructure','Mining','Food & Beverages','Other'] },
  cin:               { type: 'text',   label: 'CIN / Registration No.',    required: false, default: '' },
  gst:               { type: 'text',   label: 'GST Number',                required: false, default: '' },
  address:           { type: 'textarea',label: 'Registered Address',       required: false, default: '' },
  website:           { type: 'text',   label: 'Website',                   required: false, default: '' },

  // Reporting scope
  reportingYear:     { type: 'text',   label: 'Reporting Year',            required: true,  default: '' },
  periodFrom:        { type: 'date',   label: 'Reporting Period From',     required: true,  default: '' },
  periodTo:          { type: 'date',   label: 'Reporting Period To',       required: true,  default: '' },
  employeeCount:     { type: 'number', label: 'Total Employee Count',      required: true,  default: 0  },
  operationalBoundary:{ type: 'select',label: 'Operational Boundary',     required: false, default: 'Operational Control',
    options: ['Operational Control','Financial Control','Equity Share'] },
  reportingScope:    { type: 'select', label: 'Reporting Scope',          required: false, default: 'All Operations',
    options: ['All Operations','Manufacturing Only','Single Site','Multi-Site'] },
  reportingStandard: { type: 'multiselect', label: 'Reporting Standards', required: false, default: [],
    options: ['GRI 2021','BRSR','TCFD','SASB','UNGC','CDP','ISO 26000','SDGs'] },

  // Leadership
  ceoName:           { type: 'text',   label: 'CEO / MD Name',             required: false, default: '' },
  ceoTitle:          { type: 'text',   label: 'CEO / MD Designation',      required: false, default: '' },
  ceoMessage:        { type: 'textarea',label: 'CEO Message',              required: false, default: '' },
  sustainHeadName:   { type: 'text',   label: 'Sustainability Head Name',  required: false, default: '' },
  sustainHeadTitle:  { type: 'text',   label: 'Sustainability Head Title', required: false, default: '' },
  vision:            { type: 'textarea',label: 'Sustainability Vision',    required: false, default: '' },
  mission:           { type: 'textarea',label: 'Sustainability Mission',   required: false, default: '' },
  sustainabilityTheme:{ type: 'text',  label: 'Report Theme / Tagline',   required: false, default: '' },

  // Financial
  revenueCurr:       { type: 'number', label: 'Revenue Current Year (₹ Mn)', required: false, default: 0 },
  revenuePrev:       { type: 'number', label: 'Revenue Previous Year (₹ Mn)',required: false, default: 0 },
  countries:         { type: 'number', label: 'Countries / Markets',       required: false, default: 0  },
  facilities:        { type: 'number', label: 'Manufacturing Facilities',  required: false, default: 0  },

  // Assurance
  assuranceProvider: { type: 'text',   label: 'Assurance Provider',        required: false, default: '' },
  assuranceLevel:    { type: 'select', label: 'Assurance Level',           required: false, default: 'Limited Assurance',
    options: ['Limited Assurance','Reasonable Assurance','No External Assurance'] },

  // Evidence keys (references to ESG_EVIDENCE store)
  _evidenceKeys: ['logo', 'cover', 'facilityImages', 'certifications', 'ceoPhoto', 'sustainHeadPhoto'],
};

/**
 * SECTION 2 — Energy Management
 */
const MODEL_ESG_S2 = {
  _section: 'esg_s2_energy',
  _version: 1,
  _updatedAt: null,

  // Current year inputs (all in kWh unless noted)
  gridElecCurr:      { type: 'number', label: 'Grid Electricity (kWh)',         unit: 'kWh',  default: 0 },
  gridElecPrev:      { type: 'number', label: 'Grid Electricity — Prev Year',   unit: 'kWh',  default: 0 },
  solarCurr:         { type: 'number', label: 'Solar Energy Generated (kWh)',    unit: 'kWh',  default: 0 },
  solarPrev:         { type: 'number', label: 'Solar Energy — Prev Year',        unit: 'kWh',  default: 0 },
  windCurr:          { type: 'number', label: 'Wind Energy Generated (kWh)',     unit: 'kWh',  default: 0 },
  windPrev:          { type: 'number', label: 'Wind Energy — Prev Year',         unit: 'kWh',  default: 0 },
  dieselCurr:        { type: 'number', label: 'Diesel Consumed (Litres)',        unit: 'L',    default: 0 },
  dieselPrev:        { type: 'number', label: 'Diesel Consumed — Prev Year',     unit: 'L',    default: 0 },
  hsdCurr:           { type: 'number', label: 'HSD / Furnace Oil (Litres)',      unit: 'L',    default: 0 },
  hsdPrev:           { type: 'number', label: 'HSD / Furnace Oil — Prev Year',   unit: 'L',    default: 0 },
  steamCurr:         { type: 'number', label: 'Steam Consumption (GJ)',          unit: 'GJ',   default: 0 },
  steamPrev:         { type: 'number', label: 'Steam Consumption — Prev Year',   unit: 'GJ',   default: 0 },
  otherFuelCurr:     { type: 'number', label: 'Other Fuel / LNG (GJ)',           unit: 'GJ',   default: 0 },
  otherFuelPrev:     { type: 'number', label: 'Other Fuel — Prev Year',          unit: 'GJ',   default: 0 },

  // Intensity denominator
  intensityDenomUnit:{ type: 'text',   label: 'Intensity Denominator',     default: 'Revenue (₹ Mn)' },
  intensityDenomCurr:{ type: 'number', label: 'Denominator Value (Current)',default: 0 },
  intensityDenomPrev:{ type: 'number', label: 'Denominator Value (Previous)',default: 0 },

  // Targets
  energyReductionTarget: { type: 'number', label: 'Energy Reduction Target (%)', default: 0 },
  renewableTarget:   { type: 'number', label: 'Renewable Energy Target (%)',  default: 0 },
  targetYear:        { type: 'text',   label: 'Target Year',                  default: '' },

  // Notes
  notes:             { type: 'textarea', label: 'Additional Notes / Context', default: '' },
  energyInitiatives: { type: 'textarea', label: 'Key Energy Initiatives',    default: '' },

  // Computed fields (written by analytics engine — do not input)
  _computed: {
    totalEnergyGJ_curr:   0,   // sum of all sources converted to GJ
    totalEnergyGJ_prev:   0,
    renewablePct_curr:    0,   // (solar+wind) / total * 100
    renewablePct_prev:    0,
    energyIntensity_curr: 0,   // totalGJ / denominator
    energyIntensity_prev: 0,
    yoyChange_pct:        0,   // (curr - prev) / prev * 100
    trend:                [],  // monthly aggregates from ESG_ENTRIES
  },

  _evidenceKeys: ['utilityBills', 'meterReadings', 'solarImages', 'auditReports'],
};

/**
 * SECTION 3 — Water Management
 */
const MODEL_ESG_S3 = {
  _section: 'esg_s3_water',
  _version: 1,
  _updatedAt: null,

  // Withdrawal by source (KL = kilolitres)
  groundwaterCurr:   { type: 'number', label: 'Groundwater Withdrawal (KL)',     unit: 'KL', default: 0 },
  groundwaterPrev:   { type: 'number', label: 'Groundwater — Prev Year',          unit: 'KL', default: 0 },
  municipalCurr:     { type: 'number', label: 'Municipal / Public Supply (KL)',   unit: 'KL', default: 0 },
  municipalPrev:     { type: 'number', label: 'Municipal Supply — Prev Year',     unit: 'KL', default: 0 },
  surfaceCurr:       { type: 'number', label: 'Surface Water (KL)',               unit: 'KL', default: 0 },
  surfacePrev:       { type: 'number', label: 'Surface Water — Prev Year',        unit: 'KL', default: 0 },
  rainwaterCurr:     { type: 'number', label: 'Rainwater Harvested (KL)',          unit: 'KL', default: 0 },
  rainwaterPrev:     { type: 'number', label: 'Rainwater — Prev Year',            unit: 'KL', default: 0 },
  recycledUsedCurr:  { type: 'number', label: 'Recycled / Reused Water (KL)',     unit: 'KL', default: 0 },
  recycledUsedPrev:  { type: 'number', label: 'Recycled / Reused — Prev Year',    unit: 'KL', default: 0 },

  // Discharge
  dischargeCurr:     { type: 'number', label: 'Total Wastewater Discharged (KL)', unit: 'KL', default: 0 },
  dischargePrev:     { type: 'number', label: 'Discharge — Prev Year',            unit: 'KL', default: 0 },
  dischargeCompliant:{ type: 'select', label: 'Discharge Meets CPCB Norms',
    options: ['Yes','No','Partial'], default: 'Yes' },

  // Treatment
  treatmentType:     { type: 'select', label: 'Wastewater Treatment',
    options: ['ETP + STP','ZLD (Zero Liquid Discharge)','ETP Only','STP Only','RO + ZLD','No Treatment'],
    default: 'ETP + STP' },

  // Intensity
  intensityDenomUnit:{ type: 'text',   label: 'Intensity Denominator',       default: 'Revenue (₹ Mn)' },
  intensityDenomCurr:{ type: 'number', label: 'Denominator Value (Current)', default: 0 },
  intensityDenomPrev:{ type: 'number', label: 'Denominator Value (Previous)',default: 0 },

  // Targets
  waterReductionTarget: { type: 'number', label: 'Water Reduction Target (%)', default: 0 },
  reuseTarget:       { type: 'number', label: 'Reuse / Recycling Target (%)', default: 0 },
  targetYear:        { type: 'text',   label: 'Target Year',                  default: '' },

  notes:             { type: 'textarea', label: 'Additional Notes',            default: '' },
  waterInitiatives:  { type: 'textarea', label: 'Key Water Conservation Initiatives', default: '' },

  _computed: {
    totalWithdrawal_curr: 0,
    totalWithdrawal_prev: 0,
    reusePct_curr:        0,   // recycledUsed / totalWithdrawal * 100
    reusePct_prev:        0,
    waterIntensity_curr:  0,
    waterIntensity_prev:  0,
    yoyChange_pct:        0,
    trend:                [],
  },

  _evidenceKeys: ['waterReports', 'meterPhotos', 'treatmentPlantImages', 'labReports'],
};

/**
 * SECTION 4 — GHG Emissions
 */
const MODEL_ESG_S4 = {
  _section: 'esg_s4_ghg',
  _version: 1,
  _updatedAt: null,

  // ── SCOPE 1 — Direct Emissions ──
  s1_dieselLCurr:    { type: 'number', label: 'Diesel (Litres) — Current',    unit: 'L',   default: 0 },
  s1_dieselLPrev:    { type: 'number', label: 'Diesel (Litres) — Previous',   unit: 'L',   default: 0 },
  s1_petrolLCurr:    { type: 'number', label: 'Petrol (Litres) — Current',    unit: 'L',   default: 0 },
  s1_petrolLPrev:    { type: 'number', label: 'Petrol (Litres) — Previous',   unit: 'L',   default: 0 },
  s1_lpgKgCurr:      { type: 'number', label: 'LPG (Kg) — Current',           unit: 'kg',  default: 0 },
  s1_lpgKgPrev:      { type: 'number', label: 'LPG (Kg) — Previous',          unit: 'kg',  default: 0 },
  s1_natGasM3Curr:   { type: 'number', label: 'Natural Gas (m³) — Current',   unit: 'm³',  default: 0 },
  s1_natGasM3Prev:   { type: 'number', label: 'Natural Gas (m³) — Previous',  unit: 'm³',  default: 0 },
  s1_coalKgCurr:     { type: 'number', label: 'Coal (Kg) — Current',          unit: 'kg',  default: 0 },
  s1_coalKgPrev:     { type: 'number', label: 'Coal (Kg) — Previous',         unit: 'kg',  default: 0 },
  s1_hsdLCurr:       { type: 'number', label: 'Furnace Oil / HSD (L) — Current', unit: 'L', default: 0 },
  s1_hsdLPrev:       { type: 'number', label: 'Furnace Oil / HSD (L) — Previous',unit: 'L', default: 0 },
  s1_refrigerantKgCurr:{ type: 'number', label: 'Refrigerant Leakage (kg CO2e) — Current', unit: 'kgCO2e', default: 0 },
  s1_refrigerantKgPrev:{ type: 'number', label: 'Refrigerant Leakage — Previous', unit: 'kgCO2e', default: 0 },

  // ── SCOPE 2 — Indirect (Purchased Energy) ──
  s2_gridKwhCurr:    { type: 'number', label: 'Purchased Electricity (kWh) — Current', unit: 'kWh', default: 0 },
  s2_gridKwhPrev:    { type: 'number', label: 'Purchased Electricity — Previous',       unit: 'kWh', default: 0 },
  s2_emissionFactor: { type: 'number', label: 'Grid Emission Factor (kgCO2e/kWh)',      unit: '',    default: 0.82 },
  s2_steamKwhCurr:   { type: 'number', label: 'Purchased Steam / Heat (kWh equiv) — Current', unit: 'kWh', default: 0 },
  s2_steamKwhPrev:   { type: 'number', label: 'Purchased Steam / Heat — Previous',       unit: 'kWh', default: 0 },

  // ── SCOPE 3 — Value Chain ──
  s3_roadTkmCurr:    { type: 'number', label: 'Road Freight (tonne-km) — Current',  unit: 'tkm', default: 0 },
  s3_roadTkmPrev:    { type: 'number', label: 'Road Freight — Previous',             unit: 'tkm', default: 0 },
  s3_railTkmCurr:    { type: 'number', label: 'Rail Freight (tonne-km) — Current',  unit: 'tkm', default: 0 },
  s3_railTkmPrev:    { type: 'number', label: 'Rail Freight — Previous',             unit: 'tkm', default: 0 },
  s3_airTkmCurr:     { type: 'number', label: 'Air Freight (tonne-km) — Current',   unit: 'tkm', default: 0 },
  s3_airTkmPrev:     { type: 'number', label: 'Air Freight — Previous',              unit: 'tkm', default: 0 },
  s3_businessTravel: { type: 'number', label: 'Business Travel (kgCO2e) — Current', unit: 'kgCO2e', default: 0 },
  s3_employeeCommute:{ type: 'number', label: 'Employee Commute (kgCO2e) — Current',unit: 'kgCO2e', default: 0 },
  s3_supplyChain:    { type: 'number', label: 'Supply Chain / Upstream (tCO2e) — Current', unit: 'tCO2e', default: 0 },
  s3_wasteDisposal:  { type: 'number', label: 'Waste Disposal (tCO2e) — Current',   unit: 'tCO2e', default: 0 },
  s3_otherCurr:      { type: 'number', label: 'Other Scope 3 (tCO2e) — Current',    unit: 'tCO2e', default: 0 },

  // Intensity
  intensityDenomUnit: { type: 'text',   label: 'Intensity Denominator',       default: 'Revenue (₹ Mn)' },
  intensityDenomCurr: { type: 'number', label: 'Denominator (Current)',        default: 0 },
  intensityDenomPrev: { type: 'number', label: 'Denominator (Previous)',       default: 0 },

  // Targets
  ghgReductionTarget: { type: 'number', label: 'GHG Reduction Target (%)',     default: 0 },
  netZeroYear:        { type: 'text',   label: 'Net Zero Target Year',         default: '' },
  sbtiStatus:         { type: 'select', label: 'SBTi Status',
    options: ['Not Started','Target Setting in Progress','Committed','Approved','Achieved'], default: 'Not Started' },

  notes:              { type: 'textarea', label: 'Notes',                       default: '' },
  climateInitiatives: { type: 'textarea', label: 'Key Climate Initiatives',    default: '' },

  _computed: {
    scope1_tCO2e_curr:  0,
    scope1_tCO2e_prev:  0,
    scope2_tCO2e_curr:  0,
    scope2_tCO2e_prev:  0,
    scope3_tCO2e_curr:  0,
    scope3_tCO2e_prev:  0,
    total_tCO2e_curr:   0,
    total_tCO2e_prev:   0,
    ghgIntensity_curr:  0,
    ghgIntensity_prev:  0,
    yoyChange_pct:      0,
    trend:              [],
  },

  _evidenceKeys: ['fuelBills', 'electricityBills', 'freightLogs', 'ghgAuditReport'],
};

/**
 * SECTION 5 — Waste Management
 */
const MODEL_ESG_S5 = {
  _section: 'esg_s5_waste',
  _version: 1,
  _updatedAt: null,

  hazardousWasteCurr:    { type: 'number', label: 'Hazardous Waste Generated (MT) — Current', unit: 'MT', default: 0 },
  hazardousWastePrev:    { type: 'number', label: 'Hazardous Waste — Previous',               unit: 'MT', default: 0 },
  nonHazardousWasteCurr: { type: 'number', label: 'Non-Hazardous Waste Generated (MT) — Current', unit: 'MT', default: 0 },
  nonHazardousWastePrev: { type: 'number', label: 'Non-Hazardous Waste — Previous',           unit: 'MT', default: 0 },
  ewasteCurr:            { type: 'number', label: 'E-Waste (MT) — Current',                   unit: 'MT', default: 0 },
  ewastePrev:            { type: 'number', label: 'E-Waste — Previous',                       unit: 'MT', default: 0 },
  recycledWasteCurr:     { type: 'number', label: 'Waste Recycled (MT) — Current',            unit: 'MT', default: 0 },
  recycledWastePrev:     { type: 'number', label: 'Waste Recycled — Previous',                unit: 'MT', default: 0 },
  reusedWasteCurr:       { type: 'number', label: 'Waste Reused / Repurposed (MT) — Current', unit: 'MT', default: 0 },
  reusedWastePrev:       { type: 'number', label: 'Waste Reused — Previous',                  unit: 'MT', default: 0 },
  coProcessedCurr:       { type: 'number', label: 'Co-Processed in Cement Kiln (MT) — Current', unit: 'MT', default: 0 },
  coProcessedPrev:       { type: 'number', label: 'Co-Processed — Previous',                  unit: 'MT', default: 0 },
  landfilledWasteCurr:   { type: 'number', label: 'Waste Landfilled / Disposed (MT) — Current', unit: 'MT', default: 0 },
  landfilledWastePrev:   { type: 'number', label: 'Waste Landfilled — Previous',              unit: 'MT', default: 0 },
  flyAshCurr:            { type: 'number', label: 'Fly Ash / Coal Ash (MT) — Current',        unit: 'MT', default: 0 },
  flyAshPrev:            { type: 'number', label: 'Fly Ash — Previous',                       unit: 'MT', default: 0 },

  zeroWasteYear:         { type: 'text',   label: 'Zero Waste to Landfill Target Year',        default: '' },
  wasteReductionTarget:  { type: 'number', label: 'Waste Reduction Target (%)',                default: 0  },

  hwdisposalMethod:      { type: 'textarea', label: 'Hazardous Waste Disposal Methods',        default: '' },
  notes:                 { type: 'textarea', label: 'Waste Management Initiatives / Notes',    default: '' },

  _computed: {
    totalWaste_curr:       0,
    totalWaste_prev:       0,
    recyclingRate_curr:    0,   // (recycled + reused) / total * 100
    recyclingRate_prev:    0,
    diversionRate_curr:    0,   // (total - landfilled) / total * 100
    diversionRate_prev:    0,
    yoyChange_pct:         0,
    trend:                 [],
  },

  _evidenceKeys: ['disposalCertificates', 'wasteReports', 'vendorDocuments', 'wastePhotos'],
};

/**
 * SECTION 6 — Biodiversity
 */
const MODEL_ESG_S6 = {
  _section: 'esg_s6_biodiversity',
  _version: 1,
  _updatedAt: null,

  greenBeltAreaCurr: { type: 'number', label: 'Green Belt / Plantation Area (Ha) — Current', unit: 'Ha', default: 0 },
  greenBeltAreaPrev: { type: 'number', label: 'Green Belt Area — Previous',                  unit: 'Ha', default: 0 },
  treesPlantedCurr:  { type: 'number', label: 'Trees Planted (Cumulative) — Current',        unit: 'Nos', default: 0 },
  treesPlantedPrev:  { type: 'number', label: 'Trees Planted — Previous',                    unit: 'Nos', default: 0 },
  treeSurvivalRate:  { type: 'number', label: 'Tree Survival Rate (%)',                      unit: '%',  default: 0  },
  nativeSppPct:      { type: 'number', label: 'Native Species Percentage (%)',               unit: '%',  default: 0  },
  floraSpeciesCount: { type: 'number', label: 'Flora Species Documented',                    unit: 'Nos', default: 0 },
  faunaSpeciesCount: { type: 'number', label: 'Fauna Species Documented',                    unit: 'Nos', default: 0 },
  nearProtectedArea: { type: 'select', label: 'Near Ecologically Sensitive Area',
    options: ['No','Yes — Wildlife Sanctuary','Yes — National Park','Yes — Ramsar Site','Yes — Other'],
    default: 'No' },
  biodiversityPrograms:    { type: 'textarea', label: 'Biodiversity Conservation Programs', default: '' },
  conservationActivities:  { type: 'textarea', label: 'Conservation Activities Undertaken', default: '' },
  impactOnBiodiversity:    { type: 'textarea', label: 'Potential Impacts on Biodiversity',  default: '' },

  _computed: {
    greenBeltPctOfSite: 0,    // requires site area from EIA or org profile
  },

  _evidenceKeys: ['geoTaggedImages', 'plantationRecords', 'biodiversityReports'],
};

/**
 * SECTION 7 — Social & Employees
 */
const MODEL_ESG_S7 = {
  _section: 'esg_s7_social',
  _version: 1,
  _updatedAt: null,

  // Headcount
  totalEmpCurr:       { type: 'number', label: 'Total Employees — Current',         default: 0 },
  totalEmpPrev:       { type: 'number', label: 'Total Employees — Previous',        default: 0 },
  maleCurr:           { type: 'number', label: 'Male Employees — Current',          default: 0 },
  malePrev:           { type: 'number', label: 'Male Employees — Previous',         default: 0 },
  femaleCurr:         { type: 'number', label: 'Female Employees — Current',        default: 0 },
  femalePrev:         { type: 'number', label: 'Female Employees — Previous',       default: 0 },
  contractCurr:       { type: 'number', label: 'Contract / Temporary Workers — Current', default: 0 },
  contractPrev:       { type: 'number', label: 'Contract Workers — Previous',      default: 0 },
  differentlyAbled:   { type: 'number', label: 'Differently-Abled Employees',      default: 0 },

  // Senior Management
  womenInMgmtCurr:    { type: 'number', label: 'Women in Senior Management (%) — Current', unit: '%', default: 0 },
  womenInMgmtPrev:    { type: 'number', label: 'Women in Senior Management — Previous',    unit: '%', default: 0 },
  womenInBoardCurr:   { type: 'number', label: 'Women on Board (%) — Current',             unit: '%', default: 0 },

  // Hiring & Attrition
  newHiresCurr:       { type: 'number', label: 'New Hires — Current Year',          default: 0 },
  newHiresPrev:       { type: 'number', label: 'New Hires — Previous Year',         default: 0 },
  attritionCurr:      { type: 'number', label: 'Attrition Count — Current Year',   default: 0 },
  attritionPrev:      { type: 'number', label: 'Attrition Count — Previous Year',  default: 0 },

  // Training
  trainingHoursCurr:  { type: 'number', label: 'Total Training Hours — Current',   unit: 'hrs', default: 0 },
  trainingHoursPrev:  { type: 'number', label: 'Total Training Hours — Previous',  unit: 'hrs', default: 0 },
  trainingCoverage:   { type: 'number', label: 'Training Coverage (%)',            unit: '%',   default: 0 },

  // Benefits
  parentalLeaveReturn:{ type: 'number', label: 'Parental Leave Return Rate (%)',   unit: '%',   default: 0 },
  equalPayRatio:      { type: 'number', label: 'Equal Pay Ratio (F:M)',            unit: '',    default: 0 },

  notes:              { type: 'textarea', label: 'HR Initiatives / Highlights',    default: '' },

  _computed: {
    genderDiversityPct_curr:  0,   // female / total * 100
    genderDiversityPct_prev:  0,
    trainingHoursPerEmp_curr: 0,   // trainingHours / total
    trainingHoursPerEmp_prev: 0,
    attritionRate_curr:       0,   // attrition / total * 100
    attritionRate_prev:       0,
    trend:                    [],
  },

  _evidenceKeys: ['hrReports', 'trainingRecords', 'trainingImages', 'payEquityReport'],
};

/**
 * SECTION 8 — Health & Safety
 */
const MODEL_ESG_S8 = {
  _section: 'esg_s8_safety',
  _version: 1,
  _updatedAt: null,

  // Incidents
  totalIncidentsCurr:  { type: 'number', label: 'Total Incidents — Current',       default: 0 },
  totalIncidentsPrev:  { type: 'number', label: 'Total Incidents — Previous',      default: 0 },
  nearMissesCurr:      { type: 'number', label: 'Near Misses Reported — Current',  default: 0 },
  nearMissesPrev:      { type: 'number', label: 'Near Misses — Previous',          default: 0 },
  ltiCurr:             { type: 'number', label: 'Lost Time Injuries (LTI) — Current', default: 0 },
  ltiPrev:             { type: 'number', label: 'LTI — Previous',                  default: 0 },
  ltdCurr:             { type: 'number', label: 'Lost Time Days — Current',        default: 0 },
  ltdPrev:             { type: 'number', label: 'Lost Time Days — Previous',       default: 0 },
  fatalitiesCurr:      { type: 'number', label: 'Fatalities — Current',            default: 0 },
  fatalitiesPrev:      { type: 'number', label: 'Fatalities — Previous',           default: 0 },
  firstAidCasesCurr:   { type: 'number', label: 'First Aid Cases — Current',       default: 0 },

  // Exposure
  totalManHoursCurr:   { type: 'number', label: 'Total Man-Hours Worked — Current', unit: 'hrs', default: 0 },
  totalManHoursPrev:   { type: 'number', label: 'Total Man-Hours — Previous',       unit: 'hrs', default: 0 },

  // Trainings
  safetyTrainingsCount:{ type: 'number', label: 'Safety Trainings Conducted',      default: 0 },
  safetyTrainedEmp:    { type: 'number', label: 'Employees Trained in Safety',    default: 0 },
  mockDrills:          { type: 'number', label: 'Mock Drills / Emergency Exercises', default: 0 },
  safetyObservations:  { type: 'number', label: 'Safety Observations Logged',     default: 0 },
  safetyDaysCelebrated:{ type: 'number', label: 'Safety Days Without LTI',        default: 0 },

  // Certifications
  iso45001:            { type: 'select', label: 'ISO 45001 Certified',
    options: ['Yes','No','In Progress'], default: 'No' },

  notes:               { type: 'textarea', label: 'Safety Initiatives / OHS Notes', default: '' },

  _computed: {
    ltifr_curr:         0,   // (LTI * 1,000,000) / manHours
    ltifr_prev:         0,
    trir_curr:          0,   // Total Recordable Incident Rate
    trir_prev:          0,
    severityRate_curr:  0,   // (LTD * 1,000,000) / manHours
    safetyScore:        0,   // composite 0-100
    trend:              [],
  },

  _evidenceKeys: ['incidentReports', 'safetyImages', 'trainingEvidence', 'auditReports'],
};

/**
 * SECTION 9 — Governance
 */
const MODEL_ESG_S9 = {
  _section: 'esg_s9_governance',
  _version: 1,
  _updatedAt: null,

  // Board
  boardSize:           { type: 'number', label: 'Total Board Members',           default: 0 },
  boardWomen:          { type: 'number', label: 'Women on Board',                default: 0 },
  independentDirectors:{ type: 'number', label: 'Independent Directors',        default: 0 },
  boardMeetings:       { type: 'number', label: 'Board Meetings Per Year',      default: 0 },
  esgCommittee:        { type: 'select', label: 'ESG / Sustainability Committee',
    options: ['Yes — Board Level','Yes — Management Level','No'], default: 'No' },

  // Policies
  policyCount:         { type: 'number', label: 'No. of Formal ESG / Sustainability Policies', default: 0 },
  policiesListed:      { type: 'textarea', label: 'List Key Policies',          default: '' },
  antiCorruptionPolicy:{ type: 'select', label: 'Anti-Corruption Policy',
    options: ['Yes','No'], default: 'No' },
  whistleblowerPolicy: { type: 'select', label: 'Whistleblower Policy',
    options: ['Yes','No'], default: 'No' },
  humanRightsPolicy:   { type: 'select', label: 'Human Rights Policy',
    options: ['Yes','No'], default: 'No' },
  supplierCodeOfConduct:{ type: 'select', label: 'Supplier Code of Conduct',
    options: ['Yes','No'], default: 'No' },

  // Ethics
  ethicsTrainedEmp:    { type: 'number', label: 'Employees Trained on Ethics / Anti-Bribery', default: 0 },
  corruptionIncidents: { type: 'number', label: 'Confirmed Corruption Incidents',            default: 0 },
  whistleblowerCases:  { type: 'number', label: 'Whistleblower Cases Reported',              default: 0 },
  grievancesRaised:    { type: 'number', label: 'Grievances Raised',                         default: 0 },
  grievancesResolved:  { type: 'number', label: 'Grievances Resolved',                       default: 0 },

  // Compliance
  auditCount:          { type: 'number', label: 'Internal + External ESG Audits Conducted',  default: 0 },
  complianceRate:      { type: 'number', label: 'Regulatory Compliance Rate (%)',            unit: '%', default: 0 },
  legalNotices:        { type: 'number', label: 'Legal Notices / Fines Received',           default: 0 },
  penaltyAmount:       { type: 'number', label: 'Total Penalties Paid (₹)',                 default: 0 },

  // Risk
  riskFramework:       { type: 'select', label: 'Enterprise Risk Management Framework',
    options: ['None','COSO ERM','ISO 31000','Other'], default: 'None' },
  climateRiskAssessed: { type: 'select', label: 'Climate Risk Assessed (TCFD)',
    options: ['Yes','No','In Progress'], default: 'No' },

  notes:               { type: 'textarea', label: 'Governance Highlights',      default: '' },

  _computed: {
    boardDiversityPct:  0,
    grievanceResolutionPct: 0,
    governanceScore:    0,   // composite 0-100
  },

  _evidenceKeys: ['auditReports', 'policyDocuments', 'complianceCertificates', 'boardMinutes'],
};

/**
 * SECTION 10 — Community & CSR
 */
const MODEL_ESG_S10 = {
  _section: 'esg_s10_csr',
  _version: 1,
  _updatedAt: null,

  csrProjectCount:     { type: 'number', label: 'No. of CSR Projects',                           default: 0 },
  beneficiaries:       { type: 'number', label: 'Total Beneficiaries (Cumulative)',              default: 0 },
  csrInvestment:       { type: 'number', label: 'CSR Investment — Current Year (₹ Lakhs)',       unit: '₹L', default: 0 },
  csrInvestmentPrev:   { type: 'number', label: 'CSR Investment — Previous Year (₹ Lakhs)',     unit: '₹L', default: 0 },
  mandatoryCsr:        { type: 'number', label: 'Mandatory CSR Obligation (₹ Lakhs)',            unit: '₹L', default: 0 },
  volunteeringHours:   { type: 'number', label: 'Employee Volunteering Hours',                  unit: 'hrs', default: 0 },
  volunteeringEmp:     { type: 'number', label: 'Employees Participated in Volunteering',       default: 0 },

  // Focus areas
  focusAreas:          { type: 'multiselect', label: 'CSR Focus Areas', default: [],
    options: ['Education','Healthcare','Livelihood','Water & Sanitation','Environment','Women Empowerment',
              'Sports & Culture','Disaster Relief','Skill Development','Nutrition'] },

  projectDescriptions: { type: 'textarea', label: 'Key CSR Project Descriptions',              default: '' },
  communityPartnerships:{ type: 'textarea', label: 'Community / NGO Partnerships',             default: '' },
  sdgAlignment:        { type: 'textarea', label: 'SDG Alignment of CSR Activities',           default: '' },

  _computed: {
    csrSpendPct:        0,   // csrInvestment / mandatoryCsr * 100
    perBeneficiaryCost: 0,
  },

  _evidenceKeys: ['csrImages', 'eventReports', 'certificates', 'beneficiaryRecords'],
};

/* ═══════════════════════════════════════════════════════════
   DAILY / PERIODIC ENTRY SCHEMA  (append-only)
   ═══════════════════════════════════════════════════════════ */

/**
 * EsgEntry — one row in the append-only ESG_ENTRIES log
 */
const MODEL_ESG_ENTRY = {
  id:          '',           // unique: Date.now().toString(36) + random
  entryType:   'daily',      // 'daily' | 'weekly' | 'monthly' | 'quarterly'
  section:     '',           // 'energy' | 'water' | 'ghg' | 'waste' | 'safety' | 'social'
  date:        '',           // ISO date YYYY-MM-DD
  reportingPeriodFrom: '',
  reportingPeriodTo:   '',
  createdAt:   '',           // ISO datetime — never modified
  createdBy:   '',           // user identifier from auth token / profile
  source:      'esg',

  // Payload — varies by section, all numeric, units defined by section model
  data: {
    // Energy
    gridElecKwh:    null,
    solarKwh:       null,
    windKwh:        null,
    dieselL:        null,
    // Water
    totalWaterKL:   null,
    recycledWaterKL:null,
    dischargeKL:    null,
    // GHG
    scope1KgCO2e:   null,
    scope2KgCO2e:   null,
    // Waste
    totalWasteMT:   null,
    recycledWasteMT:null,
    hazardousWasteMT:null,
    // Safety
    incidents:      null,
    nearMisses:     null,
    lti:            null,
    manHours:       null,
    // Air Quality (EIA/ESG monitoring)
    pm25:           null,
    pm10:           null,
    so2:            null,
    nox:            null,
  },

  comments:    '',           // user remarks
  evidenceIds: [],           // references to EVIDENCE store IDs

  // Version history (append new object when entry is amended)
  _history: [],              // [{amendedAt, amendedBy, previousValues}]
};

/* ═══════════════════════════════════════════════════════════
   EVIDENCE ITEM SCHEMA
   ═══════════════════════════════════════════════════════════ */

/**
 * EvidenceItem — stored in ESG_EVIDENCE or EIA_EVIDENCE
 */
const MODEL_EVIDENCE_ITEM = {
  id:           '',           // unique ID
  module:       'esg',        // 'esg' | 'eia'
  section:      '',           // 'energy' | 'water' | 'ghg' etc.
  category:     '',           // 'image' | 'pdf' | 'excel' | 'certificate' | 'report'
  fileName:     '',
  mimeType:     '',
  sizeBytes:    0,
  uploadedAt:   '',           // ISO datetime
  uploadedBy:   '',
  caption:      '',           // auto-generated or user-provided
  dataUrl:      '',           // base64 data URI (stored for images)
  linkedEntryIds: [],         // ESG entry IDs this evidence supports
  tags:         [],           // ['solar','energy','site'] for auto-classification
  quality:      0,            // 0-100 — used to select best image for reports
  isDuplicate:  false,
  isDeleted:    false,
};

/* ═══════════════════════════════════════════════════════════
   ESG SCORING MODEL
   ═══════════════════════════════════════════════════════════ */

/**
 * Scoring weights and thresholds
 */
const ESG_SCORE_CONFIG = {
  weights: {
    environmental: 0.40,   // 40% of overall
    social:        0.35,   // 35%
    governance:    0.25,   // 25%
  },

  environmental: {
    renewableEnergy:  { weight: 0.25, maxScore: 100, benchmark: 25 },  // 25% renew = 100pts
    waterReuse:       { weight: 0.20, maxScore: 100, benchmark: 30 },
    wasteDiversion:   { weight: 0.20, maxScore: 100, benchmark: 80 },
    ghgReduction:     { weight: 0.20, maxScore: 100, benchmark: 10 },  // 10% YoY = 100pts
    biodiversity:     { weight: 0.15, maxScore: 100, benchmark: 1  },  // 1ha per 10 employees
  },

  social: {
    genderDiversity:  { weight: 0.25, maxScore: 100, benchmark: 30 },  // 30% female = 100pts
    trainingHours:    { weight: 0.25, maxScore: 100, benchmark: 40 },  // 40 hrs/emp/yr
    ltifr:            { weight: 0.30, maxScore: 100, benchmark: 0   },  // 0 = 100pts, scales down
    csrSpend:         { weight: 0.20, maxScore: 100, benchmark: 2   },  // 2% profit
  },

  governance: {
    policies:         { weight: 0.30, maxScore: 100, benchmark: 10  },  // 10 policies = 100pts
    auditCoverage:    { weight: 0.25, maxScore: 100, benchmark: 2   },
    complianceRate:   { weight: 0.30, maxScore: 100, benchmark: 100 },
    boardDiversity:   { weight: 0.15, maxScore: 100, benchmark: 30  },
  },

  // Risk score modifiers
  riskPenalties: {
    fatalities:       -20,   // per fatality
    legalNotices:     -5,    // per notice
    corruptionCases:  -10,
    nonCompliance:    -15,
  },

  // Maturity levels
  maturityLevels: [
    { min: 0,  max: 24,  label: 'Initial',      color: '#ef4444' },
    { min: 25, max: 49,  label: 'Developing',   color: '#f97316' },
    { min: 50, max: 69,  label: 'Defined',      color: '#eab308' },
    { min: 70, max: 84,  label: 'Managed',      color: '#22c55e' },
    { min: 85, max: 100, label: 'Optimizing',   color: '#059669' },
  ],
};

/* ═══════════════════════════════════════════════════════════
   EIA SECTION SCHEMAS  (lightweight — full wizard in Phase 8)
   ═══════════════════════════════════════════════════════════ */

const MODEL_EIA_S1 = {
  _section: 'eia_s1_project',
  _version: 1,
  projName:         { type: 'text',     label: 'Project Name',              required: true,  default: '' },
  proponent:        { type: 'text',     label: 'Project Proponent',         required: true,  default: '' },
  projType:         { type: 'text',     label: 'Project Type / Sector',     required: false, default: '' },
  projCat:          { type: 'select',   label: 'Project Category',
    options: ['Category A','Category B1','Category B2'], default: 'Category B1' },
  location:         { type: 'text',     label: 'Project Location',          required: true,  default: '' },
  state:            { type: 'text',     label: 'State',                     required: false, default: '' },
  district:         { type: 'text',     label: 'District',                  required: false, default: '' },
  latitude:         { type: 'text',     label: 'Latitude',                  required: false, default: '' },
  longitude:        { type: 'text',     label: 'Longitude',                 required: false, default: '' },
  areaHa:           { type: 'number',   label: 'Project Area (Ha)',         required: false, default: 0  },
  studyRadiusKm:    { type: 'number',   label: 'Study Area Radius (km)',    required: false, default: 10 },
  investmentCr:     { type: 'number',   label: 'Capital Investment (₹ Cr)',required: false, default: 0  },
  capacityDesc:     { type: 'text',     label: 'Installed Capacity',        required: false, default: '' },
  constPeriod:      { type: 'text',     label: 'Construction Period',       required: false, default: '' },
  opLifeYears:      { type: 'number',   label: 'Operation Life (Years)',    required: false, default: 0  },
  empDirect:        { type: 'number',   label: 'Direct Employment',         required: false, default: 0  },
  empIndirect:      { type: 'number',   label: 'Indirect Employment',       required: false, default: 0  },
  projDesc:         { type: 'textarea', label: 'Project Description',       required: false, default: '' },
  consultant:       { type: 'text',     label: 'EIA Consultant',            required: false, default: '' },
  accredNo:         { type: 'text',     label: 'MoEFCC Accreditation No.',  required: false, default: '' },
  reportYear:       { type: 'text',     label: 'Report Year',               required: false, default: '' },
  studyFrom:        { type: 'text',     label: 'Study Period From',         required: false, default: '' },
  studyTo:          { type: 'text',     label: 'Study Period To',           required: false, default: '' },
  _evidenceKeys:    ['logo','coverPhoto','sitePhoto','layoutPlan','drawingsMap'],
};

const MODEL_EIA_S2 = {
  _section: 'eia_s2_baseline',
  _version: 1,
  // Air Quality (µg/m³)
  naaqArea:         { type: 'select',  label: 'NAAQ Classification',
    options: ['Industrial Area','Residential Area','Rural Area','Ecologically Sensitive Area'], default: 'Industrial Area' },
  airStations:      { type: 'number', label: 'No. of Air Monitoring Stations', default: 0 },
  pm25Avg:          { type: 'number', label: 'PM2.5 Average (µg/m³)',      unit: 'µg/m³', default: 0 },
  pm25Max:          { type: 'number', label: 'PM2.5 Maximum',              unit: 'µg/m³', default: 0 },
  pm10Avg:          { type: 'number', label: 'PM10 Average (µg/m³)',       unit: 'µg/m³', default: 0 },
  pm10Max:          { type: 'number', label: 'PM10 Maximum',               unit: 'µg/m³', default: 0 },
  so2Avg:           { type: 'number', label: 'SO₂ Average (µg/m³)',        unit: 'µg/m³', default: 0 },
  so2Max:           { type: 'number', label: 'SO₂ Maximum',                unit: 'µg/m³', default: 0 },
  noxAvg:           { type: 'number', label: 'NOx Average (µg/m³)',        unit: 'µg/m³', default: 0 },
  noxMax:           { type: 'number', label: 'NOx Maximum',                unit: 'µg/m³', default: 0 },
  coAvg:            { type: 'number', label: 'CO Average (µg/m³)',         unit: 'µg/m³', default: 0 },
  windDir:          { type: 'text',   label: 'Predominant Wind Direction', default: '' },
  windSpeedMs:      { type: 'number', label: 'Wind Speed (m/s)',           default: 0 },
  // Water Quality
  swPH:             { type: 'number', label: 'Surface Water pH',           default: 0 },
  swBOD:            { type: 'number', label: 'Surface Water BOD (mg/L)',   default: 0 },
  swCOD:            { type: 'number', label: 'Surface Water COD (mg/L)',   default: 0 },
  swDO:             { type: 'number', label: 'Surface Water DO (mg/L)',    default: 0 },
  gwPH:             { type: 'number', label: 'Groundwater pH',             default: 0 },
  gwTDS:            { type: 'number', label: 'Groundwater TDS (mg/L)',     default: 0 },
  gwHardness:       { type: 'number', label: 'Groundwater Hardness (mg/L)',default: 0 },
  waterDemandKLD:   { type: 'number', label: 'Daily Water Demand (KLD)',   default: 0 },
  wwGeneratedKLD:   { type: 'number', label: 'Wastewater Generated (KLD)', default: 0 },
  wtType:           { type: 'select', label: 'Treatment System',
    options: ['ETP + STP','ZLD','ETP Only','STP Only','RO + ZLD'], default: 'ETP + STP' },
  // Noise
  noiseDayBase:     { type: 'number', label: 'Baseline Noise — Day dB(A)', default: 0 },
  noiseNightBase:   { type: 'number', label: 'Baseline Noise — Night dB(A)',default: 0 },
  noiseZone:        { type: 'select', label: 'CPCB Noise Zone',
    options: ['Industrial','Commercial','Residential','Silence Zone'], default: 'Industrial' },
  // Soil & Ecology
  landUse:          { type: 'select', label: 'Land Use Type',
    options: ['Industrial','Mixed Industrial+Agricultural','Agricultural','Forest Fringe','Coastal'], default: 'Industrial' },
  floraCount:       { type: 'number', label: 'Flora Species Count',       default: 0 },
  faunaCount:       { type: 'number', label: 'Fauna Species Count',       default: 0 },
  forestLand:       { type: 'select', label: 'Forest Land Involvement',
    options: ['No','Yes — FC Act Applicable','Under Verification'], default: 'No' },
  protectedArea:    { type: 'select', label: 'Protected Area within 10km',
    options: ['None','Wildlife Sanctuary','National Park','Biosphere Reserve','Ramsar Site'], default: 'None' },
  _evidenceKeys:    ['airMonitoringPhoto','waterBodyPhoto','ecologyPhoto','monitoringReports'],
};

const MODEL_EIA_S3 = {
  _section: 'eia_s3_impact',
  _version: 1,
  // Impact significance per component × phase
  impAirConst:      { type: 'select', label: 'Air — Construction Phase',    options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impAirOp:         { type: 'select', label: 'Air — Operation Phase',       options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impAirNature:     { type: 'select', label: 'Air — Nature',                options: ['Adverse','Beneficial','Reversible','Irreversible'], default: 'Adverse' },
  impWaterConst:    { type: 'select', label: 'Water — Construction Phase',  options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impWaterOp:       { type: 'select', label: 'Water — Operation Phase',     options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impWaterNature:   { type: 'select', label: 'Water — Nature',              options: ['Adverse','Beneficial','Reversible','Irreversible'], default: 'Adverse' },
  impNoiseConst:    { type: 'select', label: 'Noise — Construction Phase',  options: ['Negligible','Low','Moderate','High'], default: 'Moderate' },
  impNoiseOp:       { type: 'select', label: 'Noise — Operation Phase',     options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impNoiseNature:   { type: 'select', label: 'Noise — Nature',              options: ['Adverse','Beneficial','Reversible','Irreversible'], default: 'Reversible' },
  impLandConst:     { type: 'select', label: 'Land/Soil — Construction',    options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impLandOp:        { type: 'select', label: 'Land/Soil — Operation',       options: ['Negligible','Low','Moderate','High'], default: 'Negligible' },
  impLandNature:    { type: 'select', label: 'Land/Soil — Nature',          options: ['Adverse','Beneficial','Reversible','Irreversible'], default: 'Reversible' },
  impEcolConst:     { type: 'select', label: 'Ecology — Construction',      options: ['Negligible','Low','Moderate','High'], default: 'Low' },
  impEcolOp:        { type: 'select', label: 'Ecology — Operation',         options: ['Negligible','Low','Moderate','High'], default: 'Negligible' },
  impEcolNature:    { type: 'select', label: 'Ecology — Nature',            options: ['Adverse','Beneficial','Reversible','Irreversible'], default: 'Reversible' },
  impSocioConst:    { type: 'select', label: 'Socio-Economic — Construction', options: ['Negligible','Beneficial','Low Adverse','Moderate Adverse'], default: 'Beneficial' },
  impSocioOp:       { type: 'select', label: 'Socio-Economic — Operation',  options: ['Negligible','Beneficial','Low Adverse','Moderate Adverse'], default: 'Beneficial' },
  impSocioNature:   { type: 'select', label: 'Socio-Economic — Nature',     options: ['Adverse','Beneficial','Reversible','Irreversible'], default: 'Beneficial' },
  posImpacts:       { type: 'textarea', label: 'Positive Impacts',          default: '' },
  negImpacts:       { type: 'textarea', label: 'Negative Impacts',          default: '' },
  cumulImpact:      { type: 'textarea', label: 'Cumulative Impact Assessment', default: '' },
  _evidenceKeys:    ['impactStudyDocs'],
};

const MODEL_EIA_S4 = {
  _section: 'eia_s4_mitigation',
  _version: 1,
  empBudgetLakhs:   { type: 'number',   label: 'EMP Budget (₹ Lakhs)',        default: 0 },
  greenBeltHa:      { type: 'number',   label: 'Green Belt Area (Ha)',         default: 0 },
  apcMeasures:      { type: 'textarea', label: 'Air Pollution Control Measures', default: '' },
  waterMeasures:    { type: 'textarea', label: 'Water Management Measures',    default: '' },
  noiseMeasures:    { type: 'textarea', label: 'Noise Control Measures',       default: '' },
  wasteMeasures:    { type: 'textarea', label: 'Waste Management Measures',    default: '' },
  wasteNH_MTday:    { type: 'number',   label: 'Non-Hazardous Waste (MT/day)', default: 0 },
  wasteHaz_MTyr:    { type: 'number',   label: 'Hazardous Waste (MT/year)',    default: 0 },
  ghgTCO2eYr:       { type: 'number',   label: 'GHG Emissions (tCO₂e/year)',   default: 0 },
  renewPlan:        { type: 'textarea', label: 'Renewable Energy Plan',        default: '' },
  csrPlan:          { type: 'textarea', label: 'CSR / Community Plan',         default: '' },
  monStations:      { type: 'number',   label: 'Monitoring Stations',          default: 0 },
  monFrequency:     { type: 'select',   label: 'Monitoring Frequency',
    options: ['Monthly','Bi-Monthly','Quarterly','Seasonal'], default: 'Monthly' },
  _evidenceKeys:    ['empPhoto','empDocument'],
};

const MODEL_EIA_S5 = {
  _section: 'eia_s5_monitoring_plan',
  _version: 1,
  // Monitoring programme configuration — actual monitoring data goes into EIA_ENTRIES
  monitoringParams: { type: 'textarea', label: 'Parameters to Monitor',        default: '' },
  monitoringSchedule:{ type: 'textarea',label: 'Monitoring Schedule',          default: '' },
  responsibleParty: { type: 'text',    label: 'Responsible Person / Team',    default: '' },
  reportingFormat:  { type: 'text',    label: 'Reporting Format / Template',  default: '' },
  dataRetentionYrs: { type: 'number',  label: 'Data Retention Period (Years)', default: 10 },
  _evidenceKeys:    [],
};

/* ═══════════════════════════════════════════════════════════
   EIA MONITORING ENTRY  (append-only — same as ESG_ENTRY)
   ═══════════════════════════════════════════════════════════ */
const MODEL_EIA_ENTRY = {
  id:          '',
  entryType:   'daily',    // 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  date:        '',
  createdAt:   '',
  createdBy:   '',
  source:      'eia',
  data: {
    pm25:         null,
    pm10:         null,
    so2:          null,
    nox:          null,
    co:           null,
    noiseDay:     null,
    noiseNight:   null,
    ph:           null,
    bod:          null,
    cod:          null,
    do_mg:        null,
    tds:          null,
    tempC:        null,
    humidity:     null,
    windSpeedMs:  null,
    windDir:      null,
    rainfall:     null,
  },
  comments:    '',
  evidenceIds: [],
  _history:    [],
};

/* ═══════════════════════════════════════════════════════════
   REPORT CONFIGURATION SCHEMA
   ═══════════════════════════════════════════════════════════ */
const MODEL_REPORT_CONFIG = {
  _key: 'eco_esg_report_cfg',
  reportType:      'esg',      // 'esg' | 'eia' | 'combined'
  periodFrom:      '',
  periodTo:        '',
  includeChapters: [
    'cover','toc','executive_summary','leadership_message','about_org',
    'sustainability_strategy','material_topics','esg_governance',
    'energy','water','ghg','waste','biodiversity',
    'social','safety','csr','eia_findings',
    'risk_assessment','scorecard','dashboard','targets',
    'recommendations','annexures','evidence_gallery'
  ],
  coverStyle:      'professional',    // 'professional' | 'minimal'
  colorTheme:      'green',           // 'green' | 'blue' | 'purple'
  includeCharts:   true,
  includeGallery:  true,
  includeGRIIndex: true,
  watermark:       false,
  confidential:    false,
  pageNumbering:   true,
  lastGeneratedAt: null,
  lastFilename:    '',
};

/* ═══════════════════════════════════════════════════════════
   DATA ACCESS LAYER  (LocalStorage helpers)
   ═══════════════════════════════════════════════════════════ */

const ESGSchema = {

  /** Initialize — run once on page load */
  init() {
    const stored = localStorage.getItem(KEYS.SCHEMA_VERSION);
    if (stored !== ESG_SCHEMA_VERSION) {
      this._migrate(stored);
      localStorage.setItem(KEYS.SCHEMA_VERSION, ESG_SCHEMA_VERSION);
    }
  },

  /** Migration from legacy flat objects */
  _migrate(fromVersion) {
    // Lift eco_company_brand → eco_company_v3
    const legacyBrand = this._readRaw(KEYS.LEGACY_BRAND);
    if (legacyBrand && !this._readRaw(KEYS.COMPANY)) {
      const newCompany = {
        orgName: legacyBrand.compName || '',
        industry: legacyBrand.industry || '',
        address: legacyBrand.address || '',
        cin: legacyBrand.cin || '',
        gst: legacyBrand.gst || '',
        website: legacyBrand.website || '',
        signatory: legacyBrand.signatory || '',
        designation: legacyBrand.designation || '',
        logo: legacyBrand.logoB64 || '',
        cover: legacyBrand.coverB64 || '',
        _migratedFrom: 'eco_company_brand',
        _migratedAt: new Date().toISOString(),
      };
      this._writeRaw(KEYS.COMPANY, newCompany);
    }

    // Lift eco_esg_full fields into new per-section stores
    const legacyESG = this._readRaw(KEYS.LEGACY_ESG_FULL);
    if (legacyESG && Object.keys(legacyESG).length > 0) {
      // Map legacy esgd_* fields to new sections
      const s1 = this.getSection('esg', 1) || {};
      if (!s1.orgName && legacyESG.esgd_reportYear) {
        this.saveSection('esg', 1, {
          reportingYear: legacyESG.esgd_reportYear || '',
          periodFrom:    legacyESG.esgd_periodFrom  || '',
          periodTo:      legacyESG.esgd_periodTo    || '',
          assuranceProvider: legacyESG.esgd_assuranceProvider || '',
          assuranceLevel:    legacyESG.esgd_assuranceLevel    || '',
          sustainabilityTheme: legacyESG.esgd_theme || '',
          ceoName:  legacyESG.esgd_ceoName  || '',
          ceoTitle: legacyESG.esgd_ceoTitle || '',
          ceoMessage: legacyESG.esgd_ceoMessage || '',
          vision:   legacyESG.esgd_vision  || '',
          mission:  legacyESG.esgd_mission || '',
          revenueCurr: legacyESG.esgd_revCurr || 0,
          revenuePrev: legacyESG.esgd_revPrev || 0,
          countries:   legacyESG.esgd_countries || 0,
          facilities:  legacyESG.esgd_facilities || 0,
          _migratedFrom: 'eco_esg_full',
        });
      }
      // Section 4 — GHG
      if (legacyESG.esgd_scope1Curr) {
        const s4 = this.getSection('esg', 4) || {};
        if (!s4.s1_tCO2e_manual_curr) {
          this.saveSection('esg', 4, {
            _legacy_scope1Curr: parseFloat(legacyESG.esgd_scope1Curr) || 0,
            _legacy_scope1Prev: parseFloat(legacyESG.esgd_scope1Prev) || 0,
            _legacy_scope2Curr: parseFloat(legacyESG.esgd_scope2Curr) || 0,
            _legacy_scope2Prev: parseFloat(legacyESG.esgd_scope2Prev) || 0,
            _legacy_scope3Curr: parseFloat(legacyESG.esgd_scope3Curr) || 0,
            _migratedFrom: 'eco_esg_full',
          });
        }
      }
    }
  },

  /* ── SECTION CRUD ── */

  /** Read a section's saved data */
  getSection(module, sectionNum) {
    const key = this._sectionKey(module, sectionNum);
    return this._readRaw(key);
  },

  /** Write (merge) data into a section */
  saveSection(module, sectionNum, payload) {
    const key = this._sectionKey(module, sectionNum);
    const current = this._readRaw(key) || {};
    const updated = Object.assign({}, current, payload, { _updatedAt: new Date().toISOString() });
    this._writeRaw(key, updated);
    return updated;
  },

  /** Get all section data for a module (returns map: sectionNum → data) */
  getAllSections(module) {
    const count = module === 'esg' ? 10 : 5;
    const result = {};
    for (let i = 1; i <= count; i++) {
      result[i] = this.getSection(module, i) || {};
    }
    return result;
  },

  /* ── ENTRY CRUD (append-only) ── */

  /** Append a new monitoring entry (never overwrites) */
  addEntry(module, entryData) {
    const key = module === 'eia' ? KEYS.EIA_ENTRIES : KEYS.ESG_ENTRIES;
    const db = this._readRaw(key) || { entries: [], _lastUpdated: null };
    const entry = Object.assign({}, MODEL_ESG_ENTRY, entryData, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      source: module,
      _history: [],
    });
    db.entries.push(entry);
    db._lastUpdated = new Date().toISOString();
    this._writeRaw(key, db);
    return entry;
  },

  /** Amend an existing entry (appends amendment to _history, never deletes original) */
  amendEntry(module, entryId, changes, amendedBy) {
    const key = module === 'eia' ? KEYS.EIA_ENTRIES : KEYS.ESG_ENTRIES;
    const db = this._readRaw(key) || { entries: [] };
    const idx = db.entries.findIndex(e => e.id === entryId);
    if (idx < 0) return null;
    const entry = db.entries[idx];
    const histRecord = {
      amendedAt: new Date().toISOString(),
      amendedBy: amendedBy || 'user',
      previousValues: Object.assign({}, entry.data),
    };
    entry._history = entry._history || [];
    entry._history.push(histRecord);
    entry.data = Object.assign({}, entry.data, changes);
    db.entries[idx] = entry;
    this._writeRaw(key, db);
    return entry;
  },

  /** Query entries with date range and optional section filter */
  queryEntries(module, options) {
    const key = module === 'eia' ? KEYS.EIA_ENTRIES : KEYS.ESG_ENTRIES;
    const db = this._readRaw(key) || { entries: [] };
    let rows = db.entries;

    // Legacy lift: also include eco_report_v2 entries for backward compat
    const legacy = this._readRaw(KEYS.LEGACY_REPORT) || { entries: [] };
    const legacyRows = (legacy.entries || []).filter(e => e.source === module);
    rows = rows.concat(legacyRows);

    if (options && options.from) rows = rows.filter(e => e.date >= options.from);
    if (options && options.to)   rows = rows.filter(e => e.date <= options.to);
    if (options && options.section) rows = rows.filter(e => e.section === options.section);
    if (options && options.entryType) rows = rows.filter(e => e.entryType === options.entryType);

    rows.sort((a, b) => (a.date > b.date ? 1 : -1));
    return rows;
  },

  /* ── EVIDENCE CRUD ── */

  /** Save an evidence item */
  addEvidence(module, evidenceItem) {
    const key = module === 'eia' ? KEYS.EIA_EVIDENCE : KEYS.ESG_EVIDENCE;
    const db = this._readRaw(key) || { items: [] };
    const item = Object.assign({}, MODEL_EVIDENCE_ITEM, evidenceItem, {
      id: 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      module,
      uploadedAt: new Date().toISOString(),
    });
    // Auto-classify
    item.tags = this._autoTag(item);
    item.quality = this._scoreImageQuality(item);
    db.items.push(item);
    this._writeRaw(key, db);
    return item;
  },

  /** Get evidence for a section */
  getEvidence(module, section) {
    const key = module === 'eia' ? KEYS.EIA_EVIDENCE : KEYS.ESG_EVIDENCE;
    const db = this._readRaw(key) || { items: [] };
    if (!section) return db.items.filter(i => !i.isDeleted);
    return db.items.filter(i => i.section === section && !i.isDeleted);
  },

  /** Soft-delete an evidence item */
  deleteEvidence(module, evidenceId) {
    const key = module === 'eia' ? KEYS.EIA_EVIDENCE : KEYS.ESG_EVIDENCE;
    const db = this._readRaw(key) || { items: [] };
    const idx = db.items.findIndex(i => i.id === evidenceId);
    if (idx >= 0) { db.items[idx].isDeleted = true; }
    this._writeRaw(key, db);
  },

  /** Get best-quality image for a section (for report cover / section header) */
  getBestImage(module, section) {
    const items = this.getEvidence(module, section)
      .filter(i => i.category === 'image' && i.dataUrl);
    if (!items.length) return null;
    return items.sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
  },

  /* ── ANALYTICS CACHE ── */

  saveAnalytics(data) {
    const payload = Object.assign({}, data, { _computedAt: new Date().toISOString() });
    this._writeRaw(KEYS.ESG_ANALYTICS, payload);
  },

  getAnalytics() {
    return this._readRaw(KEYS.ESG_ANALYTICS);
  },

  /* ── REPORT CONFIG ── */

  getReportConfig() {
    return this._readRaw(KEYS.ESG_REPORT_CFG) || Object.assign({}, MODEL_REPORT_CONFIG);
  },

  saveReportConfig(cfg) {
    this._writeRaw(KEYS.ESG_REPORT_CFG, cfg);
  },

  /* ── COMPANY PROFILE (shared) ── */

  getCompany() {
    return this._readRaw(KEYS.COMPANY) || this._readRaw(KEYS.LEGACY_BRAND) || {};
  },

  saveCompany(data) {
    const current = this.getCompany();
    this._writeRaw(KEYS.COMPANY, Object.assign({}, current, data, { _updatedAt: new Date().toISOString() }));
  },

  /* ── INTERNAL HELPERS ── */

  _sectionKey(module, num) {
    const map = {
      esg: {
        1: KEYS.ESG_S1_PROFILE, 2: KEYS.ESG_S2_ENERGY,  3: KEYS.ESG_S3_WATER,
        4: KEYS.ESG_S4_GHG,     5: KEYS.ESG_S5_WASTE,   6: KEYS.ESG_S6_BIO,
        7: KEYS.ESG_S7_SOCIAL,  8: KEYS.ESG_S8_SAFETY,  9: KEYS.ESG_S9_GOV,
        10: KEYS.ESG_S10_CSR,
      },
      eia: {
        1: KEYS.EIA_S1_PROJECT, 2: KEYS.EIA_S2_BASELINE,  3: KEYS.EIA_S3_IMPACT,
        4: KEYS.EIA_S4_MITIGATION, 5: KEYS.EIA_S5_MONITORING,
      },
    };
    return (map[module] || {})[num] || `eco_${module}_s${num}`;
  },

  _readRaw(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch(e) { return null; }
  },

  _writeRaw(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch(e) { console.error('ESGSchema write failed:', key, e); }
  },

  _autoTag(evidenceItem) {
    const name = (evidenceItem.fileName || '').toLowerCase();
    const caption = (evidenceItem.caption || '').toLowerCase();
    const text = name + ' ' + caption;
    const tagMap = {
      solar: ['solar','pv panel','renewable'],
      energy: ['electricity','meter','kwh','energy','power'],
      water: ['water','effluent','etp','stp','pond','river'],
      waste: ['waste','disposal','landfill','recycl'],
      safety: ['safety','ppe','helmet','incident','first aid'],
      training: ['training','session','workshop','classroom'],
      csr: ['csr','community','plantation','donate','social'],
      biodiversity: ['tree','plant','green belt','flora','fauna','garden'],
      air: ['air','emission','stack','chimney','aaqms'],
      governance: ['audit','policy','board','certificate','compliance'],
    };
    const tags = [];
    for (const [tag, keywords] of Object.entries(tagMap)) {
      if (keywords.some(k => text.includes(k))) tags.push(tag);
    }
    // Section-based tag
    if (evidenceItem.section) tags.push(evidenceItem.section);
    return tags;
  },

  _scoreImageQuality(evidenceItem) {
    let score = 50;  // base
    if (evidenceItem.category === 'image') score += 20;
    if (evidenceItem.sizeBytes > 100000) score += 15;  // larger = better quality
    if (evidenceItem.sizeBytes > 500000) score += 10;
    if (evidenceItem.caption && evidenceItem.caption.length > 5) score += 5;
    return Math.min(100, score);
  },

};

/* ═══════════════════════════════════════════════════════════
   EXPORTS  (used by other modules via script tag or module)
   ═══════════════════════════════════════════════════════════ */

// Make available globally for non-module scripts
window.ESGSchema        = ESGSchema;
window.ESG_KEYS         = KEYS;
window.EMISSION_FACTORS = EMISSION_FACTORS;
window.ESG_SCORE_CONFIG = ESG_SCORE_CONFIG;
window.ESG_MODELS = {
  s1: MODEL_ESG_S1, s2: MODEL_ESG_S2, s3: MODEL_ESG_S3,
  s4: MODEL_ESG_S4, s5: MODEL_ESG_S5, s6: MODEL_ESG_S6,
  s7: MODEL_ESG_S7, s8: MODEL_ESG_S8, s9: MODEL_ESG_S9,
  s10: MODEL_ESG_S10,
  entry: MODEL_ESG_ENTRY,
  evidence: MODEL_EVIDENCE_ITEM,
  reportConfig: MODEL_REPORT_CONFIG,
};
window.EIA_MODELS = {
  s1: MODEL_EIA_S1, s2: MODEL_EIA_S2, s3: MODEL_EIA_S3,
  s4: MODEL_EIA_S4, s5: MODEL_EIA_S5,
  entry: MODEL_EIA_ENTRY,
};
