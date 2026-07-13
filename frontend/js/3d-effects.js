'use strict';
/* ═══════════════════════════════════════════════════════════
   EcoSphere — Per-Module 3D Canvas Effects + Navigation
   ═══════════════════════════════════════════════════════════ */

/* ─── Section canvas particle configs ─── */
var MODULE_CONFIGS = {
  canvasPolicy: {
    particles: 28, colors: ['rgba(217,119,6,', 'rgba(245,158,11,', 'rgba(252,211,77,'],
    shapes: ['scroll'], size: [3,7], speed: [0.2,0.5], type: 'float'
  },
  canvasDash: {
    particles: 35, colors: ['rgba(37,99,235,', 'rgba(96,165,250,', 'rgba(59,130,246,'],
    shapes: ['dot'], size: [2,5], speed: [0.3,0.6], type: 'float'
  },
  canvasMonitor: {
    particles: 45, colors: ['rgba(22,163,74,', 'rgba(74,222,128,', 'rgba(168,224,99,', 'rgba(0,200,83,'],
    shapes: ['leaf'], size: [4,9], speed: [0.25,0.55], type: 'leaf'
  },
  canvasESG: {
    particles: 30, colors: ['rgba(124,58,237,', 'rgba(167,139,250,', 'rgba(99,102,241,'],
    shapes: ['ring'], size: [3,7], speed: [0.3,0.6], type: 'orbit'
  },
  canvasCarbon: {
    particles: 40, colors: ['rgba(29,78,216,', 'rgba(96,165,250,', 'rgba(147,197,253,'],
    shapes: ['cloud'], size: [3,8], speed: [0.15,0.35], type: 'cloud'
  },
  canvasSus: {
    particles: 38, colors: ['rgba(13,148,136,', 'rgba(45,212,191,', 'rgba(22,163,74,', 'rgba(52,211,153,'],
    shapes: ['leaf'], size: [4,10], speed: [0.2,0.45], type: 'grow'
  },
  canvasReport: {
    particles: 25, colors: ['rgba(217,119,6,', 'rgba(251,191,36,', 'rgba(253,230,138,'],
    shapes: ['doc'], size: [3,6], speed: [0.2,0.4], type: 'float'
  }
};

/* ─── Leaf shape drawer ─── */
function drawLeaf(ctx, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size*.7, -size*.5, size*.8, size*.3, 0, size);
  ctx.bezierCurveTo(-size*.8, size*.3, -size*.7, -size*.5, 0, -size);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -size*.8);
  ctx.lineTo(0, size*.7);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
}

/* ─── Cloud shape ─── */
function drawCloud(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI*2);
  ctx.arc(x+size*.8, y, size*.7, 0, Math.PI*2);
  ctx.arc(x-size*.8, y, size*.6, 0, Math.PI*2);
  ctx.arc(x+size*.3, y-size*.5, size*.65, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* ─── Init section canvas ─── */
function initSectionCanvas(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var section = canvas.parentElement;
  var cfg = MODULE_CONFIGS[canvasId];
  if (!cfg) return;

  // Size canvas to section
  function resize() {
    canvas.width = section.offsetWidth;
    canvas.height = section.offsetHeight;
  }
  resize();
  new ResizeObserver(resize).observe(section);

  var ctx = canvas.getContext('2d');
  var particles = [];

  // Create particles
  for (var i = 0; i < cfg.particles; i++) {
    var colorBase = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
      speed: cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]),
      color: colorBase + (0.06 + Math.random() * 0.1) + ')',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.1 + Math.random() * 0.3),
      phase: Math.random() * Math.PI * 2,
      orbitR: 20 + Math.random() * 40,
      orbitSpeed: (Math.random() - 0.5) * 0.01,
    });
  }

  var t = 0;
  var animId;
  function draw() {
    animId = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.008;

    particles.forEach(function(p) {
      var alpha = 0.05 + 0.08 * Math.abs(Math.sin(t * 0.5 + p.phase));
      var col = p.color.replace(/[\d.]+\)$/, alpha + ')');

      if (cfg.type === 'leaf' || cfg.type === 'grow') {
        drawLeaf(ctx, p.x, p.y, p.size, p.rot, col);
        p.rot += p.rotSpeed;
        p.y += p.vy * p.speed;
        p.x += Math.sin(t + p.phase) * 0.4;
        if (p.y < -p.size) {
          p.y = canvas.height + p.size;
          p.x = Math.random() * canvas.width;
        }
      } else if (cfg.type === 'orbit') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(t + p.phase) * p.orbitR * 0.3,
                p.y + Math.sin(t + p.phase) * p.orbitR * 0.15, p.size, 0, Math.PI*2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.restore();
        p.x += p.vx * 0.3;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      } else if (cfg.type === 'cloud') {
        drawCloud(ctx, p.x, p.y, p.size, col);
        p.x += p.speed * 0.4;
        p.y += Math.sin(t * 0.5 + p.phase) * 0.15;
        if (p.x > canvas.width + 30) p.x = -30;
      } else {
        // float
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y + Math.sin(t + p.phase) * 4, p.size, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.restore();
        p.x += p.vx;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      }
    });
  }

  // Only run when section is visible
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { if (!animId) draw(); }
      else { cancelAnimationFrame(animId); animId = null; }
    });
  }, {threshold: 0.05});
  io.observe(section);
}

/* ─── 3D card tilt effect ─── */
function init3DCards() {
  document.querySelectorAll('.param-card, .policy-card, .kpi-card, .feat-card, .ind-card, .isg-card').forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var rx = ((e.clientY - cy) / (rect.height / 2)) * -6;
      var ry = ((e.clientX - cx) / (rect.width / 2)) * 6;
      card.style.transform = 'perspective(600px) rotateX('+rx+'deg) rotateY('+ry+'deg) translateZ(6px)';
      card.style.boxShadow = '0 14px 40px rgba(0,0,0,0.15), '+(ry>0?ry:0)*0.5+'px '+(rx<0?-rx:0)*0.5+'px 12px rgba(22,163,74,0.15)';
    });
    card.addEventListener('mouseleave', function() {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
    });
    card.addEventListener('mouseenter', function() {
      card.style.transition = 'none';
    });
  });
}

/* ─── Floating greenery SVG decorations per section ─── */
var SECTION_SVGS = {
  'policy':       { emoji: '📜', extra: ['🌿','✨','🌱'] },
  'dashboard':    { emoji: '🌍', extra: ['📊','✨','🔆'] },
  'monitoring':   { emoji: '🌳', extra: ['🌿','🍃','🌱','🌾'] },
  'esg':          { emoji: '♻️', extra: ['📈','🌐','💡'] },
  'carbon':       { emoji: '🌫️', extra: ['⚡','🌊','💨'] },
  'sustainability':{ emoji: '🌿', extra: ['🌱','☘️','🍀','🌸'] },
  'reports':      { emoji: '📋', extra: ['📄','✅','💼'] },
  'ai-assistant': { emoji: '🤖', extra: ['💡','🔬','⚡'] }
};

function addSectionDecorations() {
  Object.keys(SECTION_SVGS).forEach(function(id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    var cfg = SECTION_SVGS[id];

    // Add floating decoration elements
    cfg.extra.forEach(function(emoji, i) {
      var el = document.createElement('div');
      el.className = 'sec-float-deco';
      el.textContent = emoji;
      el.style.cssText = [
        'position:absolute',
        'font-size:'+(16+Math.random()*14)+'px',
        'right:'+(4+i*8)+'%',
        'top:'+(6+i*12)+'%',
        'opacity:0.12',
        'animation:decoFloat '+(4+i*1.5)+'s '+(i*0.5)+'s ease-in-out infinite alternate',
        'pointer-events:none',
        'user-select:none',
        'z-index:0',
        'transform:rotate('+(Math.random()*20-10)+'deg)'
      ].join(';');
      sec.appendChild(el);
    });
  });
}

/* ─── Page transition overlay ─── */
var transitioning = false;

window.pageTransition = function(callback, reverse) {
  if (transitioning) return;
  transitioning = true;
  var overlay = document.getElementById('pageTransition');
  var leavesContainer = document.getElementById('ptoLeaves');
  if (!overlay) { callback && callback(); transitioning = false; return; }

  // Spawn leaves
  leavesContainer.innerHTML = '';
  var EMOJIS = ['🌿','🍃','🌱','☘️','🍀','🌾'];
  for (var i = 0; i < 16; i++) {
    var l = document.createElement('div');
    l.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    l.style.cssText = [
      'position:absolute',
      'font-size:'+(18+Math.random()*20)+'px',
      'left:'+(Math.random()*100)+'%',
      'top:'+(Math.random()*100)+'%',
      'opacity:0',
      'animation:ptoLeaf '+(0.4+Math.random()*0.3)+'s '+(i*0.04)+'s ease forwards'
    ].join(';');
    leavesContainer.appendChild(l);
  }

  overlay.classList.add('pto-in');
  setTimeout(function() {
    callback && callback();
    overlay.classList.remove('pto-in');
    overlay.classList.add('pto-out');
    setTimeout(function() {
      overlay.classList.remove('pto-out');
      transitioning = false;
    }, 500);
  }, 400);
};

/* ─── Return to Home ─── */
window.returnHome = function() {
  pageTransition(function() {
    // Hide app
    var app = document.getElementById('mainApp');
    app.classList.remove('app-show');
    app.classList.add('page-hidden');
    // Show landing
    var lp = document.getElementById('landingPage');
    lp.classList.remove('page-hidden');
    lp.style.cssText = '';
    window.scrollTo(0, 0);
  });
  // Hide home fab
  document.getElementById('homeFab').style.display = 'none';
};

/* ─── Override goIndustry / goLogin / doLogin with transitions ─── */
var _origGoIndustry = window.goIndustry;
window.goIndustry = function() {
  pageTransition(function() {
    document.getElementById('landingPage').classList.add('page-hidden');
    var ip = document.getElementById('industryPage');
    ip.classList.remove('page-hidden');
    ip.style.cssText = '';
    window.scrollTo(0, 0);
  });
};

var _origGoLogin = window.goLogin;
window.goLogin = function() {
  pageTransition(function() {
    document.getElementById('industryPage').classList.add('page-hidden');
    var lp = document.getElementById('loginPage');
    lp.classList.remove('page-hidden');
    lp.style.cssText = '';
    window.scrollTo(0, 0);
    if (typeof initGlobe === 'function') initGlobe('loginGlobe');
  });
};

var _origGoLanding = window.goLanding;
window.goLanding = function(e) {
  if (e) e.preventDefault();
  pageTransition(function() {
    document.getElementById('industryPage').classList.add('page-hidden');
    document.getElementById('loginPage').classList.add('page-hidden');
    var lp = document.getElementById('landingPage');
    lp.classList.remove('page-hidden');
    lp.style.cssText = '';
    window.scrollTo(0, 0);
  });
  return false;
};

var _origDoLogin = window.doLogin;
window.doLogin = function(e) {
  e.preventDefault();
  var loader = document.getElementById('loginLoader');
  var txt = document.getElementById('loginBtnText');
  if (loader) loader.style.display = 'block';
  if (txt) txt.style.opacity = '.3';
  setTimeout(function() {
    pageTransition(function() {
      document.getElementById('loginPage').classList.add('page-hidden');
      var app = document.getElementById('mainApp');
      app.classList.remove('page-hidden');
      app.style.cssText = '';
      app.classList.add('app-show');
      if (typeof initMainApp === 'function') initMainApp();
      // Show home fab
      var fab = document.getElementById('homeFab');
      if (fab) fab.style.display = 'flex';
    });
  }, 800);
};

var _origDoLogout = window.doLogout;
window.doLogout = function() {
  pageTransition(function() {
    var app = document.getElementById('mainApp');
    app.classList.remove('app-show');
    app.classList.add('page-hidden');
    // Return to landing
    var lp = document.getElementById('landingPage');
    lp.classList.remove('page-hidden');
    lp.style.cssText = '';
    document.getElementById('lgPass').value = '';
    var loader = document.getElementById('loginLoader');
    var txt = document.getElementById('loginBtnText');
    if (loader) loader.style.display = 'none';
    if (txt) txt.style.opacity = '';
    var fab = document.getElementById('homeFab');
    if (fab) fab.style.display = 'none';
    window.scrollTo(0, 0);
  });
};

/* ─── Smooth sidebar navigation ─── */
var _origSbClick = window.sbClick;
window.sbClick = function(el, title) {
  var href = el.getAttribute('href');
  document.querySelectorAll('.sb-link').forEach(function(l) { l.classList.remove('active'); });
  el.classList.add('active');
  var tb = document.getElementById('tbSection');
  if (tb) tb.textContent = title;

  var target = document.querySelector(href);
  var ac = document.getElementById('appContent');
  if (target && ac) {
    var offset = target.offsetTop - 68;
    var start = ac.scrollTop;
    var duration = 500;
    var startTime = null;
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function scroll(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var progress = Math.min(elapsed / duration, 1);
      ac.scrollTop = start + (offset - start) * ease(progress);
      if (progress < 1) requestAnimationFrame(scroll);
    }
    requestAnimationFrame(scroll);
  }
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.add('sb-col');
    window.sbCollapsed = true;
  }
};

/* ─── Landing nav smooth scroll ─── */
document.querySelectorAll('.land-nav-links a').forEach(function(a) {
  a.addEventListener('click', function(e) {
    e.preventDefault();
    var target = document.querySelector(a.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ─── Improved data entry forms with better UX ─── */
var _origOpenForm = window.openDataForm;
window.openDataForm = function(type) {
  var FORMS = {
    air: {
      title: 'Air Quality Data Entry', icon: 'fa-wind', color: '#16a34a', bg: '#f0fdf4',
      fields: [
        {label:'PM2.5 (µg/m³)', hint:'Limit: 60', warn: 60},
        {label:'PM10 (µg/m³)', hint:'Limit: 100', warn: 100},
        {label:'CO₂ (ppm)', hint:'Normal: ~400', warn: 1000},
        {label:'SO₂ (ppb)', hint:'Limit: 80', warn: 80},
        {label:'NOₓ (ppb)', hint:'Limit: 40', warn: 40},
        {label:'O₃ (ppb)', hint:'Limit: 70', warn: 70},
        {label:'Wind Speed (m/s)', hint:''},
        {label:'Temperature (°C)', hint:''}
      ]
    },
    water: {
      title: 'Water Quality Data Entry', icon: 'fa-water', color: '#0d9488', bg: '#f0fdfa',
      fields: [
        {label:'pH Level', hint:'Range: 6.5–8.5', warn: null},
        {label:'TDS (mg/L)', hint:'Limit: 600', warn: 600},
        {label:'BOD (mg/L)', hint:'Limit: 30', warn: 30},
        {label:'COD (mg/L)', hint:'Limit: 250', warn: 250},
        {label:'DO (mg/L)', hint:'Min: 4', warn: null},
        {label:'Turbidity (NTU)', hint:'Limit: 10', warn: 10},
        {label:'Temperature (°C)', hint:'Limit: 35', warn: 35},
        {label:'Total Coliform (MPN)', hint:'Limit: 500', warn: 500}
      ]
    }
  };

  var cfg = FORMS[type];
  if (!cfg) { if (_origOpenForm) return _origOpenForm(type); return; }

  var body = document.getElementById('dataModalBody');
  body.innerHTML =
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;padding:16px;background:'+cfg.bg+';border-radius:12px;border:1px solid '+cfg.color+'22">' +
      '<div style="width:48px;height:48px;border-radius:12px;background:'+cfg.color+';display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#fff;box-shadow:0 4px 12px '+cfg.color+'33">' +
        '<i class="fas '+cfg.icon+'"></i>' +
      '</div>' +
      '<div><h3 style="font-family:Poppins,sans-serif;font-size:1.1rem;font-weight:900;color:#0f172a;margin-bottom:3px">'+cfg.title+'</h3>' +
      '<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:.78rem;font-weight:700;color:#64748b;letter-spacing:1px">CPCB/MPCB Compliance Parameters</span></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
      '<div class="wf-grp"><label>Date</label><input type="date" value="'+new Date().toISOString().split('T')[0]+'"/></div>' +
      '<div class="wf-grp"><label>Monitoring Location</label><input type="text" placeholder="e.g. Station A, Effluent Point"/></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:18px">' +
      cfg.fields.map(function(f) {
        return '<div class="wf-grp">' +
          '<label style="display:flex;justify-content:space-between;align-items:center">' +
            f.label +
            (f.hint ? '<span style="font-size:.65rem;color:#94a3b8;font-weight:500">'+f.hint+'</span>' : '') +
          '</label>' +
          '<input type="number" step="0.01" placeholder="Enter value" ' +
            'style="border-color:'+cfg.color+'33" ' +
            'onfocus="this.style.borderColor=\''+cfg.color+'\'" ' +
            'onblur="this.style.borderColor=\''+cfg.color+'33\'"/>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="wf-grp" style="margin-bottom:18px">' +
      '<label>Observations / Remarks</label>' +
      '<textarea rows="2" placeholder="Note any anomalies, weather conditions, or unusual readings..." style="resize:vertical;width:100%;border-color:'+cfg.color+'33"></textarea>' +
    '</div>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<button onclick="submitAndAnalyse(\''+type+'\')" style="background:'+cfg.color+';color:#fff;border:none;cursor:pointer;font-family:Plus Jakarta Sans,sans-serif;font-size:.92rem;font-weight:800;padding:11px 22px;border-radius:9px;display:inline-flex;align-items:center;gap:8px;transition:all .2s"><i class="fas fa-save"></i> Save & AI Analyse</button>' +
      '<button onclick="generateReport(\'Monitoring\')" style="background:transparent;color:#475569;border:1.5px solid #e2e8f0;cursor:pointer;font-family:Plus Jakarta Sans,sans-serif;font-size:.88rem;font-weight:800;padding:9px 18px;border-radius:9px;display:inline-flex;align-items:center;gap:7px"><i class="fas fa-download"></i> Export PDF</button>' +
      '<button onclick="document.getElementById(\'dataModal\').classList.remove(\'open\')" style="margin-left:auto;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:9px 14px;color:#64748b;cursor:pointer;font-family:Inter,sans-serif;font-size:.86rem"><i class="fas fa-times"></i> Cancel</button>' +
    '</div>';

  var modal = document.getElementById('dataModal');
  modal.classList.add('open');
  modal.style.display = 'flex';
};

window.submitAndAnalyse = function(type) {
  var modal = document.getElementById('dataModal');
  modal.classList.remove('open');
  modal.style.display = 'none';
  // Simulate AI analysis
  showToast('✅ ' + type.charAt(0).toUpperCase() + type.slice(1) + ' data saved successfully!');
  setTimeout(function() {
    showToast('🤖 AI analysis complete — all parameters within permissible limits.');
  }, 2000);
};

/* ─── Init all on DOM ready ─── */
(function initEffects() {
  function run() {
    // Section canvases
    Object.keys(MODULE_CONFIGS).forEach(initSectionCanvas);
    // Floating decorations
    addSectionDecorations();
    // 3D card tilt
    init3DCards();
    // Re-init 3D tilt when new cards scroll in
    var obs = new MutationObserver(function() { init3DCards(); });
    var ac = document.getElementById('appContent');
    if (ac) obs.observe(ac, {childList: true, subtree: true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    setTimeout(run, 500);
  }
})();
