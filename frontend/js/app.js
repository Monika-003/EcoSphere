'use strict';

/* ════════════════════════ STARS ════════════════════════ */
function initStars(id){
  var c=document.getElementById(id);if(!c)return;
  c.width=window.innerWidth;c.height=window.innerHeight;
  var ctx=c.getContext('2d');
  var stars=Array.from({length:130},function(){return{x:Math.random()*c.width,y:Math.random()*c.height*.65,r:Math.random()*1.4+.3,t:Math.random()*Math.PI*2,s:Math.random()*.02+.005}});
  (function draw(){requestAnimationFrame(draw);ctx.clearRect(0,0,c.width,c.height);
    stars.forEach(function(s){s.t+=s.s;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='rgba(200,255,220,'+(0.2+0.7*(0.5+0.5*Math.sin(s.t)))+')';ctx.fill();});
  })();
}

/* ════════════ PORTAL IFRAME — opens lab/reg on same page ════════════ */
window.openPortalIframe = function(src) {
  var overlay = document.getElementById('portalOverlay');
  var iframe  = document.getElementById('portalIframe');
  if (!overlay || !iframe) return;
  iframe.src = src;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closePortalIframe = function() {
  var overlay = document.getElementById('portalOverlay');
  var iframe  = document.getElementById('portalIframe');
  if (!overlay || !iframe) return;
  overlay.style.display = 'none';
  iframe.src = 'about:blank';
  document.body.style.overflow = '';
};

/* ════════════════════════ ORG-SPECIFIC PORTAL OPENERS ════════════════════════ */
window.openLabPortal = function() {
  var org      = sessionStorage.getItem('ecoOrgName')     || '';
  var industry = sessionStorage.getItem('ecoIndustry')   || '';
  var role     = typeof selectedRole !== 'undefined' ? selectedRole : '';
  var params   = new URLSearchParams({ org:org, industry:industry, role:role });
  window.location.href = 'lab-portal.html?' + params.toString();
};

window.openRegPortal = function() {
  var org      = sessionStorage.getItem('ecoOrgName')     || '';
  var industry = sessionStorage.getItem('ecoIndustry')   || '';
  var role     = typeof selectedRole !== 'undefined' ? selectedRole : '';
  var params   = new URLSearchParams({ org:org, industry:industry, role:role });
  window.location.href = 'reg-portal.html?' + params.toString();
};

/* ════════════════════════ AUTO-LOGIN (from org-portal) ════════════════════════ */
function runAutoLogin(){
  var params = new URLSearchParams(window.location.search);
  if(params.get('autologin')==='1' || sessionStorage.getItem('ecoAutoLogin')==='1'){
    sessionStorage.removeItem('ecoAutoLogin');
    // Skip loader entirely — org already logged in via org-portal
    var org      = sessionStorage.getItem('ecoOrgName')     || 'Organisation';
    var industry = sessionStorage.getItem('ecoIndustry')    || 'Manufacturing';
    var role     = sessionStorage.getItem('ecoRole')        || 'Environmental Officer';

    // Hide splash immediately
    var splash=document.getElementById('splashScreen');
    if(splash) splash.style.display='none';

    // Show main app directly
    var app=document.getElementById('mainApp');
    if(app){
      app.classList.remove('page-hidden');
      app.classList.add('app-show');
      app.style.cssText='display:flex!important;position:fixed;inset:0;z-index:8000;background:#f8fafc';
    }

    // Update nav with org data
    var tbRole=document.getElementById('tbRole');
    var tbInd=document.getElementById('tbIndustry');
    if(tbRole) tbRole.textContent=role;
    if(tbInd)  tbInd.textContent=industry;

    // Set selected industry for portal buttons
    if(typeof selectedIndustry!=='undefined') selectedIndustry=industry;
    sessionStorage.setItem('ecoIndustry',industry);
    sessionStorage.setItem('ecoOrgName',org);

    // Init the app
    if(typeof initMainApp==='function'){
      setTimeout(initMainApp,100);
    } else {
      // Fallback init
      setTimeout(function(){
        if(typeof setupSidebar==='function') setupSidebar();
        if(typeof animateAllCounters==='function') animateAllCounters();
        if(typeof animateGaugeFills==='function') animateGaugeFills();
        if(typeof initCharts==='function') setTimeout(initCharts,200);
      },100);
    }

    // Show welcome toast
    setTimeout(function(){
      if(typeof showToast==='function')
        showToast('🌿 Welcome, '+role+' — '+org+' · '+industry);
    },800);

    return; // don't run the normal loader
  }
}

/* ════════════════════════ LOADER ════════════════════════ */
(function(){
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){
      runAutoLogin();
      if(new URLSearchParams(window.location.search).get('autologin')!=='1'&&
         sessionStorage.getItem('ecoAutoLogin')!=='1'){
        initStars('starsCanvas');
        setTimeout(function(){
          var sp=document.getElementById('splashScreen');
          if(sp) sp.classList.add('out');
          showLanding();
        },4200);
      }
    });
  } else {
    runAutoLogin();
    if(new URLSearchParams(window.location.search).get('autologin')!=='1'){
      initStars('starsCanvas');
      setTimeout(function(){
        var sp=document.getElementById('splashScreen');
        if(sp) sp.classList.add('out');
        showLanding();
      },4200);
    }
  }
})();

/* ════════════════════════ ECO LEAVES BG (landing) ════════ */
function spawnEcoLeaves(){
  var c=document.getElementById('ecoLeavesBg');if(!c)return;
  var emojis=['🌿','🍃','🌱','☘️','🌾'];
  for(var i=0;i<18;i++){
    var el=document.createElement('div');
    el.style.cssText='position:absolute;font-size:'+(14+Math.random()*18)+'px;left:'+(Math.random()*100)+'%;top:'+(Math.random()*100)+'%;opacity:'+(0.07+Math.random()*0.1)+';animation:plantBob '+(4+Math.random()*4)+'s '+(Math.random()*3)+'s ease infinite alternate;pointer-events:none;user-select:none';
    el.textContent=emojis[Math.floor(Math.random()*emojis.length)];
    c.appendChild(el);
  }
}

/* ════════════════════════ NAVIGATION FLOW ══════════════ */
function showLanding(){
  /* Show the original white-themed landing page */
  var lp=document.getElementById('landingPage');
  if(lp){ lp.classList.remove('page-hidden'); lp.style.cssText=''; }
  /* Hide enterprise pages */
  ['enterpriseLanding','portalSelectEnterPage','superAdminPage',
   'marketplacePage','certCenterPage','verifyPage','commandCenterPage',
   'onboardOrgPage','onboardLabPage','onboardRegPage','onboardConsPage','onboardAudPage',
   'labPortalPage','regPortalPage'].forEach(function(id){
    var e=document.getElementById(id);
    if(e){ e.style.display='none'; e.classList.add('page-hidden'); }
  });
  spawnEcoLeaves();
  if(typeof initGlobe==='function') initGlobe('landGlobe');
  animateLandingCounters();
  if(typeof setBgScheme==='function') setBgScheme('dark');
}
window.showLanding=showLanding;

window.backToLanding=function(){
  showLanding();
};
window.showLanding=showLanding;

window.goIndustry=function(){
  document.getElementById('landingPage').classList.add('page-hidden');
  var ip=document.getElementById('industryPage');
  ip.classList.remove('page-hidden');
  ip.style.cssText='';
};

window.goLanding=function(e){
  if(e)e.preventDefault();
  ['industryPage','loginPage','mainApp','labPortalPage','regPortalPage'].forEach(function(id){
    var el=document.getElementById(id);if(el){el.classList.add('page-hidden');el.style.display='none';}
  });
  showLanding();
  return false;
};

window.goLogin=function(){
  document.getElementById('industryPage').classList.add('page-hidden');
  var lp=document.getElementById('loginPage');
  lp.classList.remove('page-hidden');
  lp.style.cssText='';
  if(typeof initGlobe==='function') initGlobe('loginGlobe');
  if(typeof setBgScheme==='function') setBgScheme('dark');
};

/* ════════════════════════ INDUSTRY SELECTION ══════════ */
var selectedIndustry='Manufacturing';

window.selectIndustry=function(el){
  document.querySelectorAll('.isg-card').forEach(function(c){c.classList.remove('selected')});
  el.classList.add('selected');
  selectedIndustry=el.dataset.ind;
  sessionStorage.setItem('ecoIndustry', selectedIndustry);
  var lbl=document.getElementById('indSelSelected');
  var nm=document.getElementById('indSelName');
  var btn=document.getElementById('indSelContinue');
  if(lbl){lbl.style.display='flex';nm.textContent=selectedIndustry}
  if(btn)btn.style.display='inline-flex';
  // update login tag
  var t=document.getElementById('lctIndustryName');
  if(t)t.textContent=selectedIndustry;
  var sbt=document.getElementById('sbIndustryName');
  if(sbt)sbt.textContent=selectedIndustry;
  var tbi=document.getElementById('tbIndustry');
  if(tbi)tbi.textContent=selectedIndustry;
};

/* ════════════════════════ LOGIN ══════════════════════ */
var selectedRole='environmental_officer';

window.pickRole=function(el){
  document.querySelectorAll('.lc-role').forEach(function(r){r.classList.remove('active')});
  el.classList.add('active');
  selectedRole=el.dataset.role;
};

window.togglePw=function(){
  var pw=document.getElementById('lgPass'),eye=document.getElementById('pwEye');
  if(!pw)return;
  pw.type=pw.type==='password'?'text':'password';
  eye.className=pw.type==='password'?'fas fa-eye':'fas fa-eye-slash';
};

window.doLogin=function(e){
  e.preventDefault();
  /* save org info for portal pass-through */
  var orgEl = document.getElementById('rOrg') || document.getElementById('lEmail');
  var indEl = document.querySelector('#industryPage .isg-card.selected');
  sessionStorage.setItem('ecoOrgName',  orgEl ? orgEl.value : (document.title||''));
  sessionStorage.setItem('ecoIndustry', indEl ? (indEl.dataset.ind||'') : (typeof selectedIndustry!=='undefined'?selectedIndustry:''));
  var loader=document.getElementById('loginLoader'),txt=document.getElementById('loginBtnText');
  if(loader)loader.style.display='block';
  if(txt)txt.style.opacity='.3';
  setTimeout(function(){
    document.getElementById('loginPage').classList.add('page-hidden');
    var app=document.getElementById('mainApp');
    app.classList.remove('page-hidden');
    app.style.cssText='';
    app.classList.add('app-show');
    if(typeof setBgScheme==='function') setBgScheme('light');
    initMainApp();
  },1300);
};

window.doLogout=function(){
  var app=document.getElementById('mainApp');
  app.classList.remove('app-show');
  setTimeout(function(){
    app.classList.add('page-hidden');
    var lp=document.getElementById('loginPage');
    lp.classList.remove('page-hidden');
    lp.style.cssText='';
    document.getElementById('lgPass').value='';
    var loader=document.getElementById('loginLoader'),txt=document.getElementById('loginBtnText');
    if(loader)loader.style.display='none';
    if(txt)txt.style.opacity='';
  },600);
};

/* ════════════════════════ MAIN APP INIT ══════════════ */
function initMainApp(){
  setupSidebar();
  setupScrollReveal();
  animateAllCounters();
  animateGaugeFills();
  updateNavForRole(selectedRole);
  if(typeof initCharts==='function')setTimeout(initCharts,200);
  setTimeout(function(){showToast('🌿 Welcome to EcoSphere — '+selectedIndustry)},600);
  scheduleAutoAlerts();
}

/* ── Sidebar ── */
var sbCollapsed=false;
function setupSidebar(){
  var links=document.querySelectorAll('.sb-link');
  var ac=document.getElementById('appContent');
  if(ac){
    ac.addEventListener('scroll',function(){
      var secs=document.querySelectorAll('.app-sec[id]');
      var cur='';
      secs.forEach(function(s){if(ac.scrollTop>=s.offsetTop-90)cur=s.id});
      links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+cur)});
    });
  }
}

window.toggleSidebar=function(){
  sbCollapsed=!sbCollapsed;
  document.getElementById('sidebar').classList.toggle('sb-col',sbCollapsed);
};

window.sbClick=function(el,title){
  var href=el.getAttribute('href');
  document.querySelectorAll('.sb-link').forEach(function(l){l.classList.remove('active')});
  el.classList.add('active');
  var t=document.getElementById('tbSection');
  if(t)t.textContent=title;
  var target=document.querySelector(href);
  var ac=document.getElementById('appContent');
  if(target&&ac){setTimeout(function(){target.scrollIntoView({behavior:'smooth',block:'start'})},50)}
  if(window.innerWidth<=768){document.getElementById('sidebar').classList.add('sb-col');sbCollapsed=true}
};

/* ── Role ── */
function updateNavForRole(role){
  var MAP={
    environmental_officer:['Env. Officer','Full Access','badge-full','fa-user-tie'],
    env_engineer:['Env. Engineer','Full Access','badge-full','fa-hard-hat'],
    production_head:['Production Head','View Only','badge-view','fa-industry'],
    quality_head:['Quality Head','View Only','badge-view','fa-check-circle'],
    hr_head:['HR Head','View Only','badge-view','fa-users'],
    purchase_head:['Purchase Head','View Only','badge-view','fa-shopping-cart'],
    maintenance_head:['Maintenance Head','View Only','badge-view','fa-tools'],
    admin:['Administrator','Full Access','badge-full','fa-shield-alt']
  };
  var d=MAP[role]||MAP['admin'];
  var els={sbRoleName:d[0],tbRole:d[0]};
  Object.keys(els).forEach(function(k){var e=document.getElementById(k);if(e)e.textContent=els[k]});
  var sbA=document.getElementById('sbAccess');
  if(sbA){sbA.textContent=d[1];sbA.className=d[2]}
  var sbAva=document.querySelector('.sb-user-ava i');
  var tbAva=document.querySelector('#tbAva i');
  if(sbAva)sbAva.className='fas '+d[3];
  if(tbAva)tbAva.className='fas '+d[3];
  var viewOnly=['production_head','quality_head','hr_head','purchase_head','maintenance_head'];
  if(viewOnly.indexOf(role)>-1){
    document.querySelectorAll('.pc-btn,.btn-mod,.wf-actions button').forEach(function(b){b.disabled=true;b.style.opacity='.35';b.title='View only'});
    showToast('🔒 View-only access assigned.');
  }
}

/* ── Counters ── */
function animateLandingCounters(){
  document.querySelectorAll('#landingPage .counter').forEach(function(el){if(!el.dataset.done)countTo(el)});
}
function animateAllCounters(){
  document.querySelectorAll('#mainApp .counter').forEach(function(el){if(!el.dataset.done)countTo(el)});
}
function countTo(el){
  if(el.dataset.done)return;el.dataset.done='1';
  var target=parseFloat(el.dataset.target||0),isF=String(target).indexOf('.')>-1;
  var dur=2000,start=performance.now();
  (function tick(now){
    var t=Math.min((now-start)/dur,1),v=target*(1-Math.pow(1-t,3));
    el.textContent=isF?v.toFixed(1):Math.round(v);
    if(t<1)requestAnimationFrame(tick);
    else el.style.animation='counterPop .4s ease';
  })(start);
}

function setupScrollReveal(){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      e.target.classList.add('visible');
      e.target.querySelectorAll('.counter:not([data-done])').forEach(countTo);
      io.unobserve(e.target);
    });
  },{threshold:.1});
  document.querySelectorAll('.param-card,.kpi-card,.policy-card,.score-panel,.wform-panel,.wcard,.wc-card,.report-tracker,.ai-insights-card,.ai-gen-card').forEach(function(el){el.classList.add('reveal');io.observe(el)});
}

function animateGaugeFills(){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      e.target.querySelectorAll('.g-fill,.pil-fill,.sc-fill,.sub-bar div').forEach(function(bar){
        var w=bar.style.getPropertyValue('--gw')||bar.style.getPropertyValue('--pw')||bar.style.getPropertyValue('--sw')||bar.style.getPropertyValue('--sbw')||bar.style.width||'0%';
        bar.style.width='0%';
        setTimeout(function(){bar.style.transition='width 2.2s cubic-bezier(.4,0,.2,1)';bar.style.width=w},100);
      });
      io.unobserve(e.target);
    });
  },{threshold:.15});
  document.querySelectorAll('.param-card,.score-panel,.two-col-layout').forEach(function(el){io.observe(el)});
}

/* ════════════════════════ IN-PAGE DATA ENTRY BOX ═══════════
   Opens a prominent full-width form box WITHIN the same page,
   directly below the parameter cards — no modal, no slide panel
   ════════════════════════════════════════════════════════════ */
var IPFB_CONFIGS = {
  air: {
    title:'Air Quality Data Entry', tag:'MODULE 1 — AIR',
    icon:'fa-wind', color:'#0369a1', bg:'#eff6ff',
    note:'CPCB National Ambient Air Quality Standards',
    sections:[
      { title:'Basic Details', fields:[
        {l:'Date',id:'aq-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Location / Station',id:'aq-loc',type:'text',ph:'e.g. Station A, Boundary Point',hint:''},
        {l:'Shift / Period',id:'aq-shift',type:'select',opts:['Morning (6AM–2PM)','Afternoon (2PM–10PM)','Night (10PM–6AM)','24hr Average'],hint:''},
        {l:'Monitoring Method',id:'aq-method',type:'select',opts:['Manual Measurement','Automated Sensor','Lab Analysis'],hint:''}
      ]},
      { title:'Parameter Readings', fields:[
        {l:'PM2.5 (µg/m³)',id:'aq-pm25',type:'number',ph:'0.0',hint:'Limit: 60',warn:true},
        {l:'PM10 (µg/m³)',id:'aq-pm10',type:'number',ph:'0.0',hint:'Limit: 100',warn:true},
        {l:'SO₂ (ppb)',id:'aq-so2',type:'number',ph:'0.0',hint:'Limit: 80',warn:true},
        {l:'NOₓ (ppb)',id:'aq-nox',type:'number',ph:'0.0',hint:'Limit: 40',warn:true},
        {l:'CO₂ (ppm)',id:'aq-co2',type:'number',ph:'0.0',hint:'Normal ~400',warn:false},
        {l:'O₃ (ppb)',id:'aq-o3',type:'number',ph:'0.0',hint:'Limit: 70',warn:true},
        {l:'Wind Speed (m/s)',id:'aq-wind',type:'number',ph:'0.0',hint:''},
        {l:'Temperature (°C)',id:'aq-temp',type:'number',ph:'0.0',hint:''}
      ]}
    ],
    aiResult:'PM2.5 (62 µg/m³) within CPCB limit (60). PM10 (85 µg/m³) within limit (100). NOₓ (25 ppb) well within safe range. CO₂ (412 ppm) normal atmospheric level.<br/><br/><strong>Recommendation:</strong> Monitor PM2.5 closely — trending toward limit. Consider dust suppression near Station A.'
  },
  water: {
    title:'Water Quality Data Entry', tag:'MODULE 1 — WATER',
    icon:'fa-water', color:'#0e7490', bg:'#ecfeff',
    note:'MPCB / CPCB Effluent Discharge Standards',
    sections:[
      { title:'Sample Details', fields:[
        {l:'Date',id:'wq-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Sampling Point',id:'wq-loc',type:'text',ph:'e.g. Inlet, Outlet, Effluent',hint:''},
        {l:'Sample Type',id:'wq-type',type:'select',opts:['Grab Sample','Composite Sample','Continuous','24hr Average'],hint:''},
        {l:'Temperature (°C)',id:'wq-temp',type:'number',ph:'0.0',hint:'Limit: 35',warn:true}
      ]},
      { title:'Water Parameters', fields:[
        {l:'pH Level',id:'wq-ph',type:'number',ph:'7.0',hint:'Range: 6.5–8.5',warn:false},
        {l:'TDS (mg/L)',id:'wq-tds',type:'number',ph:'0',hint:'Limit: 600',warn:true},
        {l:'BOD (mg/L)',id:'wq-bod',type:'number',ph:'0.0',hint:'Limit: 30',warn:true},
        {l:'COD (mg/L)',id:'wq-cod',type:'number',ph:'0',hint:'Limit: 250',warn:true},
        {l:'DO (mg/L)',id:'wq-do',type:'number',ph:'0.0',hint:'Min: 4.0',warn:true},
        {l:'Turbidity (NTU)',id:'wq-tur',type:'number',ph:'0.0',hint:'Limit: 10',warn:true},
        {l:'Total Coliform (MPN)',id:'wq-col',type:'number',ph:'0',hint:'Limit: 500',warn:true},
        {l:'Nitrates (mg/L)',id:'wq-nit',type:'number',ph:'0.0',hint:'Limit: 45',warn:true}
      ]}
    ],
    aiResult:'pH (7.2) within safe range. TDS (550 mg/L) approaching limit of 600 mg/L — <strong>monitor closely</strong>. BOD (3 mg/L) excellent (limit 30). DO (6.8 mg/L) healthy.<br/><br/><strong>Recommendation:</strong> TDS trending upward — inspect upstream industrial discharge points.'
  },
  noise: {
    title:'Noise Monitoring Data', tag:'MODULE 1 — NOISE',
    icon:'fa-volume-up', color:'#b91c1c', bg:'#fef2f2',
    note:'CPCB Noise Standards — Industrial Zone',
    sections:[
      { title:'Monitoring Details', fields:[
        {l:'Date',id:'ns-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Monitoring Point',id:'ns-loc',type:'text',ph:'e.g. Boundary, Near Residential',hint:''},
        {l:'Equipment Used',id:'ns-eq',type:'text',ph:'Sound level meter model/ID',hint:''},
        {l:'Duration (hrs)',id:'ns-dur',type:'number',ph:'0',hint:''}
      ]},
      { title:'Noise Levels', fields:[
        {l:'Day Level (dB)',id:'ns-day',type:'number',ph:'0.0',hint:'Limit: 75',warn:true},
        {l:'Night Level (dB)',id:'ns-night',type:'number',ph:'0.0',hint:'Limit: 70',warn:true},
        {l:'Peak Level (dB)',id:'ns-peak',type:'number',ph:'0.0',hint:'Limit: 100',warn:true},
        {l:'Leq (dB)',id:'ns-leq',type:'number',ph:'0.0',hint:'Equivalent avg'},
        {l:'Background (dB)',id:'ns-bg',type:'number',ph:'0.0',hint:'Ambient noise'}
      ]}
    ],
    aiResult:'⚠️ Peak noise 88 dB <strong>EXCEEDS CPCB boundary limit</strong> of 85 dB. Day level (70 dB) within industrial limit (75). Night (45 dB) compliant.<br/><br/><strong>Action required:</strong> Inspect Compressor Room B. Install noise barriers within 48 hours.'
  },
  soil: {
    title:'Soil Monitoring Data', tag:'MODULE 1 — SOIL',
    icon:'fa-mountain', color:'#166534', bg:'#f0fdf4',
    note:'Soil Quality Indicators — Field / Industrial Land',
    sections:[
      { title:'Sampling Details', fields:[
        {l:'Date',id:'sl-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Sampling Location',id:'sl-loc',type:'text',ph:'e.g. Field A, Near Storage',hint:''},
        {l:'Depth (cm)',id:'sl-depth',type:'number',ph:'0–30',hint:''},
        {l:'Land Use Type',id:'sl-use',type:'select',opts:['Agricultural','Industrial','Residential','Forest','Contaminated Site'],hint:''}
      ]},
      { title:'Soil Parameters', fields:[
        {l:'Moisture (%)',id:'sl-moist',type:'number',ph:'0.0',hint:'Range: 20–60'},
        {l:'pH Level',id:'sl-ph',type:'number',ph:'7.0',hint:'Range: 6.0–8.5'},
        {l:'Nitrogen (kg/ha)',id:'sl-n',type:'number',ph:'0',hint:'Normal: 80–200'},
        {l:'Phosphorus (kg/ha)',id:'sl-p',type:'number',ph:'0.0',hint:''},
        {l:'Potassium (kg/ha)',id:'sl-k',type:'number',ph:'0',hint:''},
        {l:'Heavy Metals (mg/kg)',id:'sl-hm',type:'number',ph:'0.0',hint:'Limit: 3',warn:true},
        {l:'Organic Carbon (%)',id:'sl-oc',type:'number',ph:'0.0',hint:''},
        {l:'Conductivity (mS/cm)',id:'sl-ec',type:'number',ph:'0.0',hint:''}
      ]}
    ],
    aiResult:'Soil pH (6.5) within acceptable range. Moisture (38%) adequate. Nitrogen normal. Heavy metals well below limit.<br/><br/><strong>Recommendation:</strong> Continue quarterly monitoring. Consider organic matter addition to improve fertility.'
  },
  temp: {
    title:'Temperature Data Entry', tag:'MODULE 1 — TEMPERATURE',
    icon:'fa-thermometer-half', color:'#b45309', bg:'#fffbeb',
    note:'Process & Effluent Temperature Monitoring',
    sections:[
      { title:'Measurement Details', fields:[
        {l:'Date',id:'tp-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Location / Unit',id:'tp-loc',type:'text',ph:'e.g. Process Area, Stack',hint:''},
        {l:'Time',id:'tp-time',type:'time',val:'09:00',hint:''},
        {l:'Sensor Type',id:'tp-sensor',type:'select',opts:['Thermometer','RTD Sensor','Thermocouple','IR Sensor'],hint:''}
      ]},
      { title:'Temperature Readings', fields:[
        {l:'Ambient (°C)',id:'tp-amb',type:'number',ph:'0.0',hint:'Expected: 20–45'},
        {l:'Process (°C)',id:'tp-proc',type:'number',ph:'0.0',hint:'Limit: 80',warn:true},
        {l:'Effluent (°C)',id:'tp-eff',type:'number',ph:'0.0',hint:'Limit: 35',warn:true},
        {l:'Stack Gas (°C)',id:'tp-stack',type:'number',ph:'0',hint:''},
        {l:'Cooling Water In (°C)',id:'tp-cwi',type:'number',ph:'0.0',hint:''},
        {l:'Cooling Water Out (°C)',id:'tp-cwo',type:'number',ph:'0.0',hint:''}
      ]}
    ],
    aiResult:'Process temp (78°C) within limit of 80°C — borderline. Effluent (28°C) well within limit of 35°C. Ambient (32°C) normal.<br/><br/><strong>Recommendation:</strong> Monitor process temperature. Check heat exchanger efficiency.'
  },
  humidity: {
    title:'Humidity Data Entry', tag:'MODULE 1 — HUMIDITY',
    icon:'fa-tint', color:'#0369a1', bg:'#f0f9ff',
    note:'Atmospheric Moisture Parameters',
    sections:[
      { title:'Measurement Details', fields:[
        {l:'Date',id:'hm-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Location',id:'hm-loc',type:'text',ph:'e.g. Ambient, Work Zone, Lab',hint:''},
        {l:'Time',id:'hm-time',type:'time',val:'09:00',hint:''},
        {l:'Instrument',id:'hm-inst',type:'text',ph:'Hygrometer model/ID',hint:''}
      ]},
      { title:'Humidity Readings', fields:[
        {l:'Relative Humidity (%)',id:'hm-rh',type:'number',ph:'0.0',hint:'Normal: 40–80'},
        {l:'Absolute Humidity (g/m³)',id:'hm-ah',type:'number',ph:'0.0',hint:''},
        {l:'Dew Point (°C)',id:'hm-dp',type:'number',ph:'0.0',hint:''},
        {l:'Wet Bulb Temp (°C)',id:'hm-wb',type:'number',ph:'0.0',hint:''},
        {l:'Dry Bulb Temp (°C)',id:'hm-db',type:'number',ph:'0.0',hint:''},
        {l:'Specific Humidity (g/kg)',id:'hm-sp',type:'number',ph:'0.0',hint:''}
      ]}
    ],
    aiResult:'Relative humidity (65%) within comfortable range. Dew point (24°C) indicates warm humid conditions. No critical humidity alerts.<br/><br/><strong>Recommendation:</strong> Monitor during monsoon season — high humidity may affect sensor accuracy.'
  },
  waste: {
    title:'Waste Management Data', tag:'MODULE 1 — WASTE',
    icon:'fa-recycle', color:'#7c3aed', bg:'#faf5ff',
    note:'Waste Inventory & Disposal Record',
    sections:[
      { title:'Record Details', fields:[
        {l:'Date',id:'ws-date',type:'date',val:'2025-06-02',hint:''},
        {l:'Facility / Department',id:'ws-fac',type:'text',ph:'e.g. Production Unit A',hint:''},
        {l:'Disposal Method',id:'ws-disp',type:'select',opts:['Recycling','Landfill','Incineration','Composting','Authorized Vendor'],hint:''},
        {l:'Vendor Name',id:'ws-vendor',type:'text',ph:'Authorised disposal vendor name',hint:''}
      ]},
      { title:'Waste Quantities', fields:[
        {l:'Solid Waste (tonnes)',id:'ws-solid',type:'number',ph:'0.0',hint:'Monthly total'},
        {l:'Recyclable (tonnes)',id:'ws-rec',type:'number',ph:'0.0',hint:''},
        {l:'Recycled (%)',id:'ws-pct',type:'number',ph:'0.0',hint:''},
        {l:'Hazardous Waste (kg)',id:'ws-haz',type:'number',ph:'0.0',hint:'Track carefully',warn:true},
        {l:'E-Waste (kg)',id:'ws-ewaste',type:'number',ph:'0.0',hint:''},
        {l:'Biomedical (kg)',id:'ws-bio',type:'number',ph:'0.0',hint:''},
        {l:'Composted (kg)',id:'ws-comp',type:'number',ph:'0.0',hint:''},
        {l:'Landfill Diverted (%)',id:'ws-div',type:'number',ph:'0.0',hint:'Target: >80'}
      ]}
    ],
    aiResult:'Recycling rate (62%) above industry average of 45%. Hazardous waste (12 kg) within limits. Solid waste trending slightly upward.<br/><br/><strong>Recommendation:</strong> Increase composting capacity. Review procurement to reduce packaging waste at source.'
  }
};

window.openInpageForm = function(type) {
  var cfg = IPFB_CONFIGS[type];
  if (!cfg) { openDataForm && openDataForm(type); return; }

  var box = document.getElementById('inpageFormBox');
  if (!box) { openDataPanel && openDataPanel(type); return; }

  // Update header
  document.getElementById('ipfbTitle').textContent = cfg.title;
  document.getElementById('ipfbTag').textContent   = cfg.tag;

  // Build form content
  var html = '<div class="ipfb-form-header" style="background:'+cfg.bg+';border-left:5px solid '+cfg.color+'">' +
    '<div class="ipfb-form-ico" style="background:'+cfg.color+'"><i class="fas '+cfg.icon+'"></i></div>' +
    '<div><div class="ipfb-form-title">'+cfg.title+'</div>' +
    '<div class="ipfb-form-note">'+cfg.note+'</div></div></div>';

  cfg.sections.forEach(function(sec) {
    html += '<div class="ipfb-sec-title"><i class="fas fa-circle-dot"></i> '+sec.title+'</div>';
    html += '<div class="ipfb-grid">';
    sec.fields.forEach(function(f) {
      html += '<div class="ipfb-field">';
      html += '<label>'+f.l+(f.hint?'<span class="ipfb-hint'+(f.warn?' ipfb-warn':'')+'">'+ f.hint+'</span>':'')+'</label>';
      if (f.type==='select') {
        html += '<select id="'+f.id+'">';
        f.opts.forEach(function(o){ html += '<option>'+o+'</option>'; });
        html += '</select>';
      } else {
        html += '<input type="'+f.type+'" id="'+f.id+'"'+(f.ph?' placeholder="'+f.ph+'"':'')+(f.val?' value="'+f.val+'"':'')+' step="0.01"/>';
      }
      html += '</div>';
    });
    html += '</div>';
  });

  html += '<div class="ipfb-remarks-row"><label>Remarks / Observations</label>' +
    '<textarea id="ipfb-remarks" rows="3" placeholder="Note any anomalies, weather conditions, equipment status, calibration details..."></textarea></div>';

  html += '<div class="ipfb-actions">' +
    '<button class="ipfb-save" style="background:'+cfg.color+'" onclick="saveInpageForm(\''+type+'\')"><i class="fas fa-save"></i> Save & AI Analyse</button>' +
    '<button class="ipfb-export" onclick="generateReport(\'Monitoring\')"><i class="fas fa-file-pdf"></i> Export PDF</button>' +
    '<button class="ipfb-clear" onclick="closeInpageForm()"><i class="fas fa-times"></i> Close Form</button>' +
    '</div>';

  html += '<div class="ipfb-ai-result" id="ipfb-ai-result" style="display:none">' +
    '<div class="ipfb-ai-head"><i class="fas fa-brain"></i> AI Analysis Complete</div>' +
    '<div id="ipfb-ai-text"></div></div>';

  document.getElementById('ipfbContent').innerHTML = html;

  box.style.display = 'block';
  box.style.animation = 'ipfbSlideIn .4s cubic-bezier(.4,0,.2,1) both';

  // Highlight the active param card
  document.querySelectorAll('.param-card').forEach(function(c){ c.classList.remove('card-active'); });
  var activeCard = document.getElementById('card-'+type);
  if (activeCard) {
    activeCard.classList.add('card-active');
    activeCard.style.borderColor = cfg.color;
  }

  // Scroll to the form
  setTimeout(function(){
    box.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 100);
};

window.saveInpageForm = function(type) {
  var cfg = IPFB_CONFIGS[type];
  var aiBox = document.getElementById('ipfb-ai-result');
  var aiTxt = document.getElementById('ipfb-ai-text');
  if (aiBox && aiTxt && cfg) {
    aiTxt.innerHTML = cfg.aiResult;
    aiBox.style.display = 'block';
    aiBox.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  showToast('✅ '+cfg.title+' saved. AI analysis complete!');
};

window.closeInpageForm = function() {
  var box = document.getElementById('inpageFormBox');
  if (box) {
    box.style.animation = 'ipfbSlideOut .3s ease forwards';
    setTimeout(function(){ box.style.display = 'none'; }, 300);
  }
  document.querySelectorAll('.param-card').forEach(function(c){
    c.classList.remove('card-active');
    c.style.borderColor = '';
  });
};

/* ════════════════════════ DATA ENTRY SLIDE PANEL ═══════════ */
var DEP_CONFIGS = {
  air: {
    title:'Air Quality Data Entry', tag:'MODULE 1 — MONITORING',
    icon:'fa-wind', icoColor:'linear-gradient(135deg,#0369a1,#0ea5e9)',
    hdrBg:'#eff6ff', note:'CPCB National Ambient Air Quality Standards',
    fields:[
      {label:'PM2.5 (µg/m³)', hint:'Limit: 60', id:'aq-pm25', type:'number'},
      {label:'PM10 (µg/m³)', hint:'Limit: 100', id:'aq-pm10', type:'number'},
      {label:'SO₂ (ppb)', hint:'Limit: 80', id:'aq-so2', type:'number'},
      {label:'NOₓ (ppb)', hint:'Limit: 40', id:'aq-nox', type:'number'},
      {label:'CO₂ (ppm)', hint:'Normal ~400', id:'aq-co2', type:'number'},
      {label:'O₃ (ppb)', hint:'Limit: 70', id:'aq-o3', type:'number'},
      {label:'Wind Speed (m/s)', hint:'', id:'aq-wind', type:'number'},
      {label:'Temperature (°C)', hint:'', id:'aq-temp', type:'number'}
    ],
    ai: 'PM2.5 (62 µg/m³) is borderline — within CPCB limit of 60 µg/m³. PM10 (85 µg/m³) within limit of 100 µg/m³. NOₓ (25 ppb) well within safe range. <br/><br/><strong>Recommendation:</strong> Monitor PM2.5 closely — trending toward limit. Consider dust suppression near Station A.'
  },
  water: {
    title:'Water Quality Data Entry', tag:'MODULE 1 — MONITORING',
    icon:'fa-water', icoColor:'linear-gradient(135deg,#0e7490,#0891b2)',
    hdrBg:'#ecfeff', note:'MPCB / CPCB Effluent Discharge Standards',
    fields:[
      {label:'pH Level', hint:'Range: 6.5–8.5', id:'wq-ph', type:'number'},
      {label:'TDS (mg/L)', hint:'Limit: 600', id:'wq-tds', type:'number'},
      {label:'BOD (mg/L)', hint:'Limit: 30', id:'wq-bod', type:'number'},
      {label:'COD (mg/L)', hint:'Limit: 250', id:'wq-cod', type:'number'},
      {label:'DO (mg/L)', hint:'Min: 4.0', id:'wq-do', type:'number'},
      {label:'Turbidity (NTU)', hint:'Limit: 10', id:'wq-tur', type:'number'},
      {label:'Temperature (°C)', hint:'Limit: 35', id:'wq-temp', type:'number'},
      {label:'Total Coliform (MPN)', hint:'Limit: 500', id:'wq-col', type:'number'}
    ],
    ai: 'pH (7.2) within safe range. TDS (550 mg/L) approaching limit of 600 mg/L — <strong>monitor closely</strong>. BOD (3 mg/L) excellent (limit 30 mg/L). DO (6.8 mg/L) healthy. <br/><br/><strong>Recommendation:</strong> TDS trending upward — inspect upstream discharge points.'
  },
  noise: {
    title:'Noise Monitoring Data', tag:'MODULE 1 — MONITORING',
    icon:'fa-volume-up', icoColor:'linear-gradient(135deg,#b91c1c,#ef4444)',
    hdrBg:'#fef2f2', note:'CPCB Noise Standards — Industrial Zone',
    fields:[
      {label:'Day Level (dB)', hint:'Limit: 75', id:'ns-day', type:'number'},
      {label:'Night Level (dB)', hint:'Limit: 70', id:'ns-night', type:'number'},
      {label:'Peak Level (dB)', hint:'Limit: 100', id:'ns-peak', type:'number'},
      {label:'Leq (dB)', hint:'Equivalent', id:'ns-leq', type:'number'},
      {label:'Duration (hrs)', hint:'', id:'ns-dur', type:'number'},
      {label:'Background (dB)', hint:'', id:'ns-bg', type:'number'}
    ],
    ai: '⚠️ Peak noise at 88 dB <strong>EXCEEDS CPCB boundary limit</strong> of 85 dB. Day level (70 dB) within industrial zone limit (75 dB). Night level (45 dB) compliant.<br/><br/><strong>Immediate action required:</strong> Inspect Compressor Room B — likely noise source. Consider noise barriers.'
  },
  soil: {
    title:'Soil Monitoring Data', tag:'MODULE 1 — MONITORING',
    icon:'fa-mountain', icoColor:'linear-gradient(135deg,#166534,#15803d)',
    hdrBg:'#f0fdf4', note:'Soil Quality Indicators — Agricultural / Industrial Land',
    fields:[
      {label:'Moisture (%)', hint:'Range: 20–60', id:'sl-moist', type:'number'},
      {label:'pH Level', hint:'Range: 6.0–8.5', id:'sl-ph', type:'number'},
      {label:'Nitrogen (kg/ha)', hint:'Normal: 80–200', id:'sl-n', type:'number'},
      {label:'Phosphorus (kg/ha)', hint:'', id:'sl-p', type:'number'},
      {label:'Potassium (kg/ha)', hint:'', id:'sl-k', type:'number'},
      {label:'Heavy Metals (mg/kg)', hint:'Limit: 3', id:'sl-hm', type:'number'},
      {label:'Organic Carbon (%)', hint:'', id:'sl-oc', type:'number'},
      {label:'Conductivity (mS/cm)', hint:'', id:'sl-ec', type:'number'}
    ],
    ai: 'Soil pH (6.5) within acceptable range. Moisture (38%) adequate for vegetation. Nitrogen levels normal. Heavy metals (0.8 mg/kg) well below limit.<br/><br/><strong>Recommendation:</strong> Continue quarterly monitoring. Consider organic matter addition to improve fertility index.'
  },
  temp: {
    title:'Temperature Data Entry', tag:'MODULE 1 — MONITORING',
    icon:'fa-thermometer-half', icoColor:'linear-gradient(135deg,#b45309,#d97706)',
    hdrBg:'#fffbeb', note:'Process & Effluent Temperature Monitoring',
    fields:[
      {label:'Ambient (°C)', hint:'Expected: 20–45', id:'tp-amb', type:'number'},
      {label:'Process (°C)', hint:'Limit: 80', id:'tp-proc', type:'number'},
      {label:'Effluent (°C)', hint:'Limit: 35', id:'tp-eff', type:'number'},
      {label:'Stack Gas (°C)', hint:'', id:'tp-stack', type:'number'},
      {label:'Cooling Water In (°C)', hint:'', id:'tp-cwi', type:'number'},
      {label:'Cooling Water Out (°C)', hint:'', id:'tp-cwo', type:'number'}
    ],
    ai: 'Process temperature (78°C) within limit of 80°C — borderline. Effluent (28°C) well within limit of 35°C. Ambient (32°C) normal for season.<br/><br/><strong>Recommendation:</strong> Monitor process temperature — close to operational limit. Check heat exchanger efficiency.'
  },
  humidity: {
    title:'Humidity Data Entry', tag:'MODULE 1 — MONITORING',
    icon:'fa-tint', icoColor:'linear-gradient(135deg,#0369a1,#0891b2)',
    hdrBg:'#f0f9ff', note:'Atmospheric Moisture Parameters',
    fields:[
      {label:'Relative Humidity (%)', hint:'Normal: 40–80', id:'hm-rh', type:'number'},
      {label:'Absolute Humidity (g/m³)', hint:'', id:'hm-ah', type:'number'},
      {label:'Dew Point (°C)', hint:'', id:'hm-dp', type:'number'},
      {label:'Wet Bulb Temp (°C)', hint:'', id:'hm-wb', type:'number'},
      {label:'Dry Bulb Temp (°C)', hint:'', id:'hm-db', type:'number'},
      {label:'Specific Humidity (g/kg)', hint:'', id:'hm-sp', type:'number'}
    ],
    ai: 'Relative humidity (65%) within comfortable range. Dew point (24°C) indicates warm humid conditions. No critical humidity alerts.<br/><br/><strong>Recommendation:</strong> Monitor during monsoon season — high humidity may affect air quality sensor accuracy.'
  },
  waste: {
    title:'Waste Management Data', tag:'MODULE 1 — MONITORING',
    icon:'fa-recycle', icoColor:'linear-gradient(135deg,#7c3aed,#6366f1)',
    hdrBg:'#faf5ff', note:'Waste Inventory & Disposal Record',
    fields:[
      {label:'Solid Waste (tonnes)', hint:'Monthly total', id:'ws-solid', type:'number'},
      {label:'Recyclable (tonnes)', hint:'', id:'ws-rec', type:'number'},
      {label:'Recycled (%)', hint:'', id:'ws-pct', type:'number'},
      {label:'Hazardous Waste (kg)', hint:'Track carefully', id:'ws-haz', type:'number'},
      {label:'E-Waste (kg)', hint:'', id:'ws-ewaste', type:'number'},
      {label:'Biomedical (kg)', hint:'', id:'ws-bio', type:'number'},
      {label:'Composted (kg)', hint:'', id:'ws-comp', type:'number'},
      {label:'Landfill Diverted (%)', hint:'', id:'ws-div', type:'number'}
    ],
    ai: 'Recycling rate (62%) above industry average of 45%. Hazardous waste (12 kg) within limits. Solid waste trending slightly upward.<br/><br/><strong>Recommendation:</strong> Increase composting capacity. Review procurement to reduce packaging waste at source.'
  }
};

window.openDataPanel = function(type) {
  var cfg = DEP_CONFIGS[type];
  if (!cfg) { openDataForm(type); return; }

  document.getElementById('depTitle').textContent = cfg.title;
  document.getElementById('depModuleTag').textContent = cfg.tag;

  var body = document.getElementById('depBody');
  var fieldsHtml = '';
  for (var i=0; i<cfg.fields.length; i+=2) {
    fieldsHtml += '<div class="dep-row">';
    fieldsHtml += buildDepField(cfg.fields[i]);
    if (cfg.fields[i+1]) fieldsHtml += buildDepField(cfg.fields[i+1]);
    fieldsHtml += '</div>';
  }

  body.innerHTML =
    '<div class="dep-form-header" style="background:'+cfg.hdrBg+'">' +
      '<div class="dfh-ico" style="background:'+cfg.icoColor+'"><i class="fas '+cfg.icon+'"></i></div>' +
      '<div><h3>'+cfg.title+'</h3><p>'+cfg.note+'</p></div>' +
    '</div>' +
    '<div class="dep-row">' +
      '<div class="dep-grp"><label>Date</label><input type="date" id="dep-date" value="2025-06-02"/></div>' +
      '<div class="dep-grp"><label>Location / Point</label><input type="text" id="dep-loc" placeholder="e.g. Station A, Boundary"/></div>' +
    '</div>' +
    '<div class="dep-row">' +
      '<div class="dep-grp"><label>Shift / Period</label><select id="dep-shift"><option>Morning (6AM–2PM)</option><option>Afternoon (2PM–10PM)</option><option>Night (10PM–6AM)</option><option>24hr Average</option></select></div>' +
      '<div class="dep-grp"><label>Monitoring Method</label><select id="dep-method"><option>Manual Measurement</option><option>Automated Sensor</option><option>Lab Analysis</option><option>Grab Sample</option></select></div>' +
    '</div>' +
    '<div class="dep-section"><i class="fas fa-chart-bar"></i> Parameter Readings</div>' +
    fieldsHtml +
    '<div class="dep-grp" style="margin-bottom:18px"><label>Remarks / Observations</label>' +
    '<textarea id="dep-remarks" rows="3" placeholder="Note any anomalies, weather conditions, equipment status, calibration details..." style="resize:vertical;width:100%"></textarea></div>' +
    '<div class="dep-actions">' +
      '<button class="dep-save" onclick="saveDepForm(\''+type+'\')"><i class="fas fa-save"></i> Save & AI Analyse</button>' +
      '<button class="dep-export" onclick="generateReport(\'Monitoring\')"><i class="fas fa-download"></i> Export PDF</button>' +
      '<button class="dep-cancel" onclick="closeDataPanel()"><i class="fas fa-times"></i> Cancel</button>' +
    '</div>' +
    '<div class="dep-ai-result" id="dep-ai-result" style="display:none">' +
      '<div class="dep-ai-result-head"><i class="fas fa-brain"></i> AI Analysis Complete</div>' +
      '<p id="dep-ai-text"></p>' +
    '</div>';

  document.getElementById('depOverlay').classList.add('open');
  document.getElementById('depPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
};

function buildDepField(f) {
  var hintHtml = f.hint ? '<span class="dep-hint dep-limit">'+f.hint+'</span>' : '';
  return '<div class="dep-grp">' +
    '<label>'+f.label+' '+hintHtml+'</label>' +
    '<input type="'+f.type+'" step="0.01" id="'+f.id+'" placeholder="0.0"/>' +
    '</div>';
}

window.saveDepForm = function(type) {
  var cfg = DEP_CONFIGS[type];
  var aiBox = document.getElementById('dep-ai-result');
  var aiTxt = document.getElementById('dep-ai-text');
  if (aiBox && aiTxt && cfg) {
    aiTxt.innerHTML = cfg.ai;
    aiBox.style.display = 'block';
    aiBox.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  showToast('✅ ' + (cfg ? cfg.title : type) + ' saved. AI analysis complete!');
};

window.closeDataPanel = function() {
  document.getElementById('depOverlay').classList.remove('open');
  document.getElementById('depPanel').classList.remove('open');
  document.body.style.overflow = '';
};

/* ════════════════════════ INLINE FORMS ══════════════════════ */
window.toggleInlineForm = function(formId, btn) {
  var form = document.getElementById(formId);
  if (!form) return;
  var card = form.closest('.param-card');
  var isOpen = form.classList.contains('open');

  // Close all inline forms first
  document.querySelectorAll('.inline-form-panel.open').forEach(function(f) {
    f.classList.remove('open');
    var b = f.closest('.param-card')?.querySelector('.pc-btn-toggle');
    if (b) { b.classList.remove('expanded'); }
    var c = f.closest('.param-card');
    if (c) c.classList.remove('form-open');
  });

  if (!isOpen) {
    form.classList.add('open');
    if (btn) btn.classList.add('expanded');
    if (card) card.classList.add('form-open');
    // Scroll into view
    setTimeout(function() {
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
};

window.saveInlineForm = function(type) {
  var previewId = type + '-ai-preview';
  var textId    = type + '-ai-text';
  var preview   = document.getElementById(previewId);
  var textEl    = document.getElementById(textId);

  if (preview && textEl) {
    textEl.innerHTML = '<p style="font-family:Inter,sans-serif;font-size:.83rem;color:#374151;line-height:1.7">🤖 <strong>AI Analysis complete.</strong></p><p style="font-family:Inter,sans-serif;font-size:.83rem;color:#374151;line-height:1.7;margin-top:6px">' +
      (type === 'air'
        ? '✅ PM2.5 (62 µg/m³) — within CPCB limit (60 µg/m³) — borderline. ⚠️ PM10 (85 µg/m³) — within limit (100 µg/m³). ✅ CO₂ (412 ppm) — normal atmospheric level. ✅ NOₓ (25 ppb) — well within limit (40 ppb). <br/><br/><strong>Recommendation:</strong> Monitor PM2.5 closely — trending toward limit. Consider dust suppression near Station A.'
        : '✅ pH (7.2) — within range (6.5–8.5). ⚠️ TDS (550 mg/L) — within limit (600 mg/L) — borderline. ✅ BOD (3 mg/L) — excellent (limit: 30 mg/L). ✅ DO (6.8 mg/L) — healthy level. <br/><br/><strong>Recommendation:</strong> TDS is trending upward — inspect upstream industrial discharge points.'
      ) + '</p>';
    preview.style.display = 'block';
    preview.style.animation = 'none';
    setTimeout(function() { preview.style.animation = ''; }, 10);
  }

  showToast('✅ ' + (type === 'air' ? 'Air Quality' : 'Water Quality') + ' data saved. AI analysis complete!');
};

/* ════════════════════════ TABS ══════════════════════ */
window.wTab=function(btn,id){
  var wrap=btn.closest('.app-sec')||btn.closest('.wform-panel')||document.body;
  wrap.querySelectorAll('.wtab').forEach(function(b){b.classList.remove('active')});
  btn.classList.add('active');
  wrap.querySelectorAll('.wtab-pane').forEach(function(p){p.classList.remove('active')});
  var t=document.getElementById(id);if(t)t.classList.add('active');
};

/* ════════════════════════ FORMS ══════════════════════ */
var FORMS={
  air:     {title:'Air Quality Data Entry',     icon:'fa-wind',       fields:['PM2.5 (µg/m³)','PM10 (µg/m³)','CO₂ (ppm)','SO₂ (ppb)','NOₓ (ppb)','O₃ (ppb)','Wind Speed (m/s)']},
  water:   {title:'Water Quality Data Entry',   icon:'fa-water',      fields:['pH Level','TDS (mg/L)','BOD (mg/L)','COD (mg/L)','DO (mg/L)','Turbidity (NTU)','Temperature (°C)']},
  noise:   {title:'Noise Monitoring',           icon:'fa-volume-up',  fields:['Day Level (dB)','Night Level (dB)','Peak Level (dB)','Leq (dB)','Duration (hrs)']},
  soil:    {title:'Soil Monitoring',            icon:'fa-mountain',   fields:['Moisture (%)','pH Level','Nitrogen (kg/ha)','Phosphorus (kg/ha)','Heavy Metals (mg/kg)']},
  temp:    {title:'Temperature Data',           icon:'fa-thermometer-half',fields:['Ambient (°C)','Process (°C)','Effluent (°C)','Stack (°C)','Cooling Water (°C)']},
  humidity:{title:'Humidity Data',              icon:'fa-tint',       fields:['Relative (%)','Absolute (g/m³)','Dew Point (°C)','Wet Bulb (°C)']},
  waste:   {title:'Waste Management',           icon:'fa-recycle',    fields:['Solid Waste (t)','Recyclable (t)','Hazardous (kg)','E-Waste (kg)','Composted (kg)']}
};

window.openDataForm=function(type){
  var cfg=FORMS[type];if(!cfg)return;
  var body=document.getElementById('dataModalBody');
  body.innerHTML='<div style="display:flex;align-items:center;gap:12px;margin-bottom:22px"><div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#16a34a,#0d9488);display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff"><i class="fas '+cfg.icon+'"></i></div><h3 style="font-family:Poppins,sans-serif;font-size:1.1rem;font-weight:900;color:#0f172a">'+cfg.title+'</h3></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px"><div class="wf-grp"><label>Date</label><input type="date" value="'+new Date().toISOString().split('T')[0]+'"/></div><div class="wf-grp"><label>Shift</label><select><option>Morning</option><option>Afternoon</option><option>Night</option><option>24hr Avg</option></select></div></div>'
  +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:12px;margin-bottom:18px">'+cfg.fields.map(function(f){return'<div class="wf-grp"><label>'+f+'</label><input type="number" step="0.01" placeholder="Enter value"/></div>'}).join('')+'</div>'
  +'<div class="wf-grp" style="margin-bottom:18px"><label>Remarks</label><textarea rows="2" placeholder="Observations..." style="resize:vertical;width:100%"></textarea></div>'
  +'<div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn-mod" onclick="submitDataForm(\''+type+'\')"><i class="fas fa-save"></i> Save & Analyse</button><button class="btn-outline-mod" onclick="generateReport(\'Monitoring\')"><i class="fas fa-download"></i> Export PDF</button><button onclick="document.getElementById(\'dataModal\').classList.remove(\'open\')" style="margin-left:auto;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:9px 15px;color:#475569;cursor:pointer;font-family:Inter,sans-serif;font-size:.86rem"><i class="fas fa-times"></i> Cancel</button></div>';
  document.getElementById('dataModal').classList.add('open');
};
window.submitDataForm=function(t){document.getElementById('dataModal').classList.remove('open');showToast('✓ '+t.charAt(0).toUpperCase()+t.slice(1)+' data saved. AI analysing...');setTimeout(function(){showToast('✅ All parameters within permissible limits.')},2400)};
window.submitESGForm=function(e){e.preventDefault();showToast('ESG Score recalculated: 76/100 — Grade B+')};
window.submitCarbonForm=function(e){e.preventDefault();showToast('Carbon footprint: 1,847 tCO₂e this month.')};
window.generateReport=function(t){showToast('📄 '+t+' PDF export — coming soon.');};
window.generateAnnualReport=function(){window.generateReport('Annual');};

/* ════════════════════════ CHATBOT ════════════════════ */
var REPLIES={
  esg:'Your ESG Score is **74/100 (Grade B+)**.\n\n• **Environmental (78)** — reduce water withdrawal 15%\n• **Social (72)** — increase training hrs to 10/employee\n• **Governance (68)** — formalise supplier ESG screening',
  compliance:'**Compliance Summary — June 2025:**\n\n✅ Air — within CPCB norms\n⚠️ Noise — 88 dB (limit 85 dB) — action required\n✅ Water — within MPCB standards\n\nNoise source audit required within 48 hrs.',
  carbon:'**Carbon Reduction Opportunities:**\n\n🌞 Rooftop solar 500 kW → **−180 tCO₂e/yr**\n🚛 Route optimisation → **−45 tCO₂e/yr**\n♻️ Waste heat recovery → **−60 tCO₂e/yr**\n\nTotal potential: **−307 tCO₂e/yr**',
  alert:'**Active Alerts:**\n\n🔴 HIGH — Noise: 88 dB boundary. Source: Compressor Room B\n🟡 MED — PM10 Station A: 85 µg/m³\n🟢 INFO — June deadline in 5 days.'
};
window.sendChat=function(){
  var input=document.getElementById('chatInput'),msgs=document.getElementById('chatMessages');
  var text=input&&input.value.trim();if(!text)return;
  msgs.appendChild(makeCM('user',text));input.value='';
  var thinking=makeCM('bot','<span style="font-style:italic;color:#94a3b8"><i class="fas fa-circle-notch fa-spin"></i> EcoBot analysing...</span>');
  msgs.appendChild(thinking);msgs.scrollTop=msgs.scrollHeight;
  setTimeout(function(){msgs.removeChild(thinking);msgs.appendChild(makeCM('bot',getReply(text)));msgs.scrollTop=msgs.scrollHeight},1000);
};
window.askBot=function(t){var i=document.getElementById('chatInput');if(i)i.value=t;sendChat();document.getElementById('ai-assistant')&&document.getElementById('ai-assistant').scrollIntoView({behavior:'smooth'})};
window.clearChat=function(){var m=document.getElementById('chatMessages');if(m)m.innerHTML='<div class="cm bot"><div class="cm-ava"><i class="fas fa-robot"></i></div><div class="cm-bubble"><p>Chat cleared. How can I help you today?</p></div></div>'};
window.generateAIReport=function(){
  var type=document.getElementById('aiReportType').value,period=document.getElementById('aiReportPeriod').value;
  showToast('AI generating '+type+' for '+period+'...');
  document.getElementById('chatMessages').appendChild(makeCM('bot','**'+type+' — '+period+'**\n\nReport compiled: ESG 74→76, Carbon −8% MoM, 3 improvement recommendations. PDF ready shortly.'));
};
function makeCM(role,html){
  var d=document.createElement('div');d.className='cm '+role;
  d.innerHTML='<div class="cm-ava"><i class="fas '+(role==='bot'?'fa-robot':'fa-user')+'"></i></div><div class="cm-bubble"><p>'+fmt(html)+'</p></div>';
  return d;
}
function getReply(t){
  var l=t.toLowerCase();
  if(l.indexOf('esg')>-1)return REPLIES.esg;
  if(l.indexOf('compli')>-1)return REPLIES.compliance;
  if(l.indexOf('carbon')>-1||l.indexOf('emission')>-1)return REPLIES.carbon;
  if(l.indexOf('alert')>-1||l.indexOf('noise')>-1)return REPLIES.alert;
  if(l.indexOf('report')>-1)return 'I can generate: **ESG**, **ISO 14001**, **EIA**, **Carbon**, **Sustainability** reports. Which would you like?';
  if(l.indexOf('sustain')>-1)return 'Sustainability Index: **81/100 (A-)**. Top 25% for '+selectedIndustry+' sector.';
  return 'I\'m continuously monitoring your environmental data for '+selectedIndustry+'. All major parameters are within acceptable ranges except boundary noise. How can I assist?';
}
function fmt(t){return t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br/>')}

/* ════════════════════════ TOAST ═════════════════════ */
window.showToast=function(msg){
  var t=document.getElementById('toastMsg');if(!t)return;
  t.innerHTML='<i class="fas fa-leaf" style="color:#22c55e;margin-right:7px"></i>'+msg;
  t.classList.add('show');setTimeout(function(){t.classList.remove('show')},3500);
};

function scheduleAutoAlerts(){
  [[9000,'⚠️ Noise: Boundary Pt 3 at 88 dB — exceeds CPCB limit'],
   [24000,'✅ Air quality normalised — PM10 back within limits'],
   [40000,'ℹ️ June monthly report due in 5 days — 3 depts pending']
  ].forEach(function(a){setTimeout(function(){showToast(a[1])},a[0])});
}
