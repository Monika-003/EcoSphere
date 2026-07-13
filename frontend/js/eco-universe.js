/**
 * EcoSphere — Environmental Intelligence Universe
 * Premium 3D background engine using Three.js + WebGL
 * Renders behind ALL existing content — pointer-events: none
 * Supports: Landing, Org Portal, Lab Portal, Reg Portal, Admin
 */

(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     CONFIGURATION — tune per page
  ═══════════════════════════════════════════════════════════════ */
  var PAGE_THEMES = {
    landing:    { primaryColor: 0x22c55e, secondaryColor: 0x0ea5e9, accentColor: 0xa78bfa, globeColor: 0x1a7a4a, atmColor: 0x22c55e },
    org:        { primaryColor: 0x3b82f6, secondaryColor: 0x1d4ed8, accentColor: 0x60a5fa, globeColor: 0x1e3a5f, atmColor: 0x3b82f6 },
    lab:        { primaryColor: 0x0d9488, secondaryColor: 0x059669, accentColor: 0x2dd4bf, globeColor: 0x042f2e, atmColor: 0x0d9488 },
    reg:        { primaryColor: 0xd97706, secondaryColor: 0xb45309, accentColor: 0xfbbf24, globeColor: 0x451a03, atmColor: 0xd97706 },
    admin:      { primaryColor: 0xa78bfa, secondaryColor: 0x7c3aed, accentColor: 0x818cf8, globeColor: 0x1e1b4b, atmColor: 0xa78bfa }
  };

  /* Environmental monitoring node positions (lat, lon) — real global sites */
  var MONITORING_NODES = [
    { lat: 17.4,  lon: 78.5,  label: 'Hyderabad', type: 'air',   active: true  },
    { lat: 19.1,  lon: 72.9,  label: 'Mumbai',    type: 'water', active: true  },
    { lat: 28.6,  lon: 77.2,  label: 'Delhi',     type: 'air',   active: true  },
    { lat: 13.1,  lon: 80.3,  label: 'Chennai',   type: 'soil',  active: true  },
    { lat: 12.9,  lon: 77.6,  label: 'Bangalore', type: 'noise', active: true  },
    { lat: 22.6,  lon: 88.4,  label: 'Kolkata',   type: 'water', active: false },
    { lat: 51.5,  lon: -0.1,  label: 'London',    type: 'air',   active: true  },
    { lat: 40.7,  lon: -74.0, label: 'New York',  type: 'carbon',active: true  },
    { lat: 35.7,  lon: 139.7, label: 'Tokyo',     type: 'air',   active: true  },
    { lat: -33.9, lon: 151.2, label: 'Sydney',    type: 'water', active: false },
    { lat: 48.9,  lon: 2.3,   label: 'Paris',     type: 'noise', active: true  },
    { lat: 52.5,  lon: 13.4,  label: 'Berlin',    type: 'air',   active: true  },
    { lat: 55.8,  lon: 37.6,  label: 'Moscow',    type: 'soil',  active: false },
    { lat: 39.9,  lon: 116.4, label: 'Beijing',   type: 'air',   active: true  },
    { lat: -23.6, lon: -46.7, label: 'São Paulo', type: 'carbon',active: true  },
    { lat: 6.5,   lon: 3.4,   label: 'Lagos',     type: 'water', active: false },
    { lat: -26.2, lon: 28.0,  label: 'Joburg',    type: 'soil',  active: true  },
    { lat: 31.2,  lon: 121.5, label: 'Shanghai',  type: 'air',   active: true  },
    { lat: 37.6,  lon: -122.4,label: 'San Fran',  type: 'carbon',active: true  },
    { lat: 43.7,  lon: -79.4, label: 'Toronto',   type: 'noise', active: false },
  ];

  var NODE_COLORS = {
    air:    0x60a5fa,
    water:  0x2dd4bf,
    soil:   0x86efac,
    noise:  0xfb923c,
    carbon: 0xf472b6,
    esg:    0xa78bfa
  };

  /* ═══════════════════════════════════════════════════════════════
     UTILITY HELPERS
  ═══════════════════════════════════════════════════════════════ */
  function latLonToVec3(lat, lon, radius) {
    var phi   = (90 - lat) * (Math.PI / 180);
    var theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
       radius * Math.cos(phi),
       radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function hexToRgb(hex) {
    var r = (hex >> 16) & 255;
    var g = (hex >> 8)  & 255;
    var b =  hex        & 255;
    return { r: r / 255, g: g / 255, b: b / 255 };
  }

  /* Detect which portal we are on */
  function detectPage() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('org-portal')   > -1) return 'org';
    if (path.indexOf('lab-portal')   > -1) return 'lab';
    if (path.indexOf('reg-portal')   > -1) return 'reg';
    if (path.indexOf('portal-select') > -1) return 'landing';
    return 'landing';
  }

  /* ═══════════════════════════════════════════════════════════════
     MAIN UNIVERSE CLASS
  ═══════════════════════════════════════════════════════════════ */
  function EcoUniverse() {
    this.canvas    = null;
    this.renderer  = null;
    this.scene     = null;
    this.camera    = null;
    this.clock     = new THREE.Clock();
    this.mouse     = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.theme     = PAGE_THEMES[detectPage()] || PAGE_THEMES.landing;
    this.objects   = {};
    this.particles = [];
    this.arcs      = [];
    this.rings     = [];
    this.dataNodes = [];
    this.disposed  = false;
    this._raf      = null;
  }

  /* ─── INIT ─── */
  EcoUniverse.prototype.init = function () {
    if (typeof THREE === 'undefined') return;

    /* Create canvas — sits behind everything */
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'ecoUniverseCanvas';
    this.canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'z-index:0',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 1.8s ease',
    ].join(';');
    document.body.insertBefore(this.canvas, document.body.firstChild);

    /* Renderer */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = false;

    /* Scene */
    this.scene = new THREE.Scene();

    /* Camera */
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 3.2);

    /* Build world */
    this._buildGlobe();
    this._buildAtmosphere();
    this._buildMonitoringNodes();
    this._buildConnectionArcs();
    this._buildParticleField();
    this._buildDataRings();
    this._buildHolographicGrid();
    this._buildEnergyBeams();
    this._buildAmbientLights();

    /* Events */
    this._attachEvents();

    /* Animate */
    this._animate();

    /* Fade in */
    var self = this;
    setTimeout(function () {
      self.canvas.style.opacity = '1';
    }, 400);

    return this;
  };

  /* ─── GLOBE ─── */
  EcoUniverse.prototype._buildGlobe = function () {
    var self = this;

    /* ── Generate Earth-like texture procedurally ── */
    var texSize = 512;
    var texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = texSize;
    var ctx = texCanvas.getContext('2d');

    /* Deep ocean base */
    ctx.fillStyle = '#040d1a';
    ctx.fillRect(0, 0, texSize, texSize);

    /* Continent blobs (approximated) */
    var landColor = function (x, y, w, h, rot, color) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rot || 0);
      ctx.scale(1, 0.6);
      var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) / 2);
      grd.addColorStop(0, color || '#0a2a1a');
      grd.addColorStop(0.6, '#061a10');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    /* Africa */
    landColor(210, 160, 90, 130, 0.05, '#0d3320');
    /* Eurasia */
    landColor(230, 90, 200, 90, -0.1, '#0a2a1a');
    /* North America */
    landColor(60, 80, 110, 100, 0.15, '#0d2e1e');
    /* South America */
    landColor(95, 220, 60, 100, 0.1, '#0d3320');
    /* Australia */
    landColor(355, 205, 55, 45, 0, '#0a2518');
    /* Greenland */
    landColor(90, 50, 40, 30, 0, '#0a1f14');

    /* Ocean shimmer noise */
    for (var i = 0; i < 600; i++) {
      var ox = Math.random() * texSize;
      var oy = Math.random() * texSize;
      var oa = Math.random() * 0.06;
      ctx.fillStyle = 'rgba(30,100,180,' + oa + ')';
      ctx.fillRect(ox, oy, 2, 2);
    }

    /* Grid lines (lat/lon) */
    ctx.strokeStyle = 'rgba(22,163,74,0.08)';
    ctx.lineWidth = 0.5;
    for (var lat = 0; lat <= texSize; lat += texSize / 12) {
      ctx.beginPath(); ctx.moveTo(0, lat); ctx.lineTo(texSize, lat); ctx.stroke();
    }
    for (var lon = 0; lon <= texSize; lon += texSize / 24) {
      ctx.beginPath(); ctx.moveTo(lon, 0); ctx.lineTo(lon, texSize); ctx.stroke();
    }

    var earthTexture = new THREE.CanvasTexture(texCanvas);

    /* Main sphere */
    var geoSphere = new THREE.SphereGeometry(1, 64, 64);
    var matSphere = new THREE.MeshPhongMaterial({
      map:          earthTexture,
      color:        this.theme.globeColor,
      emissive:     new THREE.Color(this.theme.primaryColor),
      emissiveIntensity: 0.04,
      shininess:    15,
      opacity:      0.92,
      transparent:  true
    });
    var globe = new THREE.Mesh(geoSphere, matSphere);
    this.scene.add(globe);
    this.objects.globe = globe;

    /* Wireframe overlay */
    var geoWire = new THREE.SphereGeometry(1.002, 28, 28);
    var matWire = new THREE.MeshBasicMaterial({
      color:       this.theme.primaryColor,
      wireframe:   true,
      opacity:     0.04,
      transparent: true
    });
    var wireframe = new THREE.Mesh(geoWire, matWire);
    this.scene.add(wireframe);
    this.objects.wireframe = wireframe;
  };

  /* ─── ATMOSPHERE ─── */
  EcoUniverse.prototype._buildAtmosphere = function () {
    var atmColor = new THREE.Color(this.theme.atmColor);
    var rgb = { r: atmColor.r, g: atmColor.g, b: atmColor.b };

    /* Outer glow — custom shader */
    var vertexShader = [
      'varying vec3 vNormal;',
      'void main(){',
      '  vNormal = normalize(normalMatrix * normal);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
      '}'
    ].join('\n');

    var fragmentShader = [
      'varying vec3 vNormal;',
      'uniform float atmR;',
      'uniform float atmG;',
      'uniform float atmB;',
      'void main(){',
      '  float intensity = pow(0.65 - dot(vNormal, vec3(0.0,0.0,1.0)), 3.5);',
      '  gl_FragColor = vec4(atmR, atmG, atmB, 1.0) * intensity;',
      '}'
    ].join('\n');

    var atmGeo = new THREE.SphereGeometry(1.18, 48, 48);
    var atmMat = new THREE.ShaderMaterial({
      vertexShader:   vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        atmR: { value: rgb.r },
        atmG: { value: rgb.g },
        atmB: { value: rgb.b }
      },
      side:        THREE.BackSide,
      blending:    THREE.AdditiveBlending,
      transparent: true
    });
    var atmosphere = new THREE.Mesh(atmGeo, atmMat);
    this.scene.add(atmosphere);
    this.objects.atmosphere = atmosphere;

    /* Inner glow ring */
    var innerGeo = new THREE.SphereGeometry(1.05, 48, 48);
    var innerMat = new THREE.MeshBasicMaterial({
      color:       this.theme.primaryColor,
      opacity:     0.03,
      transparent: true,
      side:        THREE.BackSide
    });
    this.scene.add(new THREE.Mesh(innerGeo, innerMat));
  };

  /* ─── MONITORING NODES ─── */
  EcoUniverse.prototype._buildMonitoringNodes = function () {
    var self = this;
    var nodeGroup = new THREE.Group();

    MONITORING_NODES.forEach(function (n) {
      var pos      = latLonToVec3(n.lat, n.lon, 1.015);
      var color    = NODE_COLORS[n.type] || 0x22c55e;
      var size     = n.active ? 0.018 : 0.010;
      var opacity  = n.active ? 0.95  : 0.45;

      /* Core dot */
      var geo = new THREE.SphereGeometry(size, 10, 10);
      var mat = new THREE.MeshBasicMaterial({
        color:       color,
        opacity:     opacity,
        transparent: true
      });
      var dot = new THREE.Mesh(geo, mat);
      dot.position.copy(pos);
      dot.userData = { node: n, phase: Math.random() * Math.PI * 2, baseOpacity: opacity };
      nodeGroup.add(dot);

      if (n.active) {
        /* Outer pulse ring */
        var ringGeo = new THREE.RingGeometry(size * 1.8, size * 2.4, 16);
        var ringMat = new THREE.MeshBasicMaterial({
          color:       color,
          opacity:     0.5,
          transparent: true,
          side:        THREE.DoubleSide
        });
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        ring.userData = { pulse: true, phase: Math.random() * Math.PI * 2 };
        nodeGroup.add(ring);
      }
    });

    this.scene.add(nodeGroup);
    this.objects.nodeGroup = nodeGroup;
    this.dataNodes = nodeGroup.children;
  };

  /* ─── CONNECTION ARCS ─── */
  EcoUniverse.prototype._buildConnectionArcs = function () {
    var arcGroup = new THREE.Group();
    var connections = [
      [0, 2], [0, 1], [0, 3], [0, 4],   // India hub
      [6, 7], [6, 10], [6, 11],           // Europe hub
      [7, 12], [8, 17], [13, 17],         // Asia-Pacific
      [1, 14], [7, 14], [17, 18],         // Cross-continental
    ];
    var self = this;

    connections.forEach(function (pair) {
      var a = MONITORING_NODES[pair[0]];
      var b = MONITORING_NODES[pair[1]];
      if (!a || !b) return;

      var posA = latLonToVec3(a.lat, a.lon, 1.015);
      var posB = latLonToVec3(b.lat, b.lon, 1.015);

      /* Bezier arc lifting off the globe */
      var mid  = posA.clone().add(posB).multiplyScalar(0.5);
      var lift = 1.0 + posA.distanceTo(posB) * 0.35;
      mid.normalize().multiplyScalar(lift);

      var curve = new THREE.QuadraticBezierCurve3(posA, mid, posB);
      var pts   = curve.getPoints(60);
      var geo   = new THREE.BufferGeometry().setFromPoints(pts);
      var mat   = new THREE.LineBasicMaterial({
        color:       self.theme.primaryColor,
        opacity:     0.18,
        transparent: true
      });
      var arc = new THREE.Line(geo, mat);
      arc.userData = { phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.4 };
      arcGroup.add(arc);
    });

    this.scene.add(arcGroup);
    this.objects.arcGroup = arcGroup;
  };

  /* ─── PARTICLE FIELD ─── */
  EcoUniverse.prototype._buildParticleField = function () {
    var COUNT  = window.innerWidth < 768 ? 800 : 1600;
    var posArr = new Float32Array(COUNT * 3);
    var colArr = new Float32Array(COUNT * 3);
    var sizes  = new Float32Array(COUNT);

    var colors = [
      new THREE.Color(this.theme.primaryColor),
      new THREE.Color(this.theme.secondaryColor),
      new THREE.Color(this.theme.accentColor),
      new THREE.Color(0xffffff)
    ];

    for (var i = 0; i < COUNT; i++) {
      /* Distribute on sphere surface + scattered */
      var theta  = Math.random() * Math.PI * 2;
      var phi    = Math.acos(2 * Math.random() - 1);
      var radius = 1.25 + Math.random() * 1.8;

      posArr[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      posArr[i * 3 + 1] = radius * Math.cos(phi);
      posArr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      var c = colors[Math.floor(Math.random() * colors.length)];
      colArr[i * 3]     = c.r;
      colArr[i * 3 + 1] = c.g;
      colArr[i * 3 + 2] = c.b;

      sizes[i] = Math.random() < 0.05 ? 3.5 : (0.5 + Math.random() * 1.8);
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,  1));

    var mat = new THREE.PointsMaterial({
      vertexColors: true,
      size:         0.012,
      sizeAttenuation: true,
      opacity:      0.65,
      transparent:  true,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false
    });

    var particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    this.objects.particles = particles;
  };

  /* ─── DATA RINGS ─── */
  EcoUniverse.prototype._buildDataRings = function () {
    var ringGroup = new THREE.Group();
    var ringConfigs = [
      { radius: 1.35, tube: 0.003, color: this.theme.primaryColor,   opacity: 0.35, tilt: 0.4,  speed: 0.3  },
      { radius: 1.55, tube: 0.002, color: this.theme.accentColor,    opacity: 0.25, tilt: -0.6, speed: -0.2 },
      { radius: 1.72, tube: 0.0015,color: this.theme.secondaryColor, opacity: 0.20, tilt: 1.0,  speed: 0.15 },
      { radius: 1.90, tube: 0.001, color: 0xffffff,                   opacity: 0.08, tilt: 0.2,  speed: -0.1 },
    ];

    ringConfigs.forEach(function (cfg) {
      var geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 120);
      var mat = new THREE.MeshBasicMaterial({
        color:       cfg.color,
        opacity:     cfg.opacity,
        transparent: true,
        blending:    THREE.AdditiveBlending
      });
      var ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = cfg.tilt;
      ring.userData = { speed: cfg.speed };
      ringGroup.add(ring);
    });

    this.scene.add(ringGroup);
    this.objects.ringGroup = ringGroup;
  };

  /* ─── HOLOGRAPHIC GRID ─── */
  EcoUniverse.prototype._buildHolographicGrid = function () {
    /* Equatorial ring with tick marks */
    var tickGroup = new THREE.Group();
    var NUM_TICKS = 72;

    for (var i = 0; i < NUM_TICKS; i++) {
      var angle = (i / NUM_TICKS) * Math.PI * 2;
      var inner = 1.25;
      var outer = i % 6 === 0 ? 1.32 : (i % 3 === 0 ? 1.29 : 1.27);
      var pts   = [
        new THREE.Vector3(Math.cos(angle) * inner, 0, Math.sin(angle) * inner),
        new THREE.Vector3(Math.cos(angle) * outer, 0, Math.sin(angle) * outer)
      ];
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({
        color:       this.theme.primaryColor,
        opacity:     i % 6 === 0 ? 0.6 : 0.2,
        transparent: true
      });
      tickGroup.add(new THREE.Line(geo, mat));
    }

    this.scene.add(tickGroup);
    this.objects.tickGroup = tickGroup;

    /* Satellite orbit paths */
    var orbitGroup = new THREE.Group();
    var orbitAngles = [0.8, -0.5, 1.2, -1.1];
    var self = this;

    orbitAngles.forEach(function (angle, idx) {
      var orbitGeo = new THREE.TorusGeometry(1.5 + idx * 0.08, 0.001, 4, 100);
      var orbitMat = new THREE.MeshBasicMaterial({
        color:       self.theme.accentColor,
        opacity:     0.12,
        transparent: true
      });
      var orbit = new THREE.Mesh(orbitGeo, orbitMat);
      orbit.rotation.x = angle;
      orbit.rotation.z = angle * 0.5;
      orbitGroup.add(orbit);

      /* Satellite dot */
      var satGeo = new THREE.SphereGeometry(0.012, 6, 6);
      var satMat = new THREE.MeshBasicMaterial({
        color:  self.theme.primaryColor,
        opacity: 0.9,
        transparent: true
      });
      var sat = new THREE.Mesh(satGeo, satMat);
      sat.userData = { orbitRadius: 1.5 + idx * 0.08, orbitAngle: angle, orbitZ: angle * 0.5, phase: idx * Math.PI / 2, speed: 0.3 + idx * 0.12 };
      orbitGroup.add(sat);
    });

    this.scene.add(orbitGroup);
    this.objects.orbitGroup = orbitGroup;
  };

  /* ─── ENERGY BEAMS (vertical data streams) ─── */
  EcoUniverse.prototype._buildEnergyBeams = function () {
    var beamGroup = new THREE.Group();
    var self = this;

    /* Select 5 active nodes for beams */
    var activeNodes = MONITORING_NODES.filter(function (n) { return n.active; }).slice(0, 5);

    activeNodes.forEach(function (n) {
      var pos    = latLonToVec3(n.lat, n.lon, 1.015);
      var endPos = pos.clone().multiplyScalar(2.2);

      var pts = [pos, endPos];
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({
        color:       NODE_COLORS[n.type] || self.theme.primaryColor,
        opacity:     0.15,
        transparent: true,
        blending:    THREE.AdditiveBlending
      });
      var beam = new THREE.Line(geo, mat);
      beam.userData = { phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.5 };
      beamGroup.add(beam);
    });

    this.scene.add(beamGroup);
    this.objects.beamGroup = beamGroup;
  };

  /* ─── LIGHTS ─── */
  EcoUniverse.prototype._buildAmbientLights = function () {
    var ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(ambient);

    var sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(5, 3, 5);
    this.scene.add(sun);

    var rim = new THREE.DirectionalLight(this.theme.primaryColor, 0.3);
    rim.position.set(-5, -2, -3);
    this.scene.add(rim);
  };

  /* ─── EVENTS ─── */
  EcoUniverse.prototype._attachEvents = function () {
    var self = this;

    window.addEventListener('mousemove', function (e) {
      self.mouse.targetX = (e.clientX / window.innerWidth  - 0.5) * 0.4;
      self.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 0.3;
    }, { passive: true });

    window.addEventListener('resize', function () {
      self.camera.aspect = window.innerWidth / window.innerHeight;
      self.camera.updateProjectionMatrix();
      self.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* Touch support */
    window.addEventListener('touchmove', function (e) {
      if (!e.touches[0]) return;
      self.mouse.targetX = (e.touches[0].clientX / window.innerWidth  - 0.5) * 0.25;
      self.mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 0.18;
    }, { passive: true });
  };

  /* ─── ANIMATION LOOP ─── */
  EcoUniverse.prototype._animate = function () {
    if (this.disposed) return;
    var self = this;
    this._raf = requestAnimationFrame(function () { self._animate(); });

    var t   = this.clock.getElapsedTime();
    var dt  = this.clock.getDelta ? 0.016 : 0.016;

    /* Smooth mouse follow */
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.03;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.03;

    /* Globe slow auto-rotation + mouse tilt */
    if (this.objects.globe) {
      this.objects.globe.rotation.y    = t * 0.06;
      this.objects.globe.rotation.x   += (this.mouse.y * 0.3 - this.objects.globe.rotation.x) * 0.025;
      this.objects.wireframe.rotation.y = t * 0.065;
    }

    /* Node group tracks globe */
    if (this.objects.nodeGroup) {
      this.objects.nodeGroup.rotation.y = this.objects.globe ? this.objects.globe.rotation.y : t * 0.06;
      this.objects.nodeGroup.rotation.x = this.objects.globe ? this.objects.globe.rotation.x : 0;
    }

    /* Pulse monitoring nodes */
    if (this.objects.nodeGroup) {
      this.objects.nodeGroup.children.forEach(function (mesh) {
        if (!mesh.userData.node) return;
        if (mesh.userData.pulse) {
          /* Pulse ring scale */
          var s = 1 + 0.5 * Math.sin(t * 2.5 + mesh.userData.phase);
          mesh.scale.set(s, s, 1);
          mesh.material.opacity = 0.3 * (1 - (s - 1) / 0.5);
        } else {
          /* Core dot brightness */
          mesh.material.opacity = mesh.userData.baseOpacity * (0.75 + 0.25 * Math.sin(t * 1.8 + mesh.userData.phase));
        }
      });
    }

    /* Arc animations */
    if (this.objects.arcGroup) {
      this.objects.arcGroup.children.forEach(function (arc) {
        var o = 0.08 + 0.1 * Math.abs(Math.sin(t * arc.userData.speed + arc.userData.phase));
        arc.material.opacity = o;
      });
    }

    /* Rotating rings */
    if (this.objects.ringGroup) {
      this.objects.ringGroup.children.forEach(function (ring) {
        ring.rotation.z += ring.userData.speed * 0.005;
      });
    }

    /* Orbit group */
    if (this.objects.orbitGroup) {
      this.objects.orbitGroup.children.forEach(function (obj) {
        if (obj.userData.orbitRadius) {
          /* Satellite */
          var p = t * obj.userData.speed + obj.userData.phase;
          var r = obj.userData.orbitRadius;
          var localX = r * Math.cos(p);
          var localZ = r * Math.sin(p);
          /* Apply orbit tilt */
          var oAngle = obj.userData.orbitAngle;
          var oZ     = obj.userData.orbitZ;
          obj.position.set(
            localX,
            localZ * Math.sin(oAngle),
            localZ * Math.cos(oAngle)
          );
        }
      });
    }

    /* Energy beams pulse */
    if (this.objects.beamGroup) {
      this.objects.beamGroup.children.forEach(function (beam) {
        beam.material.opacity = 0.05 + 0.2 * Math.abs(Math.sin(t * beam.userData.speed + beam.userData.phase));
      });
    }

    /* Tick group rotates */
    if (this.objects.tickGroup) {
      this.objects.tickGroup.rotation.y = t * 0.04;
    }

    /* Particle slow drift */
    if (this.objects.particles) {
      this.objects.particles.rotation.y = t * 0.012;
      this.objects.particles.rotation.x = t * 0.005;
    }

    /* Camera subtle drift */
    this.camera.position.x += (this.mouse.x * 0.4 - this.camera.position.x) * 0.015;
    this.camera.position.y += (-this.mouse.y * 0.3 - this.camera.position.y) * 0.015;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  /* ─── DISPOSE ─── */
  EcoUniverse.prototype.dispose = function () {
    this.disposed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.renderer) this.renderer.dispose();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     PAGE-SPECIFIC BACKGROUND LAYERS (CSS + Canvas 2D overlays)
  ═══════════════════════════════════════════════════════════════ */
  function injectPageBackground() {
    var page = detectPage();

    /* Background gradient overlay */
    var overlay = document.createElement('div');
    overlay.id  = 'ecoUniverseOverlay';

    var gradients = {
      landing: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(4,13,26,0.92), rgba(2,7,18,0.97)), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(2,20,10,0.88), transparent)',
      org:     'radial-gradient(ellipse 80% 60% at 15% 25%, rgba(4,13,26,0.93), rgba(2,7,18,0.97))',
      lab:     'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(2,20,18,0.93), rgba(2,10,9,0.97))',
      reg:     'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(20,10,2,0.93), rgba(10,5,2,0.97))',
      admin:   'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(5,3,20,0.93), rgba(2,2,12,0.97))'
    };

    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'z-index:0',
      'pointer-events:none',
      'background:' + (gradients[page] || gradients.landing),
    ].join(';');

    document.body.insertBefore(overlay, document.body.firstChild);
  }

  /* ═══════════════════════════════════════════════════════════════
     MOLECULAR STRUCTURE OVERLAY (Lab Portal specific)
  ═══════════════════════════════════════════════════════════════ */
  function buildMolecularCanvas() {
    var c   = document.createElement('canvas');
    c.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;opacity:0.18';
    document.body.insertBefore(c, document.body.firstChild);
    c.width  = window.innerWidth;
    c.height = window.innerHeight;

    var ctx    = c.getContext('2d');
    var nodes  = [];
    var nodeCount = 24;

    for (var i = 0; i < nodeCount; i++) {
      nodes.push({
        x:  Math.random() * c.width,
        y:  Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r:  3 + Math.random() * 5,
        color: ['#2dd4bf','#0d9488','#22c55e','#60a5fa'][Math.floor(Math.random() * 4)]
      });
    }

    function drawMolecules() {
      ctx.clearRect(0, 0, c.width, c.height);
      /* Draw bonds */
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[j].x - nodes[i].x;
          var dy = nodes[j].y - nodes[i].y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = 'rgba(13,148,136,' + (0.3 * (1 - dist / 160)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      /* Draw nodes */
      nodes.forEach(function (n) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > c.width)  n.vx *= -1;
        if (n.y < 0 || n.y > c.height) n.vy *= -1;
      });
      requestAnimationFrame(drawMolecules);
    }
    drawMolecules();

    window.addEventListener('resize', function () {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     COMPLIANCE NETWORK (Reg Portal specific)
  ═══════════════════════════════════════════════════════════════ */
  function buildComplianceNetwork() {
    var c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;opacity:0.15';
    document.body.insertBefore(c, document.body.firstChild);
    c.width  = window.innerWidth;
    c.height = window.innerHeight;

    var ctx   = c.getContext('2d');
    var hubs  = [];
    var NUM   = 10;

    for (var i = 0; i < NUM; i++) {
      hubs.push({
        x:  (i / NUM) * c.width + Math.random() * 80,
        y:  100 + Math.random() * (c.height - 200),
        r:  4 + Math.random() * 8,
        pulse: Math.random() * Math.PI * 2,
        color: ['#d97706','#f59e0b','#fbbf24'][Math.floor(Math.random() * 3)]
      });
    }

    var t = 0;
    function drawNetwork() {
      ctx.clearRect(0, 0, c.width, c.height);
      t += 0.02;
      /* Draw connections */
      for (var i = 0; i < hubs.length; i++) {
        for (var j = i + 1; j < hubs.length; j++) {
          var dx   = hubs[j].x - hubs[i].x;
          var dy   = hubs[j].y - hubs[i].y;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 280) {
            var flow = 0.3 + 0.2 * Math.sin(t + i);
            ctx.beginPath();
            ctx.moveTo(hubs[i].x, hubs[i].y);
            ctx.lineTo(hubs[j].x, hubs[j].y);
            ctx.strokeStyle = 'rgba(217,119,6,' + (flow * (1 - dist/280)) + ')';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }
      /* Draw hubs */
      hubs.forEach(function (h) {
        var pulse = 1 + 0.3 * Math.sin(t * 1.5 + h.pulse);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = h.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      requestAnimationFrame(drawNetwork);
    }
    drawNetwork();

    window.addEventListener('resize', function () {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     FLOATING DATA CARDS (animated environmental stats overlay)
  ═══════════════════════════════════════════════════════════════ */
  function buildFloatingDataCards() {
    var page = detectPage();

    var cards = {
      landing: [
        { icon: '🌡️', label: 'Global Temp Anomaly', value: '+1.2°C', color: '#f97316', x: '5%',  y: '15%' },
        { icon: '💨', label: 'CO₂ Concentration',   value: '421 ppm', color: '#60a5fa', x: '82%', y: '20%' },
        { icon: '🌊', label: 'Sea Level Rise',       value: '+3.3mm/yr', color: '#2dd4bf', x: '88%', y: '72%' },
        { icon: '🏭', label: 'Active Monitors',      value: '2,847',   color: '#a78bfa', x: '3%',  y: '75%' },
      ],
      org: [
        { icon: '🌬️', label: 'PM2.5',  value: '62 µg/m³',  color: '#60a5fa', x: '2%',  y: '12%' },
        { icon: '💧', label: 'pH Level', value: '7.2',       color: '#2dd4bf', x: '86%', y: '18%' },
        { icon: '🔊', label: 'Noise',   value: '88 dB ⚠',  color: '#f97316', x: '85%', y: '75%' },
        { icon: '♻️', label: 'Recycling', value: '62%',     color: '#4ade80', x: '2%',  y: '78%' },
      ],
      lab: [
        { icon: '🧪', label: 'Samples Today',  value: '47',       color: '#2dd4bf', x: '3%',  y: '12%' },
        { icon: '⏱',  label: 'Avg TAT',        value: '3.2 days', color: '#60a5fa', x: '84%', y: '18%' },
        { icon: '✅', label: 'Approval Rate',  value: '94.2%',    color: '#4ade80', x: '85%', y: '75%' },
        { icon: '🏅', label: 'NABL Score',     value: 'A+',       color: '#a78bfa', x: '3%',  y: '78%' },
      ],
      reg: [
        { icon: '📋', label: 'Pending Reviews', value: '23',       color: '#fbbf24', x: '3%',  y: '12%' },
        { icon: '🏛',  label: 'Certs Issued',   value: '1,247',    color: '#d97706', x: '82%', y: '18%' },
        { icon: '⚖️', label: 'Compliance Rate', value: '87.4%',   color: '#4ade80', x: '85%', y: '75%' },
        { icon: '🚨', label: 'Active Notices',  value: '8',        color: '#f87171', x: '3%',  y: '78%' },
      ]
    };

    var pageCards = cards[page] || cards.landing;

    pageCards.forEach(function (card, idx) {
      var el = document.createElement('div');
      el.style.cssText = [
        'position:fixed',
        'left:' + card.x,
        'top:' + card.y,
        'z-index:1',
        'pointer-events:none',
        'background:rgba(4,13,26,0.65)',
        'backdrop-filter:blur(12px)',
        '-webkit-backdrop-filter:blur(12px)',
        'border:1px solid rgba(255,255,255,0.08)',
        'border-radius:12px',
        'padding:10px 14px',
        'min-width:140px',
        'opacity:0',
        'transform:translateY(12px)',
        'transition:opacity 0.8s ease, transform 0.8s ease',
        'font-family:Inter,sans-serif',
        'animation:ecoCardFloat ' + (4 + idx * 0.8) + 's ' + (2 + idx * 0.5) + 's ease-in-out infinite alternate',
      ].join(';');

      el.innerHTML =
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">' +
        '<span style="font-size:1rem">' + card.icon + '</span>' +
        '<span style="font-size:.62rem;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px">' + card.label + '</span>' +
        '</div>' +
        '<div style="font-family:Poppins,sans-serif;font-size:1.05rem;font-weight:900;color:' + card.color + '">' + card.value + '</div>';

      document.body.appendChild(el);

      setTimeout(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 1200 + idx * 300);
    });

    /* Inject keyframe CSS */
    if (!document.getElementById('ecoUniverseStyles')) {
      var style = document.createElement('style');
      style.id = 'ecoUniverseStyles';
      style.textContent = [
        '@keyframes ecoCardFloat {',
        '  0%   { transform: translateY(0px); }',
        '  100% { transform: translateY(-10px); }',
        '}',
        '@keyframes ecoRingPulse {',
        '  0%,100% { opacity:.15; transform:scale(1); }',
        '  50%      { opacity:.4;  transform:scale(1.08); }',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     ENSURE EXISTING CONTENT IS ABOVE BACKGROUND
  ═══════════════════════════════════════════════════════════════ */
  function ensureContentAbove() {
    /* The splash, pages, portals must be above the background canvas */
    var selectors = [
      '#splashScreen',
      '#enterpriseLanding',
      '#portalSelectPage',
      '#portalSelectEnterPage',
      '#onboardOrgPage',
      '#onboardLabPage',
      '#onboardRegPage',
      '#onboardConsPage',
      '#onboardAudPage',
      '#superAdminPage',
      '#marketplacePage',
      '#certCenterPage',
      '#verifyPage',
      '#commandCenterPage',
      '#stepIndustry',
      '#stepLogin',
      '#stepDash',
      '.admin-portal',
      '.lab-portal-main',
      '.reg-portal-main',
      '#loginPage',
      '#app',
      '.login-wrap',
      'nav.ent-nav',
      '.ent-hero-content',
      '.ent-features',
      '.ent-stakeholders',
      'footer'
    ];

    selectors.forEach(function (sel) {
      var els = document.querySelectorAll(sel);
      els.forEach(function (el) {
        var current = parseInt(getComputedStyle(el).zIndex) || 0;
        if (current <= 0) {
          el.style.position = el.style.position || 'relative';
          el.style.zIndex   = '2';
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════════ */
  function boot() {
    if (typeof THREE === 'undefined') return;

    var page = detectPage();

    /* Inject background gradient */
    injectPageBackground();

    /* Page-specific 2D overlays */
    if (page === 'lab') {
      buildMolecularCanvas();
    } else if (page === 'reg') {
      buildComplianceNetwork();
    }

    /* Floating data cards — disabled */
    // buildFloatingDataCards();

    /* Ensure existing elements stay above */
    ensureContentAbove();

    /* Wait a tick so DOM is fully rendered, then launch 3D */
    setTimeout(function () {
      try {
        var universe = new EcoUniverse();
        universe.init();
        global._ecoUniverse = universe;
      } catch (e) {
        /* Silently degrade if WebGL not available */
        console.warn('[EcoUniverse] WebGL not available:', e.message);
      }
    }, 150);

    /* Re-run content-above fix whenever pages switch */
    var observer = new MutationObserver(function () {
      ensureContentAbove();
    });
    observer.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['style', 'class'] });
  }

  /* ─── DOMContentLoaded ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}(window));
