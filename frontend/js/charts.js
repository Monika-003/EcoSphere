'use strict';
window.initCharts=function(){
  if(typeof Chart==='undefined'){setTimeout(window.initCharts,300);return}
  var tt={plugins:{legend:{labels:{color:'#475569',font:{size:11,family:'Rajdhani',weight:'700'},boxWidth:12,padding:14}},tooltip:{backgroundColor:'#0f172a',titleColor:'#f59e0b',bodyColor:'#e2e8f0',borderColor:'#334155',borderWidth:1,padding:12,cornerRadius:10}},scales:{x:{ticks:{color:'#64748b',font:{size:10,family:'Rajdhani',weight:'700'}},grid:{color:'#f1f5f9'}},y:{ticks:{color:'#64748b',font:{size:10,family:'Rajdhani',weight:'700'}},grid:{color:'#f1f5f9'}}}};
  // ESG Ring
  var eEl=document.getElementById('esgRing');
  if(eEl)new Chart(eEl,{type:'doughnut',data:{datasets:[{data:[74,26],backgroundColor:['rgba(124,58,237,.9)','#f1f5f9'],borderColor:['#7c3aed','transparent'],borderWidth:2}]},options:{cutout:'78%',responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},animation:{animateRotate:true,duration:2000,easing:'easeOutCubic'}}});
  // Sustainability Ring
  var sEl=document.getElementById('sustainRing');
  if(sEl)new Chart(sEl,{type:'doughnut',data:{datasets:[{data:[81,19],backgroundColor:['rgba(13,148,136,.9)','#f1f5f9'],borderColor:['#0d9488','transparent'],borderWidth:2}]},options:{cutout:'76%',responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},animation:{animateRotate:true,duration:2200,easing:'easeOutCubic'}}});
  // Carbon Bar
  var cEl=document.getElementById('carbonChart');
  if(cEl)new Chart(cEl,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Scope 1',data:[920,900,870,855,840,832],backgroundColor:'rgba(29,78,216,.75)',borderRadius:5},{label:'Scope 2',data:[720,700,680,660,650,641],backgroundColor:'rgba(217,119,6,.75)',borderRadius:5},{label:'Scope 3',data:[420,410,400,390,380,374],backgroundColor:'rgba(22,163,74,.7)',borderRadius:5}]},options:{responsive:true,...tt,animation:{duration:2000,easing:'easeOutCubic'}}});
  // Trend Line
  var tlEl=document.getElementById('trendLineChart');
  if(tlEl)new Chart(tlEl,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'ESG',data:[68,71,73,74,75,74],borderColor:'#9333ea',backgroundColor:'rgba(147,51,234,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#9333ea'},{label:'Carbon',data:[75,77,79,80,81,82],borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#2563eb'},{label:'Sustain.',data:[72,74,75,78,79,81],borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#16a34a'},{label:'Air Quality',data:[60,58,62,65,64,63],borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.05)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#f59e0b'}]},options:{responsive:true,interaction:{mode:'index',intersect:false},...tt,scales:{...tt.scales,y:{...tt.scales.y,min:50,max:100}},animation:{duration:2500,easing:'easeOutCubic'}}});
  // Emission Donut
  var eDoEl=document.getElementById('emissionDonut');
  if(eDoEl)new Chart(eDoEl,{type:'doughnut',data:{labels:['Electricity','Fuel','Logistics','Water','Process'],datasets:[{data:[35,28,18,10,9],backgroundColor:['rgba(217,119,6,.88)','rgba(29,78,216,.88)','rgba(22,163,74,.85)','rgba(13,148,136,.82)','rgba(124,58,237,.80)'],borderColor:'#fff',borderWidth:3}]},options:{responsive:true,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'#475569',font:{size:10,family:'Rajdhani',weight:'700'},padding:10,boxWidth:10}},tooltip:tt.plugins.tooltip},animation:{animateRotate:true,duration:2000,easing:'easeOutCubic'}}});
  // Trend
  var stEl=document.getElementById('trendChart');
  if(stEl)new Chart(stEl,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Sustainability Score',data:[72,74,75,78,79,81],borderColor:'#0d9488',backgroundColor:'rgba(13,148,136,.08)',fill:true,tension:.4,pointRadius:5,pointBackgroundColor:'#0d9488'}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:tt.plugins.tooltip},scales:{x:tt.scales.x,y:{...tt.scales.y,min:60,max:100}},animation:{duration:2000}}});
  // trigger gauge fills
  setTimeout(function(){
    document.querySelectorAll('.g-fill,.pil-fill,.sc-fill,.sub-bar div').forEach(function(bar){
      var w=bar.style.getPropertyValue('--gw')||bar.style.getPropertyValue('--pw')||bar.style.getPropertyValue('--sw')||bar.style.getPropertyValue('--sbw')||'0%';
      bar.style.width='0%';setTimeout(function(){bar.style.transition='width 2.2s cubic-bezier(.4,0,.2,1)';bar.style.width=w},150);
    });
  },300);
};
