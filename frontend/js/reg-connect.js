/**
 * reg-connect.js
 * Connects reg-portal.html to the EcoSphere backend API.
 *
 * Overrides:
 *   doRegLogin()  -> POST /auth/login
 *   regLogout()   -> POST /auth/logout
 *   regAct(type)  -> POST /regulatory/reports/{id}/approve|certificate|notice|inspection
 *
 * Loads:
 *   Dashboard stats   -> GET /regulatory/dashboard
 *   Pending approvals -> GET /regulatory/pending
 *   Analytics data    -> GET /regulatory/analytics
 *
 * Loads after: api.js, eco-api-service.js
 */
(function (window) {
  'use strict';


  function whenReady(fn) {
    if (window.EcoService && window.EcoSphereAPI) { fn(); return; }
    var t = setInterval(function () {
      if (window.EcoService && window.EcoSphereAPI) { clearInterval(t); fn(); }
    }, 40);
  }

  /* Currently selected report/entity ID for regulation actions */
  var _activeReportId = null;

  whenReady(function () {

    /* ================================================
       SESSION RESTORE
    ================================================ */
    (function restoreSession() {
      var token = EcoService.TokenStore.getAccess();
      var user  = EcoService.TokenStore.getUser();
      if (!token || !user) return;

      var app = document.getElementById('app');
      if (!app) return;

      /* Auto-show the portal if a valid session exists (handles browser back button) */
      if (app.style.display !== 'flex') {
        var loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.style.display = 'none';
        app.style.display = 'flex';
        if (typeof initCharts === 'function') setTimeout(initCharts, 200);
        if (typeof _buildRegOrgSidebar === 'function') setTimeout(_buildRegOrgSidebar, 300);
        if (typeof _loadDynamicRegSubmissions === 'function') setTimeout(function(){ _loadDynamicRegSubmissions(window._regOrg||''); }, 500);
      }

      _applyUserToUI(user);
      _loadDashboard();
      _loadPendingApprovals();
      _loadAnalytics();
      _loadAlerts();
      setTimeout(function(){ if (typeof _loadRegCertsFromAPI === 'function') _loadRegCertsFromAPI(); }, 400);
    })();

    /* ================================================
       LOGIN
    ================================================ */
    window.doRegLogin = function () {
      var emailEl = document.getElementById('rEmail') || document.getElementById('lEmail');
      var pwEl    = document.getElementById('rPw')    || document.getElementById('lPw');
      var err     = document.getElementById('loginErr');

      if (!emailEl || !emailEl.value.trim() || !pwEl || !pwEl.value) {
        if (err) {
          err.style.display = 'flex';
          err.innerHTML = '<i class="fas fa-exclamation-circle"></i>&nbsp;Please fill in Email and Password.';
        }
        return;
      }
      if (err) err.style.display = 'none';

      /* No org at login — org is selected from sidebar after login */
      window._regOrg = null;

      var btn  = document.getElementById('regBtn')    || document.getElementById('loginBtn');
      var txt  = document.getElementById('regBtnTxt') || document.getElementById('loginBtnTxt');
      var spin = document.getElementById('regSpin')   || document.getElementById('loginSpinner');
      if (btn)  btn.disabled       = true;
      if (txt)  txt.style.opacity  = '.4';
      if (spin) spin.style.display = 'inline-block';

      /* Client-side auth against ecoRegRegisteredUsers; fallback auto-create for demo */
      var enteredEmail = emailEl.value.trim().toLowerCase();
      var enteredPw    = pwEl.value;

      var regUsers = [];
      try { regUsers = JSON.parse(localStorage.getItem('ecoRegRegisteredUsers') || '[]'); } catch(e) {}

      var matched = null;
      for (var i = 0; i < regUsers.length; i++) {
        if ((regUsers[i].email||'').toLowerCase() === enteredEmail) { matched = regUsers[i]; break; }
      }

      /* If no reg-specific account found, accept any credential and auto-create the account */
      if (!matched) {
        matched = { email: enteredEmail, password: enteredPw, firstName: enteredEmail.split('@')[0], lastName: '', role: 'REG_OFFICER' };
        regUsers.push(matched);
        localStorage.setItem('ecoRegRegisteredUsers', JSON.stringify(regUsers));
      } else if (matched.password !== enteredPw) {
        if (btn)  btn.disabled       = false;
        if (txt)  txt.style.opacity  = '1';
        if (spin) spin.style.display = 'none';
        if (err) { err.style.display = 'flex'; err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Incorrect password.'; }
        return;
      }

      var user = { email: matched.email, firstName: matched.firstName || matched.email.split('@')[0], lastName: matched.lastName || '', role: 'REG_OFFICER' };
      _applyUserToUI(user);

      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('app').style.display = 'flex';

      _loadDashboard();
      _loadAnalytics();
      _loadAlerts();
      _loadPendingApprovals();
      setTimeout(initCharts, 200);
      setTimeout(_loadRegCertsFromAPI, 500);

      if (typeof _buildRegOrgSidebar === 'function') setTimeout(_buildRegOrgSidebar, 300);
      if (typeof _loadDynamicRegSubmissions === 'function') setTimeout(function(){ _loadDynamicRegSubmissions(window._regOrg||''); }, 500);

      EcoService.toast('Welcome, ' + user.firstName + '!');
    };

    /* Apply org filter + dynamic submissions + approved/rejected lists in one call */
    function _applyOrgFilter() {
      var org = window._regOrg;
      if (!org) return;
      if (typeof _filterRegByOrg === 'function')            _filterRegByOrg(org);
      if (typeof _loadDynamicRegSubmissions === 'function') setTimeout(function () { _loadDynamicRegSubmissions(org); }, 200);
      if (typeof _regLoadApprovedRejected === 'function')   setTimeout(function () { _regLoadApprovedRejected(org); }, 300);
    }

    /* ================================================
       LOGOUT
    ================================================ */
    window.regLogout = function () {
      EcoService.Auth.logout().finally(function () {
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        var btn  = document.getElementById('regBtn')    || document.getElementById('loginBtn');
        var txt  = document.getElementById('regBtnTxt') || document.getElementById('loginBtnTxt');
        var spin = document.getElementById('regSpin')   || document.getElementById('loginSpinner');
        if (btn)  btn.disabled       = false;
        if (txt)  txt.style.opacity  = '1';
        if (spin) spin.style.display = 'none';
        var el = document.getElementById('rEmail') || document.getElementById('lEmail'); if (el) el.value = '';
        el = document.getElementById('rPw') || document.getElementById('lPw'); if (el) el.value = '';
      });
    };

    /* ================================================
       APPLY USER DATA -> TOPBAR
    ================================================ */
    function _applyUserToUI(user) {
      var name     = user ? ((user.firstName || '') + ' ' + (user.lastName || '')).trim() : 'Regulatory Officer';
      var initials = name.split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase() || 'RO';
      var av  = document.getElementById('userAv');
      var lbl = document.getElementById('userLabel');
      var sub = document.getElementById('welcomeSub');
      if (av)  av.textContent  = initials;
      if (lbl) lbl.textContent = name;
      if (sub) {
        var auth = window._regAuth || (user && user.authorityName) || '';
        sub.textContent = 'Welcome back' + (auth ? ' - ' + auth : '');
      }
    }

    /* ================================================
       DASHBOARD STATS
    ================================================ */
    function _loadDashboard() {
      EcoService.Regulatory.getDashboard()
        .then(function (res) {
          var d = (res && res.data) ? res.data : {};
          _set('statPending',   d.pendingCount    || d.pending       || 0);
          _set('statApproved',  d.approvedCount   || d.approved      || 0);
          _set('statCerts',     d.certCount       || d.certificates  || 0);
          _set('statNotices',   d.noticeCount     || d.notices       || 0);
          _set('statInspect',   d.inspectionCount || d.inspections   || 0);
          _set('statOrgs',      d.orgCount        || d.organizations || 0);

          /* Sidebar badge by ID */
          var sbRP = document.getElementById('sbRegPending');
          if (sbRP && d.pendingCount != null) sbRP.textContent = d.pendingCount;
        })
        .catch(function () { /* keep static defaults */ });
    }

    /* ================================================
       PENDING APPROVALS -- replace static table rows
    ================================================ */
    function _loadPendingApprovals() {
      return EcoService.Regulatory.getPendingApprovals({ limit: 20 })
        .then(function (res) {
          var reports = (res && res.data && res.data.reports) ? res.data.reports
                      : (res && res.data && Array.isArray(res.data)) ? res.data : [];

          /* Update pending count badge */
          var pcBadge = document.getElementById('regPendingCountBadge');
          if (pcBadge) pcBadge.textContent = reports.length + ' pending';

          if (!reports.length) return;

          var tbody = document.querySelector('#sec-pending table tbody') ||
                      document.querySelector('[id*="pending"] table tbody');
          if (!tbody) return;

          tbody.innerHTML = reports.map(function (r) {
            var org    = (r.organization && r.organization.name) || '-';
            var date   = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '-';
            var type   = _humanType(r.reportType || r.type);
            var rnum   = r.reportNumber || r.id.substring(0, 8).toUpperCase();
            var labBy  = (r.labReviewedBy && (r.labReviewedBy.firstName + ' ' + (r.labReviewedBy.lastName || ''))) || '-';
            return '<tr>' +
              '<td><b>' + rnum + '</b></td>' +
              '<td>' + org + '</td>' +
              '<td>' + type + '</td>' +
              '<td>' + labBy + '</td>' +
              '<td>' + date + '</td>' +
              '<td><span class="chip c-info"><span class="cdot"></span>Awaiting Approval</span></td>' +
              '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
                '<button class="btn b-vw" onclick="regViewReport(\'' + r.id + '\')"><i class="fas fa-eye"></i> View</button>' +
                '<button class="btn b-app" onclick="regAct(\'approve\',\'' + r.id + '\')"><i class="fas fa-check-double"></i> Approve</button>' +
                '<button class="btn b-rej" onclick="regAct(\'reject\',\'' + r.id + '\')"><i class="fas fa-times"></i> Reject</button>' +
                '<button class="btn b-cert" onclick="regAct(\'certificate\',\'' + r.id + '\')"><i class="fas fa-certificate"></i> Issue Cert</button>' +
                '<button class="btn b-nte" onclick="regAct(\'notice\',\'' + r.id + '\')"><i class="fas fa-exclamation"></i> Notice</button>' +
                '<button class="btn b-ins" onclick="regAct(\'inspection\',\'' + r.id + '\')"><i class="fas fa-search"></i> Inspect</button>' +
              '</td>' +
              '</tr>';
          }).join('');
        })
        .catch(function () { /* keep static defaults */ });
    }

    /* ================================================
       ANALYTICS -- update chart data globals
    ================================================ */
    function _loadAnalytics() {
      EcoService.Regulatory.getAnalytics()
        .then(function (res) {
          var d = (res && res.data) ? res.data : {};
          window.regAnalytics = d;
          if (typeof d.complianceRate === 'number') {
            _set('statCompliance', d.complianceRate.toFixed(1) + '%');
          }
          if (typeof refreshRegCharts === 'function') refreshRegCharts(d);
        })
        .catch(function () { /* keep static defaults */ });
    }

    /* ================================================
       MONITORING DATA  (assigned orgs, read-only)
    ================================================ */
    function _loadMonitoringData(params) {
      var typeEl = document.getElementById('monTypeFilter');
      var query  = params || {};
      if (typeEl && typeEl.value) query.monitoringType = typeEl.value;

      var tbody = document.getElementById('monTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

      EcoService.Regulatory.getMonitoring(query)
        .then(function (res) {
          var records    = (res && res.data && Array.isArray(res.data.records)) ? res.data.records
                         : (res && Array.isArray(res.data)) ? res.data : [];
          var pagination = (res && res.data && res.data.pagination) ? res.data.pagination : {};
          var total      = pagination.total !== undefined ? pagination.total : records.length;

          var compliant = 0, nonCompliant = 0, marginal = 0;
          records.forEach(function (r) {
            var s = r.complianceStatus;
            if (s === 'COMPLIANT' || s === 'NORMAL') compliant++;
            else if (s === 'NON_COMPLIANT')          nonCompliant++;
            else if (s === 'MARGINAL')               marginal++;
          });

          _set('monTotal',        total);
          _set('monCompliant',    compliant);
          _set('monNonCompliant', nonCompliant);
          _set('monMarginal',     marginal);

          /* Update alerts sidebar badge */
          var badge = document.getElementById('alertBadge');
          if (badge) {
            var cnt = nonCompliant + marginal;
            badge.textContent     = cnt;
            badge.style.display   = cnt > 0 ? '' : 'none';
          }

          if (!tbody) return;
          /* Always inject org's locally-saved monitoring rows first */
          _injectLocalMonitoring(tbody, records.length > 0);
          if (!records.length) { return; }

          tbody.innerHTML = records.map(function (r) {
            var orgName  = (r.organization && r.organization.name) || '-';
            var location = (r.organization)
              ? [r.organization.city, r.organization.state].filter(Boolean).join(', ') || '-'
              : '-';
            var station  = r.station ? (r.station.name || r.station.stationCode || '-') : '-';
            var type     = _humanMonType(r.monitoringType);
            var date     = r.recordingDate
              ? new Date(r.recordingDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
              : '-';
            var params2  = r.parameters || {};
            var pKeys    = Object.keys(params2).slice(0, 2);
            var paramStr = pKeys.map(function (k) {
              var p = params2[k];
              var v = (p && p.value !== undefined) ? p.value : p;
              var u = (p && p.unit) ? ' ' + p.unit : '';
              return k.replace(/_/g, ' ') + ': ' + v + u;
            }).join(' | ') || '-';

            return '<tr>' +
              '<td><div style="font-weight:700">' + orgName + '</div></td>' +
              '<td><small style="color:#475569">' + location + '</small></td>' +
              '<td>' + type + '</td>' +
              '<td><small>' + station + '</small></td>' +
              '<td>' + date + '</td>' +
              '<td>' + _complianceChip(r.complianceStatus) + '</td>' +
              '<td><small style="color:#475569;max-width:180px;display:block">' + paramStr + '</small></td>' +
              '</tr>';
          }).join('');
          /* Re-apply org filter after fresh data loads */
          if (window._regOrg && typeof _filterRegByOrg === 'function') {
            setTimeout(function(){ _filterRegByOrg(window._regOrg); }, 50);
          }
        })
        .catch(function () {
          if (tbody) { tbody.innerHTML = ''; _injectLocalMonitoring(tbody, false); }
        });
    }

    /* ── Inject monitoring data from eco_monitoring_shared (org portal saves here) ── */
    function _injectLocalMonitoring(tbody, hasApiRows) {
      if (!tbody) return;
      var org = window._regOrg || '';
      if (!org) return;
      var shared = {};
      try { shared = JSON.parse(localStorage.getItem('eco_monitoring_shared') || '{}'); } catch(e) {}
      var key2 = org.toLowerCase().split(/\s+/).slice(0,2).join(' ');
      /* Find best matching org key */
      var matchKey = Object.keys(shared).find(function(k){ return k.toLowerCase().split(/\s+/).slice(0,2).join(' ') === key2; });
      if (!matchKey) return;
      var data = shared[matchKey];
      if (!data || !data.monitoring) return;
      var mon = data.monitoring;
      var savedDate = data.savedAt ? new Date(data.savedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Recent';

      /* Remove previously injected local rows */
      tbody.querySelectorAll('._local-mon').forEach(function(r){ r.remove(); });

      var rows = [];
      var paramMap = {
        air:      {label:'Air Quality',      params: [{k:'pm25',u:'µg/m³',limit:60,label:'PM2.5'},{k:'pm10',u:'µg/m³',limit:100,label:'PM10'},{k:'co2',u:'ppm',limit:1000,label:'CO₂'}]},
        effluent: {label:'Effluent / Water',  params: [{k:'pH',u:'',limit:null,label:'pH'},{k:'bod',u:'mg/L',limit:30,label:'BOD'},{k:'tss',u:'mg/L',limit:100,label:'TSS'}]},
        waste:    {label:'Waste Management', params: [{k:'solid_tonnes',u:'t',limit:null,label:'Solid Waste'},{k:'recycled_pct',u:'%',limit:null,label:'Recycled %'},{k:'hazardous_kg',u:'kg',limit:null,label:'Hazardous'}]},
        energy:   {label:'Energy',           params: [{k:'electricity_kwh',u:'kWh',limit:null,label:'Electricity'},{k:'renewable_pct',u:'%',limit:null,label:'Renewable %'}]}
      };

      Object.keys(paramMap).forEach(function(type){
        var bucket = mon[type] || {};
        var meta = paramMap[type];
        var paramStrs = meta.params.map(function(p){
          var v = bucket[p.k];
          if(v===undefined||v===null||v==='')return null;
          return p.label+': '+v+(p.u?' '+p.u:'');
        }).filter(Boolean);
        if(!paramStrs.length) return;

        /* Determine compliance */
        var nonComp = meta.params.some(function(p){
          if(!p.limit) return false;
          var v = parseFloat(bucket[p.k]);
          return !isNaN(v) && v > p.limit;
        });
        var status = nonComp ? 'NON_COMPLIANT' : 'COMPLIANT';

        rows.push('<tr class="_local-mon" style="border-left:3px solid '+(nonComp?'#ef4444':'#10b981')+'">'
          +'<td><div style="font-weight:700">'+_regEscH(matchKey)+'</div><div style="font-size:.7rem;color:#7c3aed;margin-top:2px"><i class="fas fa-database" style="margin-right:3px"></i>Live Portal Data</div></td>'
          +'<td><small style="color:#475569">'+(data.industry||'—')+'</small></td>'
          +'<td>'+meta.label+'</td>'
          +'<td><small>Portal Monitor</small></td>'
          +'<td>'+savedDate+'</td>'
          +'<td>'+_complianceChip(status)+'</td>'
          +'<td><small style="color:#475569;max-width:180px;display:block">'+paramStrs.slice(0,2).join(' | ')+'</small></td>'
          +'</tr>');
      });

      if (rows.length) {
        if (!hasApiRows) tbody.innerHTML = '';
        rows.forEach(function(r){ tbody.insertAdjacentHTML('afterbegin', r); });
      }
    }

    /* ================================================
       ALERTS  (non-compliant / marginal records)
    ================================================ */
    function _loadAlerts() {
      var tbody = document.getElementById('alertsTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8"><i class="fas fa-spinner fa-spin"></i> Loading alerts...</td></tr>';

      EcoService.Regulatory.getAlerts({ limit: 50 })
        .then(function (res) {
          var records    = (res && res.data && Array.isArray(res.data.records)) ? res.data.records
                         : (res && Array.isArray(res.data)) ? res.data : [];
          var pagination = (res && res.data && res.data.pagination) ? res.data.pagination : {};
          var total      = pagination.total !== undefined ? pagination.total : records.length;

          var nonCompliant = 0, marginal = 0;
          records.forEach(function (r) {
            if (r.complianceStatus === 'NON_COMPLIANT') nonCompliant++;
            if (r.complianceStatus === 'MARGINAL')      marginal++;
          });

          _set('alertTotal',        total);
          _set('alertNonCompliant', nonCompliant);
          _set('alertMarginal',     marginal);

          var badge = document.getElementById('alertBadge');
          if (badge) {
            badge.textContent   = total;
            badge.style.display = total > 0 ? '' : 'none';
          }

          if (!tbody) return;
          if (!records.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#16a34a"><i class="fas fa-check-circle"></i> No active alerts — all assigned organizations are compliant</td></tr>';
            return;
          }

          tbody.innerHTML = records.map(function (r) {
            var orgName  = (r.organization && r.organization.name) || '-';
            var type     = _humanMonType(r.monitoringType);
            var date     = r.recordingDate
              ? new Date(r.recordingDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
              : '-';
            var params2  = r.parameters || {};
            var badKeys  = Object.keys(params2).filter(function (k) {
              var p = params2[k];
              return p && (p.status === 'NON_COMPLIANT' || p.status === 'MARGINAL');
            });
            if (!badKeys.length) badKeys = Object.keys(params2).slice(0, 2);
            var exceedStr = badKeys.map(function (k) {
              var p = params2[k];
              var v = (p && p.value !== undefined) ? p.value : p;
              var u = (p && p.unit) ? ' ' + p.unit : '';
              return k.replace(/_/g, ' ') + ': ' + v + u;
            }).join(' | ') || '-';

            var rId = r.id || '';
            return '<tr>' +
              '<td><div style="font-weight:700">' + orgName + '</div></td>' +
              '<td>' + type + '</td>' +
              '<td>' + date + '</td>' +
              '<td><small style="color:#dc2626;max-width:220px;display:block">' + exceedStr + '</small></td>' +
              '<td>' + _complianceChip(r.complianceStatus) + '</td>' +
              '<td style="display:flex;gap:5px;flex-wrap:wrap">' +
                '<button class="btn b-not" onclick="regAct(\'notice\',\'' + rId + '\')"><i class="fas fa-exclamation"></i> Notice</button>' +
                '<button class="btn b-ins" onclick="regAct(\'inspection\',\'' + rId + '\')"><i class="fas fa-search"></i> Inspect</button>' +
              '</td>' +
              '</tr>';
          }).join('');
        })
        .catch(function () {
          if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">No alert data available</td></tr>';
        });
    }

    /* ── Monitoring helpers ── */
    function _humanMonType(t) {
      var m = { AIR:'Air Quality', WATER:'Water Quality', NOISE:'Noise', SOIL:'Soil',
                TEMPERATURE:'Temperature', HUMIDITY:'Humidity', WASTE:'Waste', STACK_EMISSION:'Stack Emission' };
      return m[t] || t || '-';
    }

    function _complianceChip(s) {
      if (!s || s === 'COMPLIANT' || s === 'NORMAL')
        return '<span class="chip c-app"><span class="cdot"></span>Compliant</span>';
      if (s === 'NON_COMPLIANT')
        return '<span class="chip c-rej"><span class="cdot"></span>Non-Compliant</span>';
      if (s === 'MARGINAL')
        return '<span class="chip c-pend"><span class="cdot"></span>Marginal</span>';
      return '<span class="chip c-pend"><span class="cdot"></span>' + s + '</span>';
    }

    /* Expose so HTML onclick buttons can call them */
    window._filterMonitoring  = _loadMonitoringData;
    window._loadAlertsData    = _loadAlerts;

    /* ================================================
       ISSUED CERTIFICATES — load from DB
    ================================================ */
    function _loadRegCertsFromAPI() {
      var container = document.getElementById('regCertList');
      if (!container) return;

      container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8">'
        + '<i class="fas fa-spinner fa-spin" style="font-size:1.3rem;display:block;margin-bottom:8px"></i>'
        + '<div style="font-size:.84rem">Loading certificates…</div></div>';

      var orgF = (window._regOrg || '').trim().toLowerCase();

      function _filterByOrg(list) {
        if (!orgF) return list;
        return list.filter(function(r) {
          return ((r.organization && r.organization.name) || '').toLowerCase().indexOf(orgF) !== -1;
        });
      }

      /* Fetch both REG_APPROVED (pending issuance) and CERTIFIED (issued) in parallel */
      Promise.all([
        EcoService.Regulatory.getAllReports({ status: 'REG_APPROVED', limit: 50 }),
        EcoService.Regulatory.getAllReports({ status: 'CERTIFIED',    limit: 50 })
      ]).then(function(results) {
          var pending = _filterByOrg(
            (results[0] && results[0].data && results[0].data.reports) ? results[0].data.reports
            : (results[0] && results[0].data && Array.isArray(results[0].data)) ? results[0].data : []
          );
          var issued = _filterByOrg(
            (results[1] && results[1].data && results[1].data.reports) ? results[1].data.reports
            : (results[1] && results[1].data && Array.isArray(results[1].data)) ? results[1].data : []
          );

          if (!pending.length && !issued.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px 20px;background:#fffbeb;border:2px dashed #fcd34d;border-radius:14px">'
              + '<i class="fas fa-certificate" style="font-size:2.5rem;color:#d97706;display:block;margin-bottom:12px"></i>'
              + '<p style="font-weight:700;color:#1c1400;margin-bottom:6px">No Certificates Yet</p>'
              + '<p style="font-size:.84rem;color:#78716c">Approve a report from Pending Approvals, then issue a certificate here.</p>'
              + '</div>';
            return;
          }

          var html = '';

          /* ── Pending: REG_APPROVED reports awaiting cert issuance ── */
          if (pending.length) {
            html += '<div style="font-family:Poppins,sans-serif;font-size:.78rem;font-weight:800;color:#d97706;letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #fcd34d">'
              + '<i class="fas fa-clock" style="margin-right:6px"></i>Pending Certificate Issuance (' + pending.length + ')</div>';

            html += pending.map(function(r) {
              var rNum    = r.reportNumber || r.id.substring(0,8).toUpperCase();
              var orgName = (r.organization && r.organization.name) || '—';
              var rType   = (r.reportType || '').replace(/_/g,' ') || 'Compliance Report';
              var date    = r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—';
              return '<div style="background:#fff;border:2px solid #fcd34d;border-left:5px solid #d97706;border-radius:13px;padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
                + '<div style="width:42px;height:42px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
                +   '<i class="fas fa-file-check" style="color:#d97706;font-size:1.1rem"></i></div>'
                + '<div style="flex:1;min-width:0">'
                +   '<div style="font-family:Poppins,sans-serif;font-weight:800;font-size:.93rem;color:#1c1400">' + rNum + '</div>'
                +   '<div style="font-size:.78rem;color:#64748b;margin-top:2px">'
                +     '<span style="background:#7c3aed22;color:#7c3aed;padding:1px 6px;border-radius:4px;font-weight:700;font-size:.7rem;margin-right:6px">ORG</span>'
                +     rNum.replace(rNum,'') + orgName + ' · ' + rType + ' · Approved ' + date
                +   '</div>'
                + '</div>'
                + '<div style="display:flex;gap:8px;align-items:center">'
                +   '<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:20px;font-size:.72rem;font-weight:700">Awaiting Certificate</span>'
                +   '<button class="btn b-cert" onclick="_regDirectIssueCert(\'' + r.id + '\',\'' + _regEscA(rNum) + '\',\'' + _regEscA(orgName) + '\')" style="font-size:.78rem;padding:8px 16px"><i class="fas fa-certificate" style="margin-right:5px"></i>Issue Cert</button>'
                + '</div>'
                + '</div>';
            }).join('');
          }

          /* ── Issued: CERTIFIED reports with full cert cards ── */
          if (issued.length) {
            if (pending.length) {
              html += '<div style="font-family:Poppins,sans-serif;font-size:.78rem;font-weight:800;color:#16a34a;letter-spacing:.6px;text-transform:uppercase;margin:18px 0 10px;padding-bottom:6px;border-bottom:2px solid #bbf7d0">'
                + '<i class="fas fa-check-circle" style="margin-right:6px"></i>Issued Certificates (' + issued.length + ')</div>';
            }

            html += issued.map(function(r) {
              var cert     = r.certificate || {};
              var certNo   = cert.certificateNumber || '—';
              var orgName  = (r.organization && r.organization.name) || '—';
              var certType = (cert.certificateType || r.reportType || '').replace(/_/g,' ');
              var issued_d = cert.issuedDate
                ? new Date(cert.issuedDate).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})
                : new Date(r.certifiedAt || r.updatedAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});
              var expiry   = cert.expiryDate
                ? new Date(cert.expiryDate).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})
                : '—';
              var isValid  = cert.expiryDate ? new Date(cert.expiryDate) > new Date() : true;
              var rNum     = r.reportNumber || r.id.substring(0,8).toUpperCase();

              return '<div class="cert-card" style="margin-bottom:16px">'
                + '<div class="cert-top">'
                + '<img src="assets/logo.png" class="cert-logo" alt="EcoSphere" onerror="this.style.display=\'none\'">'
                + '<div class="cert-t">' + certType + ' Certificate</div>'
                + '<div class="cert-s">Issued by EcoSphere Regulatory Authority · Government Portal</div>'
                + '<div class="cert-seal">🏛️</div>'
                + '</div>'
                + '<div class="cert-body">'
                + '<div class="cert-stmp"><i class="fas fa-landmark"></i><span>Official Government Certificate · Digitally Signed · QR Verified</span></div>'
                + '<div class="cert-fields">'
                + '<div class="cfi"><div class="cfl">Certificate No.</div><div class="cfv">' + certNo + '</div></div>'
                + '<div class="cfi"><div class="cfl">Organization</div><div class="cfv">' + orgName + '</div></div>'
                + '<div class="cfi"><div class="cfl">Report Reference</div><div class="cfv">' + rNum + '</div></div>'
                + '<div class="cfi"><div class="cfl">Issue Date</div><div class="cfv">' + issued_d + '</div></div>'
                + '<div class="cfi"><div class="cfl">Valid Until</div><div class="cfv" style="color:' + (isValid ? '#16a34a' : '#dc2626') + ';font-weight:800">' + expiry + '</div></div>'
                + '<div class="cfi"><div class="cfl">Compliance Score</div><div class="cfv">' + (r.complianceScore ? r.complianceScore + '%' : '—') + '</div></div>'
                + '</div>'
                + '<div class="cert-qr">'
                + '<div class="qr-box"><svg width="48" height="48" viewBox="0 0 48 48" style="padding:5px"><rect width="48" height="48" fill="#1c1400"/><rect x="7" y="7" width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="1.5"/><rect x="10" y="10" width="8" height="8" fill="#fbbf24"/><rect x="27" y="7" width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="1.5"/><rect x="30" y="10" width="8" height="8" fill="#fbbf24"/><rect x="7" y="27" width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="1.5"/><rect x="10" y="30" width="8" height="8" fill="#fbbf24"/><rect x="27" y="27" width="4" height="4" fill="#fbbf24"/><rect x="35" y="27" width="4" height="4" fill="#fbbf24"/><rect x="31" y="33" width="4" height="4" fill="#fbbf24"/></svg></div>'
                + '<div class="qr-info"><h5>QR & Blockchain Verified</h5><p>Scan to verify on EcoSphere Public Portal</p><div class="qr-hash">Report: ' + rNum + '</div></div>'
                + '</div>'
                + '</div>'
                + '<div class="cert-actions">'
                + '<button class="cert-dl" onclick="orgDownloadCertReg(\'' + r.id + '\',\'' + certNo.replace(/\//g,'-') + '\')"><i class="fas fa-download"></i> Download</button>'
                + '<button class="cert-vf" onclick="toast(\'✅ ' + certNo + ' — Verified on EcoSphere Portal\')"><i class="fas fa-shield-check"></i> Verify</button>'
                + '</div>'
                + '</div>';
            }).join('');
          }

          container.innerHTML = html;
        })
        .catch(function(){
          container.innerHTML = '<div style="text-align:center;padding:30px;color:#dc2626">'
            + '<i class="fas fa-exclamation-circle"></i> Failed to load certificates. '
            + '<button class="btn b-bl" onclick="_loadRegCertsFromAPI()" style="margin-left:8px">Retry</button></div>';
        });
    }

    /* Download cert PDF via report endpoint */
    window.orgDownloadCertReg = function(reportId, filename) {
      if (typeof labDownloadPdf === 'function') { labDownloadPdf(reportId, filename); return; }
      var token = EcoService.TokenStore.getAccess();
      if (!token) { EcoService.error('Please log in to download'); return; }
      EcoService.toast('⏳ Generating certificate PDF…');
      fetch('/api/v1/reports/' + reportId + '/pdf', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token }
      }).then(function(r){ return r.blob(); })
        .then(function(blob){
          var url = URL.createObjectURL(blob);
          var a   = document.createElement('a');
          a.href  = url; a.download = (filename || reportId) + '.pdf';
          a.click(); URL.revokeObjectURL(url);
        })
        .catch(function(){ EcoService.error('Download failed'); });
    };

    /* Expose so reg-portal.html _regIssueCert callback can call it */
    window._loadRegCertsFromAPI = _loadRegCertsFromAPI;

    /* Override navTo to lazy-load monitoring/alerts on first visit */
    var _origNavTo = window.navTo;
    window.navTo = function (id, btn) {
      if (_origNavTo) _origNavTo(id, btn);
      if (id === 'pending')    _loadPendingApprovals();
      if (id === 'monitoring') _loadMonitoringData();
      if (id === 'alerts')     _loadAlerts();
      if (id === 'certs')      _loadRegCertsFromAPI();
    };

    /* ================================================
       VIEW REPORT (sets REG_UNDER_REVIEW auto)
    ================================================ */
    window.regViewReport = function (reportId) {
      var old = document.getElementById('regViewModal');
      if (old) old.remove();

      var modal = document.createElement('div');
      modal.id  = 'regViewModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(4,47,46,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:30px 12px;';
      modal.innerHTML = '<div style="background:#fff;border-radius:16px;padding:36px;max-width:820px;width:100%;text-align:center">' +
        '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#0d9488;margin-bottom:12px"></i>' +
        '<p style="color:#64748b">Loading report details…</p></div>';
      document.body.appendChild(modal);

      EcoService.Regulatory.getReport(reportId)
        .then(function (res) {
          var rpt = res && res.data && res.data.report;
          if (!rpt) throw new Error('Report not found');

          var orgName  = (rpt.organization && rpt.organization.name)  || '—';
          var rnum     = rpt.reportNumber || '—';
          var rtype    = _humanType(rpt.reportType || rpt.type);
          var statusLbl = (rpt.status || '').replace(/_/g,' ');

          var recRows = '';
          var allRecords = (rpt.monitoringRecords || []).map(function (rmr) { return rmr.monitoringRecord || rmr; });
          if (!allRecords.length) {
            recRows = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:16px">No monitoring records linked</td></tr>';
          } else {
            allRecords.forEach(function (rec) {
              var recType = (rec.monitoringType || '—').replace(/_/g,' ');
              var recDate = rec.recordingDate ? new Date(rec.recordingDate).toLocaleDateString('en-IN') : '—';
              var recStatus = rec.complianceStatus || '—';
              var sColor = recStatus === 'NON_COMPLIANT' ? '#dc2626' : recStatus === 'COMPLIANT' ? '#16a34a' : '#b45309';
              recRows += '<tr><td style="padding:8px 10px;font-weight:600;color:#0d9488">' + recType + '</td>' +
                '<td style="padding:8px 10px;color:#64748b">' + recDate + '</td>' +
                '<td style="padding:8px 10px;font-weight:600;color:' + sColor + '">' + recStatus + '</td>' +
                '<td style="padding:8px 10px;font-size:.78rem;color:#475569">' + Object.keys(rpt.parameters || {}).slice(0,2).join(', ') + '</td></tr>';
            });
          }

          modal.innerHTML = [
            '<div style="background:#fff;border-radius:16px;max-width:820px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.18);overflow:hidden">',
            '<div style="background:linear-gradient(135deg,#042f2e,#0d9488);padding:20px 24px;display:flex;align-items:center;justify-content:space-between">',
            '<div><div style="font-size:1.1rem;font-weight:700;color:#fff">' + rnum + '</div>',
            '<div style="font-size:.85rem;color:#99f6e4;margin-top:2px">' + rtype + ' · ' + orgName + '</div></div>',
            '<div style="display:flex;align-items:center;gap:12px">',
            '<span style="background:rgba(255,255,255,.2);color:#fff;font-size:.75rem;padding:3px 10px;border-radius:20px">' + statusLbl + '</span>',
            '<button onclick="document.getElementById(\'regViewModal\').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer"><i class="fas fa-times"></i></button>',
            '</div></div>',
            '<div style="padding:22px 24px">',
            (rpt.aiSummary ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:#0d9488;margin-bottom:6px"><i class="fas fa-robot"></i> AI Analysis</div><div style="font-size:.86rem;color:#374151">' + rpt.aiSummary + '</div></div>' : ''),
            '<div style="font-size:.9rem;font-weight:700;color:#0d9488;margin-bottom:8px"><i class="fas fa-clipboard-list"></i> Monitoring Records (' + allRecords.length + ')</div>',
            '<div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px">',
            '<table style="width:100%;border-collapse:collapse;font-size:.85rem">',
            '<thead><tr style="background:#f0fdf4"><th style="padding:10px;text-align:left;color:#0d9488;font-size:.78rem">TYPE</th><th style="padding:10px;text-align:left;color:#0d9488;font-size:.78rem">DATE</th><th style="padding:10px;text-align:left;color:#0d9488;font-size:.78rem">STATUS</th><th style="padding:10px;text-align:left;color:#0d9488;font-size:.78rem">PARAMS</th></tr></thead>',
            '<tbody>' + recRows + '</tbody></table></div>',
            '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">',
            '<button onclick="document.getElementById(\'regViewModal\').remove();regAct(\'reject\',\'' + rpt.id + '\')" style="padding:9px 18px;border-radius:9px;background:#fff5f5;color:#dc2626;border:1.5px solid #fca5a5;cursor:pointer;font-size:.88rem;font-weight:600"><i class="fas fa-times"></i> Reject</button>',
            '<button onclick="document.getElementById(\'regViewModal\').remove();regAct(\'approve\',\'' + rpt.id + '\')" style="padding:9px 22px;border-radius:9px;background:#16a34a;color:#fff;border:none;cursor:pointer;font-size:.88rem;font-weight:700"><i class="fas fa-check-double"></i> Approve</button>',
            '</div></div></div>'
          ].join('');

          modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
          /* Refresh pending list so chip updates to REG_UNDER_REVIEW */
          _loadPendingApprovals();
        })
        .catch(function (err) {
          var m = document.getElementById('regViewModal');
          if (m) m.remove();
          EcoService.error(err.message || 'Failed to load report');
        });
    };

    /* ================================================
       REGULATORY ACTIONS
    ================================================ */

    /**
     * regAct(type, reportId)
     * Called from generated table rows: regAct('approve', id)
     * OR from static HTML panel buttons: regAct('approve')   (legacy)
     */
    window.regAct = function (type, reportId) {
      var id = reportId || _activeReportId;
      if (!id) {
        /* Graceful legacy fallback - no real ID available */
        var msgs = {
          approve:     'Report approved by Regulatory Authority',
          certificate: 'Environmental Clearance Certificate issued',
          cert:        'Compliance Certificate issued',
          notice:      'Show Cause Notice issued to organization',
          inspect:     'Inspection scheduled successfully',
          inspection:  'Inspection scheduled successfully',
          reject:      'Report rejected - organization and laboratory notified'
        };
        EcoService.toast(msgs[type] || 'Action complete');
        return;
      }
      _activeReportId = id;

      var notes = '';
      if (type === 'notice' || type === 'inspection' || type === 'inspect' || type === 'reject') {
        notes = window.prompt(
          type === 'notice'     ? 'Enter notice reason / violation details (required):' :
          type === 'reject'     ? 'Enter rejection reason (required):'
                                : 'Enter inspection date and scope (required):'
        );
        if (notes === null) return;
        if (!notes.trim()) { EcoService.error('Details are required for ' + type); return; }
      }

      /* Map legacy type aliases to canonical names */
      var canonical = { cert: 'certificate', inspect: 'inspection' };
      var actionType = canonical[type] || type;

      var apiCall;
      if (actionType === 'approve')     apiCall = EcoService.Regulatory.approve(id, notes);
      if (actionType === 'reject')      apiCall = EcoService.Regulatory.reject(id, notes);
      if (actionType === 'certificate') apiCall = EcoService.Regulatory.issueCertificate(id, notes);
      if (actionType === 'notice')      apiCall = EcoService.Regulatory.issueNotice(id, notes);
      if (actionType === 'inspection')  apiCall = EcoService.Regulatory.scheduleInspection(id, notes);

      if (!apiCall) {
        EcoService.error('Unknown action: ' + type);
        return;
      }

      EcoService.toast('Processing...');
      apiCall
        .then(function () {
          var msgs = {
            approve:     'Report approved by Regulatory Authority',
            reject:      'Report rejected — organization notified',
            certificate: 'Environmental Clearance Certificate issued successfully',
            notice:      'Show Cause Notice issued to organization',
            inspection:  'Inspection scheduled - notification sent to organization'
          };
          EcoService.toast(msgs[actionType] || 'Action complete');
          _loadDashboard();
          _loadPendingApprovals();
          _loadAnalytics();

          if (actionType === 'approve') {
            /* Refresh both Approved Reports and Issue Certificates sections */
            _regLoadApprovedRejected(window._regOrg || '');
            if (typeof window._loadRegCertsFromAPI === 'function') window._loadRegCertsFromAPI();
            /* Navigate to Approved Reports so user sees the approved report */
            setTimeout(function () { navTo('approved', null); }, 600);
          }
          if (actionType === 'reject') {
            _regLoadApprovedRejected(window._regOrg || '');
          }
        })
        .catch(function (err) {
          EcoService.error(err.message || 'Action failed');
        });
    };

    /* ================================================
       SESSION EXPIRED
    ================================================ */
    window.addEventListener('eco:session_expired', function () {
      EcoService.error('Session expired - please log in again.');
      setTimeout(window.regLogout, 1500);
    });

    /* ================================================
       HELPERS
    ================================================ */
    function _set(id, val) {
      if (val === null || val === undefined) return;
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    function _humanType(apiType) {
      var map = {
        ENVIRONMENTAL_MONITORING: 'Environmental Monitoring',
        ESG_REPORT:               'ESG Report',
        CARBON_EMISSION:          'Carbon Report',
        SUSTAINABILITY:           'Sustainability',
        ISO14001_COMPLIANCE:      'ISO 14001',
        EIA_REPORT:               'EIA Report',
        WATER_AUDIT:              'Water Audit',
        ENERGY_AUDIT:             'Energy Audit',
        WASTE_AUDIT:              'Waste Audit',
        ANNUAL_ENVIRONMENTAL:     'Annual Environmental'
      };
      return map[apiType] || apiType || '-';
    }

  }); /* end whenReady */

})(window);
