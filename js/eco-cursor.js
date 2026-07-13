/*!
 * EcoSphere — Eco Cursor v3
 * Single sharp cursor · leaf trail · click burst · ambient leaves
 * 3-D card tilt · magnetic buttons
 */
(function () {
  'use strict';
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
  /* Run only once even if script is loaded multiple times */
  if (window.__ecoCursorInit) return;
  window.__ecoCursorInit = true;

  /* ═══════════════════════════════════════
     1.  STYLES
  ═══════════════════════════════════════ */
  var CSS = `
    *, *::before, *::after { cursor: none !important; }

    /* ── Trail canvas (behind everything) ── */
    #eco-trail-cv {
      position: fixed; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 2147483600;
    }

    /* ── Single cursor dot ── */
    #eco-dot {
      position: fixed;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: #ffffff;
      border: 2.5px solid #22c55e;
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
      box-shadow:
        0 0 0 1px rgba(34,197,94,.35),
        0 0 10px rgba(34,197,94,.8),
        0 0 24px rgba(34,197,94,.45);
      transition:
        width  .15s cubic-bezier(.23,1,.32,1),
        height .15s cubic-bezier(.23,1,.32,1),
        background .15s,
        border-color .15s,
        opacity .2s;
    }

    /* ── Hover: ring expands, fill tints ── */
    body.cur-hover #eco-dot {
      width: 26px; height: 26px;
      background: rgba(34,197,94,.12);
      border-color: #4ade80;
      box-shadow:
        0 0 0 2px rgba(74,222,128,.3),
        0 0 14px rgba(74,222,128,.7),
        0 0 30px rgba(34,197,94,.35);
    }

    /* ── Click: shrink to a bright flash ── */
    body.cur-click #eco-dot {
      width: 10px; height: 10px;
      background: #22c55e;
      border-color: #fff;
      box-shadow:
        0 0 0 3px rgba(34,197,94,.5),
        0 0 18px #22c55e,
        0 0 36px rgba(34,197,94,.6);
    }

    /* ── Text cursor: thin blinking bar ── */
    body.cur-text #eco-dot {
      width: 2px; height: 22px;
      border-radius: 2px;
      background: #22c55e;
      border: none;
      box-shadow: 0 0 8px rgba(34,197,94,.7);
    }

    /* ── Off-screen: fade out ── */
    body.cur-off #eco-dot { opacity: 0; }

    /* ── Leaf particles ── */
    .eco-leaf {
      position: fixed; pointer-events: none;
      z-index: 2147483610; transform-origin: center;
    }

    @keyframes eco-ld-a {
      0%   { opacity:.95; transform:translate(-50%,-50%) rotate(0deg)   scale(1); }
      50%  { opacity:.6;  transform:translate(calc(-50% + 20px),calc(-50% + 26px)) rotate(200deg) scale(.65); }
      100% { opacity:0;   transform:translate(calc(-50% + 34px),calc(-50% + 68px)) rotate(400deg) scale(.1); }
    }
    @keyframes eco-ld-b {
      0%   { opacity:.9;  transform:translate(-50%,-50%) rotate(0deg)    scale(1); }
      40%  { opacity:.65; transform:translate(calc(-50% - 26px),calc(-50% + 20px)) rotate(-220deg) scale(.6); }
      100% { opacity:0;   transform:translate(calc(-50% - 42px),calc(-50% + 64px)) rotate(-440deg) scale(.1); }
    }
    @keyframes eco-ld-c {
      0%   { opacity:.85; transform:translate(-50%,-50%) rotate(45deg)  scale(1); }
      60%  { opacity:.55; transform:translate(calc(-50% + 10px),calc(-50% + 36px)) rotate(280deg) scale(.5); }
      100% { opacity:0;   transform:translate(calc(-50% + 6px), calc(-50% + 78px)) rotate(520deg) scale(.08); }
    }
    @keyframes eco-ld-d {
      0%   { opacity:.9;  transform:translate(-50%,-50%) rotate(-30deg) scale(1); }
      50%  { opacity:.6;  transform:translate(calc(-50% - 16px),calc(-50% + 30px)) rotate(160deg) scale(.7); }
      100% { opacity:0;   transform:translate(calc(-50% - 30px),calc(-50% + 76px)) rotate(380deg) scale(.12); }
    }
    @keyframes eco-ld-e {
      0%   { opacity:.8;  transform:translate(-50%,-50%) rotate(0deg)   scale(1); }
      35%  { opacity:.65; transform:translate(calc(-50% + 12px),calc(-50% - 18px)) rotate(90deg)  scale(.8); }
      100% { opacity:0;   transform:translate(calc(-50% + 24px),calc(-50% + 48px)) rotate(300deg) scale(.18); }
    }

    /* ── Click ripple ── */
    .eco-ripple {
      position: fixed; pointer-events: none; z-index: 2147483620;
      border-radius: 50%; border: 2px solid rgba(34,197,94,.6);
      transform: translate(-50%,-50%) scale(0);
      animation: eco-ripple-out .55s cubic-bezier(.25,.46,.45,.94) forwards;
    }
    @keyframes eco-ripple-out {
      to { transform: translate(-50%,-50%) scale(8); opacity: 0; }
    }
  `;

  var styleEl = document.createElement('style');
  styleEl.id  = 'eco-cursor-styles';
  if (!document.getElementById('eco-cursor-styles')) {
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
  }

  /* ═══════════════════════════════════════
     2.  DOM — single dot + canvas
  ═══════════════════════════════════════ */
  /* Remove any previous instance elements */
  ['eco-trail-cv','eco-dot','eco-ring','eco-glow'].forEach(function(id) {
    var old = document.getElementById(id);
    if (old) old.remove();
  });
  document.querySelectorAll('.eco-fly').forEach(function(el) { el.remove(); });

  var cv  = document.createElement('canvas');
  cv.id   = 'eco-trail-cv';
  document.body.appendChild(cv);

  var dot = document.createElement('div');
  dot.id  = 'eco-dot';
  document.body.appendChild(dot);

  /* Canvas context */
  var ctx;
  function resizeCV() {
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    ctx = cv.getContext('2d');
  }
  resizeCV();
  window.addEventListener('resize', resizeCV);

  /* ═══════════════════════════════════════
     3.  STATE
  ═══════════════════════════════════════ */
  var mx = -500, my = -500;
  var pts = [];
  var leafDist = 0, lx0 = 0, ly0 = 0;

  /* ═══════════════════════════════════════
     4.  MOUSE TRACKING
  ═══════════════════════════════════════ */
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;

    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';

    pts.push({ x: mx, y: my, t: Date.now() });
    if (pts.length > 48) pts.shift();

    leafDist += Math.hypot(mx - lx0, my - ly0);
    if (leafDist >= 22) {
      spawnLeaf(mx, my, false);
      leafDist = 0;
      lx0 = mx; ly0 = my;
    }
  });

  /* ═══════════════════════════════════════
     5.  RAF — only the canvas trail
  ═══════════════════════════════════════ */
  function tick() {
    drawTrail();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ═══════════════════════════════════════
     6.  CANVAS TRAIL
  ═══════════════════════════════════════ */
  var TRAIL_AGE = 560;

  function drawTrail() {
    var now = Date.now();
    pts = pts.filter(function (p) { return now - p.t < TRAIL_AGE; });
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (pts.length < 3) return;

    /* wide soft glow pass */
    ctx.save();
    ctx.filter = 'blur(3px)';
    drawCurve(0.14, 5);
    ctx.restore();

    /* core bright pass */
    drawCurve(0.24, 2);

    /* sharp spine (last 14 pts) */
    var tail = pts.slice(-14);
    if (tail.length >= 3) drawCurve(0.42, 1.2, tail);
  }

  function drawCurve(maxA, maxW, points) {
    var p = points || pts;
    if (p.length < 3) return;
    for (var i = 1; i < p.length - 1; i++) {
      var ratio = i / p.length;
      var xc = (p[i].x + p[i + 1].x) / 2;
      var yc = (p[i].y + p[i + 1].y) / 2;
      ctx.beginPath();
      ctx.moveTo(p[i - 1].x, p[i - 1].y);
      ctx.quadraticCurveTo(p[i].x, p[i].y, xc, yc);
      ctx.strokeStyle = 'rgba(34,197,94,' + (ratio * maxA) + ')';
      ctx.lineWidth   = ratio * maxW + 0.4;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
    }
  }

  /* ═══════════════════════════════════════
     7.  LEAF PARTICLES
  ═══════════════════════════════════════ */
  var COLORS = ['#22c55e','#16a34a','#34d399','#4ade80','#86efac','#10b981','#a3e635'];
  var ANIMS  = ['eco-ld-a','eco-ld-b','eco-ld-c','eco-ld-d','eco-ld-e'];
  var SHAPES = [
    '50% 0 50% 0',
    '50% 0 50% 50%',
    '40% 60% 60% 40% / 50% 50% 50% 50%'
  ];

  function spawnLeaf(x, y, burst) {
    var el  = document.createElement('div');
    el.className = 'eco-leaf';
    var sz  = burst ? 5 + Math.random() * 7 : 5 + Math.random() * 10;
    var col = COLORS[Math.floor(Math.random() * COLORS.length)];
    var an  = ANIMS[Math.floor(Math.random() * ANIMS.length)];
    var dur = 1.0 + Math.random() * 1.4;
    var br  = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    el.style.cssText = [
      'left:' + x + 'px', 'top:' + y + 'px',
      'width:' + sz + 'px', 'height:' + sz + 'px',
      'background:' + col,
      'border-radius:' + br,
      'box-shadow:0 0 3px ' + col + '90',
      'animation:' + an + ' ' + dur + 's ease-out forwards'
    ].join(';');
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, (dur + 0.2) * 1000);
  }

  /* ═══════════════════════════════════════
     8.  CLICK BURST + RIPPLE
  ═══════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var r    = document.createElement('div');
    r.className = 'eco-ripple';
    r.style.cssText = 'width:20px;height:20px;left:' + e.clientX + 'px;top:' + e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(function () { if (r.parentNode) r.remove(); }, 650);

    for (var i = 0; i < 8; i++) {
      (function (idx) {
        setTimeout(function () {
          var angle = (idx / 8) * Math.PI * 2;
          var d     = 22 + Math.random() * 20;
          spawnLeaf(e.clientX + Math.cos(angle) * d, e.clientY + Math.sin(angle) * d, true);
        }, idx * 22);
      })(i);
    }
  });

  /* ═══════════════════════════════════════
     9.  CURSOR STATES
  ═══════════════════════════════════════ */
  var SEL_INT  = 'a,button,[onclick],label,[role="button"],[tabindex="0"],.btn';
  var SEL_TEXT = 'input,textarea,select';

  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    if (!t || !t.matches) return;
    var inText = t.matches(SEL_TEXT) || (t.closest && t.closest(SEL_TEXT));
    var inBtn  = !inText && (t.matches(SEL_INT) || (t.closest && t.closest(SEL_INT)));
    document.body.classList.toggle('cur-text',  !!inText);
    document.body.classList.toggle('cur-hover', !!inBtn);
  });
  document.addEventListener('mouseout',   function () {
    document.body.classList.remove('cur-hover', 'cur-text');
  });
  document.addEventListener('mousedown',  function () { document.body.classList.add('cur-click'); });
  document.addEventListener('mouseup',    function () { document.body.classList.remove('cur-click'); });
  document.addEventListener('mouseleave', function () { document.body.classList.add('cur-off'); });
  document.addEventListener('mouseenter', function () { document.body.classList.remove('cur-off'); });

  /* ═══════════════════════════════════════
     10.  3-D CARD TILT
  ═══════════════════════════════════════ */
  var TILT_SEL = '.erb-card,.kpi-card,.sc-section,.feature-card,.pm-metric-card,.mod-card,.card,.card-glass,.portal-card,.eco-card';
  var tiltSet  = new WeakSet();

  function bindTilt(el) {
    if (tiltSet.has(el)) return;
    tiltSet.add(el);
    el.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1),box-shadow .5s';
    el.addEventListener('mousemove', function (e) {
      var r  = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width  - 0.5;
      var py = (e.clientY - r.top)  / r.height - 0.5;
      el.style.transition  = 'transform .08s linear';
      el.style.transform   = 'perspective(700px) rotateX(' + (-py * 9) + 'deg) rotateY(' + (px * 9) + 'deg) scale3d(1.025,1.025,1.025)';
      el.style.boxShadow   = '0 ' + (12 + py * 8) + 'px ' + (30 + Math.abs(px) * 14) + 'px rgba(34,197,94,.12)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transition = 'transform .55s cubic-bezier(.23,1,.32,1),box-shadow .55s';
      el.style.transform  = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      el.style.boxShadow  = '';
    });
  }

  function scanTilt() { document.querySelectorAll(TILT_SEL).forEach(bindTilt); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanTilt);
  else scanTilt();
  setInterval(scanTilt, 2000);

  /* ═══════════════════════════════════════
     11.  MAGNETIC BUTTONS
  ═══════════════════════════════════════ */
  var MAG_SEL = 'button,.btn,.erb-btn,.sc-save-btn,.sc-pdf-btn';
  var magEl   = null;

  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    if (!t || !t.matches) return;
    magEl = t.matches(MAG_SEL) ? t : (t.closest ? t.closest(MAG_SEL) : null);
  });
  document.addEventListener('mouseout', function () { magEl = null; });
  document.addEventListener('mousemove', function (e) {
    if (!magEl) return;
    var r  = magEl.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top  + r.height / 2;
    dot.style.left = (e.clientX + (cx - e.clientX) * 0.28) + 'px';
    dot.style.top  = (e.clientY + (cy - e.clientY) * 0.28) + 'px';
  });

  /* ═══════════════════════════════════════
     12.  AMBIENT LEAVES (background drift)
  ═══════════════════════════════════════ */
  function ambientLeaf() {
    var x   = Math.random() * window.innerWidth;
    var el  = document.createElement('div');
    el.className = 'eco-leaf';
    var sz  = 6 + Math.random() * 9;
    var col = COLORS[Math.floor(Math.random() * COLORS.length)];
    var dur = 3.5 + Math.random() * 3;
    var dx  = (Math.random() - 0.5) * 140;
    var rot = 360 + Math.random() * 360;
    var kfn = 'eco-amb-' + (Date.now() % 999999) + Math.floor(Math.random() * 9999);
    var kfs = document.createElement('style');
    kfs.textContent = '@keyframes ' + kfn + '{'
      + '0%{opacity:0;transform:translate(0,0) rotate(0deg) scale(1)}'
      + '10%{opacity:.65}'
      + '90%{opacity:.4}'
      + '100%{opacity:0;transform:translate(' + dx + 'px,' + (window.innerHeight + 80) + 'px) rotate(' + rot + 'deg) scale(.45)}'
      + '}';
    document.head.appendChild(kfs);
    el.style.cssText = [
      'left:' + x + 'px', 'top:-20px',
      'width:' + sz + 'px', 'height:' + sz + 'px',
      'background:' + col,
      'border-radius:' + SHAPES[Math.floor(Math.random() * SHAPES.length)],
      'box-shadow:0 0 4px ' + col + '60',
      'animation:' + kfn + ' ' + dur + 's ease-in-out forwards',
      'z-index:2147483605'
    ].join(';');
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); kfs.remove(); }, (dur + 0.5) * 1000);
  }

  setInterval(ambientLeaf, 2000);
  setTimeout(ambientLeaf, 400);
  setTimeout(ambientLeaf, 1000);
  setTimeout(ambientLeaf, 1600);

})();
