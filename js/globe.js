'use strict';
/* ═══════════════════════════════════════════════════════════════
   EcoSphere — Living Biosphere Globe v5
   80+ trees POP & GROW from the surface · Spring physics
   Lush ocean · Polar caps · Seed drift · No rings
   ═══════════════════════════════════════════════════════════════ */

window.initGlobe = function(id) {
  var canvas = document.getElementById(id);
  if (!canvas || typeof THREE === 'undefined') return;
  function tryInit(n) {
    var W = (canvas.parentElement && canvas.parentElement.offsetWidth)  || 0;
    var H = (canvas.parentElement && canvas.parentElement.offsetHeight) || 0;
    if ((W < 10 || H < 10) && n > 0) { setTimeout(function(){ tryInit(n-1); }, 150); return; }
    buildGlobe(canvas, W||420, H||420);
  }
  tryInit(8);
};

/* ─── Spring curve ─── */
function spring(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-8 * t) * Math.cos(14 * t);
}

/* ─── Surface vector ─── */
function sv(lat, lon) {
  var phi = (90-lat)*Math.PI/180, th = (lon+180)*Math.PI/180;
  return { x:-Math.sin(phi)*Math.cos(th), y:Math.cos(phi), z:Math.sin(phi)*Math.sin(th) };
}

function buildGlobe(canvas, W, H) {
  var renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(W, H);
  renderer.setClearColor(0,0);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
  camera.position.set(0, 0.2, 3.3);
  camera.lookAt(0,0,0);

  /* ── EARTH LAYERS ── */

  /* Core ocean — deep rich blue */
  var earth = new THREE.Mesh(
    new THREE.SphereGeometry(1,96,96),
    new THREE.MeshPhongMaterial({
      color:0x0369a1, emissive:0x023d60,
      specular:0x7dd3fc, shininess:90,
      transparent:true, opacity:0.95
    })
  );
  scene.add(earth);

  /* Land/forest layer — vivid green */
  var land = new THREE.Mesh(
    new THREE.SphereGeometry(1.001,64,64),
    new THREE.MeshPhongMaterial({
      color:0x166534, emissive:0x052e16,
      specular:0x4ade80, shininess:20,
      transparent:true, opacity:0.72
    })
  );
  earth.add(land);

  /* Latitude/longitude grid */
  var grid = new THREE.Mesh(
    new THREE.SphereGeometry(1.003,22,22),
    new THREE.MeshBasicMaterial({color:0x34d399, wireframe:true, transparent:true, opacity:0.04})
  );
  earth.add(grid);

  /* North polar cap */
  var northCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.38,24,24,0,Math.PI*2,0,0.55),
    new THREE.MeshPhongMaterial({color:0xe0f2fe, emissive:0xa0c4e0, transparent:true, opacity:0.75, shininess:80})
  );
  northCap.position.y = 0.88;
  earth.add(northCap);

  /* South polar cap */
  var southCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.30,24,24,0,Math.PI*2,Math.PI-0.48,0.48),
    new THREE.MeshPhongMaterial({color:0xe0f2fe, emissive:0xa0c4e0, transparent:true, opacity:0.7, shininess:80})
  );
  southCap.position.y = -0.88;
  earth.add(southCap);

  /* Atmosphere — green glow */
  var atm = new THREE.Mesh(
    new THREE.SphereGeometry(1.16,64,64),
    new THREE.MeshBasicMaterial({color:0x4ade80, transparent:true, opacity:0.035, side:THREE.BackSide})
  );
  scene.add(atm);

  /* Sky haze */
  var sky = new THREE.Mesh(
    new THREE.SphereGeometry(1.08,64,64),
    new THREE.MeshBasicMaterial({color:0x38bdf8, transparent:true, opacity:0.022, side:THREE.BackSide})
  );
  scene.add(sky);

  /* ── TREE PALETTES ── */
  var DG=[0x052e16,0x14532d,0x065f46,0x134e4a,0x166534];
  var MG=[0x15803d,0x16a34a,0x0d9488,0x047857];
  var LG=[0x22c55e,0x34d399,0x4ade80,0x6ee7b7];
  var TR=[0x78350f,0x92400e,0x713f12,0x57330a,0x6d3209];

  function rc(arr){return arr[Math.floor(Math.random()*arr.length)];}

  /* ── PINE TREE (4-tier, lush) ── */
  function pine(lat,lon,sz,del){
    var g=new THREE.Group(), tc=rc(TR), gc1=rc(MG), gc2=rc(LG);
    /* trunk */
    var tr=new THREE.Mesh(new THREE.CylinderGeometry(.005*sz,.012*sz,.09*sz,7),
      new THREE.MeshPhongMaterial({color:tc,emissive:0x3b1200}));
    tr.position.y=.045*sz; g.add(tr);
    /* 4 cone tiers */
    [[.10,.12,.05,gc2],[.083,.10,.115,gc1],[.065,.085,.170,gc2],[.048,.068,.220,gc1]].forEach(function(t){
      var c=new THREE.Mesh(new THREE.ConeGeometry(t[0]*sz,t[1]*sz,8),
        new THREE.MeshPhongMaterial({color:t[3],emissive:rc(DG),shininess:18}));
      c.position.y=t[2]*sz; g.add(c);
    });
    _place(g,lat,lon,sz,del,'sway-fast'); return g;
  }

  /* ── ROUND TREE (tropical, full canopy) ── */
  function round(lat,lon,sz,del){
    var g=new THREE.Group(), tc=rc(TR), gc=rc(MG);
    var tr=new THREE.Mesh(new THREE.CylinderGeometry(.007*sz,.013*sz,.11*sz,6),
      new THREE.MeshPhongMaterial({color:tc,emissive:0x3b1200}));
    tr.position.y=.055*sz; g.add(tr);
    /* main canopy */
    var c=new THREE.Mesh(new THREE.SphereGeometry(.135*sz,11,11),
      new THREE.MeshPhongMaterial({color:gc,emissive:rc(DG),shininess:12}));
    c.position.y=.20*sz; g.add(c);
    /* 4 satellite canopies */
    [[-.09,.16,.07],[.09,.15,-.06],[-.05,.13,-.09],[.07,.18,.05]].forEach(function(s,i){
      var sc=new THREE.Mesh(new THREE.SphereGeometry(.078*sz,9,9),
        new THREE.MeshPhongMaterial({color:i%2?rc(LG):rc(MG),emissive:rc(DG),shininess:10}));
      sc.position.set(s[0]*sz,s[1]*sz,s[2]*sz); g.add(sc);
    });
    _place(g,lat,lon,sz,del,'sway-slow'); return g;
  }

  /* ── PALM TREE ── */
  function palm(lat,lon,sz,del){
    var g=new THREE.Group();
    /* curved trunk segments */
    for(var i=0;i<6;i++){
      var seg=new THREE.Mesh(new THREE.CylinderGeometry(.006*sz,.009*sz,.06*sz,5),
        new THREE.MeshPhongMaterial({color:0x92400e,emissive:0x3b1200}));
      var ang=i/6*.38;
      seg.position.set(Math.sin(ang)*.05*sz,(i*.054+.03)*sz,0);
      seg.rotation.z=ang*.45; g.add(seg);
    }
    /* fronds */
    for(var f=0;f<7;f++){
      var fr=new THREE.Mesh(new THREE.ConeGeometry(.032*sz,.16*sz,4),
        new THREE.MeshPhongMaterial({color:f%2?rc(MG):rc(LG),emissive:rc(DG)}));
      var fa=f/7*Math.PI*2;
      fr.position.set(Math.cos(fa)*.07*sz,.30*sz,Math.sin(fa)*.07*sz);
      fr.rotation.z=-Math.PI/3.5; fr.rotation.y=fa; g.add(fr);
    }
    _place(g,lat,lon,sz,del,'sway-fast'); return g;
  }

  /* ── BUSH ── */
  function bush(lat,lon,sz,del){
    var g=new THREE.Group();
    [[0,.032,0],[.06,.028,.04],[-.06,.028,-.04],[.02,.055,.03],[-.03,.05,-.03]].forEach(function(o,i){
      var bm=new THREE.Mesh(new THREE.SphereGeometry((.05+(i*.008))*sz,8,8),
        new THREE.MeshPhongMaterial({color:i%2?rc(MG):rc(LG),emissive:rc(DG)}));
      bm.position.set(o[0]*sz,o[1]*sz,o[2]*sz); g.add(bm);
    });
    _place(g,lat,lon,sz,del,'sway-slow'); return g;
  }

  /* ── place helper ── */
  var trees=[], _d=0;
  function _place(g,lat,lon,sz,del,swayType){
    var p=sv(lat,lon);
    g.position.set(p.x,p.y,p.z);
    g.lookAt(0,0,0); g.rotateX(-Math.PI/2);
    g.scale.set(0,0,0);
    g.userData={sz:sz,delay:del,state:'wait',prog:0,
      sp:Math.random()*Math.PI*2,
      ss:(swayType==='sway-fast'?0.5+Math.random()*.5:0.28+Math.random()*.3)};
    earth.add(g); trees.push(g);
  }

  /* ── ADD ALL TREES ── stagger delays */
  var D=0;
  function a(fn,lat,lon,sz){ D+=0.14+Math.random()*.1; return fn(lat,lon,sz,D); }

  /* Amazon basin — dense round trees */
  a(round,-5,-60,1.2); a(round,-8,-58,1.1); a(round,-3,-65,1.15);
  a(round,-12,-55,1.0); a(round,0,-63,1.1); a(round,-6,-52,1.05);
  a(bush,-4,-68,.85); a(round,-15,-60,.95);

  /* North American forests */
  a(pine,50,-120,1.1); a(pine,55,-105,1.15); a(pine,45,-80,1.0);
  a(pine,60,-110,1.05); a(pine,48,-90,.95); a(pine,52,-95,1.0);
  a(round,40,-80,.88); a(bush,38,-90,.75);

  /* Scandinavia */
  a(pine,65,20,.95); a(pine,60,25,1.0); a(pine,68,25,.9);
  a(pine,70,25,.85); a(pine,62,18,.92); a(pine,58,22,.88);

  /* Siberia */
  a(pine,65,90,1.1); a(pine,60,80,.95); a(pine,70,60,.92);
  a(pine,55,85,1.0); a(pine,63,100,.95); a(pine,68,110,.9);

  /* Central Europe */
  a(pine,55,15,.9); a(pine,50,10,.92); a(round,48,14,.85);
  a(round,52,20,.88); a(bush,46,8,.72); a(pine,57,12,.88);

  /* Africa — mixed */
  a(round,5,20,.95); a(round,-5,25,.9); a(round,10,15,.88);
  a(palm,5,5,.85); a(palm,-15,30,.82); a(round,0,30,.92);
  a(round,-10,20,.88); a(round,-15,32,.85); a(bush,15,20,.72);
  a(round,3,18,.9); a(palm,12,28,.78); a(round,-20,28,.82);

  /* Asia */
  a(round,30,90,.92); a(pine,50,100,1.05); a(pine,40,120,.92);
  a(round,20,80,.88); a(round,15,75,.85); a(round,35,105,.9);
  a(pine,45,130,.92); a(pine,43,125,.88); a(bush,25,110,.72);

  /* SE Asia / Indonesia */
  a(round,5,110,1.1); a(round,0,115,1.05); a(palm,10,107,.9);
  a(palm,3,118,.88); a(round,-5,120,1.0); a(round,2,108,.95);
  a(palm,7,100,.82); a(round,-3,112,.95);

  /* Australia */
  a(round,-30,145,.85); a(round,-25,130,.88); a(round,-35,149,.82);
  a(bush,-20,140,.72); a(round,-27,133,.8);

  /* South America — Andes + Brazil */
  a(pine,-15,-70,.92); a(pine,-10,-75,.88); a(round,-20,-65,.85);
  a(round,-3,-72,.95); a(bush,-18,-68,.72); a(round,5,-60,1.0);

  /* India */
  a(round,28,77,.85); a(round,19,72,.82); a(palm,12,77,.80);
  a(round,22,80,.82); a(bush,25,85,.70);

  /* Middle East */
  a(palm,25,55,.75); a(palm,15,45,.72); a(palm,22,40,.70);

  /* Caribbean / Central America */
  a(palm,20,-75,.78); a(round,15,-85,.82); a(palm,10,-65,.75);

  /* New Zealand */
  a(round,-40,174,.82); a(round,-37,175,.78);

  /* Madagascar */
  a(round,-20,46,.82); a(palm,-15,48,.78);

  /* Extra fill for density */
  a(pine,62,30,.9); a(pine,40,-75,.88); a(pine,53,-1,.85);
  a(round,-22,-43,.78); a(round,35,35,.80); a(pine,46,25,.85);
  a(bush,-32,151,.7); a(round,2,-54,.88); a(palm,10,-72,.76);

  /* ── SEED PARTICLES ── */
  var spts=[];
  for(var i=0;i<500;i++){
    var r=1.1+Math.random()*.9, pp=Math.acos(2*Math.random()-1), pt=Math.random()*Math.PI*2;
    spts.push(r*Math.sin(pp)*Math.cos(pt),r*Math.sin(pp)*Math.sin(pt),r*Math.cos(pp));
  }
  var sGeo=new THREE.BufferGeometry();
  sGeo.setAttribute('position',new THREE.Float32BufferAttribute(spts,3));
  var seeds=new THREE.Points(sGeo,new THREE.PointsMaterial({
    color:0x86efac, size:.016, transparent:true, opacity:.45, sizeAttenuation:true
  }));
  scene.add(seeds);

  /* Bigger glow particles */
  var gpts=[];
  for(var j=0;j<80;j++){
    var gr=1.3+Math.random()*.5, gp=Math.acos(2*Math.random()-1), gt2=Math.random()*Math.PI*2;
    gpts.push(gr*Math.sin(gp)*Math.cos(gt2),gr*Math.sin(gp)*Math.sin(gt2),gr*Math.cos(gp));
  }
  var gGeo=new THREE.BufferGeometry();
  gGeo.setAttribute('position',new THREE.Float32BufferAttribute(gpts,3));
  var glows=new THREE.Points(gGeo,new THREE.PointsMaterial({
    color:0x4ade80, size:.032, transparent:true, opacity:.3, sizeAttenuation:true
  }));
  scene.add(glows);

  /* ── LIGHTS ── */
  scene.add(new THREE.AmbientLight(0x0c2820,1.3));
  var sun=new THREE.DirectionalLight(0xfef3c7,.95); sun.position.set(4,3,5); scene.add(sun);
  var gl1=new THREE.PointLight(0x22c55e,4.0,10); gl1.position.set(-2,2,2); scene.add(gl1);
  var gl2=new THREE.PointLight(0xfbbf24,1.1,7);  gl2.position.set(3,-1,2); scene.add(gl2);
  var gl3=new THREE.PointLight(0x38bdf8,1.6,7);  gl3.position.set(0,3,-1); scene.add(gl3);
  var gl4=new THREE.PointLight(0x4ade80,2.0,6);  gl4.position.set(-1,-2,1); scene.add(gl4);

  /* ── INTERACTION ── */
  var drag=false,prev={x:0,y:0},vel=0;
  canvas.addEventListener('mousedown',function(e){drag=true;prev={x:e.clientX,y:e.clientY};vel=0;});
  window.addEventListener('mousemove',function(e){
    if(!drag)return; vel=(e.clientX-prev.x)*0.003;
    earth.rotation.y+=vel; prev={x:e.clientX,y:e.clientY};
  });
  window.addEventListener('mouseup',function(){drag=false;});
  canvas.addEventListener('touchstart',function(e){drag=true;prev={x:e.touches[0].clientX,y:e.touches[0].clientY};vel=0;},{passive:true});
  window.addEventListener('touchmove',function(e){
    if(!drag)return; vel=(e.touches[0].clientX-prev.x)*0.003;
    earth.rotation.y+=vel; prev={x:e.touches[0].clientX,y:e.touches[0].clientY};
  },{passive:true});
  window.addEventListener('touchend',function(){drag=false;});
  window.addEventListener('resize',function(){
    var nW=canvas.parentElement.offsetWidth||W, nH=canvas.parentElement.offsetHeight||H;
    if(nW<10)nW=W; if(nH<10)nH=H;
    camera.aspect=nW/nH; camera.updateProjectionMatrix(); renderer.setSize(nW,nH);
  });

  /* ── ANIMATE ── */
  var t=0, elapsed=0;
  (function loop(){
    requestAnimationFrame(loop);
    t+=0.010; elapsed+=0.016;

    /* Earth rotate */
    if(!drag){ earth.rotation.y+=0.0026; vel*=0.92; earth.rotation.y+=vel; }

    /* Tree pop + sway */
    trees.forEach(function(tr){
      var u=tr.userData;
      if(u.state==='wait'&&elapsed>u.delay){ u.state='grow'; u.prog=0; }
      if(u.state==='grow'){
        u.prog+=0.030; /* pop speed */
        var sc=spring(Math.min(u.prog,1))*u.sz;
        tr.scale.set(sc,sc,sc);
        if(u.prog>=1){ tr.scale.set(u.sz,u.sz,u.sz); u.state='sway'; }
      }
      if(u.state==='sway'){
        tr.rotation.z=Math.sin(t*u.ss+u.sp)*0.035;
        tr.rotation.x=Math.cos(t*u.ss*.7+u.sp)*0.022;
      }
    });

    /* Seeds drift */
    seeds.rotation.y-=0.0007;
    seeds.rotation.x=Math.sin(t*.18)*.05;
    seeds.material.opacity=0.30+0.18*Math.sin(t*1.3);
    glows.rotation.y-=0.0005;
    glows.rotation.x=Math.cos(t*.22)*.04;
    glows.material.opacity=0.18+0.14*Math.sin(t*.9+1);

    /* Atmosphere breathe */
    atm.material.opacity=0.028+0.016*Math.sin(t*.5);
    sky.material.opacity=0.018+0.010*Math.sin(t*.7+1);

    camera.position.y=0.2+Math.sin(t*.28)*.06;
    camera.lookAt(0,0,0);
    renderer.render(scene,camera);
  })();
}
