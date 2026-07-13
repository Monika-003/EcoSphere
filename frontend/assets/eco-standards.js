/* EcoSphere — Country Environmental Standards Database
   Referenced by org-portal.html, lab-portal.html
   All air limits in µg/m³ unless noted; water in mg/L; noise in dB(A)
*/
var ECO_COUNTRY_DB = {
  'India': {
    flag: '🇮🇳', code: 'IN',
    regulator: 'CPCB',
    fullRegulator: 'Central Pollution Control Board (CPCB) / MoEFCC',
    standard: 'NAAQS 2009 / Environmental Protection Act 1986',
    climate: 'Tropical / Semi-arid',
    climateNote: 'Hot summers, monsoon rainfall; dust and photochemical smog prevalent in dry season. High humidity in coastal zones.',
    air: { pm25_24h:60,  pm25_annual:40,  pm10_24h:100, pm10_annual:60,  so2_24h:80,  so2_annual:50, no2_24h:80, no2_annual:40, o3_8h:100,  co_8h:2.0 },
    water: { ph_min:6.5, ph_max:8.5, bod_inland:30,  cod:250, tss:100, tds:2100, do_min:4.0, temp_max:40 },
    noise: { ind_day:75, ind_night:70, res_day:55, res_night:45, com_day:65, com_night:55 }
  },
  'USA': {
    flag: '🇺🇸', code: 'US',
    regulator: 'US EPA',
    fullRegulator: 'U.S. Environmental Protection Agency (EPA)',
    standard: 'NAAQS 2024 / Clean Air Act / Clean Water Act',
    climate: 'Varied (Temperate / Semi-arid / Tropical)',
    climateNote: 'Diverse climates from arctic to tropical; strong westerly winds; tornado belt in midwest; high humidity in SE.',
    air: { pm25_24h:35,  pm25_annual:12,  pm10_24h:150, pm10_annual:50,  so2_24h:75,  so2_annual:30, no2_24h:100,no2_annual:53, o3_8h:70,   co_8h:9.0 },
    water: { ph_min:6.0, ph_max:9.0, bod_inland:10,  cod:125, tss:30,  tds:500,  do_min:5.0, temp_max:32 },
    noise: { ind_day:70, ind_night:60, res_day:55, res_night:45, com_day:60, com_night:50 }
  },
  'UK': {
    flag: '🇬🇧', code: 'GB',
    regulator: 'Environment Agency',
    fullRegulator: 'Environment Agency (EA) / UKHSA',
    standard: 'UK NAQS 2023 / Environmental Permitting Regulations',
    climate: 'Temperate / Maritime',
    climateNote: 'Mild, wet winters; cool summers; frequent cloud cover; Atlantic influence dominates. Low UV index.',
    air: { pm25_24h:25,  pm25_annual:10,  pm10_24h:50,  pm10_annual:20,  so2_24h:125, so2_annual:20, no2_24h:200,no2_annual:40, o3_8h:120,  co_8h:10.0 },
    water: { ph_min:6.0, ph_max:9.0, bod_inland:5,   cod:125, tss:35,  tds:600,  do_min:5.0, temp_max:28 },
    noise: { ind_day:70, ind_night:55, res_day:45, res_night:35, com_day:60, com_night:45 }
  },
  'European Union': {
    flag: '🇪🇺', code: 'EU',
    regulator: 'EEA / IED',
    fullRegulator: 'European Environment Agency (EEA) / Industrial Emissions Directive',
    standard: 'EU AQ Directive 2024/2881 / IED 2010/75/EU',
    climate: 'Varied (Mediterranean / Temperate / Continental)',
    climateNote: 'South: hot dry summers; North: cold humid winters; Central: continental temperature extremes; Alpine zones.',
    air: { pm25_24h:25,  pm25_annual:10,  pm10_24h:45,  pm10_annual:20,  so2_24h:125, so2_annual:20, no2_24h:200,no2_annual:40, o3_8h:120,  co_8h:10.0 },
    water: { ph_min:6.0, ph_max:9.0, bod_inland:5,   cod:125, tss:35,  tds:600,  do_min:6.0, temp_max:28 },
    noise: { ind_day:65, ind_night:50, res_day:45, res_night:35, com_day:55, com_night:45 }
  },
  'Australia': {
    flag: '🇦🇺', code: 'AU',
    regulator: 'NEPC / State EPAs',
    fullRegulator: 'National Environment Protection Council (NEPC) / State EPAs',
    standard: 'NEPM Ambient Air Quality 2021 / NWQMS',
    climate: 'Arid / Tropical / Temperate',
    climateNote: 'Large arid interior; tropical north; temperate SE coasts; bushfire season raises PM significantly.',
    air: { pm25_24h:25,  pm25_annual:8,   pm10_24h:50,  pm10_annual:25,  so2_24h:210, so2_annual:57, no2_24h:246,no2_annual:62, o3_8h:140,  co_8h:9.0 },
    water: { ph_min:6.5, ph_max:9.0, bod_inland:15,  cod:150, tss:50,  tds:600,  do_min:6.0, temp_max:35 },
    noise: { ind_day:70, ind_night:65, res_day:50, res_night:40, com_day:60, com_night:50 }
  },
  'Canada': {
    flag: '🇨🇦', code: 'CA',
    regulator: 'ECCC / CEPA',
    fullRegulator: 'Environment and Climate Change Canada (ECCC)',
    standard: 'CAAQS 2020 / CEPA 1999 / Metal Mining Effluent Regulations',
    climate: 'Continental / Subarctic',
    climateNote: 'Cold snowy winters; warm humid summers; arctic blast episodes; wildfire smoke in western provinces.',
    air: { pm25_24h:27,  pm25_annual:8.8, pm10_24h:50,  pm10_annual:25,  so2_24h:70,  so2_annual:20, no2_24h:60, no2_annual:17, o3_8h:62,   co_8h:13.0 },
    water: { ph_min:6.5, ph_max:9.0, bod_inland:20,  cod:200, tss:25,  tds:500,  do_min:6.5, temp_max:30 },
    noise: { ind_day:70, ind_night:60, res_day:50, res_night:40, com_day:60, com_night:50 }
  },
  'Singapore': {
    flag: '🇸🇬', code: 'SG',
    regulator: 'NEA',
    fullRegulator: 'National Environment Agency (NEA)',
    standard: 'Singapore NAAQS / Environmental Protection & Management Act',
    climate: 'Equatorial',
    climateNote: 'Hot and humid year-round; no distinct seasons; high rainfall; transboundary haze from regional fires common.',
    air: { pm25_24h:37.5,pm25_annual:15,  pm10_24h:150, pm10_annual:50,  so2_24h:80,  so2_annual:20, no2_24h:200,no2_annual:40, o3_8h:100,  co_8h:9.0 },
    water: { ph_min:6.0, ph_max:9.5, bod_inland:20,  cod:150, tss:50,  tds:1000, do_min:4.0, temp_max:38 },
    noise: { ind_day:70, ind_night:65, res_day:55, res_night:45, com_day:65, com_night:55 }
  },
  'UAE': {
    flag: '🇦🇪', code: 'AE',
    regulator: 'MOEI / EAD',
    fullRegulator: 'Ministry of Energy & Infrastructure / Environment Agency Abu Dhabi',
    standard: 'UAE Cabinet Resolution No. 12/2006 / Federal Law No. 24/1999',
    climate: 'Arid Desert / Hot',
    climateNote: 'Extremely hot dry summers; dusty shamal winds; mild winters; very low annual rainfall; high UV index.',
    air: { pm25_24h:75,  pm25_annual:35,  pm10_24h:150, pm10_annual:70,  so2_24h:125, so2_annual:60, no2_24h:200,no2_annual:40, o3_8h:120,  co_8h:10.0 },
    water: { ph_min:6.5, ph_max:8.5, bod_inland:25,  cod:150, tss:100, tds:3000, do_min:4.0, temp_max:45 },
    noise: { ind_day:75, ind_night:70, res_day:55, res_night:45, com_day:65, com_night:55 }
  },
  'China': {
    flag: '🇨🇳', code: 'CN',
    regulator: 'MEE',
    fullRegulator: 'Ministry of Ecology and Environment (MEE)',
    standard: 'GB3095-2012 Ambient Air Quality / GB3838-2002 Surface Water',
    climate: 'Varied (Subtropical / Temperate / Arid)',
    climateNote: 'SE: subtropical humid; NW: arid desert; N: cold dry winters; severe smog episodes in industrial zones.',
    air: { pm25_24h:75,  pm25_annual:35,  pm10_24h:150, pm10_annual:70,  so2_24h:150, so2_annual:60, no2_24h:80, no2_annual:40, o3_8h:160,  co_8h:4.0 },
    water: { ph_min:6.0, ph_max:9.0, bod_inland:4,   cod:20,  tss:50,  tds:500,  do_min:5.0, temp_max:35 },
    noise: { ind_day:65, ind_night:55, res_day:55, res_night:45, com_day:60, com_night:50 }
  },
  'Brazil': {
    flag: '🇧🇷', code: 'BR',
    regulator: 'IBAMA / CONAMA',
    fullRegulator: 'IBAMA / CONAMA (National Environment Council)',
    standard: 'CONAMA Resolution 491/2018 / CONAMA 430/2011',
    climate: 'Tropical / Subtropical',
    climateNote: 'Amazon: equatorial humid; SE coast: subtropical; NE: semi-arid; burning season raises PM2.5 significantly.',
    air: { pm25_24h:25,  pm25_annual:10,  pm10_24h:50,  pm10_annual:20,  so2_24h:125, so2_annual:40, no2_24h:200,no2_annual:40, o3_8h:130,  co_8h:10.0 },
    water: { ph_min:6.0, ph_max:9.0, bod_inland:10,  cod:150, tss:100, tds:1000, do_min:5.0, temp_max:40 },
    noise: { ind_day:70, ind_night:60, res_day:55, res_night:50, com_day:65, com_night:55 }
  },
  'South Africa': {
    flag: '🇿🇦', code: 'ZA',
    regulator: 'DFFE',
    fullRegulator: 'Dept. of Forestry, Fisheries & Environment (DFFE)',
    standard: 'NAAQS 2012 / National Environmental Management: Air Quality Act',
    climate: 'Semi-arid / Subtropical',
    climateNote: 'Winter rainfall in SW; summer rainfall in east; highveld smog in Highveld Priority Area during winter.',
    air: { pm25_24h:40,  pm25_annual:20,  pm10_24h:75,  pm10_annual:40,  so2_24h:125, so2_annual:50, no2_24h:200,no2_annual:40, o3_8h:120,  co_8h:10.0 },
    water: { ph_min:5.5, ph_max:9.5, bod_inland:25,  cod:200, tss:25,  tds:1000, do_min:4.0, temp_max:37 },
    noise: { ind_day:70, ind_night:60, res_day:55, res_night:45, com_day:60, com_night:50 }
  },
  'Japan': {
    flag: '🇯🇵', code: 'JP',
    regulator: 'MOE Japan',
    fullRegulator: 'Ministry of the Environment (MOE)',
    standard: 'Japan AAQS / Water Pollution Control Law',
    climate: 'Temperate / Subtropical',
    climateNote: 'Humid subtropical south; cold north; typhoon season June–October; high humidity; cherry-blossom spring.',
    air: { pm25_24h:35,  pm25_annual:15,  pm10_24h:100, pm10_annual:50,  so2_24h:105, so2_annual:40, no2_24h:75, no2_annual:30, o3_8h:100,  co_8h:11.5 },
    water: { ph_min:6.0, ph_max:8.5, bod_inland:5,   cod:100, tss:50,  tds:500,  do_min:5.0, temp_max:28 },
    noise: { ind_day:65, ind_night:55, res_day:55, res_night:45, com_day:60, com_night:50 }
  },
  'Germany': {
    flag: '🇩🇪', code: 'DE',
    regulator: 'UBA / BImSchG',
    fullRegulator: 'Umweltbundesamt (UBA) / Federal Immission Control Act',
    standard: '39th BImSchV / EU IED Implementation',
    climate: 'Temperate Continental / Maritime',
    climateNote: 'Mild maritime NW; continental east; cold winters; moderate rainfall year-round; fog in Rhine valley.',
    air: { pm25_24h:25,  pm25_annual:10,  pm10_24h:50,  pm10_annual:20,  so2_24h:125, so2_annual:20, no2_24h:200,no2_annual:40, o3_8h:120,  co_8h:10.0 },
    water: { ph_min:6.0, ph_max:9.0, bod_inland:5,   cod:75,  tss:25,  tds:500,  do_min:7.0, temp_max:25 },
    noise: { ind_day:65, ind_night:50, res_day:45, res_night:35, com_day:55, com_night:45 }
  },
  'Other / WHO': {
    flag: '🌍', code: 'WLD',
    regulator: 'WHO',
    fullRegulator: 'World Health Organization (WHO) Global Air Quality Guidelines',
    standard: 'WHO AQG 2021 / WHO Water Quality Guidelines',
    climate: 'Varies by Region',
    climateNote: 'Apply WHO guidelines as baseline. Contact local environmental authority for site-specific requirements.',
    air: { pm25_24h:15,  pm25_annual:5,   pm10_24h:45,  pm10_annual:15,  so2_24h:40,  so2_annual:40, no2_24h:25, no2_annual:10, o3_8h:100,  co_8h:4.0 },
    water: { ph_min:6.5, ph_max:8.5, bod_inland:10,  cod:150, tss:50,  tds:600,  do_min:5.0, temp_max:35 },
    noise: { ind_day:70, ind_night:60, res_day:55, res_night:45, com_day:65, com_night:55 }
  }
};

/* Lab Accreditation Bodies — country → { name, shortName, url, searchLabel } */
var LAB_ACCREDITATION_DB = {
  'India':          { shortName:'NABL',      name:'National Accreditation Board for Testing & Calibration Laboratories (NABL)', url:'https://www.nabl-india.org/nabl/nabl-lab-search.php', searchLabel:'Search NABL-accredited lab directory' },
  'USA':            { shortName:'A2LA',       name:'American Association for Laboratory Accreditation (A2LA)', url:'https://www.a2la.org/accreditation/search-accredited-organizations/', searchLabel:'Search A2LA-accredited lab directory' },
  'UK':             { shortName:'UKAS',       name:'United Kingdom Accreditation Service (UKAS)', url:'https://www.ukas.com/find-an-organisation/', searchLabel:'Search UKAS-accredited lab directory' },
  'European Union': { shortName:'EA / ILAC',  name:'European co-operation for Accreditation (EA) / ILAC MRA', url:'https://ilac.org/ilac-mra-and-signatories/', searchLabel:'Search EA/ILAC-accredited lab directory' },
  'Australia':      { shortName:'NATA',       name:'National Association of Testing Authorities (NATA)', url:'https://www.nata.com.au/find-accredited-organisation/', searchLabel:'Search NATA-accredited lab directory' },
  'Canada':         { shortName:'SCC / CALA', name:'Standards Council of Canada (SCC) / CALA', url:'https://www.scc.ca/en/accreditation/search', searchLabel:'Search SCC-accredited lab directory' },
  'Singapore':      { shortName:'SAC-SINGLAS',name:'Singapore Accreditation Council — SINGLAS', url:'https://www.sac-accreditation.gov.sg/services/accreditation-services/laboratories', searchLabel:'Search SAC SINGLAS-accredited lab directory' },
  'UAE':            { shortName:'ESMA / DAkkS',name:'Emirates Authority for Standardization & Metrology (ESMA)', url:'https://www.esma.gov.ae/en/page/accreditation', searchLabel:'Search ESMA-accredited lab directory' },
  'China':          { shortName:'CNAS',       name:'China National Accreditation Service for Conformity Assessment (CNAS)', url:'https://www.cnas.org.cn/english/accreditation/laboratory.html', searchLabel:'Search CNAS-accredited lab directory' },
  'Brazil':         { shortName:'INMETRO',    name:'Instituto Nacional de Metrologia, Qualidade e Tecnologia (INMETRO)', url:'https://www.gov.br/inmetro/pt-br/acreditacao/busca-organismos-acreditados', searchLabel:'Search INMETRO-accredited lab directory' },
  'South Africa':   { shortName:'SANAS',      name:'South African National Accreditation System (SANAS)', url:'https://www.sanas.co.za/directory.php', searchLabel:'Search SANAS-accredited lab directory' },
  'Japan':          { shortName:'IAJapan',    name:'International Accreditation Japan (IAJapan)', url:'https://www.ipa.go.jp/en/security/jisec/accreditation/', searchLabel:'Search IAJapan-accredited lab directory' },
  'Germany':        { shortName:'DAkkS',      name:'Deutsche Akkreditierungsstelle (DAkkS)', url:'https://www.dakks.de/en/content/accredited-bodies-dakks', searchLabel:'Search DAkkS-accredited lab directory' },
  'Other / WHO':    { shortName:'ISO/IEC 17025', name:'ISO/IEC 17025 Accredited Laboratory (contact local body)', url:'https://ilac.org/ilac-mra-and-signatories/', searchLabel:'Search ILAC MRA-accredited lab directory' }
};

/* Country-specific GHG, EIA, and ESG regulatory framework data */
var ECO_COUNTRY_REGULATIONS = {
  'India': {
    ghg: { scheme:'Carbon Credit Trading Scheme (CCTS) / PAT Scheme', regulator:'BEE / MoEFCC', grid_factor:'0.82 kgCO₂/kWh', target:'45% intensity reduction by 2030 (vs 2005)', threshold:'PAT: Designated Consumers ≥1000 TOE/yr', link:'https://beepat.in' },
    eia: { act:'EIA Notification 2006 (S.O. 1533)', regulator:'MoEFCC / SEIAA', process:'Screening → Scoping → EIA Study → Public Hearing → EC Grant', timeline:'105–295 days', portal:'Parivesh Portal', link:'https://parivesh.nic.in' },
    esg: { framework:'BRSR (Business Responsibility & Sustainability Reporting)', regulator:'SEBI', scope:'Top 1000 NSE/BSE listed companies by market cap', since:'FY 2022–23 (mandatory)', link:'https://www.sebi.gov.in' }
  },
  'USA': {
    ghg: { scheme:'EPA Mandatory GHG Reporting Rule (40 CFR Part 98)', regulator:'US EPA', grid_factor:'0.386 kgCO₂/kWh (eGRID 2023)', target:'50–52% reduction by 2030 (vs 2005)', threshold:'Facilities emitting ≥25,000 mtCO₂e/yr', link:'https://www.epa.gov/ghgreporting' },
    eia: { act:'National Environmental Policy Act (NEPA 1969)', regulator:'CEQ / Lead Federal Agency', process:'EA (30–180 days) or full EIS for significant federal actions', timeline:'EA: 30–180 days; EIS: 2–5 years', portal:'NEPA Review Portal', link:'https://nepa.gov' },
    esg: { framework:'SEC Climate Disclosure Rules / TCFD-aligned', regulator:'U.S. Securities & Exchange Commission (SEC)', scope:'All public registrants (phased 2025–2027)', since:'Final rule 2024', link:'https://www.sec.gov/climate' }
  },
  'UK': {
    ghg: { scheme:'UK ETS / SECR (Streamlined Energy & Carbon Reporting)', regulator:'Environment Agency / DESNZ', grid_factor:'0.207 kgCO₂/kWh (DESNZ 2023)', target:'Net Zero by 2050 (Climate Change Act 2008)', threshold:'SECR: >250 employees or >£36M turnover', link:'https://www.gov.uk/guidance/streamlined-energy-and-carbon-reporting' },
    eia: { act:'Town & Country Planning (EIA) Regulations 2017', regulator:'Planning Inspectorate / Local Planning Authority', process:'Screening → Scoping → Environmental Statement → Consultation → Decision', timeline:'16 weeks statutory (from complete submission)', portal:'Planning Portal', link:'https://www.gov.uk/guidance/environmental-impact-assessment' },
    esg: { framework:'TCFD (mandatory) / UK Sustainability Disclosure Requirements (UK SDR)', regulator:'FCA / Companies House', scope:'UK-listed companies & large LLPs (>500 employees)', since:'2022 (TCFD mandatory for premium listed)', link:'https://www.fca.org.uk/firms/climate-change-sustainability/tcfd' }
  },
  'European Union': {
    ghg: { scheme:'EU ETS Phase 4 / Carbon Border Adjustment Mechanism (CBAM)', regulator:'European Commission / EEA', grid_factor:'0.233 kgCO₂/kWh (EU-27 avg 2023)', target:'55% reduction by 2030 (vs 1990); Climate Neutral 2050', threshold:'EU ETS: installations ≥20 MW thermal capacity', link:'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en' },
    eia: { act:'EIA Directive 2011/92/EU (amended 2014/52/EU)', regulator:'Competent Authority (Member State)', process:'Screening → Scoping → Environmental Statement → Public Consultation → Decision', timeline:'90 days from complete application', portal:'Member State national portals', link:'https://environment.ec.europa.eu/law-and-governance/environmental-assessments_en' },
    esg: { framework:'CSRD (Corporate Sustainability Reporting Directive) / ESRS', regulator:'EFRAG / National Competent Authorities', scope:'Large companies >250 employees & listed SMEs (phased 2024–2028)', since:'2024 (large companies)', link:'https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en' }
  },
  'Australia': {
    ghg: { scheme:'Safeguard Mechanism / NGER Scheme', regulator:'Clean Energy Regulator (CER)', grid_factor:'0.51 kgCO₂/kWh (NEM avg 2023)', target:'43% reduction by 2030 (vs 2005); Net Zero 2050', threshold:'NGER: ≥25,000 tCO₂-e/yr or ≥100 TJ energy consumed', link:'https://www.cleanenergyregulator.gov.au' },
    eia: { act:'EPBC Act 1999 (Environment Protection & Biodiversity Conservation)', regulator:'DAWE / State & Territory EPAs', process:'Referral → Assessment Method → EIA → Approval (MNES significance test)', timeline:'Assessment 20–30 business days; full process 12–18 months', portal:'EPBC Public Portal', link:'https://epbcportal.awe.gov.au' },
    esg: { framework:'ASRS (Australian Sustainability Reporting Standards) / AASB S1, S2', regulator:'ASIC / AASB', scope:'Large entities >500 employees or >$500M assets (phased)', since:'2025–2027 (phased rollout)', link:'https://www.aasb.gov.au/news/sustainability-reporting/' }
  },
  'Canada': {
    ghg: { scheme:'Output-Based Pricing System (OBPS) / Federal Carbon Pricing', regulator:'Environment & Climate Change Canada (ECCC)', grid_factor:'0.130 kgCO₂/kWh (national avg 2023)', target:'40–45% reduction by 2030 (vs 2005)', threshold:'OBPS: facilities ≥50,000 tCO₂e/yr in covered sectors', link:'https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html' },
    eia: { act:'Impact Assessment Act 2019 (IAA)', regulator:'Impact Assessment Agency of Canada (IAAC)', process:'Planning (180 days) → Impact Assessment Study → Review Panel → Decision', timeline:'Planning: 180 days + IA: 300 days', portal:'IAAC Online Portal', link:'https://iaac-aeic.gc.ca' },
    esg: { framework:'TCFD-aligned / ISSB (IFRS S1/S2) — CSA adoption', regulator:'Canadian Securities Administrators (CSA)', scope:'Reporting issuers (proposed rules 2024–2025)', since:'Proposed 2024; mandatory from 2025+', link:'https://www.securities-administrators.ca' }
  },
  'Singapore': {
    ghg: { scheme:'Carbon Tax (S$25 → S$50/2024 → S$80/2030 per tCO₂e)', regulator:'National Environment Agency (NEA)', grid_factor:'0.408 kgCO₂/kWh (EMA 2023)', target:'Net Zero by 2050; 60% below 2005 peak by 2030', threshold:'Carbon Tax: facilities emitting ≥25,000 tCO₂e/yr', link:'https://www.nea.gov.sg/our-services/climate-change-energy-efficiency/climate-change/carbon-tax' },
    eia: { act:'Environmental Impact Assessment (NEA/URA guideline — non-statutory)', regulator:'NEA / Urban Redevelopment Authority (URA)', process:'Pre-application → EIA Study → Agency Consultation → Development Approval', timeline:'Typically 6–12 months (case-by-case)', portal:'GoBusiness Portal', link:'https://www.nea.gov.sg/our-services/pollution-control/environmental-impact-assessment' },
    esg: { framework:'SGX Sustainability Reporting / ISSB (IFRS S1/S2) mandatory 2025', regulator:'Singapore Exchange (SGX) RegCo', scope:'All SGX-listed issuers; large listed: ISSB-aligned from FY2025', since:'2025 (climate disclosures mandatory)', link:'https://www.sgx.com/sustainable-finance/sustainability-reporting' }
  },
  'UAE': {
    ghg: { scheme:'UAE Net Zero 2050 Strategic Initiative / Voluntary Carbon Market', regulator:'MOEI / Environment Agency Abu Dhabi (EAD)', grid_factor:'0.40 kgCO₂/kWh (UAE avg 2023)', target:'Net Zero by 2050; 31% GHG reduction by 2030 (vs BAU)', threshold:'Mandatory for regulated industries (ADNOC, utilities); voluntary for others', link:'https://www.moccae.gov.ae/en/our-services/climate-change.aspx' },
    eia: { act:'Federal Law No. 24/1999 on Environment + Emirate-level regulations', regulator:'MOEI / EAD (Abu Dhabi) / DM (Dubai) / RAKEZ (RAK)', process:'Registration → Screening → Detailed EIA → Authority Approval → Monitoring', timeline:'Typically 3–12 months depending on emirate & project type', portal:'EAD eServices / Trakhees (Dubai)', link:'https://www.ead.gov.ae/en/environment/eia' },
    esg: { framework:'UAE ESG Reporting Guidelines / ADX & DFM Sustainability Disclosure', regulator:'UAE SCA / ADX / DFM', scope:'UAE-listed companies and large government-linked enterprises', since:'2023 (ADX ESG Reporting Guidelines active)', link:'https://www.adx.ae/En/Pages/ESG.aspx' }
  },
  'China': {
    ghg: { scheme:'National Carbon Market (ETS) — power sector operational, expanding to 8 sectors', regulator:'Ministry of Ecology and Environment (MEE)', grid_factor:'0.5703 kgCO₂/kWh (national avg 2022)', target:'Peak emissions before 2030; Carbon Neutral by 2060', threshold:'National ETS: ≥26,000 tCO₂/yr (power sector; other sectors phased in)', link:'https://www.mee.gov.cn/ywgz/ydqhbh/wsqtkz/' },
    eia: { act:'Environmental Impact Assessment Law 2002 (revised 2018)', regulator:'MEE / Provincial & Municipal EIA authorities', process:'Classification → EIA Report Preparation → Agency Review → Approval', timeline:'60–90 days review (varies by project category A/B/C)', portal:'National EIA Approval Information Platform', link:'https://www.mee.gov.cn' },
    esg: { framework:'CSRC ESG Disclosure / SSE & SZSE Sustainability Reporting Guidelines', regulator:'China Securities Regulatory Commission (CSRC)', scope:'All SSE/SZSE listed companies (mandatory from 2026)', since:'2024 guidelines issued; mandatory 2026', link:'http://www.csrc.gov.cn' }
  },
  'Brazil': {
    ghg: { scheme:'SBCE (Brazilian Carbon Market — in development) / GHG Protocol Program Brazil', regulator:'IBAMA / MMA (Ministry of Environment & Climate Change)', grid_factor:'0.075 kgCO₂/kWh (hydropower-dominated grid 2023)', target:'37% absolute reduction by 2025; 50% by 2030 (vs 2005)', threshold:'SBCE (proposed): ≥10,000 tCO₂e/yr; GHG Protocol: voluntary', link:'https://www.gov.br/mma/pt-br/assuntos/mudancas-climaticas' },
    eia: { act:'CONAMA Resolution 001/1986 + National Environmental Policy (PNMA 6938/81)', regulator:'IBAMA / State environmental agencies (SEMAS)', process:'Prior License (LP) → Installation License (LI) → Operation License (LO)', timeline:'Typically 12–36 months for complex projects', portal:'SEI-IBAMA / SINAFLOR', link:'https://www.ibama.gov.br/licenciamento' },
    esg: { framework:'CVM Resolution 59/2021 / B3 ESG Reporting / GRI-aligned', regulator:'CVM (Comissão de Valores Mobiliários) / B3', scope:'B3-listed companies (TCFD-aligned climate disclosures from 2023)', since:'2023 (climate disclosures mandatory for listed)', link:'https://www.gov.br/cvm/pt-br' }
  },
  'South Africa': {
    ghg: { scheme:'Carbon Tax Act 15/2019 (Phase 2: 2023–2025)', regulator:'SARS / DFFE', grid_factor:'0.928 kgCO₂/kWh (coal-heavy grid 2023)', target:'NDC: 350–420 MtCO₂e by 2030 (peak-plateau-decline)', threshold:'Carbon Tax: scheduled activities under GHG Reporting Regs 2017', link:'https://www.dffe.gov.za/projectsprogrammes/atmospheric_quality/ghg' },
    eia: { act:'NEMA 1998 (National Environmental Management Act) — EIA Regs 2014', regulator:'DFFE / Provincial environmental departments', process:'Pre-Application → Notification → Scoping → EIA Report → Review → Decision', timeline:'Basic Assessment: 107 days; Scoping+EIA: 300+ days', portal:'SAHRIS / eDEA', link:'https://www.dffe.gov.za/projectsprogrammes/eia' },
    esg: { framework:'King IV Code on Corporate Governance / JSE ESG Disclosure Requirements', regulator:'JSE (Johannesburg Stock Exchange) / FSCA', scope:'All JSE-listed entities; King IV applies to all organisations', since:'2017 (King IV); JSE ESG Guidance: 2022', link:'https://www.jse.co.za/services/sustainability' }
  },
  'Japan': {
    ghg: { scheme:'J-Credit Scheme / GX-ETS (Green Transformation ETS, launch 2026)', regulator:'Ministry of the Environment (MOE) / METI', grid_factor:'0.441 kgCO₂/kWh (METI 2023)', target:'46% reduction by 2030 (vs 2013); Carbon Neutral 2050', threshold:'Act on Global Warming Countermeasures: ≥3,000 kl crude oil equiv/yr', link:'https://www.env.go.jp/earth/ondanka/ghg/index.html' },
    eia: { act:'Environmental Impact Assessment Act 1997 (revised 2011, 2013)', regulator:'Ministry of Environment / Project lead ministry', process:'Methodological Document → Scoping → EIA Preparation → Review → Certification', timeline:'Typically 3–4 years for large infrastructure projects', portal:'MOE EIA Database', link:'https://www.env.go.jp/en/earth/eia/eia.html' },
    esg: { framework:'ISSB (IFRS S1/S2) / TCFD / SSBJ Standards', regulator:'FSA (Financial Services Agency) / Tokyo Stock Exchange (TSE)', scope:'TSE Prime Market companies (TCFD mandatory since 2023)', since:'2023 (TCFD mandatory for Prime Market)', link:'https://www.fsa.go.jp/en/policy/eft/' }
  },
  'Germany': {
    ghg: { scheme:'EU ETS Phase 4 + National BEHG (Fuel Emissions Trading Act)', regulator:'UBA (Umweltbundesamt) / DEHSt', grid_factor:'0.380 kgCO₂/kWh (2023, steadily declining)', target:'KSG Climate Protection Act: 65% by 2030; Net Zero 2045', threshold:'EU ETS: ≥20 MW thermal; BEHG: all fuel distributors', link:'https://www.dehst.de/EN/home/home-node.html' },
    eia: { act:'UVPG (Umweltverträglichkeitsprüfungsgesetz) 2017', regulator:'BfN (Bundesamt für Naturschutz) / State authorities (Landesbehörden)', process:'Screening → Scoping → UVP-Bericht → Public Consultation → Decision', timeline:'No fixed statutory deadline; typically 1–3 years', portal:'UVP-Portal (Länder-specific)', link:'https://www.bmu.de/themen/wirtschaft-produkte-ressourcen/industrie/umweltvertraeglichkeitspruefung' },
    esg: { framework:'CSRD / ESRS + LkSG (Supply Chain Due Diligence Act)', regulator:'BaFin / BMWK / Bundesanzeiger', scope:'Large enterprises >250 employees; LkSG: >1000 employees', since:'CSRD: 2024; LkSG: 2023', link:'https://www.bafin.de/EN/Aufsicht/Nachhaltigkeitsrisiken/nachhaltigkeitsrisiken_node_en.html' }
  },
  'Other / WHO': {
    ghg: { scheme:'GHG Protocol Corporate Standard (globally applicable baseline)', regulator:'Local environmental authority + UNFCCC NDC framework', grid_factor:'Use IEA country-specific factor or 0.5 kgCO₂/kWh (WHO default)', target:'Refer to national NDC submitted to UNFCCC', threshold:'ISO 14064-1 voluntary reporting; local mandatory thresholds vary', link:'https://ghgprotocol.org' },
    eia: { act:'ISO 14001 / IFC Performance Standards (international baseline)', regulator:'National or local environmental authority', process:'Refer to local statutory requirements; IFC PS3 as baseline for project finance', timeline:'Varies by jurisdiction and project category', portal:'Contact local Environmental Authority', link:'https://www.ifc.org/performancestandards' },
    esg: { framework:'GRI Standards / ISSB (IFRS S1/S2) — global baseline', regulator:'Local securities or financial regulator', scope:'Voluntary globally; mandatory for listed companies in 20+ jurisdictions', since:'GRI voluntary ongoing; ISSB adopted by growing number of countries', link:'https://www.globalreporting.org' }
  }
};
