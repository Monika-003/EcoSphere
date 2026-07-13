
(function(){
'use strict';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STATE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
var TOTAL_STEPS = 12;
var currentStep = 1;
var autoSaveTimer = null;

var STEPS = [
  {num:1,  title:'Organization Information',   icon:'fa-building',            desc:'Enter your organization details, facility information and contact person.'},
  {num:2,  title:'Project Information',        icon:'fa-project-diagram',     desc:'Provide EIA project details â€” type, location, timeline, EC category.'},
  {num:3,  title:'Environmental Baseline',     icon:'fa-leaf',                desc:'Record ambient air, water, noise, soil and biodiversity baseline data.'},
  {num:4,  title:'Resource Consumption',       icon:'fa-bolt',                desc:'Enter water, energy, fuel and renewable energy usage figures.'},
  {num:5,  title:'Emissions & Waste',          icon:'fa-smog',                desc:'Document GHG emissions, stack parameters, wastewater and solid waste.'},
  {num:6,  title:'Branding & Leadership',      icon:'fa-users',               desc:'Upload logo, cover photo, enter vision/mission and add the leadership team.'},
  {num:7,  title:'Daily Monitoring',           icon:'fa-calendar-check',      desc:'Log daily environmental & social metrics â€” compiled automatically into the PDF appendix.'},
  {num:8,  title:'Sustainability & ESG Goals', icon:'fa-seedling',            desc:'Sustainability initiatives, ESG targets register and stakeholder engagement matrix.'},
  {num:9,  title:'CSR & Community',            icon:'fa-hands-helping',       desc:'CSR programs, beneficiaries, NGO partners and community investment.'},
  {num:10, title:'Risk Assessment',            icon:'fa-exclamation-triangle',desc:'Register environmental, compliance and climate risks with likelihood, severity and mitigation.'},
  {num:11, title:'Certifications & Compliance',icon:'fa-certificate',         desc:'ISO certifications, regulatory approvals, company policies, awards and audit records.'},
  {num:12, title:'Review & Generate Report',   icon:'fa-magic',               desc:'Review all data and generate your complete ~90-page MSN-style EIA sustainability report.'}
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STORAGE KEY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function storageKey(){
  var params = new URLSearchParams(window.location.search);
  var org = params.get('orgId') || localStorage.getItem('eco_org_id') || 'default';
  return 'eia_builder_' + org;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LOAD / SAVE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function getData(){
  try{ return JSON.parse(localStorage.getItem(storageKey())) || {}; }
  catch(e){ return {}; }
}
function saveData(d){
  localStorage.setItem(storageKey(), JSON.stringify(d));
  showToast('Draft saved automatically');
  var badge = document.getElementById('draftBadge');
  if(badge) badge.style.display = 'flex';
}
function collectFormData(){
  var d = getData();
  document.querySelectorAll('[data-field]').forEach(function(el){
    if(el.type === 'checkbox') d[el.dataset.field] = el.checked ? 'true' : '';
    else d[el.dataset.field] = el.value || '';
  });
  return d;
}
function saveDraft(){
  var d = collectFormData();
  saveData(d);
}
function autoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(function(){ saveDraft(); }, 1500);
}
var triggerAutoSave = autoSave;
function loadIntoForm(){
  var d = getData();
  document.querySelectorAll('[data-field]').forEach(function(el){
    if(d[el.dataset.field] !== undefined){
      if(el.type === 'checkbox') el.checked = (d[el.dataset.field] === 'true');
      else el.value = d[el.dataset.field];
    }
  });
  var badge = document.getElementById('draftBadge');
  if(badge && Object.keys(d).length > 0) badge.style.display = 'flex';
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TOAST
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function showToast(msg){
  var t = document.getElementById('toast');
  var m = document.getElementById('toastMsg');
  if(!t) return;
  if(m) m.textContent = msg || 'Saved';
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2200);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEPPER RENDER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderStepper(){
  var wrap = document.getElementById('stepper');
  if(!wrap) return;
  var html = '';
  STEPS.forEach(function(s, i){
    var state = s.num < currentStep ? 'done' : (s.num === currentStep ? 'active' : 'pending');
    var icon = state === 'done' ? '<i class="fas fa-check"></i>' : s.num;
    html += '<div class="step-item">';
    html += '<div class="step-dot-wrap" onclick="goToStep('+s.num+')" title="'+s.title+'">';
    html += '<div class="step-dot '+state+'">'+icon+'</div>';
    html += '<div class="step-label '+state+'">'+s.title+'</div>';
    html += '</div>';
    if(i < STEPS.length - 1){
      html += '<div class="step-connector '+(s.num < currentStep ? 'done' : '')+'"></div>';
    }
    html += '</div>';
  });
  wrap.innerHTML = html;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STEP CONTENT DEFINITIONS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function stepContent(n){
  switch(n){

    case 1: return '<div class="card">'+
      '<div class="card-title"><i class="fas fa-building"></i> Organization Details</div>'+
      '<div class="fg">'+
      fld('Organization Name','org_name','text','e.g. ACME Industries Ltd.')+
      fld('Industry Type','org_industry','select','',['Manufacturing','Chemical','Textile','Pharmaceutical','Mining','Construction','Power Generation','Food Processing','Other'])+
      fld('GST / Registration Number','org_gstin','text','e.g. 27AAACI3741K1Z0')+
      fld('Year Established','org_year','number','e.g. 1998')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-map-marker-alt"></i> Address & Location</div>'+
      '<div class="fg">'+
      fldFull('Registered Address','org_address','textarea','Street, City, State, PIN Code')+
      fld('City','org_city','text','City')+
      fld('State','org_state','select','',['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Other'])+
      fld('PIN Code','org_pin','text','e.g. 400001')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-user-tie"></i> Contact Person</div>'+
      '<div class="fg">'+
      fld('Contact Person Name','org_contact','text','Full name')+
      fld('Designation','org_designation','text','e.g. Head â€“ EHS & Sustainability')+
      fld('Email Address','org_email','email','contact@company.com')+
      fld('Phone Number','org_phone','tel','+91 XXXXX XXXXX')+
      fld('Alternate Phone','org_phone2','tel','+91 XXXXX XXXXX (optional)')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-industry"></i> Facility Details</div>'+
      '<div class="fg">'+
      fld('Total Plant Area (sq m)','org_area','number','e.g. 50000')+
      fld('Number of Employees','org_employees','number','e.g. 250')+
      fld('Production Capacity','org_capacity','text','e.g. 10,000 MT per annum')+
      fld('Operating Hours / Day','org_ophours','number','e.g. 16')+
      fldFull('Facility Description','org_facility_desc','textarea','Briefly describe the facility, main products / activities, and operational processes.')+
      '</div></div>';

    case 2: return '<div class="card">'+
      '<div class="card-title"><i class="fas fa-project-diagram"></i> Project Overview</div>'+
      '<div class="fg">'+
      fld('Project Name','proj_name','text','e.g. Expansion of Unit-II')+
      fld('Project Type','proj_type','select','',['New Project','Expansion','Modernisation','Relocation','Diversification','Other'])+
      fld('MoEFCC Category','proj_category','select','',['Category A','Category B1','Category B2'])+
      fld('Estimated Project Cost (â‚¹ Cr)','proj_cost','number','e.g. 125.50')+
      fldFull('Project Description','proj_desc','textarea','Describe the project, its objectives, scope, and expected outcomes.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-map-marked-alt"></i> Project Location</div>'+
      '<div class="fg">'+
      fldFull('Project Site Address','proj_location','textarea','Full address of the project site')+
      fld('Latitude','proj_lat','text','e.g. 19.0760')+
      fld('Longitude','proj_lon','text','e.g. 72.8777')+
      fld('Survey / Plot Number','proj_survey','text','e.g. S.No. 45/A')+
      fld('Nearest Town / City','proj_town','text','e.g. Pune')+
      fld('Distance from Town (km)','proj_town_dist','number','e.g. 12')+
      fld('Land Area (hectares)','proj_land_area','number','e.g. 5.2')+
      fld('Land Type','proj_land_type','select','',['Industrial','Agricultural','Wasteland','Forest','Government','Mixed','Other'])+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-calendar-alt"></i> Project Timeline</div>'+
      '<div class="fg">'+
      fld('Proposed Start Date','proj_start','date','')+
      fld('Expected Completion Date','proj_end','date','')+
      fld('Construction Duration (months)','proj_const_dur','number','e.g. 18')+
      fld('Operation Start Year','proj_op_year','number','e.g. 2026')+
      '</div></div>';

    case 3: return '<div class="card">'+
      '<div class="card-title"><i class="fas fa-wind"></i> Air Quality Baseline</div>'+
      '<div style="font-size:.76rem;color:#64748b;margin-bottom:12px">Ambient air quality parameters at the project site (average values)</div>'+
      '<div class="param-grid">'+
      pm('PM2.5 (Âµg/mÂ³)','env_pm25','avg. ambient value')+
      pm('PM10 (Âµg/mÂ³)','env_pm10','avg. ambient value')+
      pm('SOâ‚‚ (Âµg/mÂ³)','env_so2','')+
      pm('NOâ‚“ (Âµg/mÂ³)','env_nox','')+
      pm('CO (Âµg/mÂ³)','env_co','')+
      pm('RSPM (Âµg/mÂ³)','env_rspm','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fldFull('Air Quality Observations','env_air_obs','textarea','Describe overall air quality conditions, pollution sources, prevailing wind direction, etc.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-water"></i> Water Quality Baseline</div>'+
      '<div class="param-grid">'+
      pm('pH','env_ph','')+
      pm('TDS (mg/L)','env_tds','')+
      pm('BOD (mg/L)','env_bod','')+
      pm('COD (mg/L)','env_cod','')+
      pm('DO (mg/L)','env_do','')+
      pm('Total Hardness (mg/L)','env_hardness','')+
      pm('Turbidity (NTU)','env_turbidity','')+
      pm('Total Coliform (MPN/100mL)','env_coliform','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('Water Source Type','env_water_src','select','',['Surface Water','Groundwater','Municipal Supply','Rainwater','Mixed'])+
      fldFull('Water Quality Observations','env_water_obs','textarea','Describe water quality conditions, sources, seasonal variations, any contamination concerns.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-volume-up"></i> Noise Monitoring</div>'+
      '<div class="param-grid">'+
      pm('Daytime Noise (dB)','env_noise_day','CPCB limit: 75 dB')+
      pm('Night-time Noise (dB)','env_noise_night','CPCB limit: 70 dB')+
      pm('Peak Noise (dB)','env_noise_peak','')+
      pm('Background Noise (dB)','env_noise_bg','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fldFull('Noise Observations','env_noise_obs','textarea','Describe noise sources, sensitive receptors nearby, seasonal variations.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-mountain"></i> Soil Quality</div>'+
      '<div class="param-grid">'+
      pm('Soil pH','env_soil_ph','')+
      pm('Organic Carbon (%)','env_soil_oc','')+
      pm('Nitrogen (mg/kg)','env_soil_n','')+
      pm('Phosphorus (mg/kg)','env_soil_p','')+
      pm('Potassium (mg/kg)','env_soil_k','')+
      pm('Heavy Metals','env_soil_hm','specify if any')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('Soil Type','env_soil_type','select','',['Alluvial','Black Cotton','Red','Laterite','Sandy','Loam','Clay','Mixed'])+
      fldFull('Soil Quality Observations','env_soil_obs','textarea','Describe soil characteristics, land use history, contamination concerns.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-frog"></i> Biodiversity Information</div>'+
      '<div class="fg">'+
      fld('Nearest Forest Area (km)','env_bio_forest','')+
      fld('Nearest Wildlife Sanctuary / NP (km)','env_bio_sanctuary','')+
      fld('Nearest Wetland (km)','env_bio_wetland','')+
      fld('Nearest River / Water Body (km)','env_bio_river','')+
      fldFull('Floral Description','env_bio_flora','textarea','List dominant plant species, vegetation cover, sensitive species if any.')+
      fldFull('Faunal Description','env_bio_fauna','textarea','List dominant fauna, bird species, sensitive or endangered species if any.')+
      fldFull('Biodiversity Observations','env_bio_obs','textarea','Overall biodiversity assessment including ecological sensitivity.')+
      '</div></div>';

    case 4: return '<div class="card">'+
      '<div class="card-title"><i class="fas fa-tint"></i> Water Consumption</div>'+
      '<div class="param-grid">'+
      pm('Process Water (KL/day)','res_water_process','')+
      pm('Cooling Water (KL/day)','res_water_cooling','')+
      pm('Domestic Water (KL/day)','res_water_domestic','')+
      pm('Total Water (KL/day)','res_water_total','auto-calculate')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('Water Source','res_water_source','select','',['MIDC / Municipal Supply','Groundwater Well','Surface Water (River/Lake)','Rainwater Harvesting','Recycled Water','Mixed'])+
      fld('Water Abstraction Permit','res_water_permit','text','Permit No. (if applicable)')+
      fldFull('Water Conservation Measures','res_water_conservation','textarea','Describe water recycling, treatment, rainwater harvesting initiatives.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-bolt"></i> Energy Consumption</div>'+
      '<div class="param-grid">'+
      pm('Grid Electricity (kWh/month)','res_energy_grid','')+
      pm('DG / Captive Power (kWh/month)','res_energy_dg','')+
      pm('Peak Demand (kVA)','res_energy_peak','')+
      pm('Energy Intensity (kWh/unit)','res_energy_intensity','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('Electricity Supplier / DISCOM','res_energy_supplier','text','e.g. MSEDCL, TNEB')+
      fldFull('Energy Efficiency Measures','res_energy_efficiency','textarea','Describe energy audits, BEE ratings, efficiency improvements.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-gas-pump"></i> Fuel Consumption</div>'+
      '<div class="param-grid">'+
      pm('Coal (MT/month)','res_fuel_coal','')+
      pm('Furnace Oil (KL/month)','res_fuel_fo','')+
      pm('HSD / Diesel (KL/month)','res_fuel_hsd','')+
      pm('LPG / PNG (MT/month)','res_fuel_lpg','')+
      pm('Biomass (MT/month)','res_fuel_biomass','')+
      pm('Other Fuel (MT/month)','res_fuel_other','')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-solar-panel"></i> Renewable Energy</div>'+
      '<div class="param-grid">'+
      pm('Solar Power Installed (kWp)','res_re_solar','')+
      pm('Wind Power Installed (kW)','res_re_wind','')+
      pm('Renewable Energy Generated (kWh/month)','res_re_gen','')+
      pm('% Renewable of Total','res_re_pct','%')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fldFull('Renewable Energy Plans','res_re_plans','textarea','Describe future renewable energy targets and transition roadmap.')+
      '</div></div>';

    case 5: return '<div class="card">'+
      '<div class="card-title"><i class="fas fa-cloud"></i> Carbon Emissions</div>'+
      '<div class="param-grid">'+
      pm('Scope 1 â€“ Direct (tCOâ‚‚e/year)','ems_scope1','')+
      pm('Scope 2 â€“ Indirect (tCOâ‚‚e/year)','ems_scope2','')+
      pm('Scope 3 â€“ Value Chain (tCOâ‚‚e/year)','ems_scope3','')+
      pm('Total GHG (tCOâ‚‚e/year)','ems_total_ghg','')+
      pm('Carbon Intensity (tCOâ‚‚e/unit)','ems_intensity','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('GHG Protocol Followed','ems_protocol','select','',['GHG Protocol Corporate Standard','ISO 14064','BEE PAT Scheme','SBTi','Other'])+
      fldFull('Carbon Reduction Plans','ems_carbon_plans','textarea','Describe carbon reduction targets and strategies.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-smog"></i> Air Emissions (Stack & Fugitive)</div>'+
      '<div class="param-grid">'+
      pm('SPM from Stack (mg/NmÂ³)','ems_stack_spm','')+
      pm('SOâ‚‚ from Stack (mg/NmÂ³)','ems_stack_so2','')+
      pm('NOâ‚“ from Stack (mg/NmÂ³)','ems_stack_nox','')+
      pm('HCl / HF (mg/NmÂ³)','ems_stack_hcl','if applicable')+
      pm('Stack Height (m)','ems_stack_height','')+
      pm('Number of Stacks','ems_stack_count','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('Air Pollution Control Device','ems_apcd','select','',['Bag Filter','ESP','Wet Scrubber','Cyclone','Multiclone','Dry Scrubber','None','Multiple'])+
      fldFull('Air Emission Observations','ems_air_obs','textarea','Describe emission sources, control measures, CPCB compliance status.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-water"></i> Wastewater Generation</div>'+
      '<div class="param-grid">'+
      pm('Process Wastewater (KL/day)','ww_process','')+
      pm('Domestic Sewage (KL/day)','ww_domestic','')+
      pm('Total Wastewater (KL/day)','ww_total','')+
      pm('Treated & Recycled (KL/day)','ww_recycled','')+
      pm('Effluent Discharge (KL/day)','ww_discharge','')+
      pm('ETP Capacity (KL/day)','ww_etp_cap','')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('Treatment Technology','ww_treatment','select','',['Primary + Secondary (ASP)','Primary + Secondary (MBBR)','Primary + Secondary + Tertiary','ZLD (Zero Liquid Discharge)','STP only','Effluent Soak Pit','Other'])+
      fld('CETP Connected','ww_cetp','select','',['Yes','No','Partially'])+
      fldFull('Wastewater Observations','ww_obs','textarea','Describe effluent treatment, discharge point, receiving water body.')+
      '</div></div>'+
      '<div class="card">'+
      '<div class="card-title"><i class="fas fa-trash"></i> Waste Management</div>'+
      '<div class="param-grid">'+
      pm('Hazardous Waste (MT/month)','waste_haz','')+
      pm('Non-Hazardous Waste (MT/month)','waste_nhaz','')+
      pm('E-Waste (kg/year)','waste_ewaste','')+
      pm('Biomedical Waste (kg/month)','waste_bio','if applicable')+
      pm('Plastic Waste (kg/month)','waste_plastic','')+
      pm('Recycled Waste (%)','waste_recycled_pct','%')+
      '</div>'+
      '<div class="fg" style="margin-top:12px">'+
      fld('TSDF Facility Name','waste_tsdf','text','Authorized TSDF facility for hazardous waste')+
      fld('Hazardous Waste Authorization No.','waste_auth','text','SPCB authorization number')+
      fldFull('Waste Management Observations','waste_obs','textarea','Describe waste segregation, storage, disposal methods and 3R practices.')+
      '</div></div>';

      case 6: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-palette"></i> Branding</h3>
  <div class="form-row">
    <div class="form-group">
      <label>Organisation Logo</label>
      <div id="erb-logo-preview" style="margin-bottom:8px;min-height:80px;display:flex;align-items:center;justify-content:center;border:2px dashed #cbd5e1;border-radius:8px;background:#f8fafc;padding:8px;">
        <span style="color:#94a3b8;font-size:13px;">No logo uploaded</span>
      </div>
      <input type="file" accept="image/*" onchange="erbUploadLogo(event)" style="font-size:13px;">
    </div>
    <div class="form-group">
      <label>Cover / Banner Photo</label>
      <div id="erb-cover-preview" style="margin-bottom:8px;min-height:80px;display:flex;align-items:center;justify-content:center;border:2px dashed #cbd5e1;border-radius:8px;background:#f8fafc;padding:8px;">
        <span style="color:#94a3b8;font-size:13px;">No cover photo uploaded</span>
      </div>
      <input type="file" accept="image/*" onchange="erbUploadCover(event)" style="font-size:13px;">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label>Tagline / Slogan</label>
      <input type="text" data-field="branding_tagline" placeholder="e.g. Committed to a Greener Future" oninput="triggerAutoSave()">
    </div>
    <div class="form-group">
      <label>Report Year</label>
      <input type="text" data-field="branding_year" placeholder="e.g. 2024" oninput="triggerAutoSave()">
    </div>
  </div>
  <div class="form-group">
    <label>Vision Statement</label>
    <textarea data-field="branding_vision" rows="3" placeholder="Organisation vision..." oninput="triggerAutoSave()"></textarea>
  </div>
  <div class="form-group">
    <label>Mission Statement</label>
    <textarea data-field="branding_mission" rows="3" placeholder="Organisation mission..." oninput="triggerAutoSave()"></textarea>
  </div>
  <div class="form-group">
    <label>About the Organisation</label>
    <textarea data-field="branding_about" rows="4" placeholder="Background, history and overview of the organisation..." oninput="triggerAutoSave()"></textarea>
  </div>
  <div class="form-group">
    <label>Products / Services</label>
    <textarea data-field="branding_products" rows="3" placeholder="Key products and services offered..." oninput="triggerAutoSave()"></textarea>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-chart-bar"></i> Key Statistics</h3>
  <div class="form-row">
    <div class="form-group"><label>Total Employees</label><input type="text" data-field="stat_employees" placeholder="e.g. 1,250" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Number of Facilities</label><input type="text" data-field="stat_facilities" placeholder="e.g. 4" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Countries of Operation</label><input type="text" data-field="stat_countries" placeholder="e.g. 3" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Years in Operation</label><input type="text" data-field="stat_years" placeholder="e.g. 25" oninput="triggerAutoSave()"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Annual Turnover (RM)</label><input type="text" data-field="stat_revenue" placeholder="e.g. 150,000,000" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Product Lines</label><input type="text" data-field="stat_products" placeholder="e.g. 12" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Certifications Held</label><input type="text" data-field="stat_certs" placeholder="e.g. ISO 9001, ISO 14001" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Other Key Metric</label><input type="text" data-field="stat_other" placeholder="e.g. 98% customer retention" oninput="triggerAutoSave()"></div>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-users"></i> Leadership Team</h3>
  <div id="erb-leaders-list"></div>
  <button type="button" class="btn-secondary" onclick="erbAddLeader()" style="margin-top:8px;">
    <i class="fas fa-plus"></i> Add Leader
  </button>
</div>`;

      case 7: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-plus-circle"></i> Add Daily Entry</h3>
  <div class="form-row">
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="erb-daily-date" oninput="erbDailyAS()">
    </div>
    <div class="form-group">
      <label>Weather Condition</label>
      <select id="erb-daily-weather" onchange="erbDailyAS()">
        <option value="">Select...</option>
        <option>Sunny</option><option>Cloudy</option><option>Rainy</option><option>Stormy</option><option>Hazy</option>
      </select>
    </div>
    <div class="form-group">
      <label>Workers on Site</label>
      <input type="number" id="erb-daily-workers" placeholder="0" oninput="erbDailyAS()">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>PM2.5 (Âµg/mÂ³)</label><input type="number" id="erb-daily-pm25" placeholder="0.00" step="0.01" oninput="erbDailyAS()"></div>
    <div class="form-group"><label>PM10 (Âµg/mÂ³)</label><input type="number" id="erb-daily-pm10" placeholder="0.00" step="0.01" oninput="erbDailyAS()"></div>
    <div class="form-group"><label>SOâ‚‚ (Âµg/mÂ³)</label><input type="number" id="erb-daily-so2" placeholder="0.00" step="0.01" oninput="erbDailyAS()"></div>
    <div class="form-group"><label>NOâ‚‚ (Âµg/mÂ³)</label><input type="number" id="erb-daily-no2" placeholder="0.00" step="0.01" oninput="erbDailyAS()"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Noise Level (dB)</label><input type="number" id="erb-daily-noise" placeholder="0.0" step="0.1" oninput="erbDailyAS()"></div>
    <div class="form-group"><label>Energy Used (kWh)</label><input type="number" id="erb-daily-energy" placeholder="0.0" step="0.1" oninput="erbDailyAS()"></div>
    <div class="form-group"><label>Water Used (mÂ³)</label><input type="number" id="erb-daily-water" placeholder="0.0" step="0.1" oninput="erbDailyAS()"></div>
    <div class="form-group"><label>Waste Generated (kg)</label><input type="number" id="erb-daily-waste" placeholder="0.0" step="0.1" oninput="erbDailyAS()"></div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label>Incidents / Near Misses</label>
      <input type="number" id="erb-daily-incidents" placeholder="0" oninput="erbDailyAS()">
    </div>
    <div class="form-group">
      <label>Site Photo</label>
      <input type="file" accept="image/*" onchange="erbDailyPhoto(event)" style="font-size:13px;">
    </div>
  </div>
  <div class="form-group">
    <label>Observations / Notes</label>
    <textarea id="erb-daily-notes" rows="3" placeholder="Any notable observations, compliance checks, corrective actions..." oninput="erbDailyAS()"></textarea>
  </div>
  <div style="display:flex;gap:10px;margin-top:8px;">
    <button type="button" class="btn-primary" onclick="erbSaveDaily()"><i class="fas fa-save"></i> Save Entry</button>
    <button type="button" class="btn-secondary" onclick="erbClearDaily()"><i class="fas fa-times"></i> Clear</button>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-history"></i> Monitoring Log</h3>
  <div id="erb-daily-log" style="overflow-x:auto;">
    <p style="color:#94a3b8;font-size:13px;">No entries yet. Add your first daily entry above.</p>
  </div>
</div>`;

      case 8: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-leaf"></i> ESG Strategy</h3>
  <div class="form-group">
    <label>Sustainability Strategy Overview</label>
    <textarea data-field="esg_strategy" rows="4" placeholder="Describe the organisation's overall ESG and sustainability strategy..." oninput="triggerAutoSave()"></textarea>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label>ESG Reporting Framework</label>
      <select data-field="esg_framework" onchange="triggerAutoSave()">
        <option value="">Select framework...</option>
        <option>GRI Standards</option><option>TCFD</option><option>SASB</option><option>UN SDGs</option><option>ISO 26000</option><option>Bursa Malaysia Sustainability Framework</option><option>Others</option>
      </select>
    </div>
    <div class="form-group">
      <label>SDG Alignment</label>
      <input type="text" data-field="esg_sdg" placeholder="e.g. SDG 6, 7, 13, 15" oninput="triggerAutoSave()">
    </div>
  </div>
  <div class="form-group">
    <label>Materiality Topics</label>
    <textarea data-field="esg_materiality" rows="3" placeholder="Key material topics identified through materiality assessment..." oninput="triggerAutoSave()"></textarea>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-bullseye"></i> ESG Goals & Targets</h3>
  <div id="erb-goals-list"></div>
  <button type="button" class="btn-secondary" onclick="erbAddGoal()" style="margin-top:8px;">
    <i class="fas fa-plus"></i> Add ESG Goal
  </button>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-handshake"></i> Stakeholder Engagement</h3>
  <div id="erb-sh-list"></div>
  <button type="button" class="btn-secondary" onclick="erbAddSH()" style="margin-top:8px;">
    <i class="fas fa-plus"></i> Add Stakeholder Group
  </button>
</div>`;

      case 9: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-hand-holding-heart"></i> CSR Overview</h3>
  <div class="form-row">
    <div class="form-group">
      <label>Annual CSR Budget (RM)</label>
      <input type="text" data-field="csr_budget" placeholder="e.g. 500,000" oninput="triggerAutoSave()">
    </div>
    <div class="form-group">
      <label>Total Beneficiaries</label>
      <input type="text" data-field="csr_beneficiaries" placeholder="e.g. 2,500" oninput="triggerAutoSave()">
    </div>
    <div class="form-group">
      <label>NGO / Community Partners</label>
      <input type="text" data-field="csr_ngo" placeholder="e.g. WWF, Red Crescent" oninput="triggerAutoSave()">
    </div>
  </div>
  <div class="form-group">
    <label>CSR Focus Areas</label>
    <textarea data-field="csr_focus" rows="3" placeholder="e.g. Education, Environment, Community Health, Disaster Relief..." oninput="triggerAutoSave()"></textarea>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-list-alt"></i> CSR Programs</h3>
  <div id="erb-csr-list"></div>
  <button type="button" class="btn-secondary" onclick="erbAddCSR()" style="margin-top:8px;">
    <i class="fas fa-plus"></i> Add Program
  </button>
</div>`;

      case 10: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-exclamation-triangle"></i> Risk Register</h3>
  <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Enter all identified environmental, social, compliance and climate-related risks. Likelihood and Severity rated 1 (Low) to 5 (Critical).</p>
  <div id="erb-risk-list"></div>
  <button type="button" class="btn-secondary" onclick="erbAddRisk()" style="margin-top:8px;">
    <i class="fas fa-plus"></i> Add Risk
  </button>
</div>`;

      case 11: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-certificate"></i> ISO Certifications</h3>
  <div class="form-row">
    <div class="form-group"><label>ISO 14001 (Environmental Management)</label><input type="text" data-field="cert_iso14001" placeholder="e.g. Certified since 2018, valid until 2026" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>ISO 9001 (Quality Management)</label><input type="text" data-field="cert_iso9001" placeholder="e.g. Certified since 2015, valid until 2027" oninput="triggerAutoSave()"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>ISO 45001 (OHS Management)</label><input type="text" data-field="cert_iso45001" placeholder="e.g. Certified since 2020, valid until 2026" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>ISO 50001 (Energy Management)</label><input type="text" data-field="cert_iso50001" placeholder="e.g. Not yet certified" oninput="triggerAutoSave()"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Other Certifications</label><input type="text" data-field="cert_other" placeholder="e.g. OHSAS 18001, Green Building" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Certifying Body</label><input type="text" data-field="cert_body" placeholder="e.g. SIRIM, BSI, DNV" oninput="triggerAutoSave()"></div>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-gavel"></i> Regulatory Compliance</h3>
  <div class="form-row">
    <div class="form-group"><label>EIA Approval Status</label><input type="text" data-field="comp_eia_status" placeholder="e.g. Approved, Pending" oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Approval Reference No.</label><input type="text" data-field="comp_eia_ref" placeholder="e.g. DOE/EIA/2024/001" oninput="triggerAutoSave()"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Operating Licence No.</label><input type="text" data-field="comp_licence" placeholder="e.g. Licensed under..." oninput="triggerAutoSave()"></div>
    <div class="form-group"><label>Last Compliance Audit Date</label><input type="date" data-field="comp_audit_date" onchange="triggerAutoSave()"></div>
  </div>
  <div class="form-group">
    <label>Non-Conformances / Violations</label>
    <textarea data-field="comp_violations" rows="3" placeholder="List any non-conformances, penalties or violations, or state 'None'..." oninput="triggerAutoSave()"></textarea>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-file-alt"></i> Company Policies</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;"><input type="checkbox" data-field="pol_env" onchange="triggerAutoSave()"> Environmental Policy</label>
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;"><input type="checkbox" data-field="pol_energy" onchange="triggerAutoSave()"> Energy Policy</label>
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;"><input type="checkbox" data-field="pol_safety" onchange="triggerAutoSave()"> Health & Safety Policy</label>
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;"><input type="checkbox" data-field="pol_hr" onchange="triggerAutoSave()"> Human Rights Policy</label>
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;"><input type="checkbox" data-field="pol_csr" onchange="triggerAutoSave()"> CSR / Community Policy</label>
    <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;"><input type="checkbox" data-field="pol_wb" onchange="triggerAutoSave()"> Whistleblower Policy</label>
  </div>
  <div class="form-group">
    <label>Policy Statement Summary</label>
    <textarea data-field="pol_summary" rows="3" placeholder="Brief summary of company's core policy commitments..." oninput="triggerAutoSave()"></textarea>
  </div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-trophy"></i> Awards & Recognition</h3>
  <div id="erb-awards-list"></div>
  <button type="button" class="btn-secondary" onclick="erbAddAward()" style="margin-top:8px;">
    <i class="fas fa-plus"></i> Add Award
  </button>
</div>`;

      case 12: return `
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-check-circle"></i> Data Summary</h3>
  <div id="erb-review-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px;"></div>
</div>
<div class="step-section">
  <h3 class="step-section-title"><i class="fas fa-cog"></i> Report Settings</h3>
  <div class="form-row">
    <div class="form-group">
      <label>Report Period</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="date" id="rpt-from-date" style="flex:1;">
        <span style="color:#64748b;font-size:13px;">to</span>
        <input type="date" id="rpt-to-date" style="flex:1;">
      </div>
    </div>
    <div class="form-group">
      <label>Report Language</label>
      <select id="rpt-language">
        <option value="en">English</option>
        <option value="ms">Bahasa Malaysia</option>
      </select>
    </div>
  </div>
  <div class="form-group">
    <label>Executive Summary / Chairman's Message</label>
    <textarea data-field="rpt_chairman_msg" rows="5" placeholder="Enter the Chairman's or CEO's message for the report. This will appear as a signed letter on its own page..." oninput="triggerAutoSave()"></textarea>
  </div>
  <div class="form-group">
    <label>Recommendations & Future Roadmap</label>
    <textarea data-field="rpt_recommendations" rows="4" placeholder="Summarise key recommendations and the 3-5 year sustainability roadmap..." oninput="triggerAutoSave()"></textarea>
  </div>
</div>
<div class="step-section" style="text-align:center;padding:30px 20px;">
  <h3 style="color:#0f172a;font-size:20px;margin-bottom:8px;">Generate Your Report</h3>
  <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Your ~90-page MSN-style EIA Sustainability Report will be generated using all the data you have entered across all 12 steps.</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
    <button type="button" class="btn-primary" onclick="previewReport()" style="padding:14px 28px;font-size:15px;">
      <i class="fas fa-eye"></i> Preview Report
    </button>
    <button type="button" class="btn-secondary" onclick="exportPDF()" style="padding:14px 28px;font-size:15px;">
      <i class="fas fa-file-pdf"></i> Download PDF
    </button>
    <button type="button" class="btn-secondary" onclick="exportWord()" style="padding:14px 28px;font-size:15px;">
      <i class="fas fa-file-word"></i> Download Word
    </button>
  </div>
</div>`;
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FIELD HELPERS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function fld(label, key, type, placeholder, options){
  var cls = type === 'textarea' ? 'fg-full fl' : 'fl';
  var html = '<div class="'+cls+'"><label>'+label+'</label>';
  if(type === 'select'){
    html += '<select data-field="'+key+'" onchange="autoSave()"><option value="">â€” Select â€”</option>';
    (options||[]).forEach(function(o){ html += '<option value="'+o+'">'+o+'</option>'; });
    html += '</select>';
  } else if(type === 'textarea'){
    html += '<textarea data-field="'+key+'" placeholder="'+placeholder+'" rows="3" oninput="autoSave()"></textarea>';
  } else {
    html += '<input type="'+type+'" data-field="'+key+'" placeholder="'+placeholder+'" oninput="autoSave()">';
  }
  html += '</div>';
  return html;
}
function fldFull(label, key, type, placeholder, rows){
  var html = '<div class="fg-full fl"><label>'+label+'</label>';
  html += '<textarea data-field="'+key+'" placeholder="'+placeholder+'" rows="'+(rows||3)+'" oninput="autoSave()"></textarea>';
  html += '</div>';
  return html;
}
function pm(label, key, hint){
  return '<div class="param-card"><label>'+label+'</label>'+
    '<input type="number" data-field="'+key+'" step="0.01" placeholder="0.00" oninput="autoSave()">'+
    (hint ? '<div class="param-unit">'+hint+'</div>' : '')+
    '</div>';
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REVIEW SECTION BUILDER (Step 9)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function buildReviewSections(d){
  var groups = [
    {title:'Organization Information', icon:'fa-building', fields:[
      ['Organization Name','org_name'],['Industry Type','org_industry'],['Address','org_address'],
      ['City / State','org_city'],['Contact Person','org_contact'],['Email','org_email'],['Phone','org_phone'],
      ['Facility Area','org_area'],['Employees','org_employees']
    ]},
    {title:'Project Information', icon:'fa-project-diagram', fields:[
      ['Project Name','proj_name'],['Project Type','proj_type'],['MoEFCC Category','proj_category'],
      ['Project Cost','proj_cost'],['Location','proj_location'],['Land Area','proj_land_area'],
      ['Start Date','proj_start'],['End Date','proj_end']
    ]},
    {title:'Environmental Baseline', icon:'fa-leaf', fields:[
      ['PM2.5 (Âµg/mÂ³)','env_pm25'],['PM10 (Âµg/mÂ³)','env_pm10'],['SOâ‚‚ (Âµg/mÂ³)','env_so2'],
      ['Water pH','env_ph'],['TDS (mg/L)','env_tds'],['BOD (mg/L)','env_bod'],
      ['Day Noise (dB)','env_noise_day'],['Soil pH','env_soil_ph'],['Nearest Forest (km)','env_bio_forest']
    ]},
    {title:'Resource Consumption', icon:'fa-bolt', fields:[
      ['Total Water (KL/day)','res_water_total'],['Grid Electricity (kWh/month)','res_energy_grid'],
      ['Diesel / HSD (KL/month)','res_fuel_hsd'],['Solar Installed (kWp)','res_re_solar'],
      ['Renewable Share (%)','res_re_pct']
    ]},
    {title:'Emissions & Waste', icon:'fa-smog', fields:[
      ['Scope 1 GHG (tCOâ‚‚e/yr)','ems_scope1'],['Scope 2 GHG (tCOâ‚‚e/yr)','ems_scope2'],
      ['Total GHG (tCOâ‚‚e/yr)','ems_total_ghg'],['Stack SPM (mg/NmÂ³)','ems_stack_spm'],
      ['Wastewater (KL/day)','ww_total'],['Hazardous Waste (MT/mo)','waste_haz'],
      ['Non-Haz Waste (MT/mo)','waste_nhaz'],['Recycled (%)','waste_recycled_pct']
    ]},
    {title:'Sustainability & ESG', icon:'fa-seedling', fields:[
      ['Carbon Reduction Target (%)','sus_carbon_target'],['Target Year','sus_target_year'],
      ['Renewable Energy Target (%)','sus_re_target'],['ESG Report','sus_esg_pub'],['SPCB CTO','sus_cto']
    ]},
    {title:'Certifications & Compliance', icon:'fa-certificate', fields:[
      ['ISO 14001','cert_iso14001'],['ISO 45001','cert_iso45001'],['Environmental Clearance','reg_ec'],
      ['EC Reference','reg_ec_no'],['Last Audit Date','audit_last'],['Audit Agency','audit_agency']
    ]}
  ];
  return groups.map(function(g){
    var rows = g.fields.map(function(f){
      var val = d[f[1]] || 'â€”';
      return '<div class="review-row"><div class="review-key">'+f[0]+'</div><div class="review-val">'+val+'</div></div>';
    }).join('');
    return '<div class="review-section"><h4><i class="fas '+g.icon+'" style="color:#1d4ed8"></i> '+g.title+
      '<button class="btn btn-ghost btn-sm" style="margin-left:auto;font-size:.68rem" onclick="goToStep('+
      (groups.indexOf(g)+1)+')"><i class="fas fa-edit"></i> Edit</button></h4>'+rows+'</div>';
  }).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FILE UPLOAD HANDLER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.handleUpload = function(zoneId, listId, files){
  var list = document.getElementById(listId);
  if(!list) return;
  Array.from(files).forEach(function(f){
    var item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = '<span><i class="fas fa-file"></i>'+f.name+' <span style="color:#94a3b8;font-size:.68rem">('+Math.round(f.size/1024)+' KB)</span></span>'+
      '<button class="file-remove" onclick="this.parentElement.remove()" title="Remove"><i class="fas fa-times"></i></button>';
    list.appendChild(item);
  });
  showToast(files.length+' file(s) added');
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NAVIGATION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function goToStep(n){
  saveDraft();
  currentStep = Math.min(Math.max(n, 1), TOTAL_STEPS);
  renderStep();
  window.scrollTo({top:0, behavior:'smooth'});
}
window.nextStep = function(){
  if(currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
};
window.prevStep = function(){
  if(currentStep > 1) goToStep(currentStep - 1);
};

function renderStep(){
  renderStepper();

  var s = STEPS[currentStep - 1];
  var html = '<div class="step-header">'+
    '<div class="step-num"><i class="fas '+s.icon+'"></i> Step '+s.num+' of '+TOTAL_STEPS+'</div>'+
    '<div class="step-title">'+s.title+'</div>'+
    '<div class="step-desc">'+s.desc+'</div>'+
    '</div>'+stepContent(currentStep);

  document.getElementById('mainContent').innerHTML = html;
  loadIntoForm();
  afterRenderStep(currentStep);

  /* wire auto-save on any input (already in markup, but for safety) */
  document.querySelectorAll('[data-field]').forEach(function(el){
    el.addEventListener('change', autoSave);
  });

  /* nav bar updates */
  document.getElementById('btnPrev').style.display = currentStep === 1 ? 'none' : 'inline-flex';
  document.getElementById('btnNext').style.display = currentStep === TOTAL_STEPS ? 'none' : 'inline-flex';
  document.getElementById('btnGenerate').style.display = currentStep === TOTAL_STEPS ? 'inline-flex' : 'none';

  var pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  document.getElementById('progressLabel').textContent = 'Step '+currentStep+' of '+TOTAL_STEPS;
  document.getElementById('progressFill').style.width = pct+'%';
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REPORT GENERATION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

    /* â”€â”€â”€ ERB helpers â”€â”€â”€ */
    function erbKey(k){ var d=getData(); return 'erb_'+(d.org_name||'default').replace(/\s+/g,'_')+'_'+k; }
    function erbGet(k){ try{ return JSON.parse(localStorage.getItem(erbKey(k))||'null'); }catch(e){return null;} }
    function erbSet(k,v){ localStorage.setItem(erbKey(k),JSON.stringify(v)); }

    /* â”€â”€â”€ Logo / Cover â”€â”€â”€ */
    function erbResizeImg(file,maxW,cb){
      var r=new FileReader();
      r.onload=function(e){
        var img=new Image();
        img.onload=function(){
          var w=img.width,h=img.height;
          if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
          var cv=document.createElement('canvas');cv.width=w;cv.height=h;
          cv.getContext('2d').drawImage(img,0,0,w,h);
          cb(cv.toDataURL('image/jpeg',0.88));
        };
        img.src=e.target.result;
      };
      r.readAsDataURL(file);
    }
    window.erbUploadLogo=function(ev){
      var f=ev.target.files[0]; if(!f) return;
      erbResizeImg(f,400,function(b64){
        erbSet('logo',b64);
        var el=document.getElementById('erb-logo-preview');
        if(el) el.innerHTML='<img src="'+b64+'" style="max-height:80px;max-width:100%;border-radius:6px;">';
      });
    };
    window.erbUploadCover=function(ev){
      var f=ev.target.files[0]; if(!f) return;
      erbResizeImg(f,1200,function(b64){
        erbSet('cover',b64);
        var el=document.getElementById('erb-cover-preview');
        if(el) el.innerHTML='<img src="'+b64+'" style="max-height:80px;max-width:100%;border-radius:6px;">';
      });
    };
    function erbLoadBrandImages(){
      var logo=erbGet('logo'),cover=erbGet('cover');
      var lp=document.getElementById('erb-logo-preview');
      var cp=document.getElementById('erb-cover-preview');
      if(lp&&logo) lp.innerHTML='<img src="'+logo+'" style="max-height:80px;max-width:100%;border-radius:6px;">';
      if(cp&&cover) cp.innerHTML='<img src="'+cover+'" style="max-height:80px;max-width:100%;border-radius:6px;">';
    }

    /* â”€â”€â”€ Leadership â”€â”€â”€ */
    var _ldrIdx=0;
    window.erbAddLeader=function(){
      var i=_ldrIdx++;
      var list=document.getElementById('erb-leaders-list'); if(!list) return;
      var div=document.createElement('div');
      div.id='erb-leader-'+i;
      div.style.cssText='border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px;background:#f8fafc;';
      div.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-weight:600;font-size:14px;color:#334155;">Leader #'+(i+1)+'</span><button type="button" onclick="erbDelLeader('+i+')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;">Remove</button></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        +'<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Full Name</label><input type="text" id="ldr-name-'+i+'" placeholder="Name" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font-size:13px;" oninput="erbSaveLeaders()"></div>'
        +'<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Designation</label><input type="text" id="ldr-role-'+i+'" placeholder="e.g. Group CEO" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font-size:13px;" oninput="erbSaveLeaders()"></div>'
        +'<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Qualification</label><input type="text" id="ldr-qual-'+i+'" placeholder="e.g. MBA, PhD" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font-size:13px;" oninput="erbSaveLeaders()"></div>'
        +'<div><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Photo</label><input type="file" accept="image/*" onchange="erbLeaderPhoto(event,'+i+')" style="font-size:12px;"></div>'
        +'</div>'
        +'<div style="margin-top:8px;"><label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Message / Profile</label><textarea id="ldr-msg-'+i+'" rows="2" placeholder="Brief message or profile..." style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font-size:13px;" oninput="erbSaveLeaders()"></textarea></div>';
      list.appendChild(div);
    };
    window.erbDelLeader=function(i){
      var el=document.getElementById('erb-leader-'+i); if(el) el.remove();
      erbSaveLeaders();
    };
    window.erbLeaderPhoto=function(ev,i){
      var f=ev.target.files[0]; if(!f) return;
      erbResizeImg(f,400,function(b64){
        var ldrs=erbGet('leaders')||[];
        var found=ldrs.find(function(l){return l._i===i;});
        if(found) found.photo=b64; else ldrs.push({_i:i,photo:b64});
        erbSet('leaders_photos',ldrs);
      });
    };
    window.erbSaveLeaders=function(){
      var list=document.getElementById('erb-leaders-list'); if(!list) return;
      var items=list.querySelectorAll('[id^="erb-leader-"]');
      var arr=[];
      items.forEach(function(el){
        var i=parseInt(el.id.replace('erb-leader-',''));
        var photos=erbGet('leaders_photos')||[];
        var ph=photos.find(function(p){return p._i===i;});
        arr.push({
          _i:i,
          name:   (document.getElementById('ldr-name-'+i)||{}).value||'',
          role:   (document.getElementById('ldr-role-'+i)||{}).value||'',
          qual:   (document.getElementById('ldr-qual-'+i)||{}).value||'',
          msg:    (document.getElementById('ldr-msg-'+i)||{}).value||'',
          photo:  ph?ph.photo:''
        });
      });
      erbSet('leaders',arr);
    };
    function erbLoadLeaders(){
      var arr=erbGet('leaders')||[]; if(!arr.length) return;
      arr.forEach(function(l){
        erbAddLeader();
        var i=_ldrIdx-1;
        if(document.getElementById('ldr-name-'+i)) document.getElementById('ldr-name-'+i).value=l.name||'';
        if(document.getElementById('ldr-role-'+i)) document.getElementById('ldr-role-'+i).value=l.role||'';
        if(document.getElementById('ldr-qual-'+i)) document.getElementById('ldr-qual-'+i).value=l.qual||'';
        if(document.getElementById('ldr-msg-'+i)) document.getElementById('ldr-msg-'+i).value=l.msg||'';
      });
    }

    /* â”€â”€â”€ Daily Monitoring â”€â”€â”€ */
    var _dailyPhoto='';
    window.erbDailyAS=function(){};
    window.erbDailyPhoto=function(ev){
      var f=ev.target.files[0]; if(!f) return;
      erbResizeImg(f,1200,function(b64){ _dailyPhoto=b64; });
    };
    window.erbSaveDaily=function(){
      var date=document.getElementById('erb-daily-date'); if(!date||!date.value){alert('Please select a date.');return;}
      var gv=function(id){var e=document.getElementById(id);return e?e.value:'';};
      var entry={
        date:date.value, weather:gv('erb-daily-weather'), workers:gv('erb-daily-workers'),
        pm25:gv('erb-daily-pm25'), pm10:gv('erb-daily-pm10'), so2:gv('erb-daily-so2'), no2:gv('erb-daily-no2'),
        noise:gv('erb-daily-noise'), energy:gv('erb-daily-energy'), water:gv('erb-daily-water'), waste:gv('erb-daily-waste'),
        incidents:gv('erb-daily-incidents'), notes:gv('erb-daily-notes'), photo:_dailyPhoto
      };
      var log=erbGet('daily_log')||[];
      var existing=log.findIndex(function(e){return e.date===entry.date;});
      if(existing>=0) log[existing]=entry; else log.push(entry);
      log.sort(function(a,b){return a.date>b.date?-1:1;});
      erbSet('daily_log',log);
      _dailyPhoto='';
      erbRenderDailyLog();
      alert('Entry saved for '+entry.date);
    };
    window.erbClearDaily=function(){
      var ids=['erb-daily-date','erb-daily-weather','erb-daily-workers','erb-daily-pm25','erb-daily-pm10','erb-daily-so2','erb-daily-no2','erb-daily-noise','erb-daily-energy','erb-daily-water','erb-daily-waste','erb-daily-incidents','erb-daily-notes'];
      ids.forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
      _dailyPhoto='';
    };
    window.erbDelDaily=function(date){
      var log=erbGet('daily_log')||[];
      erbSet('daily_log',log.filter(function(e){return e.date!==date;}));
      erbRenderDailyLog();
    };
    function erbRenderDailyLog(){
      var container=document.getElementById('erb-daily-log'); if(!container) return;
      var log=erbGet('daily_log')||[];
      if(!log.length){container.innerHTML='<p style="color:#94a3b8;font-size:13px;">No entries yet.</p>';return;}
      var html='<table style="width:100%;border-collapse:collapse;font-size:12px;">'
        +'<thead><tr style="background:#f1f5f9;">'
        +'<th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Date</th>'
        +'<th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Weather</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Workers</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">PM2.5</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Noise dB</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Energy kWh</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Water mÂ³</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Waste kg</th>'
        +'<th style="padding:8px;text-align:right;border:1px solid #e2e8f0;">Incidents</th>'
        +'<th style="padding:8px;text-align:center;border:1px solid #e2e8f0;">Action</th>'
        +'</tr></thead><tbody>';
      log.forEach(function(e){
        html+='<tr>'
          +'<td style="padding:8px;border:1px solid #e2e8f0;">'+e.date+'</td>'
          +'<td style="padding:8px;border:1px solid #e2e8f0;">'+(e.weather||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.workers||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.pm25||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.noise||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.energy||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.water||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.waste||'-')+'</td>'
          +'<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;">'+(e.incidents||'0')+'</td>'
          +'<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;"><button type="button" onclick="erbDelDaily(\''+e.date+'\')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">Del</button></td>'
          +'</tr>';
      });
      html+='</tbody></table>';
      container.innerHTML=html;
    }

    /* â”€â”€â”€ ESG Goals â”€â”€â”€ */
    var _goalIdx=0;
    window.erbAddGoal=function(){
      var i=_goalIdx++;
      var list=document.getElementById('erb-goals-list'); if(!list) return;
      var div=document.createElement('div');
      div.id='erb-goal-'+i;
      div.style.cssText='border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;background:#f8fafc;';
      div.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:600;font-size:13px;color:#334155;">Goal #'+(i+1)+'</span><button type="button" onclick="erbDelGoal('+i+')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">Remove</button></div>'
        +'<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:8px;">'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Goal / KPI</label><input type="text" id="goal-name-'+i+'" placeholder="e.g. Reduce GHG by 30%" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveGoals()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Baseline</label><input type="text" id="goal-base-'+i+'" placeholder="Current" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveGoals()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Current</label><input type="text" id="goal-cur-'+i+'" placeholder="Value" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveGoals()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Target</label><input type="text" id="goal-tgt-'+i+'" placeholder="e.g. 30%" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveGoals()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Deadline</label><input type="text" id="goal-dead-'+i+'" placeholder="2026" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveGoals()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Status</label><select id="goal-status-'+i+'" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" onchange="erbSaveGoals()"><option>On Track</option><option>Behind</option><option>Achieved</option><option>Not Started</option></select></div>'
        +'</div>';
      list.appendChild(div);
    };
    window.erbDelGoal=function(i){ var el=document.getElementById('erb-goal-'+i);if(el)el.remove();erbSaveGoals(); };
    window.erbSaveGoals=function(){
      var list=document.getElementById('erb-goals-list');if(!list)return;
      var arr=[];
      list.querySelectorAll('[id^="erb-goal-"]').forEach(function(el){
        var i=parseInt(el.id.replace('erb-goal-',''));
        arr.push({name:(document.getElementById('goal-name-'+i)||{}).value||'',base:(document.getElementById('goal-base-'+i)||{}).value||'',cur:(document.getElementById('goal-cur-'+i)||{}).value||'',tgt:(document.getElementById('goal-tgt-'+i)||{}).value||'',dead:(document.getElementById('goal-dead-'+i)||{}).value||'',status:(document.getElementById('goal-status-'+i)||{}).value||''});
      });
      erbSet('goals',arr);
    };
    function erbLoadGoals(){
      var arr=erbGet('goals')||[];
      arr.forEach(function(g){
        erbAddGoal();var i=_goalIdx-1;
        if(document.getElementById('goal-name-'+i)) document.getElementById('goal-name-'+i).value=g.name||'';
        if(document.getElementById('goal-base-'+i)) document.getElementById('goal-base-'+i).value=g.base||'';
        if(document.getElementById('goal-cur-'+i)) document.getElementById('goal-cur-'+i).value=g.cur||'';
        if(document.getElementById('goal-tgt-'+i)) document.getElementById('goal-tgt-'+i).value=g.tgt||'';
        if(document.getElementById('goal-dead-'+i)) document.getElementById('goal-dead-'+i).value=g.dead||'';
        if(document.getElementById('goal-status-'+i)) document.getElementById('goal-status-'+i).value=g.status||'On Track';
      });
    }

    /* â”€â”€â”€ Stakeholders â”€â”€â”€ */
    var _shIdx=0;
    window.erbAddSH=function(){
      var i=_shIdx++;
      var list=document.getElementById('erb-sh-list');if(!list)return;
      var div=document.createElement('div');
      div.id='erb-sh-'+i;
      div.style.cssText='border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;background:#f8fafc;';
      div.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:600;font-size:13px;color:#334155;">Stakeholder Group #'+(i+1)+'</span><button type="button" onclick="erbDelSH('+i+')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">Remove</button></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 2fr;gap:8px;">'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Group</label><input type="text" id="sh-grp-'+i+'" placeholder="e.g. Employees" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveSH()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Method</label><input type="text" id="sh-method-'+i+'" placeholder="e.g. Surveys" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveSH()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Frequency</label><input type="text" id="sh-freq-'+i+'" placeholder="e.g. Annual" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveSH()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Key Topics</label><input type="text" id="sh-topics-'+i+'" placeholder="e.g. Job security, Benefits" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveSH()"></div>'
        +'</div>';
      list.appendChild(div);
    };
    window.erbDelSH=function(i){var el=document.getElementById('erb-sh-'+i);if(el)el.remove();erbSaveSH();};
    window.erbSaveSH=function(){
      var list=document.getElementById('erb-sh-list');if(!list)return;
      var arr=[];
      list.querySelectorAll('[id^="erb-sh-"]').forEach(function(el){
        var i=parseInt(el.id.replace('erb-sh-',''));
        arr.push({grp:(document.getElementById('sh-grp-'+i)||{}).value||'',method:(document.getElementById('sh-method-'+i)||{}).value||'',freq:(document.getElementById('sh-freq-'+i)||{}).value||'',topics:(document.getElementById('sh-topics-'+i)||{}).value||''});
      });
      erbSet('stakeholders',arr);
    };
    function erbLoadSH(){
      var arr=erbGet('stakeholders')||[];
      arr.forEach(function(s){
        erbAddSH();var i=_shIdx-1;
        if(document.getElementById('sh-grp-'+i)) document.getElementById('sh-grp-'+i).value=s.grp||'';
        if(document.getElementById('sh-method-'+i)) document.getElementById('sh-method-'+i).value=s.method||'';
        if(document.getElementById('sh-freq-'+i)) document.getElementById('sh-freq-'+i).value=s.freq||'';
        if(document.getElementById('sh-topics-'+i)) document.getElementById('sh-topics-'+i).value=s.topics||'';
      });
    }

    /* â”€â”€â”€ CSR Programs â”€â”€â”€ */
    var _csrIdx=0;
    window.erbAddCSR=function(){
      var i=_csrIdx++;
      var list=document.getElementById('erb-csr-list');if(!list)return;
      var div=document.createElement('div');
      div.id='erb-csr-'+i;
      div.style.cssText='border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;background:#f8fafc;';
      div.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:600;font-size:13px;color:#334155;">Program #'+(i+1)+'</span><button type="button" onclick="erbDelCSR('+i+')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">Remove</button></div>'
        +'<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:8px;">'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Program Name</label><input type="text" id="csr-name-'+i+'" placeholder="e.g. Tree Planting Drive" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveCSR()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Period</label><input type="text" id="csr-period-'+i+'" placeholder="e.g. Q1 2024" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveCSR()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Beneficiaries</label><input type="text" id="csr-bene-'+i+'" placeholder="e.g. 500 children" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveCSR()"></div>'
        +'</div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Description</label><textarea id="csr-desc-'+i+'" rows="2" placeholder="Brief description of the program..." style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveCSR()"></textarea></div>';
      list.appendChild(div);
    };
    window.erbDelCSR=function(i){var el=document.getElementById('erb-csr-'+i);if(el)el.remove();erbSaveCSR();};
    window.erbSaveCSR=function(){
      var list=document.getElementById('erb-csr-list');if(!list)return;
      var arr=[];
      list.querySelectorAll('[id^="erb-csr-"]').forEach(function(el){
        var i=parseInt(el.id.replace('erb-csr-',''));
        arr.push({name:(document.getElementById('csr-name-'+i)||{}).value||'',period:(document.getElementById('csr-period-'+i)||{}).value||'',bene:(document.getElementById('csr-bene-'+i)||{}).value||'',desc:(document.getElementById('csr-desc-'+i)||{}).value||''});
      });
      erbSet('csr',arr);
    };
    function erbLoadCSR(){
      var arr=erbGet('csr')||[];
      arr.forEach(function(c){
        erbAddCSR();var i=_csrIdx-1;
        if(document.getElementById('csr-name-'+i)) document.getElementById('csr-name-'+i).value=c.name||'';
        if(document.getElementById('csr-period-'+i)) document.getElementById('csr-period-'+i).value=c.period||'';
        if(document.getElementById('csr-bene-'+i)) document.getElementById('csr-bene-'+i).value=c.bene||'';
        if(document.getElementById('csr-desc-'+i)) document.getElementById('csr-desc-'+i).value=c.desc||'';
      });
    }

    /* â”€â”€â”€ Risk Assessment â”€â”€â”€ */
    var _riskIdx=0;
    window.erbAddRisk=function(){
      var i=_riskIdx++;
      var list=document.getElementById('erb-risk-list');if(!list)return;
      var div=document.createElement('div');
      div.id='erb-risk-'+i;
      div.style.cssText='border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;background:#f8fafc;';
      div.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:600;font-size:13px;color:#334155;">Risk #'+(i+1)+'</span><button type="button" onclick="erbDelRisk('+i+')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">Remove</button></div>'
        +'<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:8px;">'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Risk Description</label><input type="text" id="risk-desc-'+i+'" placeholder="e.g. Soil contamination from spill" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveRisks()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Category</label><select id="risk-cat-'+i+'" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" onchange="erbSaveRisks()"><option>Environmental</option><option>Social</option><option>Governance</option><option>Compliance</option><option>Climate</option><option>Operational</option></select></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Likelihood (1â€“5)</label><input type="number" id="risk-like-'+i+'" min="1" max="5" placeholder="1â€“5" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveRisks()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Severity (1â€“5)</label><input type="number" id="risk-sev-'+i+'" min="1" max="5" placeholder="1â€“5" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveRisks()"></div>'
        +'</div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Mitigation Measure</label><textarea id="risk-mit-'+i+'" rows="2" placeholder="e.g. Install spill containment berms, daily inspection..." style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveRisks()"></textarea></div>';
      list.appendChild(div);
    };
    window.erbDelRisk=function(i){var el=document.getElementById('erb-risk-'+i);if(el)el.remove();erbSaveRisks();};
    window.erbSaveRisks=function(){
      var list=document.getElementById('erb-risk-list');if(!list)return;
      var arr=[];
      list.querySelectorAll('[id^="erb-risk-"]').forEach(function(el){
        var i=parseInt(el.id.replace('erb-risk-',''));
        arr.push({desc:(document.getElementById('risk-desc-'+i)||{}).value||'',cat:(document.getElementById('risk-cat-'+i)||{}).value||'',like:(document.getElementById('risk-like-'+i)||{}).value||'3',sev:(document.getElementById('risk-sev-'+i)||{}).value||'3',mit:(document.getElementById('risk-mit-'+i)||{}).value||''});
      });
      erbSet('risks',arr);
    };
    function erbLoadRisks(){
      var arr=erbGet('risks')||[];
      arr.forEach(function(r){
        erbAddRisk();var i=_riskIdx-1;
        if(document.getElementById('risk-desc-'+i)) document.getElementById('risk-desc-'+i).value=r.desc||'';
        if(document.getElementById('risk-cat-'+i)) document.getElementById('risk-cat-'+i).value=r.cat||'Environmental';
        if(document.getElementById('risk-like-'+i)) document.getElementById('risk-like-'+i).value=r.like||'';
        if(document.getElementById('risk-sev-'+i)) document.getElementById('risk-sev-'+i).value=r.sev||'';
        if(document.getElementById('risk-mit-'+i)) document.getElementById('risk-mit-'+i).value=r.mit||'';
      });
    }

    /* â”€â”€â”€ Awards â”€â”€â”€ */
    var _awardIdx=0;
    window.erbAddAward=function(){
      var i=_awardIdx++;
      var list=document.getElementById('erb-awards-list');if(!list)return;
      var div=document.createElement('div');
      div.id='erb-award-'+i;
      div.style.cssText='border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;background:#f8fafc;';
      div.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:600;font-size:13px;color:#334155;">Award #'+(i+1)+'</span><button type="button" onclick="erbDelAward('+i+')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">Remove</button></div>'
        +'<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;">'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Award / Recognition Title</label><input type="text" id="aw-title-'+i+'" placeholder="e.g. Best ESG Practice Award" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveAwards()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Awarding Body</label><input type="text" id="aw-by-'+i+'" placeholder="e.g. DOE Malaysia" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveAwards()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Year</label><input type="text" id="aw-year-'+i+'" placeholder="e.g. 2024" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" oninput="erbSaveAwards()"></div>'
        +'<div><label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Type</label><select id="aw-type-'+i+'" style="width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:6px;font-size:12px;" onchange="erbSaveAwards()"><option>Award</option><option>Certification</option><option>Recognition</option><option>Accreditation</option></select></div>'
        +'</div>';
      list.appendChild(div);
    };
    window.erbDelAward=function(i){var el=document.getElementById('erb-award-'+i);if(el)el.remove();erbSaveAwards();};
    window.erbSaveAwards=function(){
      var list=document.getElementById('erb-awards-list');if(!list)return;
      var arr=[];
      list.querySelectorAll('[id^="erb-award-"]').forEach(function(el){
        var i=parseInt(el.id.replace('erb-award-',''));
        arr.push({title:(document.getElementById('aw-title-'+i)||{}).value||'',by:(document.getElementById('aw-by-'+i)||{}).value||'',year:(document.getElementById('aw-year-'+i)||{}).value||'',type:(document.getElementById('aw-type-'+i)||{}).value||''});
      });
      erbSet('awards',arr);
    };
    function erbLoadAwards(){
      var arr=erbGet('awards')||[];
      arr.forEach(function(a){
        erbAddAward();var i=_awardIdx-1;
        if(document.getElementById('aw-title-'+i)) document.getElementById('aw-title-'+i).value=a.title||'';
        if(document.getElementById('aw-by-'+i)) document.getElementById('aw-by-'+i).value=a.by||'';
        if(document.getElementById('aw-year-'+i)) document.getElementById('aw-year-'+i).value=a.year||'';
        if(document.getElementById('aw-type-'+i)) document.getElementById('aw-type-'+i).value=a.type||'Award';
      });
    }

    /* â”€â”€â”€ Review summary cards â”€â”€â”€ */
    function erbRenderReview(){
      var c=document.getElementById('erb-review-cards');if(!c)return;
      var d=getData();
      var checks=[
        {label:'Organization Info',  ok:!!(d.org_name),       tip:d.org_name||'Not entered'},
        {label:'Project Info',       ok:!!(d.proj_name),      tip:d.proj_name||'Not entered'},
        {label:'Env Baseline',       ok:!!(d.air_quality_pm25||d.noise_level), tip:'Baseline data'},
        {label:'Resource Data',      ok:!!(d.energy_kwh||d.water_m3), tip:'Energy / Water data'},
        {label:'Emissions / Waste',  ok:!!(d.ghg_scope1||d.waste_total), tip:'GHG / Waste data'},
        {label:'Branding',           ok:!!(d.branding_vision||erbGet('logo')), tip:'Vision / Logo'},
        {label:'Daily Monitoring',   ok:!!(erbGet('daily_log')&&erbGet('daily_log').length), tip:(erbGet('daily_log')||[]).length+' entries'},
        {label:'ESG Goals',          ok:!!(erbGet('goals')&&erbGet('goals').length), tip:(erbGet('goals')||[]).length+' goals'},
        {label:'CSR Programs',       ok:!!(erbGet('csr')&&erbGet('csr').length), tip:(erbGet('csr')||[]).length+' programs'},
        {label:'Risk Assessment',    ok:!!(erbGet('risks')&&erbGet('risks').length), tip:(erbGet('risks')||[]).length+' risks'},
        {label:'Certifications',     ok:!!(d.cert_iso14001||d.cert_iso9001), tip:'ISO data'},
        {label:'Chairman Message',   ok:!!(d.rpt_chairman_msg), tip:'Message entered'}
      ];
      var html='';
      checks.forEach(function(ch){
        html+='<div style="border:1px solid '+(ch.ok?'#bbf7d0':'#fecaca')+';border-radius:8px;padding:12px;background:'+(ch.ok?'#f0fdf4':'#fff5f5')+';">'
          +'<div style="font-size:18px;margin-bottom:4px;">'+(ch.ok?'&#x2705;':'&#x26A0;&#xFE0F;')+'</div>'
          +'<div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:2px;">'+ch.label+'</div>'
          +'<div style="font-size:11px;color:#64748b;">'+ch.tip+'</div>'
          +'</div>';
      });
      c.innerHTML=html;
    }

    /* â”€â”€â”€ afterRenderStep hook â”€â”€â”€ */
    function afterRenderStep(n){
      if(n===6){ erbLoadBrandImages(); erbLoadLeaders(); }
      if(n===7){ erbRenderDailyLog(); }
      if(n===8){ erbLoadGoals(); erbLoadSH(); }
      if(n===9){ erbLoadCSR(); }
      if(n===10){ erbLoadRisks(); }
      if(n===11){ erbLoadAwards(); }
      if(n===12){ erbRenderReview(); }
    }

    /* â”€â”€â”€ SVG Chart Helpers â”€â”€â”€ */
    function BARCHART(items,title,color){
      if(!items||!items.length) return '';
      var maxV=Math.max.apply(null,items.map(function(x){return parseFloat(x.v)||0;}));
      if(!maxV) maxV=1;
      var W=480,H=200,padL=50,padB=40,padT=30,barW=Math.min(40,Math.floor((W-padL-20)/items.length-6));
      var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" style="font-family:Arial,sans-serif;">';
      svg+='<text x="'+(W/2)+'" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">'+title+'</text>';
      var chartH=H-padT-padB;
      for(var i=0;i<items.length;i++){
        var bh=Math.round(((parseFloat(items[i].v)||0)/maxV)*chartH);
        var bx=padL+i*(barW+8);
        var by=padT+chartH-bh;
        svg+='<rect x="'+bx+'" y="'+by+'" width="'+barW+'" height="'+bh+'" fill="'+(color||'#1a7a6e')+'" rx="3"/>';
        svg+='<text x="'+(bx+barW/2)+'" y="'+(H-padB+14)+'" text-anchor="middle" font-size="10" fill="#334155">'+items[i].l+'</text>';
        svg+='<text x="'+(bx+barW/2)+'" y="'+(by-4)+'" text-anchor="middle" font-size="9" fill="#64748b">'+items[i].v+'</text>';
      }
      svg+='</svg>';
      return svg;
    }
    function DONUT(segs,title){
      if(!segs||!segs.length) return '';
      var total=segs.reduce(function(a,b){return a+(parseFloat(b.v)||0);},0);
      if(!total) total=1;
      var cx=120,cy=100,r=70,ri=40;
      var svg='<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" style="font-family:Arial,sans-serif;">';
      svg+='<text x="'+(cx)+'" y="15" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">'+title+'</text>';
      var colors=['#1a7a6e','#B01020','#E8C317','#0f172a','#16a34a','#7c3aed','#0284c7','#ea580c'];
      var startAngle=-Math.PI/2;
      segs.forEach(function(s,idx){
        var sliceAngle=(parseFloat(s.v)/total)*2*Math.PI;
        var x1=cx+r*Math.cos(startAngle),y1=cy+r*Math.sin(startAngle);
        var endAngle=startAngle+sliceAngle;
        var x2=cx+r*Math.cos(endAngle),y2=cy+r*Math.sin(endAngle);
        var ix1=cx+ri*Math.cos(startAngle),iy1=cy+ri*Math.sin(startAngle);
        var ix2=cx+ri*Math.cos(endAngle),iy2=cy+ri*Math.sin(endAngle);
        var large=sliceAngle>Math.PI?1:0;
        var col=colors[idx%colors.length];
        svg+='<path d="M'+ix1+','+iy1+' L'+x1+','+y1+' A'+r+','+r+' 0 '+large+',1 '+x2+','+y2+' L'+ix2+','+iy2+' A'+ri+','+ri+' 0 '+large+',0 '+ix1+','+iy1+' Z" fill="'+col+'"/>';
        svg+='<rect x="190" y="'+(25+idx*22)+'" width="14" height="14" fill="'+col+'" rx="2"/>';
        svg+='<text x="210" y="'+(36+idx*22)+'" font-size="11" fill="#334155">'+s.l+': '+s.v+'%</text>';
        startAngle=endAngle;
      });
      svg+='</svg>';
      return svg;
    }
    function RISKHEATMAP(risks){
      var size=44,pad=30;
      var W=pad+5*size+60,H=pad+5*size+50;
      var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" style="font-family:Arial,sans-serif;">';
      svg+='<text x="'+(W/2)+'" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">Risk Heat Map</text>';
      var getColor=function(l,s){var rv=l*s;if(rv>=16)return '#dc2626';if(rv>=9)return '#f97316';if(rv>=4)return '#facc15';return '#86efac';};
      for(var row=0;row<5;row++){
        for(var col=0;col<5;col++){
          var l=col+1,s=5-row;
          svg+='<rect x="'+(pad+col*size)+'" y="'+(pad+row*size)+'" width="'+(size-2)+'" height="'+(size-2)+'" fill="'+getColor(l,s)+'" rx="4" opacity="0.75"/>';
          svg+='<text x="'+(pad+col*size+size/2-1)+'" y="'+(pad+row*size+size/2+4)+'" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600">'+(l*s)+'</text>';
        }
      }
      if(risks&&risks.length){
        risks.forEach(function(r){
          var l=Math.min(5,Math.max(1,parseInt(r.like)||3));
          var s=Math.min(5,Math.max(1,parseInt(r.sev)||3));
          var col=l-1,row=5-s;
          svg+='<circle cx="'+(pad+col*size+size/2-1)+'" cy="'+(pad+row*size+size/2-4)+'" r="5" fill="#0f172a" opacity="0.8"/>';
        });
      }
      svg+='<text x="'+(pad+2.5*size)+'" y="'+(pad+5*size+20)+'" text-anchor="middle" font-size="11" fill="#64748b">Likelihood (1=Low, 5=High)</text>';
      for(var s2=1;s2<=5;s2++){
        svg+='<text x="'+(pad-4)+'" y="'+(pad+(5-s2)*size+size/2+4)+'" text-anchor="end" font-size="10" fill="#64748b">'+s2+'</text>';
      }
      for(var l2=1;l2<=5;l2++){
        svg+='<text x="'+(pad+(l2-1)*size+size/2-1)+'" y="'+(pad+5*size+12)+'" text-anchor="middle" font-size="10" fill="#64748b">'+l2+'</text>';
      }
      svg+='</svg>';
      return svg;
    }
    function buildReportHTML() {
      var d = getData();
      var logo   = erbGet('logo')   || '';
      var cover  = erbGet('cover')  || '';
      var leaders = erbGet('leaders') || [];
      var goals   = erbGet('goals')   || [];
      var shList  = erbGet('stakeholders') || [];
      var csrList = erbGet('csr')    || [];
      var risks   = erbGet('risks')  || [];
      var awards  = erbGet('awards') || [];
      var dailyLog= erbGet('daily_log') || [];

      var NA = '<span style="color:#94a3b8;font-style:italic;">Information Not Provided</span>';
      function val(v){ return (v && String(v).trim()) ? v : NA; }
      function chk(v){ return (v && String(v).trim()) ? v : ''; }

      /* â”€â”€ brand colours â”€â”€ */
      var C = { red:'#B01020', yellow:'#E8C317', teal:'#1a7a6e', navy:'#0f172a', green:'#16a34a' };

      /* â”€â”€ page wrapper â”€â”€ */
      var pgN = 0;
      function pg(body, classes){
        pgN++;
        return '<div class="rpt-page '+(classes||'')+'" style="page-break-after:always;background:#fff;width:794px;min-height:1123px;margin:0 auto;box-sizing:border-box;position:relative;font-family:Arial,Helvetica,sans-serif;overflow:hidden;">'
          + body
          + '<div style="position:absolute;bottom:12px;right:20px;font-size:10px;color:#94a3b8;">'+pgN+'</div>'
          + '</div>';
      }

      /* â”€â”€ divider page â”€â”€ */
      function DIVIDER(title, sub, bg){
        bg = bg || C.navy;
        var bgImg = cover ? 'background-image:url('+cover+');background-size:cover;background-position:center;' : '';
        return pg(
          '<div style="width:100%;height:100%;min-height:1123px;'+bg+';'+bgImg+'display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:80px 70px;background-color:'+bg+';box-sizing:border-box;">'
          +'<div style="background:rgba(255,255,255,0.12);width:6px;height:80px;border-radius:3px;margin-bottom:24px;"></div>'
          +'<div style="font-size:36px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:12px;letter-spacing:-0.5px;">'+title+'</div>'
          +'<div style="font-size:16px;color:rgba(255,255,255,0.75);margin-bottom:32px;">'+sub+'</div>'
          +'<div style="width:80px;height:4px;background:'+C.yellow+';border-radius:2px;"></div>'
          +'</div>',
          'divider-page'
        );
      }

      /* â”€â”€ section heading â”€â”€ */
      function HDR(t, level, color){
        color = color || C.navy;
        var sz = level===1?'22px':level===2?'16px':'13px';
        var fw = level===1?'800':'700';
        return '<div style="font-size:'+sz+';font-weight:'+fw+';color:'+color+';margin-bottom:10px;border-left:4px solid '+C.teal+';padding-left:12px;">'+t+'</div>';
      }

      /* â”€â”€ two-col row â”€â”€ */
      function ROW2(a,b){
        return '<div style="display:flex;gap:24px;margin-bottom:14px;">'
          +'<div style="flex:1;">'+a+'</div>'
          +'<div style="flex:1;">'+b+'</div>'
          +'</div>';
      }

      /* â”€â”€ labelled field â”€â”€ */
      function FIELD(label, value, color){
        return '<div style="margin-bottom:10px;">'
          +'<div style="font-size:10px;font-weight:700;color:'+(color||C.teal)+';text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">'+label+'</div>'
          +'<div style="font-size:13px;color:#1e293b;line-height:1.5;">'+val(value)+'</div>'
          +'</div>';
      }

      /* â”€â”€ table â”€â”€ */
      function TBL(headers, rows, options){
        options = options || {};
        var hBg = options.hBg || C.navy;
        var html = '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;">';
        html += '<thead><tr>';
        headers.forEach(function(h,i){
          html += '<th style="background:'+hBg+';color:#fff;padding:8px 10px;text-align:'+(i===0?'left':'center')+';font-weight:700;font-size:11px;white-space:nowrap;">'+h+'</th>';
        });
        html += '</tr></thead><tbody>';
        rows.forEach(function(row, ri){
          var bg = ri%2===0?'#fff':'#f8fafc';
          html += '<tr style="background:'+bg+';">';
          row.forEach(function(cell, ci){
            html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:'+(ci===0?'left':'center')+';color:#334155;">'+cell+'</td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
      }

      /* â”€â”€ stat card strip â”€â”€ */
      function STATS(items){
        var html='<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">';
        items.forEach(function(item){
          html+='<div style="flex:1;min-width:100px;background:'+C.navy+';border-radius:8px;padding:14px 12px;text-align:center;">'
            +'<div style="font-size:22px;font-weight:900;color:'+C.yellow+';margin-bottom:4px;">'+item.v+'</div>'
            +'<div style="font-size:10px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.4px;">'+item.l+'</div>'
            +'</div>';
        });
        html+='</div>';
        return html;
      }

      /* â”€â”€ paragraph â”€â”€ */
      function PARA(text){
        return '<p style="font-size:13px;color:#334155;line-height:1.7;margin-bottom:12px;">'+val(text)+'</p>';
      }

      /* â”€â”€ page padding â”€â”€ */
      var PP = 'padding:50px 60px;';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 1: COVER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var coverBg = cover
        ? 'background-image:url('+cover+');background-size:cover;background-position:center;'
        : 'background:'+C.navy+';';

      var coverPage = '<div class="rpt-page" style="page-break-after:always;background:'+C.navy+';width:794px;min-height:1123px;margin:0 auto;box-sizing:border-box;position:relative;font-family:Arial,Helvetica,sans-serif;overflow:hidden;">'
        + (cover?'<img src="'+cover+'" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0.25;" alt="cover">':'')
        + '<div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:space-between;height:1123px;padding:60px;">'
        + '<div>'
        + (logo?'<img src="'+logo+'" style="height:70px;object-fit:contain;margin-bottom:24px;" alt="logo">':'')
        + '</div>'
        + '<div>'
        + '<div style="width:60px;height:6px;background:'+C.yellow+';border-radius:3px;margin-bottom:24px;"></div>'
        + '<div style="font-size:13px;font-weight:700;color:'+C.yellow+';text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Environmental Impact Assessment &amp; Sustainability Report</div>'
        + '<div style="font-size:46px;font-weight:900;color:#fff;line-height:1.05;margin-bottom:12px;letter-spacing:-1px;">'+chk(d.org_name)||'Organisation Name'+'</div>'
        + '<div style="font-size:20px;color:rgba(255,255,255,0.8);margin-bottom:8px;">'+(chk(d.branding_tagline)||'')+'</div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:20px;">Reporting Period: '+(chk(d.branding_year)||new Date().getFullYear())+'</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:16px;">'
        + '<div style="width:40px;height:40px;background:'+C.teal+';border-radius:50%;display:flex;align-items:center;justify-content:center;">'
        + '<div style="width:16px;height:16px;background:#fff;border-radius:50%;"></div></div>'
        + '<div style="font-size:12px;color:rgba(255,255,255,0.6);">Generated by EcoSphere Platform &bull; '+(chk(d.org_website)||chk(d.org_email)||'')+'</div>'
        + '</div></div></div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 2: INSIDE COVER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var statItems = [];
      if(chk(d.stat_employees)) statItems.push({v:d.stat_employees,l:'Employees'});
      if(chk(d.stat_facilities)) statItems.push({v:d.stat_facilities,l:'Facilities'});
      if(chk(d.stat_countries)) statItems.push({v:d.stat_countries,l:'Countries'});
      if(chk(d.stat_years)) statItems.push({v:d.stat_years,l:'Yrs in Operation'});
      if(chk(d.stat_revenue)) statItems.push({v:'RM '+d.stat_revenue,l:'Annual Turnover'});
      if(!statItems.length) statItems=[{v:'â€”',l:'Employees'},{v:'â€”',l:'Facilities'},{v:'â€”',l:'Countries'}];

      var p2Body = '<div style="'+PP+'">'
        + HDR('About This Report',1)
        + PARA('This report presents the Environmental Impact Assessment (EIA) and Sustainability performance of '+(chk(d.org_name)||'the Organisation')+' for the reporting period '+(chk(d.branding_year)||new Date().getFullYear())+'. It has been prepared in accordance with internationally recognised frameworks including GRI Standards, TCFD recommendations, and the UN Sustainable Development Goals (SDGs).')
        + PARA('All data, metrics and disclosures contained herein are based solely on information provided by the organisation. Where information has not been supplied, it is noted as "Information Not Provided".')
        + '<div style="height:1px;background:#e2e8f0;margin:20px 0;"></div>'
        + HDR('Organisation at a Glance',2)
        + (statItems.length ? STATS(statItems) : '')
        + ROW2(
            FIELD('Organisation',''+chk(d.org_name))
           +FIELD('Industry Sector',''+chk(d.industry))
           +FIELD('Address',''+chk(d.address)),
            FIELD('Registration No.',''+chk(d.reg_no))
           +FIELD('Contact Person',''+chk(d.contact_name))
           +FIELD('Email / Tel',chk(d.org_email)+(chk(d.org_email)&&chk(d.contact_phone)?' / ':'')+chk(d.contact_phone))
          )
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 3: TABLE OF CONTENTS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var tocItems=[
        ['Chairman\'s Message','4'],['Company Profile','5'],['Leadership Team','6'],
        ['Corporate Governance','7'],['Stakeholder Engagement','8'],['Materiality Assessment','9'],
        ['ESG Strategy & Framework','10'],['ESG Goals & Targets','11'],
        ['Environmental â€” Energy','12'],['Environmental â€” GHG Emissions','13'],
        ['Environmental â€” Water','14'],['Environmental â€” Waste & Air','15'],
        ['Project Details (EIA)','16'],['Environmental Baseline Data','17'],
        ['EIA Impact Assessment Matrix','18'],['Social â€” Workforce','19'],
        ['Social â€” OHS','20'],['CSR & Community Investment','21'],
        ['Risk Assessment Register','22'],['Recommendations & Roadmap','23'],
        ['Awards & Certifications','24'],['Policies & Compliance','25'],
        ['Daily Monitoring Appendix','26'],['GRI Content Index','27']
      ];
      var tocBody='<div style="'+PP+'">'
        +HDR('Table of Contents',1)
        +'<div style="margin-top:16px;">';
      tocItems.forEach(function(item,i){
        tocBody+='<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed #e2e8f0;">'
          +'<div style="display:flex;align-items:center;gap:10px;">'
          +'<div style="width:28px;height:28px;background:'+C.teal+';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;">'+(i+1)+'</div>'
          +'<div style="font-size:13px;color:#334155;">'+item[0]+'</div>'
          +'</div>'
          +'<div style="font-size:12px;color:#94a3b8;">Page '+item[1]+'</div>'
          +'</div>';
      });
      tocBody+='</div></div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 4: CHAIRMAN'S MESSAGE
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var chairmanLdr = leaders.find(function(l){ return /chair|founder|ceo|director|president/i.test(l.role||''); });
      var chairmanMsg = chk(d.rpt_chairman_msg)||'';
      var ceoMsgBody = '<div style="'+PP+'">'
        + HDR('Chairman\'s Message',1)
        + '<div style="background:'+C.navy+';border-radius:10px;padding:30px;margin-bottom:20px;">'
        + '<div style="font-size:28px;color:'+C.yellow+';font-weight:300;margin-bottom:8px;">"</div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,0.9);line-height:1.8;font-style:italic;">'+( chairmanMsg || 'Our commitment to environmental stewardship and sustainable development remains unwavering. This report reflects our progress, challenges, and aspirations as we continue to build a resilient and responsible organisation for future generations.')+'</div>'
        + '<div style="font-size:28px;color:'+C.yellow+';text-align:right;">"</div>'
        + '</div>';
      if(chairmanLdr){
        ceoMsgBody+='<div style="display:flex;align-items:center;gap:16px;margin-top:24px;">'
          +(chairmanLdr.photo?'<img src="'+chairmanLdr.photo+'" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid '+C.teal+';" alt="'+chairmanLdr.name+'">':'<div style="width:70px;height:70px;border-radius:50%;background:'+C.teal+';display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;">&#128100;</div>')
          +'<div><div style="font-weight:700;font-size:15px;color:'+C.navy+';">'+chairmanLdr.name+'</div><div style="font-size:13px;color:#64748b;">'+chairmanLdr.role+'</div><div style="font-size:11px;color:#94a3b8;">'+chk(chairmanLdr.qual)+'</div></div></div>';
      }
      ceoMsgBody+='</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 5: COMPANY PROFILE
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var profileBody = '<div style="'+PP+'">'
        + HDR('Company Profile',1)
        + ROW2(
            FIELD('Legal Name',chk(d.org_name))
           +FIELD('Registration No.',chk(d.reg_no))
           +FIELD('Year Established',chk(d.stat_years)?'Established ~'+(new Date().getFullYear()-parseInt(d.stat_years||0))+' ('+(d.stat_years)+' years)':'')
           +FIELD('Industry',chk(d.industry))
           +FIELD('Headquarters',chk(d.address)),
            FIELD('Website',chk(d.org_website))
           +FIELD('Contact',chk(d.org_email))
           +FIELD('Reporting Year',chk(d.branding_year))
           +FIELD('No. of Employees',chk(d.stat_employees))
           +FIELD('No. of Facilities',chk(d.stat_facilities))
          )
        + HDR('About the Organisation',2)
        + PARA(chk(d.branding_about)||chk(d.description))
        + HDR('Products & Services',2)
        + PARA(chk(d.branding_products))
        + HDR('Vision',2)
        + PARA(chk(d.branding_vision))
        + HDR('Mission',2)
        + PARA(chk(d.branding_mission))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 6: LEADERSHIP TEAM
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var leaderBody = '<div style="'+PP+'">'
        + HDR('Leadership Team',1);
      if(leaders.length){
        var rows4=[];
        for(var li=0;li<leaders.length;li+=2){
          rows4.push([leaders[li],leaders[li+1]||null]);
        }
        rows4.forEach(function(pair){
          leaderBody+='<div style="display:flex;gap:20px;margin-bottom:20px;">';
          pair.forEach(function(ldr){
            if(!ldr){leaderBody+='<div style="flex:1;"></div>';return;}
            leaderBody+='<div style="flex:1;background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #e2e8f0;">'
              +'<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">'
              +(ldr.photo?'<img src="'+ldr.photo+'" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid '+C.teal+';" alt="'+ldr.name+'">'
                :'<div style="width:56px;height:56px;border-radius:50%;background:'+C.teal+';flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;">&#128100;</div>')
              +'<div><div style="font-weight:700;font-size:14px;color:'+C.navy+';">'+val(ldr.name)+'</div>'
              +'<div style="font-size:12px;color:'+C.teal+';">'+val(ldr.role)+'</div>'
              +(chk(ldr.qual)?'<div style="font-size:11px;color:#64748b;">'+ldr.qual+'</div>':'')
              +'</div></div>'
              +(chk(ldr.msg)?'<p style="font-size:12px;color:#475569;line-height:1.6;margin:0;border-top:1px solid #e2e8f0;padding-top:8px;font-style:italic;">"'+ldr.msg+'"</p>':'')
              +'</div>';
          });
          leaderBody+='</div>';
        });
      } else {
        leaderBody += PARA('Leadership team information not provided.');
      }
      leaderBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 7: CORPORATE GOVERNANCE
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var govBody = '<div style="'+PP+'">'
        + HDR('Corporate Governance',1)
        + PARA('The organisation is committed to maintaining the highest standards of corporate governance, transparency and ethical business conduct. The Board of Directors provides strategic oversight, risk management and ensures accountability to all stakeholders.')
        + HDR('Board Composition',2)
        + (leaders.length
          ? TBL(['Name','Designation','Qualification'],
              leaders.map(function(l){return[val(l.name),val(l.role),chk(l.qual)||'â€”'];}),
              {hBg:C.navy})
          : PARA('Board composition data not provided.'))
        + HDR('ESG Governance Structure',2)
        + PARA('ESG oversight is integrated at the Board level. A dedicated Sustainability Committee reviews ESG performance, approves targets and monitors progress against the organisation\'s sustainability roadmap on a '+(chk(d.esg_framework)||'GRI-aligned')+' framework.')
        + FIELD('Reporting Framework',chk(d.esg_framework))
        + FIELD('SDG Alignment',chk(d.esg_sdg))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 8: STAKEHOLDER ENGAGEMENT
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var shBody = '<div style="'+PP+'">'
        + HDR('Stakeholder Engagement',1)
        + PARA('Effective stakeholder engagement is fundamental to our sustainability strategy. We engage with a broad range of stakeholders to understand their expectations, address concerns and incorporate feedback into our reporting and operational decisions.')
        + (shList.length
          ? TBL(['Stakeholder Group','Engagement Method','Frequency','Key Topics / Concerns'],
              shList.map(function(s){return[val(s.grp),val(s.method),val(s.freq),val(s.topics)];}),
              {hBg:C.teal})
          : PARA('Stakeholder engagement data not provided.'))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 9: MATERIALITY & ESG STRATEGY
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var esgStratBody = '<div style="'+PP+'">'
        + HDR('Materiality Assessment',1)
        + PARA(chk(d.esg_materiality)||'A structured materiality assessment was conducted to identify topics most significant to the organisation and its stakeholders. Topics were prioritised based on their potential impact on business performance and stakeholder concern.')
        + HDR('ESG Strategy Overview',1)
        + PARA(chk(d.esg_strategy)||'Our ESG strategy is built on three pillars: Environmental Stewardship, Social Responsibility and Governance Excellence. We integrate sustainability into all business decisions, from supply chain to product lifecycle, ensuring long-term value creation for all stakeholders.')
        + HDR('ESG Goals & Targets Register',1);

      if(goals.length){
        var statusColor=function(s){return s==='Achieved'?C.green:s==='On Track'?C.teal:s==='Behind'?C.red:C.navy;};
        esgStratBody += TBL(
          ['ESG Goal / KPI','Baseline','Current','Target','Deadline','Status'],
          goals.map(function(g){
            return [val(g.name),val(g.base),val(g.cur),val(g.tgt),val(g.dead),
              '<span style="background:'+statusColor(g.status)+';color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">'+val(g.status)+'</span>'];
          }),
          {hBg:C.navy}
        );
      } else {
        esgStratBody += PARA('ESG goals and targets data not provided.');
      }
      esgStratBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 10: ENVIRONMENTAL â€” ENERGY
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var energyBody = '<div style="'+PP+'">'
        + HDR('Environmental Performance: Energy',1)
        + ROW2(
            FIELD('Total Energy Consumed (kWh)',chk(d.energy_kwh))
           +FIELD('Electricity from Grid (kWh)',chk(d.electricity_kwh))
           +FIELD('Diesel / Fuel Used (litres)',chk(d.fuel_litres))
           +FIELD('Natural Gas (mÂ³)',chk(d.gas_m3)),
            FIELD('Renewable Energy (kWh)',chk(d.renewable_kwh))
           +FIELD('Renewable Energy Share (%)',chk(d.renewable_pct))
           +FIELD('Energy Intensity',chk(d.energy_intensity))
           +FIELD('Benchmark / Comparison',chk(d.energy_benchmark))
          );
      var energyItems=[];
      if(chk(d.electricity_kwh)) energyItems.push({l:'Grid Electricity',v:d.electricity_kwh});
      if(chk(d.renewable_kwh)) energyItems.push({l:'Renewable',v:d.renewable_kwh});
      if(chk(d.fuel_litres)) energyItems.push({l:'Diesel/Fuel',v:d.fuel_litres});
      if(chk(d.gas_m3)) energyItems.push({l:'Natural Gas',v:d.gas_m3});
      if(energyItems.length) energyBody+=BARCHART(energyItems,'Energy Consumption by Source',C.teal);
      energyBody += FIELD('Energy Conservation Measures',chk(d.energy_conservation))+'</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 11: GHG EMISSIONS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var ghgBody = '<div style="'+PP+'">'
        + HDR('Environmental Performance: GHG Emissions',1)
        + ROW2(
            FIELD('Scope 1 Emissions (tCOâ‚‚e)',chk(d.ghg_scope1))
           +FIELD('Scope 2 Emissions (tCOâ‚‚e)',chk(d.ghg_scope2))
           +FIELD('Scope 3 Emissions (tCOâ‚‚e)',chk(d.ghg_scope3))
           +FIELD('Total GHG (tCOâ‚‚e)',chk(d.ghg_total)),
            FIELD('GHG Intensity',chk(d.ghg_intensity))
           +FIELD('Carbon Offset (tCOâ‚‚e)',chk(d.carbon_offset))
           +FIELD('Net GHG Emissions',chk(d.net_ghg))
           +FIELD('Reduction Target',chk(d.ghg_target))
          );
      var ghgItems=[];
      if(chk(d.ghg_scope1)) ghgItems.push({l:'Scope 1',v:d.ghg_scope1});
      if(chk(d.ghg_scope2)) ghgItems.push({l:'Scope 2',v:d.ghg_scope2});
      if(chk(d.ghg_scope3)) ghgItems.push({l:'Scope 3',v:d.ghg_scope3});
      if(ghgItems.length) ghgBody+=BARCHART(ghgItems,'GHG Emissions by Scope (tCOâ‚‚e)',C.red);
      ghgBody += FIELD('GHG Reduction Initiatives',chk(d.ghg_initiatives))+'</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 12: WATER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var waterBody = '<div style="'+PP+'">'
        + HDR('Environmental Performance: Water',1)
        + ROW2(
            FIELD('Total Water Consumed (mÂ³)',chk(d.water_m3))
           +FIELD('Water Source',chk(d.water_source))
           +FIELD('Water Recycled (mÂ³)',chk(d.water_recycled))
           +FIELD('Water Recycling Rate (%)',chk(d.water_recycled_pct)),
            FIELD('Wastewater Discharged (mÂ³)',chk(d.wastewater_m3))
           +FIELD('BOD Level (mg/L)',chk(d.bod))
           +FIELD('COD Level (mg/L)',chk(d.cod))
           +FIELD('Water Intensity',chk(d.water_intensity))
          )
        + FIELD('Wastewater Treatment Method',chk(d.wastewater_treatment))
        + FIELD('Water Conservation Measures',chk(d.water_conservation))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 13: WASTE & AIR
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var wasteBody = '<div style="'+PP+'">'
        + HDR('Environmental Performance: Waste & Air Quality',1)
        + HDR('Solid Waste Management',2)
        + ROW2(
            FIELD('Total Waste Generated (tonnes)',chk(d.waste_total))
           +FIELD('Scheduled Waste (tonnes)',chk(d.waste_scheduled))
           +FIELD('Recycled Waste (tonnes)',chk(d.waste_recycled))
           +FIELD('Landfill Disposal (tonnes)',chk(d.waste_landfill)),
            FIELD('Hazardous Waste (tonnes)',chk(d.waste_hazardous))
           +FIELD('Recycling Rate (%)',chk(d.recycling_rate))
           +FIELD('Licensed Waste Contractor',chk(d.waste_contractor))
           +FIELD('Waste Reduction Target',chk(d.waste_target))
          )
        + HDR('Air Quality & Stack Emissions',2)
        + ROW2(
            FIELD('PM10 (mg/mÂ³)',chk(d.pm10))
           +FIELD('SOâ‚‚ Emission Factor',chk(d.so2_ef))
           +FIELD('NOâ‚“ Emission Factor',chk(d.nox_ef)),
            FIELD('Stack Height (m)',chk(d.stack_height))
           +FIELD('Monitoring Frequency',chk(d.air_monitoring_freq))
           +FIELD('Monitoring Body',chk(d.air_monitoring_body))
          )
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 14: EIA PROJECT DETAILS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var eiaBody = '<div style="'+PP+'">'
        + HDR('Project Details (EIA)',1)
        + ROW2(
            FIELD('Project Name',chk(d.proj_name))
           +FIELD('Project Type / Category',chk(d.proj_type))
           +FIELD('EIA Category',chk(d.proj_eia_category))
           +FIELD('Project Location',chk(d.proj_location)),
            FIELD('Total Project Cost (RM)',chk(d.proj_cost))
           +FIELD('Site Area (ha)',chk(d.proj_area))
           +FIELD('Construction Start',chk(d.proj_start))
           +FIELD('Expected Completion',chk(d.proj_end))
          )
        + FIELD('Project Description',chk(d.proj_description)||chk(d.description))
        + HDR('Sensitive Environmental Receivers',2)
        + ROW2(
            FIELD('Nearest Waterbody',chk(d.proj_waterbody))
           +FIELD('Proximity to Forest Reserve (km)',chk(d.proj_forest)),
            FIELD('Buffer Radius (km)',chk(d.proj_buffer))
           +FIELD('Sensitive Habitats',chk(d.proj_habitat))
          )
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 15: ENVIRONMENTAL BASELINE
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var baselineBody = '<div style="'+PP+'">'
        + HDR('Environmental Baseline Data',1)
        + HDR('Ambient Air Quality',2)
        + TBL(['Parameter','Measured Value','Standard/Limit','Status'],
          [
            ['PM10 (Âµg/mÂ³)',chk(d.air_quality_pm10)||'â€”',chk(d.pm10_standard)||'150 Âµg/mÂ³',chk(d.pm10_status)||'â€”'],
            ['PM2.5 (Âµg/mÂ³)',chk(d.air_quality_pm25)||'â€”',chk(d.pm25_standard)||'35 Âµg/mÂ³',chk(d.pm25_status)||'â€”'],
            ['SOâ‚‚ (Âµg/mÂ³)',chk(d.air_quality_so2)||'â€”',chk(d.so2_standard)||'250 Âµg/mÂ³',chk(d.so2_status)||'â€”'],
            ['NOâ‚‚ (Âµg/mÂ³)',chk(d.air_quality_no2)||'â€”',chk(d.no2_standard)||'200 Âµg/mÂ³',chk(d.no2_status)||'â€”'],
            ['CO (Âµg/mÂ³)',chk(d.air_quality_co)||'â€”','10,000 Âµg/mÂ³','â€”']
          ],{hBg:C.teal})
        + HDR('Noise Level Baseline',2)
        + TBL(['Location','Daytime (dB(A))','Night (dB(A))','Standard (dB(A))'],
          [
            ['Project Site',chk(d.noise_level)||'â€”',chk(d.noise_night)||'â€”',chk(d.noise_standard)||'65 / 55'],
            ['Nearest Sensitive Receiver',chk(d.noise_receiver)||'â€”','â€”','â€”']
          ],{hBg:C.teal})
        + HDR('Surface Water & Soil Quality',2)
        + ROW2(
            FIELD('River Water Quality Class',chk(d.water_class))
           +FIELD('Surface Water BOD (mg/L)',chk(d.surface_bod))
           +FIELD('Surface Water pH',chk(d.surface_ph)),
            FIELD('Soil Type',chk(d.soil_type))
           +FIELD('Soil pH',chk(d.soil_ph))
           +FIELD('Contamination Status',chk(d.soil_contamination))
          )
        + FIELD('Flora / Fauna Notes',chk(d.biodiversity))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 16: EIA IMPACT MATRIX
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var impactMatrix=[
        ['Air Quality Degradation','Construction','High','Regular dust suppression, water spraying'],
        ['Noise & Vibration','Construction','High','Restricted working hours, barriers'],
        ['Surface Water Contamination','Construction/Ops','Medium','Silt traps, oil interceptors'],
        ['Soil Erosion','Construction','High','Sediment control, revegetation'],
        ['Loss of Biodiversity','Construction','Medium','Habitat surveys, compensatory planting'],
        ['Increase in Solid Waste','Operations','Medium','Waste segregation, licensed disposal'],
        ['GHG Emissions Increase','Operations','Medium','Energy efficiency, renewable integration'],
        ['Community Disturbance','Construction','Low','Consultation, complaint mechanism'],
        ['Employment Opportunities','Operations','Positive','Local hiring preference'],
        ['Economic Growth','Operations','Positive','Local procurement policy']
      ];
      var impactBody = '<div style="'+PP+'">'
        + HDR('EIA Impact Assessment Matrix',1)
        + PARA('The following matrix identifies potential environmental and social impacts associated with the project, their significance and proposed mitigation measures.')
        + TBL(
          ['Impact','Phase','Significance','Mitigation Measure'],
          impactMatrix.map(function(r){
            var col=r[2]==='High'?C.red:r[2]==='Medium'?'#f97316':r[2]==='Positive'?C.green:C.navy;
            return[r[0],r[1],'<span style="background:'+col+';color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;">'+r[2]+'</span>',r[3]];
          }),
          {hBg:C.navy}
        )
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 17: SOCIAL â€” WORKFORCE
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var socialBody = '<div style="'+PP+'">'
        + HDR('Social Performance: Workforce',1)
        + ROW2(
            FIELD('Total Workforce',chk(d.total_workforce))
           +FIELD('Male Employees',chk(d.male_employees))
           +FIELD('Female Employees',chk(d.female_employees))
           +FIELD('Permanent Employees',chk(d.permanent_employees)),
            FIELD('Contract Employees',chk(d.contract_employees))
           +FIELD('New Hires (reporting year)',chk(d.new_hires))
           +FIELD('Employee Turnover Rate (%)',chk(d.turnover_rate))
           +FIELD('Average Training Hours',chk(d.training_hours))
          )
        + ROW2(
            FIELD('Local Employees (%)',chk(d.local_pct))
           +FIELD('Women in Management (%)',chk(d.women_mgmt)),
            FIELD('Persons with Disabilities',chk(d.pwd_count))
           +FIELD('Foreign Workers',chk(d.foreign_count))
          )
        + FIELD('Collective Bargaining / Union',chk(d.union_status))
        + FIELD('Employee Welfare Programs',chk(d.welfare_programs))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 18: OHS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var ohsBody = '<div style="'+PP+'">'
        + HDR('Social Performance: Occupational Health & Safety',1)
        + ROW2(
            FIELD('Recordable Incidents',chk(d.recordable_incidents))
           +FIELD('Lost Time Injuries (LTI)',chk(d.lti_count))
           +FIELD('Lost Time Injury Rate (LTIR)',chk(d.ltir))
           +FIELD('Fatalities',chk(d.fatalities)||'0'),
            FIELD('Near Miss Reports',chk(d.near_miss))
           +FIELD('Safety Training (hrs/employee)',chk(d.safety_training_hrs))
           +FIELD('Emergency Drills Conducted',chk(d.drills_count))
           +FIELD('OHS Certification',chk(d.cert_iso45001))
          )
        + FIELD('OHS Management Approach',chk(d.ohs_approach))
        + FIELD('Significant Hazards Identified',chk(d.ohs_hazards))
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 19: CSR
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var csrBody = '<div style="'+PP+'">'
        + HDR('CSR & Community Investment',1)
        + ROW2(
            FIELD('Annual CSR Budget (RM)',chk(d.csr_budget))
           +FIELD('Total Beneficiaries',chk(d.csr_beneficiaries)),
            FIELD('NGO / Community Partners',chk(d.csr_ngo))
           +FIELD('CSR Focus Areas',chk(d.csr_focus))
          );
      if(csrList.length){
        csrBody += HDR('CSR Program Register',2)
          + TBL(['Program','Period','Beneficiaries','Description'],
            csrList.map(function(c){return[val(c.name),val(c.period),val(c.bene),val(c.desc)];}),
            {hBg:C.teal});
      }
      csrBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 20: RISK ASSESSMENT
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var riskBody = '<div style="'+PP+'">'
        + HDR('Risk Assessment Register',1)
        + PARA('The following risk register identifies key environmental, social, governance and climate-related risks. Risk scores are calculated as Likelihood Ã— Severity (scale 1â€“5).');
      if(risks.length){
        riskBody += TBL(
          ['Risk Description','Category','Likelihood','Severity','Risk Score','Mitigation'],
          risks.map(function(r){
            var score=(parseInt(r.like)||1)*(parseInt(r.sev)||1);
            var col=score>=16?C.red:score>=9?'#f97316':score>=4?'#facc15':C.green;
            return[val(r.desc),val(r.cat),val(r.like),val(r.sev),'<span style="background:'+col+';color:'+(score>=4?'#fff':'#1e293b')+';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">'+score+'</span>',val(r.mit)];
          }),
          {hBg:C.navy}
        );
        riskBody += '<div style="margin-top:12px;">'+RISKHEATMAP(risks)+'</div>';
      } else {
        riskBody += PARA('Risk assessment data not provided.');
      }
      riskBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 21: RECOMMENDATIONS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var recoBody = '<div style="'+PP+'">'
        + HDR('Recommendations & Future Roadmap',1)
        + PARA(chk(d.rpt_recommendations)||'Based on this assessment, the following key recommendations are proposed to enhance sustainability performance, reduce environmental footprint and strengthen ESG governance:')
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">';
      var defaultRecos = [
        {icon:'ðŸŒ±',title:'Transition to Renewable Energy',desc:'Install solar PV systems to achieve minimum 30% renewable share by 2027'},
        {icon:'ðŸ’§',title:'Water Stewardship Programme',desc:'Implement closed-loop cooling systems and target 20% water reduction by 2026'},
        {icon:'â™»ï¸',title:'Zero Waste Initiative',desc:'Achieve 80% solid waste diversion from landfill by 2027'},
        {icon:'ðŸ“Š',title:'ESG Reporting Enhancement',desc:'Align reporting with GRI Standards and introduce third-party assurance'},
        {icon:'ðŸ‘¥',title:'Workforce Development',desc:'Increase women in management to 30% and expand skills training programme'},
        {icon:'ðŸ›¡ï¸',title:'Risk Monitoring System',desc:'Implement real-time environmental monitoring for all critical parameters'}
      ];
      defaultRecos.forEach(function(r){
        recoBody+='<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">'
          +'<div style="font-size:24px;margin-bottom:6px;">'+r.icon+'</div>'
          +'<div style="font-weight:700;font-size:13px;color:'+C.navy+';margin-bottom:4px;">'+r.title+'</div>'
          +'<div style="font-size:12px;color:#64748b;line-height:1.5;">'+r.desc+'</div>'
          +'</div>';
      });
      recoBody+='</div>';
      recoBody += HDR('3-Year Sustainability Roadmap',2)
        + TBL(['Initiative','Year 1','Year 2','Year 3','KPI'],
          [
            ['Renewable Energy','Feasibility Study','Install 500kW Solar','Achieve 30% RE Share','RE % of total energy'],
            ['Water Management','Audit & Baseline','Recycling System Install','20% Reduction Target','mÂ³ per unit output'],
            ['Waste Reduction','Segregation Policy','Composting / Recycling','80% Diversion Rate','% diverted from landfill'],
            ['ESG Reporting','GRI Gap Analysis','First GRI Report','External Assurance','GRI compliance score'],
            ['Employee Training','Needs Assessment','30hrs/employee','Certification Programme','Training hrs/employee']
          ],
          {hBg:C.teal});
      recoBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 22: AWARDS & CERTIFICATIONS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var awardBody = '<div style="'+PP+'">'
        + HDR('Awards, Certifications & Recognition',1)
        + HDR('ISO & Management System Certifications',2)
        + TBL(['Certification','Details'],
          [
            ['ISO 14001:2015 (Environmental)',chk(d.cert_iso14001)||NA],
            ['ISO 9001:2015 (Quality)',chk(d.cert_iso9001)||NA],
            ['ISO 45001:2018 (OHS)',chk(d.cert_iso45001)||NA],
            ['ISO 50001:2018 (Energy)',chk(d.cert_iso50001)||NA],
            ['Other Certifications',chk(d.cert_other)||NA]
          ].filter(function(r){return r[1]!==NA;}),
          {hBg:C.teal});
      if(awards.length){
        awardBody += HDR('Awards & Industry Recognition',2)
          + TBL(['Award / Recognition','Awarding Body','Year','Type'],
            awards.map(function(a){return[val(a.title),val(a.by),val(a.year),val(a.type)];}),
            {hBg:C.navy});
      }
      awardBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 23: POLICIES & COMPLIANCE
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var polBody = '<div style="'+PP+'">'
        + HDR('Company Policies & Regulatory Compliance',1)
        + HDR('Active Policies',2);
      var polList=[];
      if(d.pol_env) polList.push('Environmental Policy');
      if(d.pol_energy) polList.push('Energy Policy');
      if(d.pol_safety) polList.push('Health & Safety Policy');
      if(d.pol_hr) polList.push('Human Rights Policy');
      if(d.pol_csr) polList.push('CSR / Community Policy');
      if(d.pol_wb) polList.push('Whistleblower Policy');
      if(polList.length){
        polBody += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">';
        polList.forEach(function(p){
          polBody+='<span style="background:'+C.teal+';color:#fff;padding:4px 12px;border-radius:16px;font-size:12px;font-weight:600;">âœ“ '+p+'</span>';
        });
        polBody+='</div>';
      }
      if(chk(d.pol_summary)) polBody += PARA(d.pol_summary);
      polBody += HDR('Regulatory Compliance Status',2)
        + TBL(['Compliance Item','Status / Details'],
          [
            ['EIA Approval',chk(d.comp_eia_status)||'â€”'],
            ['EIA Reference Number',chk(d.comp_eia_ref)||'â€”'],
            ['Operating Licence',chk(d.comp_licence)||'â€”'],
            ['Last Compliance Audit',chk(d.comp_audit_date)||'â€”'],
            ['Non-Conformances / Violations',chk(d.comp_violations)||'None reported']
          ],
          {hBg:C.navy})
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 24: DAILY MONITORING APPENDIX
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var dailyBody = '<div style="'+PP+'">'
        + HDR('Daily Environmental Monitoring â€” Appendix',1)
        + PARA('The following table presents daily environmental monitoring data logged during the reporting period. Data was recorded on-site and compiled electronically.');
      if(dailyLog.length){
        dailyBody += '<div style="overflow-x:auto;">'
          + TBL(
            ['Date','Weather','Workers','PM2.5','PM10','SOâ‚‚','NOâ‚‚','Noise dB','Energy kWh','Water mÂ³','Waste kg','Incidents'],
            dailyLog.slice(0,50).map(function(e){
              return[e.date,e.weather||'â€”',e.workers||'â€”',e.pm25||'â€”',e.pm10||'â€”',e.so2||'â€”',e.no2||'â€”',e.noise||'â€”',e.energy||'â€”',e.water||'â€”',e.waste||'â€”',e.incidents||'0'];
            }),
            {hBg:C.navy}
          )
          + '</div>';
        if(dailyLog.length>50) dailyBody+='<p style="font-size:11px;color:#94a3b8;text-align:center;">Showing first 50 of '+dailyLog.length+' entries.</p>';
        var totalEnergy=dailyLog.reduce(function(a,e){return a+(parseFloat(e.energy)||0);},0).toFixed(1);
        var totalWater=dailyLog.reduce(function(a,e){return a+(parseFloat(e.water)||0);},0).toFixed(1);
        var totalWaste=dailyLog.reduce(function(a,e){return a+(parseFloat(e.waste)||0);},0).toFixed(1);
        var totalInc=dailyLog.reduce(function(a,e){return a+(parseInt(e.incidents)||0);},0);
        dailyBody += STATS([
          {v:dailyLog.length,l:'Days Monitored'},
          {v:totalEnergy+' kWh',l:'Total Energy'},
          {v:totalWater+' mÂ³',l:'Total Water'},
          {v:totalWaste+' kg',l:'Total Waste'},
          {v:totalInc,l:'Total Incidents'}
        ]);
      } else {
        dailyBody += PARA('No daily monitoring entries recorded.');
      }
      dailyBody += '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         PAGE 25: GRI INDEX
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var griIndex=[
        ['GRI 2-1','Organizational details','Company Profile','5'],
        ['GRI 2-2','Entities included in reporting','About This Report','2'],
        ['GRI 2-3','Reporting period, frequency and contact point','Cover / TOC','1-3'],
        ['GRI 2-6','Activities, value chain and other relationships','Company Profile','5'],
        ['GRI 2-9','Governance structure and composition','Corporate Governance','7'],
        ['GRI 2-22','Statement on sustainable development strategy','ESG Strategy','9'],
        ['GRI 2-25','Processes to remediate negative impacts','Risk Assessment','22'],
        ['GRI 2-29','Approach to stakeholder engagement','Stakeholder Engagement','8'],
        ['GRI 302-1','Energy consumption within organization','Energy Performance','12'],
        ['GRI 302-3','Energy intensity','Energy Performance','12'],
        ['GRI 303-1','Interactions with water as a shared resource','Water Performance','14'],
        ['GRI 303-3','Water withdrawal','Water Performance','14'],
        ['GRI 305-1','Direct (Scope 1) GHG emissions','GHG Emissions','13'],
        ['GRI 305-2','Energy indirect (Scope 2) GHG emissions','GHG Emissions','13'],
        ['GRI 305-4','GHG emissions intensity','GHG Emissions','13'],
        ['GRI 306-3','Waste generated','Waste & Air','15'],
        ['GRI 401-1','New employee hires and employee turnover','Workforce','19'],
        ['GRI 403-1','OHS management system','OHS','20'],
        ['GRI 403-9','Work-related injuries','OHS','20'],
        ['GRI 413-1','Operations with local community engagement programs','CSR & Community','21']
      ];
      var griBody = '<div style="'+PP+'">'
        + HDR('GRI Content Index',1)
        + PARA('This report has been prepared with reference to the GRI Standards. The following index maps GRI disclosures to relevant sections of this report.')
        + TBL(
          ['GRI Disclosure','Description','Section','Page'],
          griIndex.map(function(r){return[r[0],r[1],r[2],r[3]];}),
          {hBg:C.navy}
        )
        + '</div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         BACK COVER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var backCover = '<div class="rpt-page" style="page-break-after:always;background:'+C.navy+';width:794px;min-height:1123px;margin:0 auto;box-sizing:border-box;position:relative;font-family:Arial,Helvetica,sans-serif;overflow:hidden;">'
        +'<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:1123px;padding:60px;text-align:center;">'
        +(logo?'<img src="'+logo+'" style="height:80px;object-fit:contain;margin-bottom:28px;opacity:0.9;" alt="logo">':'')
        +'<div style="width:50px;height:4px;background:'+C.yellow+';border-radius:2px;margin:0 auto 24px;"></div>'
        +'<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:8px;">'+(chk(d.org_name)||'')+'</div>'
        +'<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:4px;">'+(chk(d.branding_tagline)||'')+'</div>'
        +'<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:16px;">'+(chk(d.address)||'')+'</div>'
        +'<div style="font-size:12px;color:rgba(255,255,255,0.5);">'+(chk(d.org_email)||'')+(chk(d.org_email)&&chk(d.org_website)?' &bull; ':'')+chk(d.org_website)+'</div>'
        +'<div style="margin-top:40px;font-size:11px;color:rgba(255,255,255,0.35);">EIA Sustainability Report '+chk(d.branding_year)+' &bull; Generated by EcoSphere Platform</div>'
        +'</div></div>';

      /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
         ASSEMBLE ALL PAGES
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
      var report = coverPage
        + pg(p2Body)
        + pg(tocBody)
        + pg(ceoMsgBody)
        + DIVIDER('Company Profile &amp; Governance','Transparency, Accountability &amp; Leadership',C.navy)
        + pg(profileBody)
        + pg(leaderBody)
        + pg(govBody)
        + DIVIDER('Stakeholder Engagement &amp; Strategy','Partnering for Sustainable Value',C.teal)
        + pg(shBody)
        + pg(esgStratBody)
        + DIVIDER('Environmental Performance','Measuring Our Footprint',C.teal)
        + pg(energyBody)
        + pg(ghgBody)
        + pg(waterBody)
        + pg(wasteBody)
        + DIVIDER('EIA â€” Project Assessment','Environmental Impact Analysis',C.red)
        + pg(eiaBody)
        + pg(baselineBody)
        + pg(impactBody)
        + DIVIDER('Social Performance &amp; Governance','People, Safety &amp; Community',C.navy)
        + pg(socialBody)
        + pg(ohsBody)
        + pg(csrBody)
        + DIVIDER('Risk, Recommendations &amp; Roadmap','Building Resilience for the Future',C.teal)
        + pg(riskBody)
        + pg(recoBody)
        + DIVIDER('Certifications, Awards &amp; Compliance','Recognitions &amp; Accountability',C.navy)
        + pg(awardBody)
        + pg(polBody)
        + DIVIDER('Appendix &amp; GRI Index','Supporting Data &amp; Disclosures',C.navy)
        + pg(dailyBody)
        + pg(griBody)
        + backCover;

      return report;
    }

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PREVIEW
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.previewReport = function(){
  saveDraft();
  var container = document.getElementById('reportContainer');
  if(container) container.innerHTML = buildReportHTML();
  var modal = document.getElementById('rptModal');
  if(modal) modal.classList.add('open');
};
window.closePreview = function(){
  var modal = document.getElementById('rptModal');
  if(modal) modal.classList.remove('open');
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   GENERATE (Export) MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.openGenerateModal = function(){
  saveDraft();
  var d = getData();
  var projName = d.proj_name || 'EIA Report';
  window.ecoExport({
    title: projName + ' â€” EIA Report',
    subtitle: 'Environmental Impact Assessment â€” Choose your preferred format',
    formats: ['pdf','word','pptx','excel','csv'],
    onFormat: function(fmt){
      if(fmt === 'pdf')   exportPDF();
      else if(fmt === 'word')  exportWord();
      else if(fmt === 'pptx')  exportPPTX();
      else if(fmt === 'excel') exportExcel();
      else if(fmt === 'csv')   exportCSV();
    }
  });
};

/* â”€â”€ PDF via html2pdf â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function exportPDF(){
  var container = document.getElementById('reportContainer');
  var d = getData();
  var orgName = (d.org_name||'EIA').replace(/[^a-zA-Z0-9]/g,'_');
  if(!container || !container.innerHTML.trim()){
    container = document.createElement('div');
    container.innerHTML = buildReportHTML();
    document.body.appendChild(container);
    container.style.position = 'absolute';
    container.style.left = '-9999px';
  }
  var opt = {
    margin:       0,
    filename:     'EIA_Report_'+orgName+'.pdf',
    image:        {type:'jpeg', quality:0.95},
    html2canvas:  {scale:1.5, useCORS:true, logging:false},
    jsPDF:        {unit:'px', format:[794,1123], orientation:'portrait'},
    pagebreak:    {mode:['avoid-all','css','legacy']}
  };
  html2pdf().set(opt).from(container).save();
}

/* â”€â”€ Word (HTML as .doc) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function exportWord(){
  var d = getData();
  var html = buildReportHTML();
  var blob = new Blob(['ï»¿'+html], {type:'application/msword'});
  _ecoTriggerDownload(blob, 'EIA_Report_'+(d.org_name||'Report').replace(/[^a-zA-Z0-9]/g,'_')+'.doc');
}

/* â”€â”€ PPTX via pptxgenjs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function exportPPTX(){
  var d = getData();
  var pptx = new PptxGenJS();
  pptx.title = 'EIA Report â€” '+(d.org_name||'Report');
  pptx.layout = 'LAYOUT_WIDE';
  var slides = [
    {title:(d.org_name||'Organisation'), sub:'Environmental Impact Assessment Report', body:''},
    {title:'Organization Profile',       sub:'', body:'Industry: '+(d.org_industry||'â€”')+'\nLocation: '+(d.org_city||'â€”')+', '+(d.org_state||'â€”')+'\nEmployees: '+(d.org_employees||'â€”')},
    {title:'Project Details',            sub:'', body:'Project: '+(d.proj_name||'â€”')+'\nType: '+(d.proj_type||'â€”')+'\nCost: â‚¹'+(d.proj_cost||'â€”')+' Cr\nCategory: '+(d.proj_category||'â€”')},
    {title:'Environmental Baseline',     sub:'', body:'PM2.5: '+(d.env_pm25||'â€”')+' Âµg/mÂ³\nPM10: '+(d.env_pm10||'â€”')+' Âµg/mÂ³\nWater pH: '+(d.env_ph||'â€”')+'\nNoise (Day): '+(d.env_noise_day||'â€”')+' dB'},
    {title:'Resource Consumption',       sub:'', body:'Water: '+(d.res_water_total||'â€”')+' KL/day\nElectricity: '+(d.res_energy_grid||'â€”')+' kWh/mo\nRenewable: '+(d.res_re_pct||'â€”')+'%'},
    {title:'Emissions & Waste',          sub:'', body:'Scope 1: '+(d.ems_scope1||'â€”')+' tCOâ‚‚e/yr\nScope 2: '+(d.ems_scope2||'â€”')+' tCOâ‚‚e/yr\nWastewater: '+(d.ww_total||'â€”')+' KL/day\nHaz Waste: '+(d.waste_haz||'â€”')+' MT/mo'},
    {title:'Sustainability Targets',     sub:'', body:'Carbon Target: '+(d.sus_carbon_target||'â€”')+'% by '+(d.sus_target_year||'â€”')+'\nRE Target: '+(d.sus_re_target||'â€”')+'%\nWater Target: '+(d.sus_water_target||'â€”')+'%'},
    {title:'Compliance Status',          sub:'', body:'EC Status: '+(d.reg_ec||'â€”')+'\nISO 14001: '+(d.cert_iso14001||'â€”')+'\nISO 45001: '+(d.cert_iso45001||'â€”')},
    {title:'Conclusion',                 sub:'', body:'The project is environmentally acceptable subject to implementation of the proposed environmental management plan and Environmental Clearance conditions.'}
  ];
  slides.forEach(function(s, i){
    var slide = pptx.addSlide();
    slide.background = {color: i === 0 ? '0c4a6e' : 'FFFFFF'};
    slide.addText(s.title, {x:0.5, y:0.5, w:'90%', h:0.8, fontSize:i===0?28:22, bold:true, color:i===0?'FFFFFF':'0c4a6e', fontFace:'Poppins'});
    if(s.sub) slide.addText(s.sub, {x:0.5, y:1.3, w:'90%', h:0.5, fontSize:14, color:i===0?'B0C4DE':'475569', fontFace:'Inter'});
    if(s.body) slide.addText(s.body, {x:0.5, y:i===0?1.9:1.6, w:'90%', h:4, fontSize:13, color:i===0?'D1E8FF':'374151', fontFace:'Inter', breakLine:true});
    slide.addText('EcoSphere EIA Report', {x:0.5, y:'93%', w:'90%', h:0.3, fontSize:9, color:'94A3B8', align:'right'});
  });
  pptx.writeFile({fileName:'EIA_Report_'+(d.org_name||'Report').replace(/[^a-zA-Z0-9]/g,'_')+'.pptx'});
}

/* â”€â”€ Excel via _ecoRowsToXls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function exportExcel(){
  var d = getData();
  var rows = [
    ['EIA Report â€” '+(d.org_name||'Organisation'),'','',''],
    ['','','',''],
    ['SECTION','PARAMETER','VALUE','UNIT'],
    ['Organization','Name', d.org_name||'â€”',''],
    ['Organization','Industry', d.org_industry||'â€”',''],
    ['Organization','City', d.org_city||'â€”',''],
    ['Organization','State', d.org_state||'â€”',''],
    ['Organization','Employees', d.org_employees||'â€”','No.'],
    ['Project','Project Name', d.proj_name||'â€”',''],
    ['Project','Project Type', d.proj_type||'â€”',''],
    ['Project','Category', d.proj_category||'â€”',''],
    ['Project','Cost', d.proj_cost||'â€”','â‚¹ Crore'],
    ['Project','Land Area', d.proj_land_area||'â€”','Ha'],
    ['Air Quality','PM2.5', d.env_pm25||'â€”','Âµg/mÂ³'],
    ['Air Quality','PM10', d.env_pm10||'â€”','Âµg/mÂ³'],
    ['Air Quality','SOâ‚‚', d.env_so2||'â€”','Âµg/mÂ³'],
    ['Air Quality','NOâ‚“', d.env_nox||'â€”','Âµg/mÂ³'],
    ['Water Quality','pH', d.env_ph||'â€”',''],
    ['Water Quality','TDS', d.env_tds||'â€”','mg/L'],
    ['Water Quality','BOD', d.env_bod||'â€”','mg/L'],
    ['Water Quality','COD', d.env_cod||'â€”','mg/L'],
    ['Noise','Daytime', d.env_noise_day||'â€”','dB'],
    ['Noise','Night-time', d.env_noise_night||'â€”','dB'],
    ['Resource','Total Water', d.res_water_total||'â€”','KL/day'],
    ['Resource','Grid Electricity', d.res_energy_grid||'â€”','kWh/month'],
    ['Resource','Renewable Share', d.res_re_pct||'â€”','%'],
    ['Emissions','Scope 1 GHG', d.ems_scope1||'â€”','tCOâ‚‚e/yr'],
    ['Emissions','Scope 2 GHG', d.ems_scope2||'â€”','tCOâ‚‚e/yr'],
    ['Emissions','Scope 3 GHG', d.ems_scope3||'â€”','tCOâ‚‚e/yr'],
    ['Emissions','Stack SPM', d.ems_stack_spm||'â€”','mg/NmÂ³'],
    ['Waste','Hazardous Waste', d.waste_haz||'â€”','MT/month'],
    ['Waste','Non-Haz Waste', d.waste_nhaz||'â€”','MT/month'],
    ['Waste','Recycled (%)', d.waste_recycled_pct||'â€”','%'],
    ['Sustainability','Carbon Target', d.sus_carbon_target||'â€”','%'],
    ['Sustainability','RE Target', d.sus_re_target||'â€”','%'],
    ['Compliance','EC Status', d.reg_ec||'â€”',''],
    ['Compliance','ISO 14001', d.cert_iso14001||'â€”',''],
    ['Compliance','ISO 45001', d.cert_iso45001||'â€”',''],
  ];
  var xls = window._ecoRowsToXls(rows, 'EIA Data');
  var blob = new Blob([xls], {type:'application/vnd.ms-excel;charset=utf-8'});
  _ecoTriggerDownload(blob, 'EIA_Data_'+(d.org_name||'Report').replace(/[^a-zA-Z0-9]/g,'_')+'.xls');
}

/* â”€â”€ CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function exportCSV(){
  var d = getData();
  var rows = [
    ['Section','Parameter','Value','Unit'],
    ['Organization','Name', d.org_name||'', ''],
    ['Organization','Industry', d.org_industry||'',''],
    ['Organization','City / State', (d.org_city||'')+'/'+(d.org_state||''),''],
    ['Project','Name', d.proj_name||'',''],
    ['Project','Type', d.proj_type||'',''],
    ['Project','Category', d.proj_category||'',''],
    ['Air Quality','PM2.5', d.env_pm25||'','Âµg/mÂ³'],
    ['Air Quality','PM10', d.env_pm10||'','Âµg/mÂ³'],
    ['Water Quality','pH', d.env_ph||'',''],
    ['Water Quality','TDS', d.env_tds||'','mg/L'],
    ['Noise','Day', d.env_noise_day||'','dB'],
    ['Resource','Water', d.res_water_total||'','KL/day'],
    ['Resource','Electricity', d.res_energy_grid||'','kWh/mo'],
    ['Emissions','Scope 1', d.ems_scope1||'','tCOâ‚‚e/yr'],
    ['Emissions','Scope 2', d.ems_scope2||'','tCOâ‚‚e/yr'],
    ['Waste','Haz', d.waste_haz||'','MT/mo'],
    ['Sustainability','Carbon Target', d.sus_carbon_target||'','%'],
    ['Compliance','EC', d.reg_ec||'',''],
  ];
  var csv = window._ecoRowsToCsv(rows);
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  _ecoTriggerDownload(blob, 'EIA_Data_'+(d.org_name||'Report').replace(/[^a-zA-Z0-9]/g,'_')+'.csv');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   INIT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
window.goToStep = goToStep;
window.previewReport = window.previewReport;
window.saveDraft = saveDraft;

renderStep();

})();
