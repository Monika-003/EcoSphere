'use strict';
/* ═══════════════════════════════════════════════════════════════
   EcoSphere — Compliance Ecosystem Engine
   Portal selection · Workflow state machine · Lab & Regulatory
   3D Ecosystem globe visualization · Certificate generation
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────── PORTAL NAVIGATION ─────────────────── */
var currentPortal = 'org'; // 'org' | 'lab' | 'reg'

window.selectPortal = function(type) {
  currentPortal = type;
  document.getElementById('portalSelectPage').classList.add('page-hidden');
  if (type === 'org') {
    // Organisation → existing industry selection flow
    var ip = document.getElementById('industryPage');
    ip.classList.remove('page-hidden');
    ip.style.cssText = '';
  } else if (type === 'lab') {
    document.getElementById('labPortalPage').classList.remove('page-hidden');
    initEcosystem3D(); // ecosystem vis in lab portal if needed
    showToast('🔬 Welcome to Laboratory Portal — ' + getLabUser());
  } else if (type === 'reg') {
    document.getElementById('regPortalPage').classList.remove('page-hidden');
    showToast('🏛️ Welcome to Regulatory Authority Portal');
  }
};

function getLabUser() { return 'Lab Administrator'; }

window.goPortalSelect = function() {
  ['labPortalPage','regPortalPage','mainApp','industryPage','loginPage'].forEach(function(id) {
    var e = document.getElementById(id);
    if (e) { e.classList.add('page-hidden'); e.style.display = ''; }
  });
  document.getElementById('portalSelectPage').classList.remove('page-hidden');
};

/* ─────────────────── LANDING → PORTAL SELECT ─────────────────── */
// Override goIndustry to show portal select first from landing
var _origGoIndustry = window.goIndustry;
window.goIndustry = function() {
  var lp = document.getElementById('landingPage');
  if (lp) lp.classList.add('page-hidden');
  document.getElementById('portalSelectPage').classList.remove('page-hidden');
};

/* ─────────────────── WORKFLOW STATE MACHINE ─────────────────── */
var WORKFLOW_STATES = [
  { id: 'data_entered',   label: 'Data Entered',     icon: 'fa-edit' },
  { id: 'ai_validated',   label: 'AI Validated',      icon: 'fa-robot' },
  { id: 'report_gen',     label: 'Report Generated',  icon: 'fa-file-medical' },
  { id: 'submitted',      label: 'Submitted to Lab',  icon: 'fa-paper-plane' },
  { id: 'lab_review',     label: 'Lab Review',        icon: 'fa-flask' },
  { id: 'lab_approved',   label: 'Lab Approved',      icon: 'fa-check-double' },
  { id: 'govt_review',    label: 'Govt Review',       icon: 'fa-landmark' },
  { id: 'certified',      label: 'Certificate Issued', icon: 'fa-certificate' },
];

// Reports store (simulated)
var REPORTS = [
  { id: 'RPT-2025-0612', type: 'Environmental Monitoring', org: 'QMICS Manufacturing',
    period: 'May 2025', state: 'lab_review', aiScore: 87, date: '02 Jun 2025' },
  { id: 'RPT-2025-0611', type: 'ESG Report', org: 'Pharma Labs India',
    period: 'Q1 2025', state: 'lab_review', aiScore: 74, date: '01 Jun 2025' },
  { id: 'RPT-2025-0598', type: 'ESG Report', org: 'QMICS Manufacturing',
    period: 'May 2025', state: 'certified', aiScore: 74, date: '28 Apr 2025' },
  { id: 'RPT-2025-0584', type: 'Carbon Footprint', org: 'QMICS Manufacturing',
    period: 'Apr 2025', state: 'certified', aiScore: 82, date: '08 May 2025' },
];

function stateIndex(state) {
  return WORKFLOW_STATES.findIndex(function(s) { return s.id === state; });
}

/* Advance workflow track display */
window.updateWorkflowDisplay = function(reportId, state) {
  var track = document.getElementById('workflowTrack');
  if (!track) return;
  var curIdx = stateIndex(state);
  var steps  = track.querySelectorAll('.tl-step');
  steps.forEach(function(step, i) {
    step.classList.remove('done','active','rejected');
    if (i < curIdx) step.classList.add('done');
    else if (i === curIdx) step.classList.add('active');
  });
};

/* Auto-generate report on data submission */
window.autoGenerateReport = function(dataType) {
  var reportId = 'RPT-' + new Date().getFullYear() + '-' + Math.floor(Math.random()*1000).toString().padStart(4,'0');
  showToast('🤖 AI is generating ' + dataType + ' report...');
  setTimeout(function() {
    showToast('✅ ' + dataType + ' Report generated: ' + reportId + ' · AI Score: 87/100');
    // Update compliance dashboard counter
    var totalEl = document.querySelector('#comp-dashboard .comp-kpi.ck-blue .ck-val');
    if (totalEl) totalEl.textContent = parseInt(totalEl.textContent || 0) + 1;
    // Show report ready in submission section
    showToast('📋 Report ready in Report Submission — submit to laboratory when ready');
  }, 2200);
};

/* Submit to lab */
window.submitToLab = function(type) {
  showToast('📤 Report submitted to laboratory for review...');
  setTimeout(function() {
    showToast('✅ Laboratory notified — report is now under review');
    // Animate a particle on ecosystem if visible
    if (typeof pulseEcoConnection === 'function') pulseEcoConnection('org', 'lab');
  }, 1500);
};

/* ─────────────────── LAB PORTAL ACTIONS ─────────────────── */
window.openLabReview = function(reportId) {
  var panel = document.getElementById('labReviewPanel');
  if (!panel) return;
  document.getElementById('labReviewId').textContent = reportId;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.labApprove = function() {
  showToast('✅ Report approved by laboratory — forwarding to Regulatory Authority');
  document.getElementById('labReviewPanel').style.display = 'none';
  setTimeout(function() {
    showToast('📨 Report forwarded to Government for final review');
    if (typeof pulseEcoConnection === 'function') pulseEcoConnection('lab', 'reg');
  }, 1800);
};

window.labCorrection = function() {
  showToast('⚠️ Correction request sent to organization — awaiting resubmission');
  document.getElementById('labReviewPanel').style.display = 'none';
};

window.labReject = function() {
  showToast('❌ Report rejected — organization has been notified');
  document.getElementById('labReviewPanel').style.display = 'none';
};

/* ─────────────────── REGULATORY PORTAL ACTIONS ─────────────────── */
window.openGovReview = function(reportId) {
  var panel = document.getElementById('govReviewPanel');
  if (!panel) return;
  document.getElementById('grc-report-info').textContent =
    reportId + ' · Chemical Corp · Sustainability Report';
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });
};

window.govApprove = function() {
  showToast('✅ Report approved by Regulatory Authority');
  document.getElementById('govReviewPanel').style.display = 'none';
  setTimeout(function() { showToast('📋 Organization notified of government approval'); }, 1500);
};

window.govIssueCert = function() {
  showToast('🏛️ Generating compliance certificate...');
  setTimeout(function() {
    showToast('🏆 Certificate issued! TSPCB/ENV/2025/' + Math.floor(Math.random()*9999).toString().padStart(4,'0') + ' — Valid for 1 year');
    document.getElementById('govReviewPanel').style.display = 'none';
    if (typeof pulseEcoConnection === 'function') pulseEcoConnection('reg', 'org');
  }, 2000);
};

window.govNotice = function() {
  showToast('📋 Compliance notice issued to organization — corrective action required within 30 days');
  document.getElementById('govReviewPanel').style.display = 'none';
};

window.govReject = function() {
  showToast('❌ Report rejected by Regulatory Authority — resubmission required');
  document.getElementById('govReviewPanel').style.display = 'none';
};

window.openCertGen = function(reportId) {
  showToast('🏆 Certificate generation initiated for ' + reportId);
  setTimeout(function() { showToast('🏅 Certificate issued — available in Certificate Center'); }, 2000);
};

window.showCerts = function() {
  var ac = document.getElementById('appContent');
  var certSec = document.getElementById('comp-certs');
  if (ac && certSec) ac.scrollTop = certSec.offsetTop - 70;
};

/* ─────────────────── ROLE-BASED PERMISSION GUARD ─────────────────── */
window.applyCompliancePermissions = function(role) {
  var isHead = ['environmental_officer','env_engineer','admin'].includes(role);
  // Members (dept heads) cannot see certificate section
  var certSec = document.getElementById('comp-certs');
  var userSec = document.getElementById('comp-users');
  if (!isHead) {
    if (certSec) certSec.style.display = 'none';
    if (userSec) userSec.style.display = 'none';
    // Disable submit buttons
    document.querySelectorAll('.tbl-btn.approve').forEach(function(b) {
      b.disabled = true; b.style.opacity = '.35'; b.title = 'Organization Head access required';
    });
  }
};

/* ─────────────────── 3D ECOSYSTEM VISUALIZATION ─────────────────── */
function initEcosystem3D() {
  var canvas = document.getElementById('ecosystemCanvas');
  if (!canvas || typeof THREE === 'undefined') return;
  if (canvas._initialized) return;
  canvas._initialized = true;

  var W = canvas.parentElement.offsetWidth  || 700;
  var H = canvas.parentElement.offsetHeight || 380;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(0, 0, 5.5);
  camera.lookAt(0, 0, 0);

  /* ── Central Earth ── */
  var earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshPhongMaterial({
      color: 0x042f2e, emissive: 0x021a18,
      specular: 0x4ade80, shininess: 45,
      transparent: true, opacity: 0.92
    })
  );
  scene.add(earth);

  var wireframe = new THREE.Mesh(
    new THREE.SphereGeometry(1.005, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.05 })
  );
  scene.add(wireframe);

  /* Atmosphere */
  var atm = new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.03, side: THREE.BackSide })
  );
  scene.add(atm);

  /* ── Three stakeholder nodes ── */
  var nodeData = [
    { name: 'Organization', angle: -Math.PI/2,      color: 0x3b82f6, label: '🏭',  dist: 2.8, ring: 0x3b82f6 },
    { name: 'Laboratory',   angle: -Math.PI/2 + Math.PI*2/3, color: 0x22c55e, label: '🔬',  dist: 2.8, ring: 0x22c55e },
    { name: 'Regulatory',   angle: -Math.PI/2 + Math.PI*4/3, color: 0xf59e0b, label: '🏛️',  dist: 2.8, ring: 0xf59e0b },
  ];

  var nodes = [];
  nodeData.forEach(function(nd) {
    var x = Math.cos(nd.angle) * nd.dist;
    var y = Math.sin(nd.angle) * 0.5;
    var z = Math.sin(nd.angle) * nd.dist * 0.5;

    /* Node sphere */
    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 24, 24),
      new THREE.MeshPhongMaterial({ color: nd.color, emissive: nd.color, shininess: 60 })
    );
    sphere.position.set(x, y, z);
    scene.add(sphere);

    /* Node glow ring */
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.022, 8, 60),
      new THREE.MeshBasicMaterial({ color: nd.ring, transparent: true, opacity: 0.55 })
    );
    ring.position.set(x, y, z);
    ring.lookAt(0, 0, 0);
    scene.add(ring);

    /* Orbital ring around node */
    var orbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.006, 6, 60),
      new THREE.MeshBasicMaterial({ color: nd.ring, transparent: true, opacity: 0.25 })
    );
    orbit.position.set(x, y, z);
    orbit.rotation.x = Math.PI / 4;
    scene.add(orbit);

    nodes.push({ mesh: sphere, ring: ring, orbit: orbit, x: x, y: y, z: z, data: nd, phase: Math.random() * Math.PI * 2 });
  });

  /* ── Connection lines (earth → each node) ── */
  var connections = [];
  nodes.forEach(function(node) {
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40;
      var p = new THREE.Vector3(
        node.x * t,
        (node.y + Math.sin(t * Math.PI) * 0.4) * t,
        node.z * t
      );
      pts.push(p);
    }
    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: node.data.color, transparent: true, opacity: 0.35 })
    );
    scene.add(line);
    connections.push({ line: line, node: node, pulseT: -1 });
  });

  /* ── Traveling particle on connections ── */
  var travelParticles = [];
  connections.forEach(function(conn, i) {
    var p = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: conn.node.data.color })
    );
    scene.add(p);
    travelParticles.push({ mesh: p, conn: conn, t: i * 0.33, speed: 0.004 + Math.random() * 0.003 });
  });

  /* Expose pulse function */
  var PORTAL_MAP = { org: 0, lab: 1, reg: 2 };
  window.pulseEcoConnection = function(from, to) {
    var fi = PORTAL_MAP[from], ti = PORTAL_MAP[to];
    if (connections[fi]) connections[fi].pulseT = 0;
    if (connections[ti]) connections[ti].pulseT = 0;
  };

  /* ── Floating data dot particles ── */
  var floatPts = [];
  for (var i = 0; i < 120; i++) {
    var r = 1.8 + Math.random() * 1.2;
    var pp = Math.acos(2 * Math.random() - 1);
    var pt = Math.random() * Math.PI * 2;
    floatPts.push(r*Math.sin(pp)*Math.cos(pt), r*Math.sin(pp)*Math.sin(pt), r*Math.cos(pp));
  }
  var fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.Float32BufferAttribute(floatPts, 3));
  var floatDots = new THREE.Points(fGeo, new THREE.PointsMaterial({
    color: 0x4ade80, size: 0.012, transparent: true, opacity: 0.35, sizeAttenuation: true
  }));
  scene.add(floatDots);

  /* ── Lights ── */
  scene.add(new THREE.AmbientLight(0x0c2820, 1.2));
  var sl = new THREE.DirectionalLight(0xfef9c3, 0.7); sl.position.set(4,3,5); scene.add(sl);
  scene.add(new THREE.PointLight(0x22c55e, 2.5, 8)); scene.children[scene.children.length-1].position.set(-2,2,2);
  scene.add(new THREE.PointLight(0x3b82f6, 1.5, 6)); scene.children[scene.children.length-1].position.set(3,-1,2);
  scene.add(new THREE.PointLight(0xf59e0b, 1.0, 5)); scene.children[scene.children.length-1].position.set(0,3,-1);

  /* ── Resize ── */
  window.addEventListener('resize', function() {
    var nW = canvas.parentElement.offsetWidth  || W;
    var nH = canvas.parentElement.offsetHeight || H;
    camera.aspect = nW / nH; camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  });

  /* ── Animate ── */
  var t = 0;
  (function loop() {
    requestAnimationFrame(loop);
    t += 0.008;

    earth.rotation.y     += 0.006;
    wireframe.rotation.y += 0.006;
    floatDots.rotation.y -= 0.003;

    /* Node pulse + orbit spin */
    nodes.forEach(function(n, i) {
      var pulse = 0.85 + 0.15 * Math.sin(t * 1.5 + n.phase);
      n.ring.material.opacity = 0.35 + 0.3 * Math.abs(Math.sin(t * 2 + n.phase));
      n.ring.scale.set(pulse, pulse, pulse);
      n.orbit.rotation.z += 0.008 + i * 0.003;
      n.orbit.rotation.x += 0.005;
    });

    /* Connection pulses */
    connections.forEach(function(c) {
      if (c.pulseT >= 0) {
        c.line.material.opacity = 0.2 + 0.6 * Math.sin(c.pulseT * Math.PI);
        c.pulseT += 0.04;
        if (c.pulseT > 1) { c.pulseT = -1; c.line.material.opacity = 0.35; }
      }
    });

    /* Traveling particles along connection lines */
    travelParticles.forEach(function(tp) {
      tp.t += tp.speed;
      if (tp.t > 1) tp.t -= 1;
      var t2 = tp.t;
      var nd = tp.conn.node;
      tp.mesh.position.set(
        nd.x * t2,
        (nd.y + Math.sin(t2 * Math.PI) * 0.4) * t2,
        nd.z * t2
      );
      tp.mesh.material.opacity = 0.6 + 0.4 * Math.sin(t2 * Math.PI);
    });

    camera.position.x = Math.sin(t * 0.25) * 0.3;
    camera.position.y = Math.cos(t * 0.2) * 0.2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  })();
}

/* ─────────────────── INIT after main app loads ─────────────────── */
/* Hook into existing initMainApp */
var _origInitMainApp = window.initMainApp;
window.initMainApp = function() {
  if (typeof _origInitMainApp === 'function') _origInitMainApp();
  // Init ecosystem after a short delay so DOM is ready
  setTimeout(function() {
    initEcosystem3D();
    if (typeof selectedRole !== 'undefined') {
      applyCompliancePermissions(selectedRole);
    }
  }, 800);
};

/* ─────────────────── LINK data form saves to auto-report gen ─────────────────── */
var _origSaveInlineForm = window.saveInlineForm;
window.saveInlineForm = function(type) {
  if (typeof _origSaveInlineForm === 'function') _origSaveInlineForm(type);
  // After saving any monitoring data, auto-generate report
  setTimeout(function() {
    var typeMap = { air:'Air Quality', water:'Water Quality', noise:'Noise', soil:'Soil', temp:'Temperature', humidity:'Humidity', waste:'Waste Management' };
    autoGenerateReport(typeMap[type] || type);
  }, 3000);
};
