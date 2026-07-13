
(function(){
'use strict';

var TOTAL_STEPS = 10;
var STEP_LABELS = [
  'Organization Profile','Project Information','Environmental Baseline',
  'Daily Monitoring','Waste Management','Energy & Water',
  'Carbon Emissions','Compliance','CSR & Sustainability','Review'
];

var currentStep = 1;
var autoSaveTimer = null;
var editingMonIdx = -1;

/* ---- STORAGE ---- */
function getOrgId(){
  return new URLSearchParams(window.location.search).get('orgId') || 'default';
}
function storageKey(){ return 'eia_data_' + getOrgId(); }
function monKey(){ return 'eia_mon_' + getOrgId(); }

function getData(){
  try{ return JSON.parse(localStorage.getItem(storageKey()) || '{}'); }
  catch(e){ return {}; }
}
function saveData(d){
  try{ localStorage.setItem(storageKey(), JSON.stringify(d)); showSaved(); }
  catch(e){}
}
function getRecords(){
  try{ return JSON.parse(localStorage.getItem(monKey()) || '[]'); }
  catch(e){ return []; }
}
function saveRecords(arr){
  try{ localStorage.setItem(monKey(), JSON.stringify(arr)); }
  catch(e){}
}

/* ---- SAVE ---- */
function autoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveDraft, 1500);
}
window.autoSave = autoSave;

function saveDraft(){
  var d = getData();
  document.querySelectorAll('[data-field]').forEach(function(el){
    if(el.type === 'checkbox') d[el.dataset.field] = el.checked ? 'true' : '';
    else d[el.dataset.field] = el.value || '';
  });
  saveData(d);
}
window.saveDraft = saveDraft;

function loadIntoForm(){
  var d = getData();
  document.querySelectorAll('[data-field]').forEach(function(el){
    if(d[el.dataset.field] !== undefined){
      if(el.type === 'checkbox') el.checked = (d[el.dataset.field] === 'true');
      else el.value = d[el.dataset.field] || '';
    }
  });
}

function showSaved(){
  var b = document.getElementById('saveBadge');
  var t = document.getElementById('saveBadgeText');
  if(!b) return;
  b.classList.add('saved'); t.textContent = 'Saved';
  setTimeout(function(){ b.classList.remove('saved'); t.textContent = 'Auto-save on'; }, 2500);
}

/* ---- STEPPER ---- */
function renderStepper(){
  var html = '';
  for(var i = 1; i <= TOTAL_STEPS; i++){
    var cls = 'erb-step-item' + (i === currentStep ? ' active' : i < currentStep ? ' done' : '');
    var num = i < currentStep ? '<i class="fas fa-check" style="font-size:.7rem"></i>' : i;
    html += '<div class="' + cls + '" onclick="goToStep(' + i + ')">';
    html += '<div class="erb-step-num">' + num + '</div>';
    html += '<div class="erb-step-label">' + STEP_LABELS[i-1] + '</div>';
    html += '</div>';
  }
  document.getElementById('erbStepper').innerHTML = html;
  document.getElementById('erbProgressBar').style.width = ((currentStep-1)/(TOTAL_STEPS-1)*100) + '%';
  document.getElementById('curStep').textContent = currentStep;
  document.getElementById('totStep').textContent = TOTAL_STEPS;
  document.getElementById('btnPrev').style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  var btnNext = document.getElementById('btnNext');
  if(currentStep === TOTAL_STEPS){
    btnNext.innerHTML = '<i class="fas fa-check-circle"></i> Complete';
    btnNext.className = 'erb-btn erb-btn-success';
  } else {
    btnNext.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    btnNext.className = 'erb-btn erb-btn-primary';
  }
  var active = document.querySelector('.erb-step-item.active');
  if(active) active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
}

/* ---- NAVIGATION ---- */
function goToStep(n){
  saveDraft();
  currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));
  renderStep();
  window.scrollTo({top:0,behavior:'smooth'});
}
function nextStep(){ if(currentStep < TOTAL_STEPS) goToStep(currentStep + 1); }
function prevStep(){ if(currentStep > 1) goToStep(currentStep - 1); }
window.goToStep = goToStep;
window.nextStep = nextStep;
window.prevStep = prevStep;

/* ---- RENDER ---- */
function renderStep(){
  renderStepper();
  var fns = [null, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10];
  document.getElementById('erbMain').innerHTML = fns[currentStep]();
  loadIntoForm();
  if(currentStep === 4) renderMonTable();
  if(currentStep === 10) renderReview();
  // load images
  ['org_logo','org_photos','bl_images','waste_images','comp_docs','csr_images'].forEach(loadImgField);
}

/* ---- IMAGE HELPERS ---- */
function imgKey(f){ return 'eia_img_' + getOrgId() + '_' + f; }

function loadImgField(field){
  var wrap = document.getElementById('ip_' + field);
  if(!wrap) return;
  var imgs = [];
  try{ imgs = JSON.parse(localStorage.getItem(imgKey(field)) || '[]'); }catch(e){}
  wrap.innerHTML = imgs.map(function(src, i){
    return '<img src="' + src + '" class="erb-thumb" onclick="removeImg(\'' + field + '\',' + i + ')" title="Click to remove"/>';
  }).join('');
}

window.handleImgUpload = function(field, input){
  var files = Array.from(input.files);
  if(!files.length) return;
  var imgs = [];
  try{ imgs = JSON.parse(localStorage.getItem(imgKey(field)) || '[]'); }catch(e){}
  var left = files.length;
  files.forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement('canvas');
        var ratio = Math.min(1200/img.width, 900/img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        imgs.push(canvas.toDataURL('image/jpeg', 0.82));
        left--;
        if(left === 0){
          localStorage.setItem(imgKey(field), JSON.stringify(imgs));
          loadImgField(field);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
};

window.removeImg = function(field, idx){
  var imgs = [];
  try{ imgs = JSON.parse(localStorage.getItem(imgKey(field)) || '[]'); }catch(e){}
  imgs.splice(idx, 1);
  localStorage.setItem(imgKey(field), JSON.stringify(imgs));
  loadImgField(field);
};

function imgWidget(field, lbl){
  return '<div class="erb-upload-zone" onclick="document.getElementById(\'fu_'+field+'\').click()">' +
    '<input type="file" id="fu_'+field+'" accept="image/*" multiple onchange="handleImgUpload(\''+field+'\',this)" onclick="event.stopPropagation()"/>' +
    '<i class="fas fa-cloud-upload-alt" style="font-size:1.6rem;color:#94a3b8;margin-bottom:8px;display:block"></i>' +
    '<div style="font-size:.82rem;font-weight:700;color:#64748b">' + lbl + '</div>' +
    '<div style="font-size:.72rem;color:#94a3b8;margin-top:4px">Click or tap to upload images</div>' +
    '</div>' +
    '<div class="erb-upload-preview" id="ip_' + field + '"></div>';
}

/* ---- FIELD HELPER ---- */
function fld(label, key, type, ph, opts){
  var h = '<div class="erb-fg"><label>' + label + '</label>';
  if(type === 'select'){
    h += '<select data-field="' + key + '" onchange="autoSave()"><option value="">-- Select --</option>';
    (opts || []).forEach(function(o){ h += '<option value="' + o + '">' + o + '</option>'; });
    h += '</select>';
  } else if(type === 'textarea'){
    h += '<textarea data-field="' + key + '" placeholder="' + (ph||'') + '" rows="3" oninput="autoSave()"></textarea>';
  } else {
    h += '<input type="' + type + '" data-field="' + key + '" placeholder="' + (ph||'') + '" oninput="autoSave()"/>';
  }
  h += '</div>';
  return h;
}

function card(icon, iconCls, title, content){
  return '<div class="erb-card">' +
    '<div class="erb-card-title"><i class="' + icon + ' erb-card-icon ' + iconCls + '"></i>' + title + '</div>' +
    content + '</div>';
}

/* ===========================
   STEP 1 — ORGANIZATION PROFILE
   =========================== */
function s1(){
  var states = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Chandigarh','Delhi','Goa','Puducherry','Jammu and Kashmir','Ladakh'];
  var industries = ['Manufacturing','Chemical','Textile','Pharmaceutical','Mining','Construction','Power Generation','Food Processing','IT / Technology','Agriculture','Cement','Steel','Fertilizer','Petrochemical','Paper & Pulp','Sugar','Distillery','Rubber','Paint & Varnish','Other'];
  return stepHeader('Organization Profile', 1, 'fas fa-building', 'Enter your organization details, facility address and primary contact person.') +
    card('fas fa-building', 'ico-blue', 'Organization Details',
      '<div class="erb-form-grid">' +
      fld('Organization Name *', 'org_name', 'text', 'e.g. ACME Industries Ltd.') +
      fld('Industry Type', 'org_industry', 'select', '', industries) +
      fld('Plant / Facility Name', 'org_plant', 'text', 'e.g. Unit 1 — Main Plant') +
      fld('Year Established', 'org_year', 'number', 'e.g. 1998') +
      fld('GST / Registration No.', 'org_gstin', 'text', 'e.g. 27AAACI3741K1Z0') +
      fld('CIN / Company No.', 'org_cin', 'text', 'e.g. U74999MH2001PTC...') +
      '</div>') +
    card('fas fa-map-marker-alt', 'ico-green', 'Facility Address',
      '<div class="erb-form-full">' + fld('Registered Address', 'org_address', 'textarea', 'Street, City, State, PIN Code') + '</div>' +
      '<div class="erb-form-grid">' +
      fld('City', 'org_city', 'text', 'e.g. Pune') +
      fld('State', 'org_state', 'select', '', states) +
      fld('PIN Code', 'org_pin', 'text', 'e.g. 411001') +
      fld('District', 'org_district', 'text', 'e.g. Pune') +
      fld('Latitude', 'org_lat', 'number', 'e.g. 18.5204') +
      fld('Longitude', 'org_lng', 'number', 'e.g. 73.8567') +
      '</div>') +
    card('fas fa-user-tie', 'ico-purple', 'Contact Person',
      '<div class="erb-form-grid">' +
      fld('Contact Name', 'org_contact', 'text', 'e.g. Rajesh Kumar') +
      fld('Designation', 'org_designation', 'text', 'e.g. Environment Manager') +
      fld('Email Address', 'org_email', 'email', 'e.g. env@company.com') +
      fld('Phone Number', 'org_phone', 'tel', 'e.g. +91 98765 43210') +
      fld('Website', 'org_website', 'url', 'e.g. https://company.com') +
      '</div>') +
    card('fas fa-camera', 'ico-orange', 'Logo & Facility Photos',
      '<div class="erb-form-grid-2">' +
      '<div class="erb-fg"><label>Organization Logo</label>' + imgWidget('org_logo', 'Upload Logo') + '</div>' +
      '<div class="erb-fg"><label>Facility Photos</label>' + imgWidget('org_photos', 'Upload Facility Photos') + '</div>' +
      '</div>');
}

/* ===========================
   STEP 2 — PROJECT INFORMATION
   =========================== */
function s2(){
  return stepHeader('Project Information', 2, 'fas fa-folder-open', 'Provide details about the project for which this EIA is being prepared.') +
    card('fas fa-project-diagram', 'ico-blue', 'Project Details',
      '<div class="erb-form-grid">' +
      fld('Project Name *', 'proj_name', 'text', 'e.g. Expansion of Unit 2') +
      fld('Project Type', 'proj_type', 'select', '', ['New Project','Expansion','Modernization','Diversification','Relocation','Change in Product Mix','Change in Process','Other']) +
      fld('EIA Category', 'proj_category', 'select', '', ['Category A (Central Govt)','Category B1 (State Level)','Category B2 (State Level)','Not Applicable']) +
      fld('Project Cost (INR Crore)', 'proj_cost', 'number', 'e.g. 250') +
      fld('Land Area (Hectares)', 'proj_land', 'number', 'e.g. 12.5') +
      fld('Built-up Area (sq.m.)', 'proj_builtup', 'number', 'e.g. 8500') +
      fld('Production Capacity', 'proj_capacity', 'text', 'e.g. 50,000 MT/year') +
      fld('Expected Employment', 'proj_employment', 'number', 'e.g. 250') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Project Description', 'proj_desc', 'textarea', 'Detailed description of the project, its objectives and scope...') + '</div>' +
      '<div class="erb-form-grid">' +
      fld('Project Start Date', 'proj_start', 'date', '') +
      fld('Expected Completion', 'proj_end', 'date', '') +
      fld('Monitoring Period From', 'proj_mon_start', 'date', '') +
      fld('Monitoring Period To', 'proj_mon_end', 'date', '') +
      '</div>') +
    card('fas fa-map', 'ico-green', 'Location & Surroundings',
      '<div class="erb-form-grid">' +
      fld('Nearest Town / City', 'proj_town', 'text', 'e.g. Pune (12 km)') +
      fld('Nearest Water Body', 'proj_water', 'text', 'e.g. Bhima River (3 km)') +
      fld('Nearest Highway', 'proj_highway', 'text', 'e.g. NH-48 (2 km)') +
      fld('Nearest Railway Station', 'proj_railway', 'text', 'e.g. Hadapsar (5 km)') +
      fld('Nearest Protected Area', 'proj_protected', 'text', 'e.g. Sanjay Gandhi NP (40 km)') +
      fld('Seismic Zone', 'proj_seismic', 'select', '', ['Zone I','Zone II','Zone III','Zone IV','Zone V']) +
      '</div>' +
      '<div class="erb-form-full">' + fld('Project Justification', 'proj_justification', 'textarea', 'Why is this project needed? Economic and social benefits...') + '</div>') +
    card('fas fa-file-alt', 'ico-orange', 'Prior Approvals & References',
      '<div class="erb-form-grid">' +
      fld('ToR Reference No.', 'proj_tor', 'text', 'e.g. J-11011/...') +
      fld('ToR Date', 'proj_tor_date', 'date', '') +
      fld('EC Reference No.', 'proj_ec', 'text', 'e.g. J-11015/...') +
      fld('EC Date', 'proj_ec_date', 'date', '') +
      fld('CRZ Clearance', 'proj_crz', 'text', 'e.g. Not Applicable') +
      fld('Forest Clearance', 'proj_forest', 'text', 'e.g. FC/MH/2024/...') +
      '</div>');
}

/* ===========================
   STEP 3 — ENVIRONMENTAL BASELINE
   =========================== */
function s3(){
  return stepHeader('Environmental Baseline', 3, 'fas fa-tree', 'Document the pre-project environmental conditions at the site and surrounding area.') +
    card('fas fa-wind', 'ico-blue', 'Air Quality Baseline',
      '<div class="erb-form-grid">' +
      fld('PM10 (ug/m3)', 'bl_pm10', 'number', 'e.g. 62') +
      fld('PM2.5 (ug/m3)', 'bl_pm25', 'number', 'e.g. 28') +
      fld('SO2 (ug/m3)', 'bl_so2', 'number', 'e.g. 15') +
      fld('NOx (ug/m3)', 'bl_nox', 'number', 'e.g. 24') +
      fld('CO (mg/m3)', 'bl_co', 'number', 'e.g. 1.2') +
      fld('RSPM (ug/m3)', 'bl_rspm', 'number', 'e.g. 45') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Air Quality Remarks', 'bl_air_remarks', 'textarea', 'Monitoring locations, sampling method, standards compared...') + '</div>') +
    card('fas fa-tint', 'ico-teal', 'Water Quality Baseline',
      '<div class="erb-form-grid">' +
      fld('pH', 'bl_water_ph', 'number', 'e.g. 7.2') +
      fld('DO (mg/L)', 'bl_water_do', 'number', 'e.g. 6.8') +
      fld('BOD (mg/L)', 'bl_water_bod', 'number', 'e.g. 3.2') +
      fld('COD (mg/L)', 'bl_water_cod', 'number', 'e.g. 12') +
      fld('TDS (mg/L)', 'bl_water_tds', 'number', 'e.g. 450') +
      fld('TSS (mg/L)', 'bl_water_tss', 'number', 'e.g. 28') +
      fld('Total Coliform (MPN/100mL)', 'bl_coliform', 'number', 'e.g. 23') +
      fld('Hardness (mg/L)', 'bl_hardness', 'number', 'e.g. 180') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Water Quality Remarks', 'bl_water_remarks', 'textarea', 'Source, sampling locations, seasonal variations...') + '</div>') +
    card('fas fa-volume-up', 'ico-orange', 'Noise Levels',
      '<div class="erb-form-grid">' +
      fld('Daytime Noise (dB)', 'bl_noise_day', 'number', 'e.g. 52') +
      fld('Nighttime Noise (dB)', 'bl_noise_night', 'number', 'e.g. 38') +
      fld('Peak Noise (dB)', 'bl_noise_peak', 'number', 'e.g. 68') +
      fld('Noise Standard Zone', 'bl_noise_zone', 'select', '', ['Industrial','Commercial','Residential / Educational / Hospital','Silence Zone']) +
      '</div>' +
      '<div class="erb-form-full">' + fld('Noise Remarks', 'bl_noise_remarks', 'textarea', 'Monitoring locations and measurement methodology...') + '</div>') +
    card('fas fa-layer-group', 'ico-yellow', 'Soil & Geology',
      '<div class="erb-form-grid">' +
      fld('Soil Type', 'bl_soil_type', 'select', '', ['Alluvial','Black Cotton','Red Laterite','Sandy Loam','Clay','Rocky','Mixed']) +
      fld('pH (Surface Soil)', 'bl_soil_ph', 'number', 'e.g. 6.8') +
      fld('Organic Carbon (%)', 'bl_soil_oc', 'number', 'e.g. 0.6') +
      fld('Available Nitrogen (kg/ha)', 'bl_soil_n', 'number', 'e.g. 180') +
      fld('Depth to Water Table (m)', 'bl_wt_depth', 'number', 'e.g. 8.5') +
      '</div>') +
    card('fas fa-water', 'ico-teal', 'Ground Water',
      '<div class="erb-form-grid">' +
      fld('Ground Water pH', 'bl_gw_ph', 'number', 'e.g. 7.1') +
      fld('TDS (mg/L)', 'bl_gw_tds', 'number', 'e.g. 380') +
      fld('Fluoride (mg/L)', 'bl_gw_fluoride', 'number', 'e.g. 0.8') +
      fld('Nitrate (mg/L)', 'bl_gw_nitrate', 'number', 'e.g. 12') +
      fld('Iron (mg/L)', 'bl_gw_iron', 'number', 'e.g. 0.2') +
      fld('Seasonal Trend', 'bl_gw_trend', 'select', '', ['Stable','Declining','Rising','Seasonal Variation']) +
      '</div>') +
    card('fas fa-cloud', 'ico-blue', 'Meteorology',
      '<div class="erb-form-grid">' +
      fld('Avg Annual Rainfall (mm)', 'bl_rainfall', 'number', 'e.g. 1200') +
      fld('Max Temp (Celsius)', 'bl_temp_max', 'number', 'e.g. 42') +
      fld('Min Temp (Celsius)', 'bl_temp_min', 'number', 'e.g. 8') +
      fld('Prevailing Wind Direction', 'bl_wind_dir', 'select', '', ['N','NE','E','SE','S','SW','W','NW','Variable']) +
      fld('Avg Wind Speed (m/s)', 'bl_wind_speed', 'number', 'e.g. 2.4') +
      fld('Relative Humidity (%)', 'bl_humidity', 'number', 'e.g. 65') +
      '</div>') +
    card('fas fa-dove', 'ico-green', 'Biodiversity & Ecology',
      '<div class="erb-form-full">' + fld('Flora Description', 'bl_flora', 'textarea', 'Plant species, vegetation type, tree density, rare/endemic species...') + '</div>' +
      '<div class="erb-form-full">' + fld('Fauna Description', 'bl_fauna', 'textarea', 'Animal species, bird species, aquatic life, Schedule I species...') + '</div>' +
      '<div class="erb-form-grid">' +
      fld('Land Use (Dominant)', 'bl_landuse', 'select', '', ['Agricultural','Forest','Wasteland','Industrial','Residential','Mixed Use','Wetland','Coastal']) +
      fld('Vegetation Cover (%)', 'bl_veg_cover', 'number', 'e.g. 35') +
      fld('Tree Density (trees/ha)', 'bl_tree_density', 'number', 'e.g. 85') +
      fld('Protected Species Present?', 'bl_protected_sp', 'select', '', ['Yes','No','Not Assessed']) +
      '</div>' +
      '<div class="erb-fg" style="margin-top:14px"><label>Baseline Supporting Images</label>' +
      imgWidget('bl_images', 'Upload baseline photos, lab reports, maps...') + '</div>');
}

/* ===========================
   STEP 4 — DAILY MONITORING
   =========================== */
function s4(){
  return stepHeader('Daily Environmental Monitoring', 4, 'fas fa-calendar-check',
    'Log daily monitoring data. Each record is permanently stored and linked to date. Records can be searched, filtered, and edited at any time.') +
    '<div class="erb-card">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">' +
    '<div class="erb-card-title" style="margin-bottom:0"><i class="fas fa-calendar-check erb-card-icon ico-blue"></i> Monitoring Records</div>' +
    '<button class="erb-btn erb-btn-primary" onclick="openMonModal(-1)"><i class="fas fa-plus"></i> Add Record</button>' +
    '</div>' +
    '<div class="erb-filter-bar">' +
    '<input type="text" id="monSearch" placeholder="Search date or remarks..." oninput="renderMonTable()" style="flex:1;min-width:160px"/>' +
    '<select id="monYear" onchange="renderMonTable()"><option value="">All Years</option></select>' +
    '<select id="monMonth" onchange="renderMonTable()">' +
    '<option value="">All Months</option>' +
    '<option value="01">January</option><option value="02">February</option>' +
    '<option value="03">March</option><option value="04">April</option>' +
    '<option value="05">May</option><option value="06">June</option>' +
    '<option value="07">July</option><option value="08">August</option>' +
    '<option value="09">September</option><option value="10">October</option>' +
    '<option value="11">November</option><option value="12">December</option>' +
    '</select>' +
    '<select id="monQtr" onchange="renderMonTable()">' +
    '<option value="">All Quarters</option>' +
    '<option value="Q1">Q1 (Jan-Mar)</option><option value="Q2">Q2 (Apr-Jun)</option>' +
    '<option value="Q3">Q3 (Jul-Sep)</option><option value="Q4">Q4 (Oct-Dec)</option>' +
    '</select>' +
    '</div>' +
    '<div id="monTableWrap"></div>' +
    '</div>';
}

function renderMonTable(){
  var wrap = document.getElementById('monTableWrap');
  if(!wrap) return;
  var records = getRecords();
  var yearSel = document.getElementById('monYear');
  if(yearSel){
    var years = [], curY = yearSel.value;
    records.forEach(function(r){ var y = (r.date||'').substring(0,4); if(y && years.indexOf(y)<0) years.push(y); });
    years.sort().reverse();
    yearSel.innerHTML = '<option value="">All Years</option>';
    years.forEach(function(y){ yearSel.innerHTML += '<option value="'+y+'"'+(y===curY?' selected':'')+'>'+y+'</option>'; });
  }
  var search = ((document.getElementById('monSearch')||{}).value||'').toLowerCase();
  var fYear = (document.getElementById('monYear')||{}).value||'';
  var fMonth = (document.getElementById('monMonth')||{}).value||'';
  var fQtr = (document.getElementById('monQtr')||{}).value||'';
  var qMap = {'Q1':['01','02','03'],'Q2':['04','05','06'],'Q3':['07','08','09'],'Q4':['10','11','12']};
  var filtered = records.filter(function(r){
    if(!r.date) return false;
    if(search && r.date.indexOf(search)<0 && (r.remarks||'').toLowerCase().indexOf(search)<0) return false;
    if(fYear && r.date.substring(0,4) !== fYear) return false;
    if(fMonth && r.date.substring(5,7) !== fMonth) return false;
    if(fQtr && qMap[fQtr] && qMap[fQtr].indexOf(r.date.substring(5,7))<0) return false;
    return true;
  });
  filtered.sort(function(a,b){ return b.date > a.date ? 1 : -1; });
  if(!filtered.length){
    wrap.innerHTML = '<div class="erb-empty"><i class="fas fa-clipboard-list"></i><p>No monitoring records found.<br>Click "Add Record" to log your first entry.</p></div>';
    return;
  }
  var h = '<div style="font-size:.78rem;color:#64748b;margin-bottom:8px;font-weight:700">'+filtered.length+' record(s)</div>';
  h += '<div class="erb-table-wrap"><table class="erb-table"><thead><tr>' +
    '<th>Date</th><th>PM10</th><th>PM2.5</th><th>SO2</th><th>NOx</th>' +
    '<th>Water pH</th><th>DO</th><th>BOD</th><th>Noise(dB)</th><th>Temp(C)</th><th>Remarks</th><th>Actions</th>' +
    '</tr></thead><tbody>';
  filtered.forEach(function(r){
    var oi = records.indexOf(r);
    h += '<tr>' +
      '<td><strong>' + fmtDate(r.date) + '</strong></td>' +
      '<td>' + (r.air_pm10||'-') + '</td>' +
      '<td>' + (r.air_pm25||'-') + '</td>' +
      '<td>' + (r.air_so2||'-') + '</td>' +
      '<td>' + (r.air_nox||'-') + '</td>' +
      '<td>' + (r.water_ph||'-') + '</td>' +
      '<td>' + (r.water_do||'-') + '</td>' +
      '<td>' + (r.water_bod||'-') + '</td>' +
      '<td>' + (r.noise_day||'-') + '</td>' +
      '<td>' + (r.met_temp||'-') + '</td>' +
      '<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(r.remarks||'')+'">' + (r.remarks||'-') + '</td>' +
      '<td style="white-space:nowrap">' +
      '<button class="erb-btn erb-btn-outline erb-btn-xs" onclick="openMonModal('+oi+')" title="Edit"><i class="fas fa-edit"></i></button> ' +
      '<button class="erb-btn erb-btn-danger erb-btn-xs" onclick="delMonRecord('+oi+')" title="Delete"><i class="fas fa-trash"></i></button>' +
      '</td></tr>';
  });
  h += '</tbody></table></div>';
  wrap.innerHTML = h;
}
window.renderMonTable = renderMonTable;

function fmtDate(d){
  if(!d) return '-';
  var p = d.split('-');
  if(p.length!==3) return d;
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return p[2] + ' ' + months[parseInt(p[1])-1] + ' ' + p[0];
}

function todayDate(){
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function pad(n){ return n<10 ? '0'+n : ''+n; }

function mf(label, id, rKey, rec){
  return '<div class="erb-fg"><label>' + label + '</label>' +
    '<input type="number" id="' + id + '" value="' + (rec[rKey]||'') + '" step="0.01" ' +
    'style="padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:.83rem;font-family:Inter,sans-serif;outline:none;width:100%"/>' +
    '</div>';
}

function openMonModal(idx){
  editingMonIdx = idx;
  var records = getRecords();
  var r = idx >= 0 ? records[idx] : {};
  document.getElementById('monModalTitle').textContent = idx >= 0 ? 'Edit Record — ' + fmtDate(r.date) : 'Add Monitoring Record';
  var b = document.getElementById('monModalBody');
  b.innerHTML =
    '<div class="erb-fg" style="margin-bottom:14px">' +
      '<label>Date <span style="color:#dc2626">*</span></label>' +
      '<input type="date" id="mon_date" value="'+(r.date||todayDate())+'" max="'+todayDate()+'" ' +
      'style="padding:10px 13px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:.85rem;font-family:Inter,sans-serif;outline:none;width:100%"/>' +
    '</div>' +
    '<div class="mon-section-head">Air Quality</div>' +
    '<div class="erb-form-grid">' +
    mf('PM10 (ug/m3)', 'mon_pm10', 'air_pm10', r) +
    mf('PM2.5 (ug/m3)', 'mon_pm25', 'air_pm25', r) +
    mf('SO2 (ug/m3)', 'mon_so2', 'air_so2', r) +
    mf('NOx (ug/m3)', 'mon_nox', 'air_nox', r) +
    mf('CO (mg/m3)', 'mon_co', 'air_co', r) +
    mf('RSPM (ug/m3)', 'mon_rspm', 'air_rspm', r) +
    '</div>' +
    '<div class="mon-section-head">Water Quality</div>' +
    '<div class="erb-form-grid">' +
    mf('pH', 'mon_wph', 'water_ph', r) +
    mf('DO (mg/L)', 'mon_do', 'water_do', r) +
    mf('BOD (mg/L)', 'mon_bod', 'water_bod', r) +
    mf('COD (mg/L)', 'mon_cod', 'water_cod', r) +
    mf('TDS (mg/L)', 'mon_tds', 'water_tds', r) +
    mf('TSS (mg/L)', 'mon_tss', 'water_tss', r) +
    '</div>' +
    '<div class="mon-section-head">Noise</div>' +
    '<div class="erb-form-grid">' +
    mf('Daytime (dB)', 'mon_nd', 'noise_day', r) +
    mf('Nighttime (dB)', 'mon_nn', 'noise_night', r) +
    mf('Peak (dB)', 'mon_np', 'noise_peak', r) +
    '</div>' +
    '<div class="mon-section-head">Soil</div>' +
    '<div class="erb-form-grid">' +
    mf('Soil pH', 'mon_sph', 'soil_ph', r) +
    mf('Moisture (%)', 'mon_sm', 'soil_moisture', r) +
    '</div>' +
    '<div class="mon-section-head">Meteorology</div>' +
    '<div class="erb-form-grid">' +
    mf('Temperature (Celsius)', 'mon_temp', 'met_temp', r) +
    mf('Humidity (%)', 'mon_hum', 'met_humidity', r) +
    mf('Wind Speed (m/s)', 'mon_wind', 'met_wind', r) +
    mf('Rainfall (mm)', 'mon_rain', 'met_rain', r) +
    '</div>' +
    '<div class="mon-section-head">Remarks & Images</div>' +
    '<div class="erb-fg" style="margin-bottom:12px">' +
      '<textarea id="mon_remarks" placeholder="Observations, anomalies, corrective actions..." rows="3" ' +
      'style="width:100%;padding:10px 13px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:.85rem;font-family:Inter,sans-serif;outline:none">' +
      (r.remarks||'') + '</textarea>' +
    '</div>' +
    '<div class="erb-fg">' +
      '<label>Supporting Images</label>' +
      '<input type="file" id="mon_imgs" accept="image/*" multiple style="padding:8px 0;font-size:.82rem"/>' +
    '</div>';
  document.getElementById('monModal').style.display = 'flex';
}
window.openMonModal = openMonModal;

function closeMonModal(){
  document.getElementById('monModal').style.display = 'none';
  editingMonIdx = -1;
}
window.closeMonModal = closeMonModal;

function saveMonRecord(){
  var date = document.getElementById('mon_date').value;
  if(!date){ alert('Please select a date.'); return; }
  var r = {
    date: date,
    air_pm10: document.getElementById('mon_pm10').value,
    air_pm25: document.getElementById('mon_pm25').value,
    air_so2: document.getElementById('mon_so2').value,
    air_nox: document.getElementById('mon_nox').value,
    air_co: document.getElementById('mon_co').value,
    air_rspm: document.getElementById('mon_rspm').value,
    water_ph: document.getElementById('mon_wph').value,
    water_do: document.getElementById('mon_do').value,
    water_bod: document.getElementById('mon_bod').value,
    water_cod: document.getElementById('mon_cod').value,
    water_tds: document.getElementById('mon_tds').value,
    water_tss: document.getElementById('mon_tss').value,
    noise_day: document.getElementById('mon_nd').value,
    noise_night: document.getElementById('mon_nn').value,
    noise_peak: document.getElementById('mon_np').value,
    soil_ph: document.getElementById('mon_sph').value,
    soil_moisture: document.getElementById('mon_sm').value,
    met_temp: document.getElementById('mon_temp').value,
    met_humidity: document.getElementById('mon_hum').value,
    met_wind: document.getElementById('mon_wind').value,
    met_rain: document.getElementById('mon_rain').value,
    remarks: document.getElementById('mon_remarks').value,
    updatedAt: new Date().toISOString()
  };
  var records = getRecords();
  if(editingMonIdx >= 0){
    r.createdAt = records[editingMonIdx].createdAt || r.updatedAt;
    records[editingMonIdx] = r;
  } else {
    r.createdAt = r.updatedAt;
    records.push(r);
  }
  saveRecords(records);
  closeMonModal();
  renderMonTable();
}
window.saveMonRecord = saveMonRecord;

window.delMonRecord = function(idx){
  if(!confirm('Delete this monitoring record? This cannot be undone.')) return;
  var records = getRecords();
  records.splice(idx, 1);
  saveRecords(records);
  renderMonTable();
};

/* ===========================
   STEP 5 — WASTE MANAGEMENT
   =========================== */
function s5(){
  return stepHeader('Waste Management', 5, 'fas fa-trash-alt', 'Document all waste types, quantities, treatment methods and disposal practices.') +
    card('fas fa-biohazard', 'ico-red', 'Hazardous Waste',
      '<div class="erb-form-grid">' +
      fld('HW Category', 'waste_haz_cat', 'select', '', ['Category 1 - Oil/Solvent Waste','Category 2 - Acid/Alkali Waste','Category 3 - Pesticide Waste','Category 5 - Inorganic Chemical Waste','Category 28 - ETP Sludge','Category 33 - Paint/Resin Waste','Category 35 - E-Waste','Multiple Categories','Other']) +
      fld('Quantity Generated (MT/year)', 'waste_haz_qty', 'number', 'e.g. 12.5') +
      fld('HW Authorization No.', 'waste_haz_auth', 'text', 'e.g. HW/MH/2024/...') +
      fld('Disposal Method', 'waste_haz_disposal', 'select', '', ['TSDF','Incineration','Cement Kiln Co-Processing','Recycling / Reuse','Sale to Authorized Recycler','Other']) +
      fld('TSDF / Vendor Name', 'waste_haz_vendor', 'text', 'e.g. MEPZ TSDF') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Hazardous Waste Notes', 'waste_haz_notes', 'textarea', 'Storage conditions, labeling, manifest, emergency procedures...') + '</div>') +
    card('fas fa-recycle', 'ico-green', 'Non-Hazardous Waste',
      '<div class="erb-form-grid">' +
      fld('Solid Waste (MT/year)', 'waste_solid_qty', 'number', 'e.g. 45') +
      fld('Solid Waste Disposal', 'waste_solid_disp', 'select', '', ['Municipal SWM','Composting','Sanitary Landfill','Incineration','Sold to Kabadiwala','Other']) +
      fld('Plastic Waste (MT/year)', 'waste_plastic_qty', 'number', 'e.g. 2.4') +
      fld('Plastic Waste Handling', 'waste_plastic_disp', 'select', '', ['PRO Registration','Authorized Recycler','Buy-Back Agreement','Municipal','Other']) +
      fld('Biomedical Waste (kg/year)', 'waste_bio_qty', 'number', 'e.g. 180') +
      fld('Biomedical Disposal', 'waste_bio_disp', 'select', '', ['CBWTF','Incineration','Autoclave + Shredder','Other']) +
      '</div>') +
    card('fas fa-water', 'ico-teal', 'Liquid Waste / Effluent',
      '<div class="erb-form-grid">' +
      fld('Effluent Volume (KLD)', 'waste_eff_vol', 'number', 'e.g. 85') +
      fld('ETP Capacity (KLD)', 'waste_etp_cap', 'number', 'e.g. 120') +
      fld('Treated Effluent Disposal', 'waste_eff_disp', 'select', '', ['CETP','MIDC Drain','Irrigation Reuse','Zero Liquid Discharge','Marine Outfall','STP','Other']) +
      fld('ETP Type', 'waste_etp_type', 'select', '', ['Primary Treatment Only','Secondary (Biological)','Tertiary Treatment','ZLD System','Physico-Chemical','Other']) +
      fld('Treated BOD (mg/L)', 'waste_eff_bod', 'number', 'e.g. 18') +
      fld('Treated COD (mg/L)', 'waste_eff_cod', 'number', 'e.g. 85') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Effluent Treatment Notes', 'waste_eff_notes', 'textarea', 'Treatment process, sludge management, recycle/reuse details...') + '</div>') +
    card('fas fa-camera', 'ico-orange', 'Waste Management Images',
      '<div class="erb-fg"><label>Upload Photos</label>' + imgWidget('waste_images', 'Waste yard, ETP, HW storage, TSDF transport photos...') + '</div>');
}

/* ===========================
   STEP 6 — ENERGY & WATER
   =========================== */
function s6(){
  return stepHeader('Energy & Water Consumption', 6, 'fas fa-bolt', 'Record energy sources, consumption data, renewable energy and water use patterns.') +
    card('fas fa-plug', 'ico-blue', 'Electricity',
      '<div class="erb-form-grid">' +
      fld('Annual Consumption (MWh)', 'en_elec_annual', 'number', 'e.g. 3250') +
      fld('Peak Demand (kW)', 'en_elec_peak', 'number', 'e.g. 850') +
      fld('Power Source', 'en_elec_source', 'select', '', ['State Grid (MSEDCL)','State Grid (TNEB)','State Grid (DISCOM)','Captive Power Plant','IPP','Open Access','Other']) +
      fld('Contract Demand (kVA)', 'en_elec_contract', 'number', 'e.g. 1000') +
      fld('Energy Intensity (MWh/MT)', 'en_elec_intensity', 'number', 'e.g. 0.065') +
      fld('Power Factor', 'en_elec_pf', 'number', 'e.g. 0.92') +
      '</div>') +
    card('fas fa-industry', 'ico-orange', 'DG Sets & Fuel',
      '<div class="erb-form-grid">' +
      fld('No. of DG Sets', 'en_dg_count', 'number', 'e.g. 3') +
      fld('Total DG Capacity (kVA)', 'en_dg_cap', 'number', 'e.g. 750') +
      fld('Annual DG Usage (Hours)', 'en_dg_hours', 'number', 'e.g. 240') +
      fld('Diesel Consumption (KL/year)', 'en_diesel_qty', 'number', 'e.g. 45') +
      fld('Furnace Oil (KL/year)', 'en_fo_qty', 'number', 'e.g. 0') +
      fld('LPG / PNG (MT/year)', 'en_lpg_qty', 'number', 'e.g. 12') +
      fld('Coal (MT/year)', 'en_coal_qty', 'number', 'e.g. 0') +
      fld('Biomass (MT/year)', 'en_biomass_qty', 'number', 'e.g. 0') +
      '</div>') +
    card('fas fa-sun', 'ico-yellow', 'Renewable Energy',
      '<div class="erb-form-grid">' +
      fld('Solar Installed (kWp)', 'en_solar_cap', 'number', 'e.g. 200') +
      fld('Solar Generation (MWh/year)', 'en_solar_gen', 'number', 'e.g. 280') +
      fld('Wind Energy (MWh/year)', 'en_wind_gen', 'number', 'e.g. 0') +
      fld('Biogas Generation (m3/year)', 'en_biogas_gen', 'number', 'e.g. 0') +
      fld('RE Share (%)', 'en_re_share', 'number', 'e.g. 8.6') +
      fld('RE Target (%)', 'en_re_target', 'number', 'e.g. 25') +
      '</div>') +
    card('fas fa-thermometer-half', 'ico-red', 'Steam & Heat',
      '<div class="erb-form-grid">' +
      fld('Boiler Capacity (TPH)', 'en_boiler_cap', 'number', 'e.g. 5') +
      fld('Steam Generation (MT/year)', 'en_steam_gen', 'number', 'e.g. 12000') +
      fld('Boiler Fuel Type', 'en_boiler_fuel', 'select', '', ['Coal','Biomass','Natural Gas','LPG','Furnace Oil','Agro Waste','Other']) +
      fld('Boiler Efficiency (%)', 'en_boiler_eff', 'number', 'e.g. 82') +
      '</div>') +
    card('fas fa-tint', 'ico-teal', 'Water Consumption',
      '<div class="erb-form-grid">' +
      fld('Total Water Use (KLD)', 'wtr_total', 'number', 'e.g. 250') +
      fld('Source of Water', 'wtr_source', 'select', '', ['Ground Water (Borewell)','Municipal Supply (MIDC)','Surface Water (River)','Recycled Water','Rain Water Harvesting','Mixed Sources']) +
      fld('Industrial Process (KLD)', 'wtr_process', 'number', 'e.g. 120') +
      fld('Cooling Water (KLD)', 'wtr_cooling', 'number', 'e.g. 80') +
      fld('Domestic Use (KLD)', 'wtr_domestic', 'number', 'e.g. 30') +
      fld('Water Recycled (KLD)', 'wtr_recycled', 'number', 'e.g. 45') +
      fld('Rain Water Harvested (KL/year)', 'wtr_rwh', 'number', 'e.g. 3500') +
      fld('Water Intensity (KL/MT)', 'wtr_intensity', 'number', 'e.g. 5.0') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Water Management Notes', 'wtr_notes', 'textarea', 'Conservation measures, STP, ZLD status, reuse strategy...') + '</div>');
}

/* ===========================
   STEP 7 — CARBON EMISSIONS
   =========================== */
function s7(){
  return stepHeader('Carbon Emissions', 7, 'fas fa-cloud', 'Document greenhouse gas emissions across all scopes with calculations and reduction targets.') +
    card('fas fa-fire', 'ico-red', 'Scope 1 — Direct Emissions',
      '<div style="font-size:.78rem;color:#64748b;margin-bottom:12px">Emissions from owned / controlled sources: boilers, furnaces, vehicles, process emissions.</div>' +
      '<div class="erb-form-grid">' +
      fld('Stationary Combustion (tCO2e)', 'ghg_s1_stationary', 'number', 'e.g. 850') +
      fld('Mobile Combustion (tCO2e)', 'ghg_s1_mobile', 'number', 'e.g. 42') +
      fld('Process Emissions (tCO2e)', 'ghg_s1_process', 'number', 'e.g. 0') +
      fld('Fugitive Emissions (tCO2e)', 'ghg_s1_fugitive', 'number', 'e.g. 5') +
      fld('Total Scope 1 (tCO2e)', 'ghg_s1_total', 'number', 'e.g. 897') +
      '</div>') +
    card('fas fa-plug', 'ico-blue', 'Scope 2 — Indirect Energy Emissions',
      '<div style="font-size:.78rem;color:#64748b;margin-bottom:12px">Emissions from purchased electricity, steam, heat or cooling.</div>' +
      '<div class="erb-form-grid">' +
      fld('Grid Electricity (tCO2e)', 'ghg_s2_elec', 'number', 'e.g. 2340') +
      fld('Purchased Steam (tCO2e)', 'ghg_s2_steam', 'number', 'e.g. 0') +
      fld('Emission Factor (kgCO2e/kWh)', 'ghg_s2_ef', 'number', 'e.g. 0.72') +
      fld('Total Scope 2 (tCO2e)', 'ghg_s2_total', 'number', 'e.g. 2340') +
      '</div>') +
    card('fas fa-link', 'ico-purple', 'Scope 3 — Value Chain Emissions',
      '<div style="font-size:.78rem;color:#64748b;margin-bottom:12px">Indirect emissions from supply chain, business travel, waste disposal, etc.</div>' +
      '<div class="erb-form-grid">' +
      fld('Business Travel (tCO2e)', 'ghg_s3_travel', 'number', 'e.g. 25') +
      fld('Employee Commuting (tCO2e)', 'ghg_s3_commute', 'number', 'e.g. 68') +
      fld('Upstream Transport (tCO2e)', 'ghg_s3_upstream', 'number', 'e.g. 120') +
      fld('Downstream Transport (tCO2e)', 'ghg_s3_downstream', 'number', 'e.g. 95') +
      fld('Waste Disposal (tCO2e)', 'ghg_s3_waste', 'number', 'e.g. 18') +
      fld('Total Scope 3 (tCO2e)', 'ghg_s3_total', 'number', 'e.g. 326') +
      '</div>') +
    card('fas fa-chart-bar', 'ico-green', 'Summary & Reduction Targets',
      '<div class="erb-form-grid">' +
      fld('Total GHG Emissions (tCO2e)', 'ghg_total', 'number', 'e.g. 3563') +
      fld('GHG Intensity (tCO2e/MT)', 'ghg_intensity', 'number', 'e.g. 0.071') +
      fld('Base Year', 'ghg_base_year', 'number', 'e.g. 2020') +
      fld('Base Year Emissions (tCO2e)', 'ghg_base_emissions', 'number', 'e.g. 3900') +
      fld('Reduction Achieved (%)', 'ghg_reduction_pct', 'number', 'e.g. 8.6') +
      fld('Reduction Target (%)', 'ghg_target_pct', 'number', 'e.g. 30') +
      fld('Target Year', 'ghg_target_year', 'number', 'e.g. 2030') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Emission Sources & Calculations', 'ghg_sources', 'textarea', 'Methodology (GHG Protocol / ISO 14064), emission factors, data sources...') + '</div>' +
      '<div class="erb-form-full">' + fld('Reduction Activities', 'ghg_reduction_activities', 'textarea', 'Energy efficiency projects, RE installations, process optimization, carbon offsets...') + '</div>');
}

/* ===========================
   STEP 8 — COMPLIANCE
   =========================== */
function s8(){
  return stepHeader('Compliance & Approvals', 8, 'fas fa-certificate', 'Document all regulatory consents, environmental clearances, audits and certifications.') +
    card('fas fa-leaf', 'ico-green', 'MoEFCC Clearances',
      '<div class="erb-form-grid">' +
      fld('Environmental Clearance No.', 'comp_ec_no', 'text', 'e.g. J-11015/9/2024-IA.II(I)') +
      fld('EC Issue Date', 'comp_ec_date', 'date', '') +
      fld('EC Valid Till', 'comp_ec_valid', 'date', '') +
      fld('EC Status', 'comp_ec_status', 'select', '', ['Valid','Expired','Under Renewal','Not Required','Applied']) +
      fld('Forest Clearance No.', 'comp_fc_no', 'text', 'e.g. FC/MH/2024/...') +
      fld('Wildlife Clearance', 'comp_wl_no', 'text', 'e.g. Not Applicable') +
      '</div>') +
    card('fas fa-industry', 'ico-blue', 'CPCB / SPCB Consents',
      '<div class="erb-form-grid">' +
      fld('Consent to Establish (CTE) No.', 'comp_cte_no', 'text', 'e.g. CTE/MH/...') +
      fld('CTE Valid Till', 'comp_cte_valid', 'date', '') +
      fld('Consent to Operate (CTO) No.', 'comp_cto_no', 'text', 'e.g. CTO/MH/...') +
      fld('CTO Valid Till', 'comp_cto_valid', 'date', '') +
      fld('SPCB Name', 'comp_spcb', 'select', '', ['MPCB (Maharashtra)','TNPCB (Tamil Nadu)','GPCB (Gujarat)','KSPCB (Karnataka)','CPCB (Central)','TSPCB (Telangana)','DPCC (Delhi)','UPPCB (Uttar Pradesh)','RPCB (Rajasthan)','WBPCB (West Bengal)','Other']) +
      fld('Industry Category', 'comp_ind_cat', 'select', '', ['Red','Orange','Green','White']) +
      fld('Air Consent No.', 'comp_air_consent', 'text', 'e.g. MPCB/AIR/...') +
      fld('Water Consent No.', 'comp_water_consent', 'text', 'e.g. MPCB/WATER/...') +
      '</div>') +
    card('fas fa-award', 'ico-yellow', 'ISO & Certifications',
      '<div class="erb-form-grid">' +
      fld('ISO 14001 Certificate No.', 'comp_iso14001', 'text', 'e.g. ISO14001/2024/...') +
      fld('ISO 14001 Valid Till', 'comp_iso14001_valid', 'date', '') +
      fld('ISO 9001 Certificate No.', 'comp_iso9001', 'text', 'e.g. ISO9001/2024/...') +
      fld('ISO 45001 Certificate No.', 'comp_iso45001', 'text', 'e.g. ISO45001/2024/...') +
      fld('Other Certifications', 'comp_other_cert', 'text', 'e.g. GreenPro, LEED, BIS...') +
      '</div>') +
    card('fas fa-search', 'ico-purple', 'Audits',
      '<div class="erb-form-grid">' +
      fld('Last Environmental Audit Date', 'comp_env_audit_date', 'date', '') +
      fld('Audit Conducted By', 'comp_env_audit_by', 'text', 'e.g. Third-party auditor name') +
      fld('Last Energy Audit Date', 'comp_energy_audit_date', 'date', '') +
      fld('Safety Audit Date', 'comp_safety_audit_date', 'date', '') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Audit Findings Summary', 'comp_audit_findings', 'textarea', 'Major findings and corrective actions taken...') + '</div>') +
    card('fas fa-file-upload', 'ico-orange', 'Legal Approvals & Documents',
      '<div class="erb-form-grid">' +
      fld('Factory License No.', 'comp_factory_lic', 'text', 'e.g. MH/FAC/2024/...') +
      fld('Factory License Valid Till', 'comp_factory_lic_valid', 'date', '') +
      fld('Fire NOC No.', 'comp_fire_noc', 'text', 'e.g. FIRE/NOC/2024/...') +
      fld('Electrical Inspector Clearance', 'comp_electrical', 'text', 'e.g. EIC/2024/...') +
      fld('PCB Cess Paid (INR Lakhs/year)', 'comp_cess', 'number', 'e.g. 2.5') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Non-Compliance Issues / Notices', 'comp_noncompliance', 'textarea', 'Show cause notices, directions, penalties, remedial actions...') + '</div>' +
      '<div class="erb-fg" style="margin-top:14px"><label>Compliance Documents</label>' +
      imgWidget('comp_docs', 'Upload EC, CTO, ISO certificates, audit reports...') + '</div>');
}

/* ===========================
   STEP 9 — CSR & SUSTAINABILITY
   =========================== */
function s9(){
  return stepHeader('CSR & Sustainability', 9, 'fas fa-hand-holding-heart', 'Document green initiatives, community programs, occupational health and long-term sustainability commitments.') +
    card('fas fa-seedling', 'ico-green', 'Green Initiatives',
      '<div class="erb-form-grid">' +
      fld('Trees Planted (Total)', 'csr_trees', 'number', 'e.g. 2500') +
      fld('Green Belt Area (Ha)', 'csr_greenbelt', 'number', 'e.g. 3.5') +
      fld('Species Planted', 'csr_species', 'text', 'e.g. Neem, Peepal, Mango, Banyan') +
      fld('Tree Survival Rate (%)', 'csr_tree_survival', 'number', 'e.g. 88') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Green Initiative Details', 'csr_green_details', 'textarea', 'Tree plantation drives, green belt development, biodiversity enhancement...') + '</div>') +
    card('fas fa-solar-panel', 'ico-yellow', 'Resource Conservation',
      '<div class="erb-form-grid">' +
      fld('Solar Projects', 'csr_solar', 'text', 'e.g. 200 kWp rooftop solar') +
      fld('Water Conservation', 'csr_water_con', 'text', 'e.g. Rainwater harvesting, STP reuse') +
      fld('Waste Reduction (%)', 'csr_waste_reduction', 'number', 'e.g. 15') +
      fld('Energy Savings (MWh/year)', 'csr_energy_saving', 'number', 'e.g. 180') +
      '</div>') +
    card('fas fa-users', 'ico-blue', 'Community Projects',
      '<div class="erb-form-grid">' +
      fld('CSR Budget (INR Lakhs)', 'csr_budget', 'number', 'e.g. 45') +
      fld('No. of Villages Covered', 'csr_villages', 'number', 'e.g. 5') +
      fld('Beneficiaries Reached', 'csr_beneficiaries', 'number', 'e.g. 3200') +
      fld('Primary Focus Area', 'csr_focus', 'select', '', ['Education','Healthcare','Livelihood','Infrastructure','Environment','Women Empowerment','Skill Development','Multiple']) +
      '</div>' +
      '<div class="erb-form-full">' + fld('Community Projects Description', 'csr_community_desc', 'textarea', 'Each CSR project: name, location, beneficiaries, outcomes, budget...') + '</div>') +
    card('fas fa-heartbeat', 'ico-red', 'Occupational Health & Safety',
      '<div class="erb-form-grid">' +
      fld('Total Workforce', 'ohs_workforce', 'number', 'e.g. 320') +
      fld('Contract Workers', 'ohs_contract', 'number', 'e.g. 85') +
      fld('Lost Time Injuries (LTI)', 'ohs_lti', 'number', 'e.g. 0') +
      fld('LTI Frequency Rate', 'ohs_ltifr', 'number', 'e.g. 0') +
      fld('Medical Treatment Cases', 'ohs_mtc', 'number', 'e.g. 3') +
      fld('Safety Training Hrs/Employee', 'ohs_training', 'number', 'e.g. 12') +
      fld('Mock Drills Conducted', 'ohs_drills', 'number', 'e.g. 4') +
      fld('OHS Audit Score (%)', 'ohs_audit_score', 'number', 'e.g. 92') +
      '</div>' +
      '<div class="erb-form-full">' + fld('Safety Programs', 'ohs_initiatives', 'textarea', 'Key safety programs, PPE compliance, emergency response, health checkups...') + '</div>') +
    card('fas fa-camera', 'ico-teal', 'CSR Photos',
      '<div class="erb-fg"><label>Upload Photos</label>' + imgWidget('csr_images', 'CSR activity photos, green belt, community programs...') + '</div>') +
    card('fas fa-bullseye', 'ico-purple', 'Sustainability Goals',
      '<div class="erb-form-full">' + fld('Short-term Goals (1-2 years)', 'sus_goals_short', 'textarea', 'e.g. Achieve ZLD by 2025, plant 5000 trees, reduce GHG by 10%...') + '</div>' +
      '<div class="erb-form-full">' + fld('Long-term Goals (5-10 years)', 'sus_goals_long', 'textarea', 'e.g. Carbon neutral by 2035, 100% RE by 2030, zero landfill waste...') + '</div>' +
      '<div class="erb-form-full">' + fld('UN SDG Alignment', 'sus_sdg', 'textarea', 'e.g. SDG 6 (Clean Water), SDG 7 (Clean Energy), SDG 13 (Climate Action), SDG 15 (Life on Land)...') + '</div>');
}

/* ===========================
   STEP 10 — REVIEW
   =========================== */
function s10(){
  return stepHeader('Review & Summary', 10, 'fas fa-eye', 'All data is saved. Review your entries and export if needed.') +
    '<div class="erb-complete-wrap">' +
    '<div class="erb-complete-icon">&#10003;</div>' +
    '<div class="erb-complete-title">Data Collection Complete</div>' +
    '<div class="erb-complete-sub">Your environmental data is securely saved. Return anytime to update records.</div>' +
    '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
    '<button class="erb-btn erb-btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Summary</button>' +
    '<button class="erb-btn erb-btn-outline" onclick="exportData()"><i class="fas fa-download"></i> Export JSON</button>' +
    '</div></div>' +
    '<div id="reviewContent"></div>';
}

function renderReview(){
  var d = getData();
  var records = getRecords();
  var wrap = document.getElementById('reviewContent');
  if(!wrap) return;
  function rv(k){ return d[k] || '<span style="color:#94a3b8;font-weight:400">Not entered</span>'; }
  function sec(title, icon, step, kvs){
    var h = '<div class="erb-review-section">' +
      '<div class="erb-review-title">' +
      '<span><i class="' + icon + '" style="margin-right:7px;opacity:.6"></i>' + title + '</span>' +
      '<button class="erb-btn erb-btn-outline erb-btn-xs" onclick="goToStep(' + step + ')"><i class="fas fa-edit"></i> Edit</button>' +
      '</div><div class="erb-review-grid">';
    kvs.forEach(function(kv){ h += '<div class="erb-kv"><div class="k">' + kv[0] + '</div><div class="v">' + rv(kv[1]) + '</div></div>'; });
    h += '</div></div>';
    return h;
  }
  var h = '';
  h += sec('Organization Profile', 'fas fa-building', 1, [
    ['Organization','org_name'],['Industry','org_industry'],['Plant','org_plant'],
    ['City','org_city'],['State','org_state'],['Contact','org_contact'],['Email','org_email'],['Phone','org_phone']
  ]);
  h += sec('Project Information', 'fas fa-folder-open', 2, [
    ['Project Name','proj_name'],['Type','proj_type'],['Category','proj_category'],
    ['Cost (Cr.)','proj_cost'],['Land (Ha)','proj_land'],['Capacity','proj_capacity'],
    ['Start','proj_start'],['Completion','proj_end']
  ]);
  h += sec('Environmental Baseline', 'fas fa-tree', 3, [
    ['PM10 (ug/m3)','bl_pm10'],['PM2.5','bl_pm25'],['Water pH','bl_water_ph'],
    ['Water DO','bl_water_do'],['Water BOD','bl_water_bod'],['Noise Day (dB)','bl_noise_day'],
    ['Soil Type','bl_soil_type'],['Rainfall (mm)','bl_rainfall']
  ]);
  h += '<div class="erb-review-section">' +
    '<div class="erb-review-title">' +
    '<span><i class="fas fa-calendar-check" style="margin-right:7px;opacity:.6"></i>Daily Monitoring Records</span>' +
    '<button class="erb-btn erb-btn-outline erb-btn-xs" onclick="goToStep(4)"><i class="fas fa-edit"></i> View</button>' +
    '</div>' +
    '<div style="font-size:.85rem;color:#374151"><strong>' + records.length + '</strong> monitoring records saved.' +
    (records.length > 0 ? ' Latest: ' + fmtDate(records[records.length-1].date) : ' Click "View" to add records.') +
    '</div></div>';
  h += sec('Waste Management', 'fas fa-trash-alt', 5, [
    ['HW Qty (MT/yr)','waste_haz_qty'],['HW Disposal','waste_haz_disposal'],
    ['Solid Waste (MT/yr)','waste_solid_qty'],['Effluent (KLD)','waste_eff_vol'],['ETP Type','waste_etp_type']
  ]);
  h += sec('Energy & Water', 'fas fa-bolt', 6, [
    ['Electricity (MWh/yr)','en_elec_annual'],['Solar (kWp)','en_solar_cap'],
    ['RE Share (%)','en_re_share'],['Total Water (KLD)','wtr_total'],['Water Source','wtr_source']
  ]);
  h += sec('Carbon Emissions', 'fas fa-cloud', 7, [
    ['Scope 1 (tCO2e)','ghg_s1_total'],['Scope 2 (tCO2e)','ghg_s2_total'],
    ['Total GHG (tCO2e)','ghg_total'],['GHG Intensity','ghg_intensity'],['Target (%)','ghg_target_pct']
  ]);
  h += sec('Compliance', 'fas fa-certificate', 8, [
    ['EC No.','comp_ec_no'],['EC Status','comp_ec_status'],['CTO No.','comp_cto_no'],
    ['CTO Valid','comp_cto_valid'],['ISO 14001','comp_iso14001']
  ]);
  h += sec('CSR & Sustainability', 'fas fa-hand-holding-heart', 9, [
    ['Trees Planted','csr_trees'],['CSR Budget (Lakh)','csr_budget'],
    ['Beneficiaries','csr_beneficiaries'],['LTI Count','ohs_lti'],['Workforce','ohs_workforce']
  ]);
  wrap.innerHTML = h;
}

window.exportData = function(){
  var payload = {
    formData: getData(),
    monitoringRecords: getRecords(),
    exportedAt: new Date().toISOString(),
    orgId: getOrgId()
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eia_data_' + getOrgId() + '_' + todayDate() + '.json';
  a.click();
};

/* ---- STEP HEADER ---- */
function stepHeader(title, n, icon, desc){
  return '<div class="erb-step-header">' +
    '<div class="erb-step-badge"><i class="' + icon + '"></i> Step ' + n + ' of ' + TOTAL_STEPS + '</div>' +
    '<div class="erb-step-title">' + title + '</div>' +
    '<div class="erb-step-desc">' + desc + '</div>' +
    '</div>';
}

/* ---- INIT ---- */
(function(){
  var step = parseInt(new URLSearchParams(window.location.search).get('step')) || 1;
  currentStep = Math.max(1, Math.min(TOTAL_STEPS, step));
  renderStep();
})();

})();
