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

  /* ── If opened from file:// or wrong origin, redirect to the server ── */
  (function checkOrigin() {
    var proto = window.location.protocol;
    var host  = window.location.hostname;
    var port  = window.location.port;
    if (proto === 'file:' || (host === 'localhost' && port !== '5000') || (host !== 'localhost' && host !== '127.0.0.1')) {
      fetch('http://localhost:5000/health')
        .then(function() { window.location.href = 'http://localhost:5000/reg-portal.html'; })
        .catch(function() {
          var w = document.getElementById('serverWarnMsg');
          if (w) w.style.display = 'flex';
        });
    }
  })();

  document.addEventListener('DOMContentLoaded', function() {
    fetch('/health', { method: 'GET' })
      .then(function(r) { if (!r.ok) throw new Error('bad'); })
      .catch(function() {
        var w = document.getElementById('serverWarnMsg');
        if (w) w.style.display = 'flex';
      });
  });

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

      EcoService.Auth.login(emailEl.value.trim(), pwEl.value)
        .then(function (res) {
          var user = res.data.user;
          _applyUserToUI(user);

          document.getElementById('loginPage').style.display = 'none';
          document.getElementById('app').style.display = 'flex';

          _loadDashboard();
          _loadAnalytics();
          _loadAlerts();
          _loadPendingApprovals();
          setTimeout(initCharts, 200);

          /* Build org sidebar from registered orgs */
          if (typeof _buildRegOrgSidebar === 'function') setTimeout(_buildRegOrgSidebar, 300);
          if (typeof _loadDynamicRegSubmissions === 'function') setTimeout(function(){ _loadDynamicRegSubmissions(window._regOrg||''); }, 500);

          EcoService.toast('Welcome, ' + (user.firstName || 'Officer') + '!');
        })
        .catch(function (e) {
          if (btn)  btn.disabled       = false;
          if (txt)  txt.style.opacity  = '1';
          if (spin) spin.style.display = 'none';
          if (err) {
            err.style.display = 'flex';
            err.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + (e.message || 'Invalid credentials');
          }
        });
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
            var type   = _humanType(r.type);
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
                '<button class="btn b-app" onclick="regAct(\'approve\',\'' + r.id + '\')"><i class="fas fa-check-double"></i> Approve</button>' +
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

    /* Override navTo to lazy-load monitoring/alerts on first visit */
    var _origNavTo = window.navTo;
    window.navTo = function (id, btn) {
      if (_origNavTo) _origNavTo(id, btn);
      if (id === 'monitoring') _loadMonitoringData();
      if (id === 'alerts')     _loadAlerts();
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
      if (type === 'notice' || type === 'inspection' || type === 'inspect') {
        notes = window.prompt(
          type === 'notice'
            ? 'Enter notice reason / violation details (required):'
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
            certificate: 'Environmental Clearance Certificate issued successfully',
            notice:      'Show Cause Notice issued to organization',
            inspection:  'Inspection scheduled - notification sent to organization'
          };
          EcoService.toast(msgs[actionType] || 'Action complete');
          _loadDashboard();
          _loadPendingApprovals();
          _loadAnalytics();
          if (actionType === 'approve' || actionType === 'certificate') {
            setTimeout(function () { navTo('certs', null); }, 800);
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
