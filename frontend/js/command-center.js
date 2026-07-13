'use strict';
/* ═══════════════════════════════════════════════════════════════
   EcoSphere — 3D Command Center
   Massive interactive ecosystem globe with 6 stakeholder nodes,
   animated data flows, particle systems, and live statistics
   ═══════════════════════════════════════════════════════════════ */

window.initCommandCenter = function(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return;
  if (canvas._cc) return; // already initialized
  canvas._cc = true;

  var W = canvas.offsetWidth  || window.innerWidth;
  var H = canvas.offsetHeight || window.innerHeight;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x040d1a, 1);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
  camera.position.set(0, 2, 7.5);
  camera.lookAt(0, 0, 0);

  /* ════════════════════════ EARTH ════════════════════════ */
  var earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 80, 80),
    new THREE.MeshPhongMaterial({
      color: 0x042f2e, emissive: 0x021a18,
      specular: 0x4ade80, shininess: 40,
      transparent: true, opacity: 0.94
    })
  );
  scene.add(earth);

  // Wireframe
  var wire = new THREE.Mesh(
    new THREE.SphereGeometry(1.406, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.04 })
  );
  scene.add(wire);

  // Atmosphere
  var atm = new THREE.Mesh(
    new THREE.SphereGeometry(1.56, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.028, side: THREE.BackSide })
  );
  scene.add(atm);

  /* ════════════════════════ TREES on earth ════════════════════════ */
  var TC = [0x166534,0x15803d,0x16a34a,0x22c55e,0x4ade80];
  function makeSmallTree(lat,lon,sz){
    var g=new THREE.Group();
    var phi=(90-lat)*Math.PI/180,th=(lon+180)*Math.PI/180;
    var trunk=new THREE.Mesh(new THREE.CylinderGeometry(.003*sz,.006*sz,.05*sz,5),
      new THREE.MeshPhongMaterial({color:0x78350f}));
    trunk.position.y=.025*sz; g.add(trunk);
    [[.05,.07,.04,TC[Math.floor(Math.random()*TC.length)]],
     [.04,.06,.095,TC[Math.floor(Math.random()*TC.length)]],
     [.03,.05,.14,TC[Math.floor(Math.random()*TC.length)]]].forEach(function(t){
      var c=new THREE.Mesh(new THREE.ConeGeometry(t[0]*sz,t[1]*sz,6),
        new THREE.MeshPhongMaterial({color:t[3],emissive:0x052e16}));
      c.position.y=t[2]*sz; g.add(c);
    });
    var x=-Math.sin(phi)*Math.cos(th),y=Math.cos(phi),z=Math.sin(phi)*Math.sin(th);
    g.position.set(x*1.4,y*1.4,z*1.4); g.lookAt(0,0,0); g.rotateX(-Math.PI/2);
    g.scale.set(0,0,0); g.userData={t:sz,d:Math.random()*3,sp:.002+Math.random()*.003};
    earth.add(g); return g;
  }
  var trees=[];
  var locs=[[-5,-60],[-12,-55],[-3,-65],[50,-120],[55,-105],[45,-80],[55,15],[50,10],[60,25],[5,20],[-5,25],[30,90],[50,100],[40,120],[20,80],[5,110],[0,115],[-30,145],[65,90],[60,80],[-10,20],[-15,30],[25,55],[15,75],[28,77]];
  locs.forEach(function(l){ trees.push(makeSmallTree(l[0],l[1],0.9+Math.random()*0.3)); });

  /* ════════════════════════ 6 STAKEHOLDER NODES ════════════════════════ */
  var NODE_CFG = [
    { id:'admin',  label:'Super Admin',     icon:'👑', color:0xa78bfa, emissive:0x4c1d95, dist:3.4, angle:  0,                  ring:0x7c3aed, y: 0.4 },
    { id:'org',    label:'Organization',    icon:'🏭', color:0x60a5fa, emissive:0x1e3a8a, dist:3.4, angle:  Math.PI*2/6*1,      ring:0x1d4ed8, y: 0.2 },
    { id:'lab',    label:'Laboratory',      icon:'🔬', color:0x2dd4bf, emissive:0x0f4c42, dist:3.4, angle:  Math.PI*2/6*2,      ring:0x0d9488, y:-0.2 },
    { id:'reg',    label:'Regulatory',      icon:'🏛️', color:0xfbbf24, emissive:0x78350f, dist:3.4, angle:  Math.PI*2/6*3,      ring:0xd97706, y:-0.4 },
    { id:'cons',   label:'Consultant',      icon:'💡', color:0x818cf8, emissive:0x312e81, dist:3.4, angle:  Math.PI*2/6*4,      ring:0x4f46e5, y:-0.2 },
    { id:'aud',    label:'Auditor',         icon:'🔍', color:0x34d399, emissive:0x064e3b, dist:3.4, angle:  Math.PI*2/6*5,      ring:0x059669, y: 0.2 },
  ];

  var nodes = [];
  NODE_CFG.forEach(function(cfg) {
    var x = Math.cos(cfg.angle) * cfg.dist;
    var y = cfg.y;
    var z = Math.sin(cfg.angle) * cfg.dist;

    /* Main sphere */
    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 24, 24),
      new THREE.MeshPhongMaterial({ color: cfg.color, emissive: cfg.emissive, shininess: 70 })
    );
    sphere.position.set(x, y, z);
    scene.add(sphere);

    /* Outer glow ring */
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.025, 8, 72),
      new THREE.MeshBasicMaterial({ color: cfg.ring, transparent: true, opacity: 0.6 })
    );
    ring.position.set(x, y, z);
    ring.lookAt(0, 0, 0);
    scene.add(ring);

    /* Inner pulsing sphere */
    var pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.25 })
    );
    pulse.position.set(x, y, z);
    scene.add(pulse);

    /* Orbital ring */
    var orbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.007, 6, 80),
      new THREE.MeshBasicMaterial({ color: cfg.ring, transparent: true, opacity: 0.2 })
    );
    orbit.position.set(x, y, z);
    orbit.rotation.x = Math.PI / 3 + Math.random() * 0.5;
    scene.add(orbit);

    nodes.push({ sphere, ring, pulse, orbit, cfg, x, y, z, phase: Math.random()*Math.PI*2 });
  });

  /* ════════════════════════ CONNECTION LINES (Earth → Nodes) ════════════════════════ */
  var connections = [];
  nodes.forEach(function(node) {
    var pts = [];
    for (var i = 0; i <= 50; i++) {
      var t = i / 50;
      var ex = node.x * t, ey = (node.y + Math.sin(t * Math.PI) * 0.8) * t, ez = node.z * t;
      pts.push(new THREE.Vector3(ex, ey, ez));
    }
    var line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: node.cfg.ring, transparent: true, opacity: 0.28 })
    );
    scene.add(line);
    connections.push({ line, node, pts });
  });

  /* ════════════════════════ CROSS-NODE CONNECTIONS ════════════════════════ */
  // Org → Lab → Reg cycle (the compliance workflow)
  var workflowPairs = [[1,2],[2,3],[1,5],[1,4]]; // indexes into nodes
  workflowPairs.forEach(function(pair) {
    var a = nodes[pair[0]], b = nodes[pair[1]];
    var mid = new THREE.Vector3((a.x+b.x)/2, (a.y+b.y)/2+0.6, (a.z+b.z)/2);
    var pts2 = [];
    for (var i = 0; i <= 40; i++) {
      var t = i/40;
      var p = new THREE.Vector3().lerpVectors(new THREE.Vector3(a.x,a.y,a.z), new THREE.Vector3(b.x,b.y,b.z), t);
      p.y += Math.sin(t * Math.PI) * 0.5;
      pts2.push(p);
    }
    var cl = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts2),
      new THREE.LineBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.15 })
    );
    scene.add(cl);
  });

  /* ════════════════════════ TRAVELING PARTICLES (data flow) ════════════════════════ */
  var dataParticles = [];
  // Along each connection
  connections.forEach(function(conn, i) {
    for (var j = 0; j < 2; j++) {
      var p = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: conn.node.cfg.color })
      );
      scene.add(p);
      dataParticles.push({ mesh: p, conn: conn, t: (i * 0.16 + j * 0.5) % 1, speed: 0.003 + Math.random() * 0.003 });
    }
  });

  /* ════════════════════════ AMBIENT PARTICLE CLOUD ════════════════════════ */
  var ambPts = [];
  for (var i = 0; i < 600; i++) {
    var r = 2.2 + Math.random() * 2.5;
    var p2 = Math.acos(2*Math.random()-1), p3 = Math.random()*Math.PI*2;
    ambPts.push(r*Math.sin(p2)*Math.cos(p3), r*Math.sin(p2)*Math.sin(p3), r*Math.cos(p2));
  }
  var aGeo = new THREE.BufferGeometry();
  aGeo.setAttribute('position', new THREE.Float32BufferAttribute(ambPts, 3));
  var ambCloud = new THREE.Points(aGeo, new THREE.PointsMaterial({ color:0x4ade80, size:.012, transparent:true, opacity:.3, sizeAttenuation:true }));
  scene.add(ambCloud);

  /* Gold particles (reports) */
  var gPts = [];
  for (var i = 0; i < 200; i++) {
    var r2 = 1.8 + Math.random() * 1.4;
    var p4 = Math.acos(2*Math.random()-1), p5 = Math.random()*Math.PI*2;
    gPts.push(r2*Math.sin(p4)*Math.cos(p5), r2*Math.sin(p4)*Math.sin(p5), r2*Math.cos(p4));
  }
  var ggeo = new THREE.BufferGeometry();
  ggeo.setAttribute('position', new THREE.Float32BufferAttribute(gPts, 3));
  var goldCloud = new THREE.Points(ggeo, new THREE.PointsMaterial({ color:0xfbbf24, size:.018, transparent:true, opacity:.2, sizeAttenuation:true }));
  scene.add(goldCloud);

  /* ════════════════════════ LIGHTS ════════════════════════ */
  scene.add(new THREE.AmbientLight(0x0a2820, 1.2));
  var sun = new THREE.DirectionalLight(0xfef9c3, 0.7); sun.position.set(5,5,8); scene.add(sun);
  var gl1 = new THREE.PointLight(0x22c55e, 3.5, 12); gl1.position.set(-3,3,3); scene.add(gl1);
  var gl2 = new THREE.PointLight(0x7c3aed, 2.0, 10); gl2.position.set(4,-2,3); scene.add(gl2);
  var gl3 = new THREE.PointLight(0x1d4ed8, 1.8, 10); gl3.position.set(0,4,-2); scene.add(gl3);
  var gl4 = new THREE.PointLight(0xfbbf24, 1.2, 8);  gl4.position.set(3,2,-4); scene.add(gl4);

  /* ════════════════════════ INTERACTION ════════════════════════ */
  var drag=false, prev={x:0,y:0}, autoRotate=true, velX=0;
  canvas.addEventListener('mousedown',function(e){drag=true;prev={x:e.clientX,y:e.clientY};autoRotate=false;velX=0;});
  window.addEventListener('mousemove',function(e){
    if(!drag)return;
    velX=(e.clientX-prev.x)*0.004;
    scene.rotation.y+=velX;
    prev={x:e.clientX,y:e.clientY};
  });
  window.addEventListener('mouseup',function(){drag=false;setTimeout(function(){autoRotate=true;},3000);});

  window.addEventListener('resize',function(){
    W=canvas.offsetWidth||window.innerWidth;H=canvas.offsetHeight||window.innerHeight;
    camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setSize(W,H);
  });

  /* Hover node detection */
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  canvas.addEventListener('mousemove',function(e){
    var rect=canvas.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
  });

  /* ════════════════════════ ANIMATE ════════════════════════ */
  var t=0, growT=0;
  (function loop(){
    requestAnimationFrame(loop);
    t+=0.008; growT+=0.016;

    if(autoRotate){ scene.rotation.y+=0.0018; velX*=0.95; scene.rotation.y+=velX; }
    if(!autoRotate){ velX*=0.92; scene.rotation.y+=velX; }

    earth.rotation.y+=0.0025; wire.rotation.y+=0.0025;

    /* Trees grow */
    trees.forEach(function(tr){
      if(growT>tr.userData.d){
        var s=tr.scale.x,ts=tr.userData.t;
        if(s<ts){var ns=Math.min(s+tr.userData.sp,ts);tr.scale.set(ns,ns,ns);}
        tr.rotation.z=Math.sin(t*.6+tr.userData.d)*.03;
      }
    });

    /* Node animations */
    nodes.forEach(function(n,i){
      var pb=0.8+0.25*Math.sin(t*1.8+n.phase);
      n.pulse.scale.set(pb,pb,pb);
      n.pulse.material.opacity=0.15+0.15*Math.abs(Math.sin(t*2+n.phase));
      n.ring.material.opacity=0.4+0.3*Math.abs(Math.sin(t*1.5+n.phase));
      n.ring.scale.set(pb,pb,pb);
      n.orbit.rotation.z+=0.006+i*0.002;
      n.orbit.rotation.y+=0.003;
    });

    /* Data particles travel along connections */
    dataParticles.forEach(function(dp){
      dp.t+=dp.speed;
      if(dp.t>1) dp.t-=1;
      var t2=dp.t, pts=dp.conn.pts;
      var idx=Math.floor(t2*(pts.length-1));
      var next=Math.min(idx+1,pts.length-1);
      var frac=(t2*(pts.length-1))-idx;
      dp.mesh.position.lerpVectors(pts[idx],pts[next],frac);
      dp.mesh.material.opacity=0.6+0.4*Math.sin(t2*Math.PI);
    });

    /* Connection line pulse */
    connections.forEach(function(c,i){
      c.line.material.opacity=0.18+0.18*Math.sin(t*0.8+i*0.7);
    });

    /* Ambient clouds */
    ambCloud.rotation.y-=0.0005; ambCloud.rotation.x=Math.sin(t*.15)*.04;
    ambCloud.material.opacity=0.22+0.1*Math.sin(t*.8);
    goldCloud.rotation.y+=0.0008;
    goldCloud.material.opacity=0.12+0.08*Math.sin(t*1.2+1);

    /* Atmospheres */
    atm.material.opacity=0.022+0.014*Math.sin(t*.5);

    camera.position.x=Math.sin(t*.25)*.4;
    camera.position.y=2+Math.cos(t*.2)*.3;
    camera.lookAt(0,0,0);

    renderer.render(scene,camera);
  })();
};

/* Mini hero globe */
window.initHeroGlobe = function(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === 'undefined') return;
  if (canvas._hg) return;
  canvas._hg = true;

  var W = canvas.offsetWidth||420, H = canvas.offsetHeight||420;
  var renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(W,H); renderer.setClearColor(0,0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(44,W/H,.1,100);
  camera.position.set(0,.3,3.8); camera.lookAt(0,0,0);

  var earth = new THREE.Mesh(new THREE.SphereGeometry(1,64,64),
    new THREE.MeshPhongMaterial({color:0x042f2e,emissive:0x021a18,specular:0x4ade80,shininess:35,transparent:true,opacity:.9}));
  scene.add(earth);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.005,18,18),
    new THREE.MeshBasicMaterial({color:0x34d399,wireframe:true,transparent:true,opacity:.04})));

  // 6 mini nodes around
  var nodeColors=[0xa78bfa,0x60a5fa,0x2dd4bf,0xfbbf24,0x818cf8,0x34d399];
  for(var i=0;i<6;i++){
    var a=i/6*Math.PI*2, d=2.2;
    var ns=new THREE.Mesh(new THREE.SphereGeometry(.12,12,12),
      new THREE.MeshPhongMaterial({color:nodeColors[i],emissive:nodeColors[i]}));
    ns.position.set(Math.cos(a)*d,.3,Math.sin(a)*d); scene.add(ns);
    var pts3=[new THREE.Vector3(0,0,0),new THREE.Vector3(Math.cos(a)*d,.3,Math.sin(a)*d)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3),
      new THREE.LineBasicMaterial({color:nodeColors[i],transparent:true,opacity:.2})));
  }

  var ap=[]; for(var j=0;j<200;j++){var r3=1.4+Math.random()*1.2;var p6=Math.acos(2*Math.random()-1);var p7=Math.random()*Math.PI*2;ap.push(r3*Math.sin(p6)*Math.cos(p7),r3*Math.sin(p6)*Math.sin(p7),r3*Math.cos(p6));}
  var ag=new THREE.BufferGeometry(); ag.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));
  var ambP=new THREE.Points(ag,new THREE.PointsMaterial({color:0x4ade80,size:.014,transparent:true,opacity:.3,sizeAttenuation:true}));
  scene.add(ambP);

  scene.add(new THREE.AmbientLight(0x0a2820,1.2));
  var sl2=new THREE.DirectionalLight(0xfef9c3,.7);sl2.position.set(3,3,5);scene.add(sl2);
  scene.add(new THREE.PointLight(0x22c55e,3,8));scene.children[scene.children.length-1].position.set(-2,2,2);

  window.addEventListener('resize',function(){var nW=canvas.offsetWidth||W;var nH=canvas.offsetHeight||H;camera.aspect=nW/nH;camera.updateProjectionMatrix();renderer.setSize(nW,nH);});

  var t2=0;
  (function loop2(){
    requestAnimationFrame(loop2); t2+=0.01;
    earth.rotation.y+=0.008;
    ambP.rotation.y-=.003;
    camera.position.y=.3+Math.sin(t2*.3)*.1; camera.lookAt(0,0,0);
    renderer.render(scene,camera);
  })();
};
