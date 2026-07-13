'use strict';
const fs=require('fs');
let html=fs.readFileSync('C:/Users/lenovo/OneDrive/Desktop/practice/EcoSphere/org-portal.html','utf8');

const btnStyle='width:100%;margin-top:12px;background:#eff6ff;border:1px solid rgba(29,78,216,.25);border-radius:8px;padding:9px;color:#1d4ed8;font-family:Poppins,sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px';

function gaugeRow(label,val,pct,col){
  return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
    +'<span style="font-size:.74rem;color:#64748b;font-weight:600;width:110px;flex-shrink:0">'+label+'</span>'
    +'<div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="height:100%;border-radius:3px;background:'+col+';width:'+pct+'"></div></div>'
    +'<span style="font-family:Poppins,sans-serif;font-size:.72rem;font-weight:800;color:#0f172a;width:34px;text-align:right">'+val+'</span>'
    +'</div>';
}

function paramCard(icon,bg,col,title,isAlert,gauges,type){
  var badgeColor=isAlert?'background:#fee2e2;border:1px solid rgba(220,38,38,.25);border-radius:10px;padding:2px 8px;color:#dc2626;font-size:.62rem;font-weight:800':'background:#f0fdf4;border:1px solid rgba(22,163,74,.25);border-radius:10px;padding:2px 8px;color:#16a34a;font-size:.62rem;font-weight:800';
  var badgeTxt=isAlert?'ALERT':'LIVE';
  return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.05)">'
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;padding-bottom:11px;border-bottom:1px solid #f1f5f9">'
    +'<div style="width:36px;height:36px;border-radius:9px;background:'+bg+';color:'+col+';display:flex;align-items:center;justify-content:center;font-size:.95rem"><i class="fas '+icon+'"></i></div>'
    +'<span style="font-family:Poppins,sans-serif;font-size:.92rem;font-weight:800;color:#0f172a">'+title+'</span>'
    +'<span style="margin-left:auto;'+badgeColor+'">'+badgeTxt+'</span>'
    +'</div>'
    +gauges
    +'<button onclick="orgOpenForm(\''+type+'\')" style="'+btnStyle+'"><i class="fas fa-edit"></i> Enter Data</button>'
    +'</div>';
}

function devRow(icon,col,bg,name,sub,val,warn){
  var border=warn?'rgba(249,115,22,.3)':'rgba(22,163,74,.18)';
  return '<div style="display:flex;align-items:center;gap:12px;padding:11px 13px;background:#f8fafc;border:1px solid '+border+';border-radius:10px;margin-bottom:8px">'
    +'<div style="width:34px;height:34px;border-radius:8px;background:'+bg+';color:'+col+';display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0"><i class="fas '+icon+'"></i></div>'
    +'<div style="flex:1"><strong style="display:block;font-size:.84rem;font-weight:700;color:#0f172a">'+name+'</strong><span style="font-size:.72rem;color:#64748b">'+sub+'</span></div>'
    +'<span style="font-size:.8rem;color:#374151">'+val+'</span>'
    +'</div>';
}

var fullMon = '<div class="pg" id="pgMonitor">\n'
  +'<div class="pg-title">Environmental Monitoring</div>\n'
  +'<div class="pg-sub">Real-time multi-parameter data collection &amp; AI analysis</div>\n'
  // Portal shortcut buttons
  +'<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">'
  +'<button onclick="openLabPortal()" style="background:linear-gradient(135deg,#0d9488,#059669);border:none;border-radius:9px;padding:9px 18px;color:#fff;font-family:Poppins,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="fas fa-flask"></i> Submit to Lab Portal</button>'
  +'<button onclick="openRegPortal()" style="background:linear-gradient(135deg,#d97706,#b45309);border:none;border-radius:9px;padding:9px 18px;color:#fff;font-family:Poppins,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="fas fa-landmark"></i> Submit to Regulatory Portal</button>'
  +'</div>'
  // Tabs
  +'<div style="display:flex;gap:5px;margin-bottom:18px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:4px;width:fit-content">'
  +'<button id="tabManual" onclick="switchMonTab(\'manual\')" style="background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border:none;border-radius:7px;padding:8px 18px;font-family:Poppins,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="fas fa-wpforms"></i> Manual Entry</button>'
  +'<button id="tabDevice" onclick="switchMonTab(\'device\')" style="background:transparent;color:#64748b;border:none;border-radius:7px;padding:8px 18px;font-family:Poppins,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="fas fa-microchip"></i> Device Integration</button>'
  +'</div>'
  // Param grid
  +'<div id="monManual" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:14px">'
  +paramCard('fa-wind','#dbeafe','#1d4ed8','Air Quality',false,
    gaugeRow('PM2.5 (µg/m³)','62','62%','#1d4ed8')+gaugeRow('PM10 (µg/m³)','85','85%','#f97316')+gaugeRow('CO₂ (ppm)','412','41%','#1d4ed8')+gaugeRow('NOₓ (ppb)','25','25%','#16a34a'),'air')
  +paramCard('fa-water','#ccfbf1','#0d9488','Water Quality',false,
    gaugeRow('pH Level','7.2','72%','#0d9488')+gaugeRow('TDS (mg/L)','550','55%','#f97316')+gaugeRow('BOD (mg/L)','3.0','10%','#16a34a')+gaugeRow('DO (mg/L)','6.8','68%','#0d9488'),'water')
  +paramCard('fa-volume-up','#fee2e2','#dc2626','Noise',true,
    gaugeRow('Day (dB)','70','70%','#f97316')+gaugeRow('Night (dB)','45','45%','#16a34a')+gaugeRow('Peak (dB)','88','88%','#dc2626'),'noise')
  +paramCard('fa-mountain','#dcfce7','#16a34a','Soil',false,
    gaugeRow('Moisture (%)','38','38%','#16a34a')+gaugeRow('pH','6.5','65%','#1d4ed8')+gaugeRow('Nitrogen','120','55%','#1d4ed8'),'soil')
  +paramCard('fa-thermometer-half','#fef3c7','#d97706','Temperature',false,
    gaugeRow('Ambient (°C)','32','60%','#f97316')+gaugeRow('Process (°C)','78','78%','#f97316')+gaugeRow('Effluent (°C)','28','40%','#16a34a'),'temp')
  +paramCard('fa-tint','#cffafe','#0e7490','Humidity',false,
    gaugeRow('Relative (%)','65','65%','#1d4ed8')+gaugeRow('Absolute (g/m³)','16','42%','#16a34a')+gaugeRow('Dew Point (°C)','24','52%','#1d4ed8'),'humidity')
  +paramCard('fa-recycle','#ede9fe','#7c3aed','Waste Management',false,
    gaugeRow('Solid (tonnes)','4.5','75%','#f97316')+gaugeRow('Recycled (%)','62','62%','#16a34a')+gaugeRow('Hazardous (kg)','12','20%','#dc2626'),'waste')
  +'</div>'
  // Device tab
  +'<div id="monDevice" style="display:none">'
  +'<div style="background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.05)">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
  +'<div style="color:#16a34a;font-family:Plus Jakarta Sans,sans-serif;font-size:.88rem;font-weight:800;display:flex;align-items:center;gap:7px"><span style="width:7px;height:7px;border-radius:50%;background:#16a34a"></span>12 Devices Connected</div>'
  +'<button style="background:#f0fdf4;border:1px solid rgba(22,163,74,.25);border-radius:8px;padding:6px 14px;color:#16a34a;font-size:.78rem;font-weight:700;cursor:pointer;font-family:Inter,sans-serif"><i class="fas fa-plug"></i> Add Device</button>'
  +'</div>'
  +devRow('fa-wind','#1d4ed8','#dbeafe','Air Quality Sensor AQ-001','Station A · 2 min ago','PM2.5: 62 µg/m³',false)
  +devRow('fa-water','#0d9488','#ccfbf1','Water Analyser WA-004','Effluent Point · 1 min ago','pH: 7.2',false)
  +devRow('fa-volume-up','#dc2626','#fee2e2','Noise Logger NL-002','Boundary · 5 min ago','dB: 88 ⚠',true)
  +devRow('fa-thermometer-half','#d97706','#fef3c7','Temp Sensor TS-007','Process Area · 30s ago','Temp: 78°C',false)
  +'<div style="background:#f0fdf4;border:1px solid rgba(22,163,74,.2);border-radius:9px;padding:13px;margin-top:12px">'
  +'<div style="font-family:Poppins,sans-serif;font-size:.78rem;font-weight:800;color:#15803d;margin-bottom:6px"><i class="fas fa-brain" style="margin-right:5px"></i>AI Real-Time Analysis</div>'
  +'<p style="font-size:.82rem;color:#374151;line-height:1.6">Noise at 88 dB exceeds CPCB limit (85 dB). Source: Compressor Room B. Auto-alert raised. All other parameters within permissible limits.</p>'
  +'</div></div></div>'
  // Data entry form area
  +'<div id="orgFormArea" style="display:none;margin-top:18px;background:#fff;border:2px solid #bfdbfe;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(29,78,216,.12)">'
  +'<div style="background:linear-gradient(90deg,#0f172a,#1e3a5f);padding:14px 20px;display:flex;align-items:center;justify-content:space-between">'
  +'<div id="orgFormTitle" style="font-family:Poppins,sans-serif;font-size:.9rem;font-weight:800;color:#fff">Data Entry</div>'
  +'<button onclick="document.getElementById(\'orgFormArea\').style.display=\'none\'" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:7px;padding:5px 12px;color:#fff;font-size:.78rem;font-weight:700;cursor:pointer"><i class="fas fa-times"></i> Close</button>'
  +'</div><div id="orgFormBody" style="padding:20px"></div>'
  +'</div>\n'
  +'</div>';

var oldStart=html.indexOf('<div class="pg" id="pgMonitor">');
var oldEnd=html.indexOf('<div class="pg" id="pgESG">');
html=html.substring(0,oldStart)+fullMon+'\n        '+html.substring(oldEnd);
fs.writeFileSync('C:/Users/lenovo/OneDrive/Desktop/practice/EcoSphere/org-portal.html',html);
console.log('Done. Size:',html.length);
