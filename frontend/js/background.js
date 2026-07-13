'use strict';
/* ═══════════════════════════════════════════════════════════════
   EcoSphere — Global 3D Animated Background
   Floating eco-particles, organic leaf paths, network lines
   Adapts colour scheme per page (dark / light)
   ═══════════════════════════════════════════════════════════════ */

(function initBackground() {
  var canvas = document.getElementById('globalBgCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var W, H, particles = [], lines = [];
  var t = 0;
  var currentScheme = 'dark'; // 'dark' | 'light'

  /* ── Resize ── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', function() { resize(); buildParticles(); });
  resize();

  /* ── Colour schemes ── */
  var SCHEMES = {
    dark: {
      bg:       'transparent',
      leaf:     ['rgba(46,204,113,', 'rgba(52,211,153,', 'rgba(134,239,172,', 'rgba(74,222,128,'],
      gold:     ['rgba(251,191,36,',  'rgba(245,166,35,'],
      glow:     ['rgba(16,185,129,',  'rgba(34,197,94,'],
      line:     'rgba(52,211,153,',
      size:     [2, 6],
    },
    light: {
      bg:       'transparent',
      leaf:     ['rgba(22,163,74,',  'rgba(16,185,129,', 'rgba(52,211,153,', 'rgba(134,239,172,'],
      gold:     ['rgba(217,119,6,',   'rgba(245,158,11,'],
      glow:     ['rgba(22,163,74,',   'rgba(13,148,136,'],
      line:     'rgba(22,163,74,',
      size:     [1.5, 4.5],
    }
  };

  /* ── Build particles ── */
  function buildParticles() {
    var count = Math.floor((W * H) / 14000); // density
    count = Math.max(40, Math.min(count, 120));
    particles = [];

    for (var i = 0; i < count; i++) {
      var depth = 0.2 + Math.random() * 0.8; // 0.2 = far, 1.0 = near
      particles.push({
        x:      Math.random() * W,
        y:      Math.random() * H,
        z:      depth,
        vx:     (Math.random() - 0.5) * 0.35 * depth,
        vy:     -(0.15 + Math.random() * 0.45) * depth,
        rot:    Math.random() * Math.PI * 2,
        rotV:   (Math.random() - 0.5) * 0.018,
        size:   (1.5 + Math.random() * 4) * depth,
        alpha: 0.04 + Math.random() * 0.14 * depth,
        type:   Math.random() > 0.7 ? 'gold' : (Math.random() > 0.5 ? 'glow' : 'leaf'),
        phase:  Math.random() * Math.PI * 2,
        sway:   (Math.random() - 0.5) * 0.8,
        swayS:  0.003 + Math.random() * 0.006,
      });
    }
  }
  buildParticles();

  /* ── Draw leaf shape ── */
  function drawLeaf(x, y, size, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.8, -size * 0.5, size * 0.9, size * 0.3, 0, size);
    ctx.bezierCurveTo(-size * 0.9, size * 0.3, -size * 0.8, -size * 0.5, 0, -size);
    ctx.fillStyle = color;
    ctx.fill();
    /* midrib */
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.75);
    ctx.lineTo(0, size * 0.65);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  /* ── Draw dot / glow ── */
  function drawDot(x, y, size, color) {
    var grd = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
    grd.addColorStop(0,   color + '0.6)');
    grd.addColorStop(0.5, color + '0.2)');
    grd.addColorStop(1,   color + '0)');
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = color + '0.7)';
    ctx.fill();
  }

  /* ── Draw network lines between close particles ── */
  function drawLines(scheme) {
    var maxDist = 130;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          var avgZ = (particles[i].z + particles[j].z) / 2;
          var lineMax = currentScheme==="light" ? 0.04 : 0.10;
          var opacity = (1 - d / maxDist) * lineMax * avgZ;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = scheme.line + opacity + ')';
          ctx.lineWidth = 0.6 * avgZ;
          ctx.stroke();
        }
      }
    }
  }

  /* ── Floating 3D hex rings (rare, background only) ── */
  var hexRings = [];
  function buildHexRings() {
    hexRings = [];
    for (var i = 0; i < 6; i++) {
      hexRings.push({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    30 + Math.random() * 80,
        rot:  Math.random() * Math.PI,
        rotV: (Math.random() - 0.5) * 0.003,
        vy:   -(0.05 + Math.random() * 0.1),
        alpha: 0.03 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  buildHexRings();

  function drawHex(x, y, r, rot, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.strokeStyle = color + alpha + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /* ── Main animation ── */
  function animate() {
    requestAnimationFrame(animate);
    t += 0.008;

    /* Determine current scheme */
    var scheme = SCHEMES[currentScheme];

    ctx.clearRect(0, 0, W, H);

    /* Draw hex rings */
    hexRings.forEach(function(h) {
      var col = currentScheme === 'dark'
        ? 'rgba(52,211,153,' : 'rgba(22,163,74,';
      drawHex(h.x, h.y, h.r + Math.sin(t * 0.5 + h.phase) * 5, h.rot, col, h.alpha);
      h.rot += h.rotV;
      h.y   += h.vy;
      var hexMax = currentScheme==="light" ? 0.015 : 0.04;
      h.alpha = hexMax * Math.abs(Math.sin(t * 0.3 + h.phase));
      if (h.y < -h.r * 2) {
        h.y = H + h.r;
        h.x = Math.random() * W;
        h.r = 30 + Math.random() * 80;
      }
    });

    /* Draw network lines */
    drawLines(scheme);

    /* Draw particles */
    particles.forEach(function(p) {
      /* sway X motion */
      p.x += p.vx + Math.sin(t * p.swayS + p.phase) * p.sway;
      p.y += p.vy;
      p.rot += p.rotV;

      /* breathing alpha */
      var maxA = currentScheme==="light" ? 0.07 : 0.18;
      var a = Math.min(p.alpha * (0.7 + 0.3 * Math.sin(t * 0.8 + p.phase)), maxA);

      /* wrap */
      if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;

      var colArr;
      if (p.type === 'gold')     colArr = scheme.gold;
      else if (p.type === 'glow') colArr = scheme.glow;
      else colArr = scheme.leaf;

      var col = colArr[Math.floor(Math.abs(Math.sin(p.phase * 3)) * (colArr.length - 0.01))];

      if (p.type === 'glow' || p.size < 2.5) {
        drawDot(p.x, p.y, p.size, col);
      } else {
        drawLeaf(p.x, p.y, p.size, p.rot, col + a + ')');
      }
    });
  }
  animate();

  /* ── Public API: switch scheme ── */
  window.setBgScheme = function(scheme) {
    currentScheme = scheme || 'dark';
  };

})();
