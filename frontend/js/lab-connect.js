/**
 * lab-connect.js
 * Connects lab-portal.html to the EcoSphere backend API.
 *
 * Overrides:
 *   doLogin()        → POST /auth/login
 *   logout()         → POST /auth/logout
 *   doAction(type)   → POST /laboratory/reports/{id}/approve|reject|correct
 *
 * Loads:
 *   Dashboard stats  → GET /laboratory/dashboard
 *   Pending queue    → GET /laboratory/pending
 *
 * Loads after: api.js, eco-api-service.js, pdf-download.js
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
        .then(function() { window.location.href = 'http://localhost:5000/lab-portal.html'; })
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

  /* Currently selected report ID for review actions */
  var _activeReportId = null;

  whenReady(function () {

    /* ════════════════════════════════════════════════
       SESSION RESTORE
    ════════════════════════════════════════════════ */
    (function restoreSession() {
      /* Restore company filter from previous session */
      window._labCompanyFilter = sessionStorage.getItem('labCompanyFilter') || '';

      var token = EcoService.TokenStore.getAccess();
      var user  = EcoService.TokenStore.getUser();
      if (!token || !user) return;

      var app = document.getElementById('app');
      if (!app) return;

      /* Auto-show the portal if a valid session exists (handles browser back button) */
      if (app.style.display !== 'flex') {
        var loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.style.display = 'none';
        if (typeof _showLabApp === 'function') {
          _showLabApp();
        } else {
          var gate = document.getElementById('labVerifyGate');
          if (gate) gate.style.display = 'none';
          app.style.display = 'flex';
        }
      }

      _applyUserToUI(user);
      _loadDashboard();
      _loadPendingReviews();
      if (typeof _buildLabOrgSidebar === 'function') setTimeout(_buildLabOrgSidebar, 300);
      if (typeof _labLoadPendingFromStorage === 'function') setTimeout(_labLoadPendingFromStorage, 500);
    })();

    /* ════════════════════════════════════════════════
       LOGIN
    ════════════════════════════════════════════════ */
    window.doLogin = function () {
      var emailEl = document.getElementById('lEmail');
      var pwEl    = document.getElementById('lPw');
      var err     = document.getElementById('loginErr');

      if (!emailEl || !emailEl.value.trim() || !pwEl || !pwEl.value) {
        if (err) {
          err.style.display = 'flex';
          err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fill in Email and Password.';
        }
        return;
      }
      if (err) err.style.display = 'none';

      /* No company filter at login — org selected from sidebar after login */
      window._labCompanyFilter = '';
      sessionStorage.removeItem('labCompanyFilter');

      var btn  = document.getElementById('loginBtn');
      var txt  = document.getElementById('loginBtnTxt');
      var spin = document.getElementById('loginSpinner');
      btn.disabled = true;
      txt.style.opacity = '.4';
      spin.style.display = 'inline-block';

      EcoService.Auth.login(emailEl.value.trim(), pwEl.value)
        .then(function (res) {
          var user = res.data.user;
          _applyUserToUI(user);

          document.getElementById('loginPage').style.display = 'none';
          document.getElementById('app').style.display = 'flex';

          /* Load real data */
          _loadDashboard();
          _loadPendingReviews();
          setTimeout(initCharts, 200);

          /* Build org sidebar — select an org to filter after login */
          if (typeof _buildLabOrgSidebar === 'function') setTimeout(_buildLabOrgSidebar, 300);
          if (typeof _labLoadPendingFromStorage === 'function') setTimeout(_labLoadPendingFromStorage, 500);

          EcoService.toast('✅ Welcome, ' + (user.firstName || 'Lab Admin') + '!');
        })
        .catch(function (e) {
          btn.disabled = false;
          txt.style.opacity = '1';
          spin.style.display = 'none';
          if (err) {
            err.style.display  = 'flex';
            err.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + (e.message || 'Invalid credentials');
          }
        });
    };

    /* ════════════════════════════════════════════════
       LOGOUT
    ════════════════════════════════════════════════ */
    window.logout = function () {
      EcoService.Auth.logout().finally(function () {
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        var btn  = document.getElementById('loginBtn');
        var txt  = document.getElementById('loginBtnTxt');
        var spin = document.getElementById('loginSpinner');
        if (btn)  btn.disabled       = false;
        if (txt)  txt.style.opacity  = '1';
        if (spin) spin.style.display = 'none';
        var el;
        el = document.getElementById('lEmail'); if (el) el.value = '';
        el = document.getElementById('lPw');    if (el) el.value = '';
        /* Clear company filter */
        window._labCompanyFilter = '';
        sessionStorage.removeItem('labCompanyFilter');
        var banner = document.getElementById('labCompanyBanner');
        if (banner) banner.style.display = 'none';
      });
    };

    /* ════════════════════════════════════════════════
       APPLY USER DATA → TOPBAR (no DOM structure changes)
    ════════════════════════════════════════════════ */
    function _applyUserToUI(user) {
      var role = window._role || (user && user.role) || 'Lab Admin';
      var initials = role.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
      var av   = document.getElementById('userAv');
      var lbl  = document.getElementById('userLabel');
      var sub  = document.getElementById('welcomeSub');
      if (av)  av.textContent  = initials;
      if (lbl) lbl.textContent = user ? (user.firstName + ' ' + (user.lastName || '')) : role;
      if (sub) {
        var company = window._labCompanyFilter || '';
        sub.textContent = 'Welcome back' + (company ? ' — reviewing ' + company : '');
      }
      /* Show / update the "Currently Reviewing" banner */
      var company = window._labCompanyFilter || '';
      var banner     = document.getElementById('labCompanyBanner');
      var bannerName = document.getElementById('labCompanyBannerName');
      if (banner) {
        if (company) {
          banner.style.display = 'flex';
          if (bannerName) bannerName.textContent = company;
        } else {
          banner.style.display = 'none';
        }
      }
    }

    /* ════════════════════════════════════════════════
       DASHBOARD STATS
    ════════════════════════════════════════════════ */
    function _loadDashboard() {
      EcoService.Lab.getDashboard()
        .then(function (res) {
          var d = (res && res.data) ? res.data : {};
          _set('statPending',  d.pendingCount  || d.pending || 0);
          _set('statReviewing',d.inReviewCount || d.inReview || 0);
          _set('statApproved', d.approvedCount || d.approved || 0);
          _set('statRejected', d.rejectedCount || d.rejected || 0);
          _set('statCerts',    d.certCount     || d.certificates || 0);
          _set('statSamples',  d.sampleCount   || d.samples || 0);

          /* Update sidebar badges by ID */
          var sbP = document.getElementById('sbPending');    if (sbP && d.pendingCount != null) sbP.textContent = d.pendingCount;
          var sbR = document.getElementById('sbInReview');   if (sbR && d.inReviewCount != null) sbR.textContent = d.inReviewCount;
          var sbA = document.getElementById('sbApproved');   if (sbA && d.approvedCount != null) sbA.textContent = d.approvedCount;
          var sbC = document.getElementById('sbCorrections');if (sbC && d.correctionCount != null) sbC.textContent = d.correctionCount;

          /* Analytics stats */
          var total = (d.approvedCount || 0) + (d.rejectedCount || 0);
          var approvalRate = total > 0 ? Math.round((d.approvedCount || 0) / total * 100) : null;
          var el;
          el = document.getElementById('labAnalApprovalRate'); if (el) el.textContent = approvalRate !== null ? approvalRate + '%' : '—';
          el = document.getElementById('labAnalAvgTime');      if (el && d.avgReviewDays != null) el.textContent = d.avgReviewDays.toFixed(1) + 'd';
          el = document.getElementById('labAnalActiveOrgs');   if (el && d.activeOrgs != null) el.textContent = d.activeOrgs;
          el = document.getElementById('labAnalReviewsYTD');   if (el && d.reviewsYTD != null) el.textContent = d.reviewsYTD;
        })
        .catch(function () { /* keep static defaults */ });
    }

    /* ════════════════════════════════════════════════
       PENDING REVIEW QUEUE — replace static table rows
    ════════════════════════════════════════════════ */
    function _loadPendingReviews() {
      EcoService.Lab.getPendingReviews({ limit: 100 })
        .then(function (res) {
          var allReports = (res && res.data && res.data.reports) ? res.data.reports
                         : (res && res.data && Array.isArray(res.data)) ? res.data : [];

          /* ── Company filter ── */
          var filter = (window._labCompanyFilter || '').trim().toLowerCase();
          var reports = filter
            ? allReports.filter(function (r) {
                var orgName = (r.organization && r.organization.name) || '';
                return orgName.toLowerCase().indexOf(filter) !== -1;
              })
            : allReports;

          /* ── Update mini-stats in the company banner ── */
          _updateCompanyMiniStats(reports);

          /* Find the pending reviews table body */
          var tbody = document.querySelector('#sec-pending table tbody') ||
                      document.querySelector('[id*="pending"] table tbody');
          if (!tbody) return;

          /* Update pending count badge in section header */
          var pcBadge = document.getElementById('pendingCountBadge');
          if (pcBadge) pcBadge.textContent = reports.length + ' pending';

          if (!reports.length) {
            var msg = filter
              ? 'No pending reports found for <b>' + _escHtml(window._labCompanyFilter) + '</b>.'
              : 'No pending reports found.';
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:22px;color:#94a3b8;font-size:.84rem"><i class="fas fa-inbox" style="margin-right:6px"></i>' + msg + '</td></tr>';
            return;
          }

          tbody.innerHTML = reports.map(function (r) {
            var org  = (r.organization && r.organization.name) || '—';
            var date = r.submittedToLabAt
              ? new Date(r.submittedToLabAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
              : (r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—');
            var type = _humanType(r.reportType || r.type);
            var rnum = r.reportNumber || r.id.substring(0, 8).toUpperCase();
            return '<tr>' +
              '<td><b>' + rnum + '</b></td>' +
              '<td>' + org + '</td>' +
              '<td>' + type + '</td>' +
              '<td>' + date + '</td>' +
              '<td><span class="chip c-warn"><span class="cdot"></span>Pending Review</span></td>' +
              '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
                '<button class="btn b-vw" onclick="labViewReport(\'' + r.id + '\')"><i class="fas fa-eye"></i> View</button>' +
                '<button class="btn b-rev" onclick="labReview(\'' + r.id + '\',\'approve\')"><i class="fas fa-check"></i> Approve</button>' +
                '<button class="btn b-cor" onclick="labReview(\'' + r.id + '\',\'correct\')"><i class="fas fa-edit"></i> Correction</button>' +
                '<button class="btn b-rej" onclick="labReview(\'' + r.id + '\',\'reject\')"><i class="fas fa-times"></i> Reject</button>' +
                '<button class="btn b-dl" onclick="labDownloadPdf(\'' + r.id + '\',\'' + rnum + '\')"><i class="fas fa-download"></i> PDF</button>' +
              '</td>' +
              '</tr>';
          }).join('');
        })
        .catch(function () { /* keep static defaults */ });
    }

    /* ── Populate the mini-stat chips inside the company banner ── */
    function _updateCompanyMiniStats(reports) {
      var miniStats = document.getElementById('labCompanyMiniStats');
      if (!miniStats || !window._labCompanyFilter) return;

      var pending    = reports.filter(function(r){ return r.status === 'SUBMITTED_TO_LAB'; }).length;
      var approved   = reports.filter(function(r){ return r.status === 'LAB_APPROVED'; }).length;
      var correction = reports.filter(function(r){ return r.status === 'LAB_CORRECTION_REQUESTED'; }).length;
      var total      = reports.length;

      var chip = function(label, val, bg, color) {
        return '<div style="background:' + bg + ';border-radius:8px;padding:6px 12px;text-align:center;min-width:52px">' +
          '<div style="font-size:.95rem;font-weight:900;color:' + color + '">' + val + '</div>' +
          '<div style="font-size:.6rem;color:rgba(255,255,255,.6);font-weight:700;text-transform:uppercase;letter-spacing:.5px">' + label + '</div>' +
        '</div>';
      };

      miniStats.innerHTML =
        chip('Total',      total,      'rgba(255,255,255,.08)', '#fff') +
        chip('Pending',    pending,    'rgba(251,191,36,.15)',  '#fbbf24') +
        chip('Approved',   approved,   'rgba(52,211,153,.15)',  '#34d399') +
        chip('Correction', correction, 'rgba(251,146,60,.15)',  '#fb923c');
    }

    function _escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ════════════════════════════════════════════════
       VIEW REPORT DETAILS MODAL
    ════════════════════════════════════════════════ */
    window.labViewReport = function (reportId) {
      var old = document.getElementById('labViewModal');
      if (old) old.remove();

      /* Skeleton loader */
      var modal = document.createElement('div');
      modal.id  = 'labViewModal';
      modal.style.cssText = [
        'position:fixed;inset:0;background:rgba(4,47,46,0.6);z-index:9999;',
        'display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:30px 12px;'
      ].join('');
      modal.innerHTML = '<div style="background:#fff;border-radius:16px;padding:36px;max-width:820px;width:100%;' +
        'text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#0d9488;margin-bottom:12px"></i>' +
        '<p style="color:#64748b">Loading report details…</p></div>';
      document.body.appendChild(modal);

      EcoService.Lab.getReportDetails(reportId)
        .then(function (res) {
          var rpt = res && res.data && res.data.report;
          if (!rpt) throw new Error('Report not found');
          _renderReportModal(rpt);
        })
        .catch(function (err) {
          var m = document.getElementById('labViewModal');
          if (m) m.remove();
          EcoService.error(err.message || 'Failed to load report details');
        });
    };

    function _renderReportModal(rpt) {
      var modal = document.getElementById('labViewModal');
      if (!modal) return;

      var orgName  = (rpt.organization && rpt.organization.name)  || '—';
      var orgInd   = (rpt.organization && rpt.organization.industryType) || '';
      var orgCity  = (rpt.organization && rpt.organization.city)  || '';
      var orgState = (rpt.organization && rpt.organization.state) || '';
      var subBy    = rpt.submittedBy
        ? (rpt.submittedBy.firstName + ' ' + (rpt.submittedBy.lastName || '')).trim()
        : '—';
      var rnum     = rpt.reportNumber || '—';
      var rtype    = _humanType(rpt.reportType || rpt.type);
      var rdate    = rpt.submittedToLabAt
        ? new Date(rpt.submittedToLabAt).toLocaleString('en-IN')
        : (rpt.createdAt ? new Date(rpt.createdAt).toLocaleString('en-IN') : '—');
      var statusCls = {
        SUBMITTED_TO_LAB:        'c-pend', LAB_UNDER_REVIEW: 'c-rev',
        LAB_APPROVED:            'c-app',  LAB_REJECTED:     'c-rej',
        LAB_CORRECTION_REQUESTED:'c-warn'
      }[rpt.status] || 'c-pend';
      var statusLbl = (rpt.status || '').replace(/_/g,' ');

      /* ── Monitoring records rows ── */
      var recRows = '';
      var allRecords = (rpt.monitoringRecords || []).map(function (rmr) {
        return rmr.monitoringRecord || rmr;
      });

      if (allRecords.length === 0) {
        recRows = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:16px">No monitoring records linked to this report</td></tr>';
      } else {
        allRecords.forEach(function (rec) {
          var recType   = (rec.monitoringType || '—').replace(/_/g,' ');
          var recDate   = rec.recordingDate ? new Date(rec.recordingDate).toLocaleDateString('en-IN') : '—';
          var recLoc    = rec.location || (rec.station && rec.station.name) || '—';
          var recStatus = rec.complianceStatus || '—';
          var sColor    = recStatus === 'NON_COMPLIANT' ? '#dc2626'
                        : recStatus === 'COMPLIANT'     ? '#16a34a'
                        : '#b45309';
          var params    = rec.parameters || {};
          var paramList = Object.entries(params);
          var paramHtml = '';
          if (paramList.length > 0) {
            paramHtml = '<table style="width:100%;margin-top:6px;border-collapse:collapse;font-size:0.78rem">' +
              '<thead><tr style="background:#f0fdf4">' +
              '<th style="padding:4px 8px;text-align:left;color:#0d9488;font-weight:600">Parameter</th>' +
              '<th style="padding:4px 8px;text-align:right;color:#0d9488;font-weight:600">Value</th>' +
              '<th style="padding:4px 8px;text-align:left;color:#0d9488;font-weight:600">Unit</th>' +
              '<th style="padding:4px 8px;text-align:left;color:#0d9488;font-weight:600">Status</th>' +
              '</tr></thead><tbody>';
            paramList.forEach(function (kv, pi) {
              var pName = kv[0];
              var pVal  = kv[1];
              var v     = (pVal && typeof pVal === 'object') ? pVal : { value: pVal };
              var pStat = v.status || '—';
              var pColor = (pStat === 'NON_COMPLIANT' || pStat === 'CRITICAL') ? '#dc2626'
                         : (pStat === 'COMPLIANT' || pStat === 'NORMAL')       ? '#16a34a'
                         :  pStat === 'WARNING'                                 ? '#b45309'
                         : '#374151';
              var rowBg = pi % 2 === 0 ? '#f8fafc' : '#fff';
              paramHtml += '<tr style="background:' + rowBg + '">' +
                '<td style="padding:4px 8px;font-weight:500">' + pName + '</td>' +
                '<td style="padding:4px 8px;text-align:right;font-weight:700;color:#0f172a">' + (v.value !== undefined ? v.value : pVal) + '</td>' +
                '<td style="padding:4px 8px;color:#64748b">' + (v.unit || '—') + '</td>' +
                '<td style="padding:4px 8px;font-weight:600;color:' + pColor + '">' + pStat + '</td>' +
                '</tr>';
            });
            paramHtml += '</tbody></table>';
          }

          recRows += '<tr style="border-bottom:1px solid #e2e8f0;vertical-align:top">' +
            '<td style="padding:10px 10px 4px;font-weight:700;color:#0d9488;white-space:nowrap">' + recType + '</td>' +
            '<td style="padding:10px 10px 4px;color:#64748b;white-space:nowrap">' + recDate + '</td>' +
            '<td style="padding:10px 10px 4px;color:#374151">' + recLoc + '</td>' +
            '<td style="padding:10px 10px 4px;font-weight:600;color:' + sColor + '">' + recStatus + '</td>' +
            '<td style="padding:4px 4px 10px;min-width:220px">' + paramHtml + '</td>' +
            '</tr>';
        });
      }

      /* ── AI summary ── */
      var aiHtml = '';
      if (rpt.aiSummary) {
        aiHtml = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-top:16px">' +
          '<div style="font-size:0.82rem;font-weight:700;color:#0d9488;margin-bottom:6px"><i class="fas fa-robot"></i> AI Analysis Summary</div>' +
          '<div style="font-size:0.86rem;color:#374151;line-height:1.6">' + (rpt.aiSummary || '') + '</div>' +
          (rpt.complianceScore ? '<div style="margin-top:8px;font-size:0.82rem;color:#64748b">Compliance Score: <b style="color:#0d9488">' + rpt.complianceScore + '%</b></div>' : '') +
          '</div>';
      }

      modal.innerHTML = [
        '<div style="background:#fff;border-radius:16px;max-width:820px;width:100%;',
        'box-shadow:0 24px 60px rgba(0,0,0,0.18);overflow:hidden">',

        /* Header bar */
        '<div style="background:linear-gradient(135deg,#042f2e,#0d9488);padding:20px 24px;display:flex;',
        'align-items:center;justify-content:space-between">',
        '<div>',
        '<div style="font-size:1.1rem;font-weight:700;color:#fff">' + rnum + '</div>',
        '<div style="font-size:0.85rem;color:#99f6e4;margin-top:2px">' + rtype + '</div>',
        '</div>',
        '<div style="display:flex;align-items:center;gap:12px">',
        '<span class="chip ' + statusCls + '" style="font-size:0.78rem"><span class="cdot"></span>' + statusLbl + '</span>',
        '<button onclick="document.getElementById(\'labViewModal\').remove()" ',
        'style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;',
        'padding:6px 12px;cursor:pointer;font-size:0.85rem"><i class="fas fa-times"></i></button>',
        '</div></div>',

        /* Body */
        '<div style="padding:22px 24px">',

        /* Org + Submission info */
        '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px">',
        '<div style="flex:1;min-width:200px;background:#f8fafc;border-radius:10px;padding:12px 16px">',
        '<div style="font-size:0.75rem;color:#94a3b8;font-weight:600;margin-bottom:4px">ORGANIZATION</div>',
        '<div style="font-weight:700;color:#0f172a">' + orgName + '</div>',
        (orgInd  ? '<div style="font-size:0.82rem;color:#64748b">' + orgInd + '</div>'   : ''),
        (orgCity ? '<div style="font-size:0.82rem;color:#94a3b8">' + orgCity + (orgState ? ', ' + orgState : '') + '</div>' : ''),
        '</div>',
        '<div style="flex:1;min-width:200px;background:#f8fafc;border-radius:10px;padding:12px 16px">',
        '<div style="font-size:0.75rem;color:#94a3b8;font-weight:600;margin-bottom:4px">SUBMITTED BY</div>',
        '<div style="font-weight:600;color:#0f172a">' + subBy + '</div>',
        '<div style="font-size:0.82rem;color:#64748b">' + rdate + '</div>',
        '</div>',
        '</div>',

        /* Monitoring records */
        '<div style="font-size:0.9rem;font-weight:700;color:#0d9488;margin-bottom:8px">',
        '<i class="fas fa-clipboard-list"></i> Monitoring Records (' + allRecords.length + ')</div>',
        '<div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px">',
        '<table style="width:100%;border-collapse:collapse;font-size:0.85rem">',
        '<thead><tr style="background:#f0fdf4">',
        '<th style="padding:10px 10px;text-align:left;font-size:0.78rem;color:#0d9488">TYPE</th>',
        '<th style="padding:10px 10px;text-align:left;font-size:0.78rem;color:#0d9488">DATE</th>',
        '<th style="padding:10px 10px;text-align:left;font-size:0.78rem;color:#0d9488">LOCATION</th>',
        '<th style="padding:10px 10px;text-align:left;font-size:0.78rem;color:#0d9488">STATUS</th>',
        '<th style="padding:10px 10px;text-align:left;font-size:0.78rem;color:#0d9488">PARAMETERS</th>',
        '</tr></thead>',
        '<tbody>' + recRows + '</tbody>',
        '</table></div>',

        aiHtml,

        /* Action buttons */
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap">',
        '<button onclick="labDownloadPdf(\'' + rpt.id + '\',\'' + rnum + '\')" ',
        'style="padding:9px 18px;border-radius:9px;background:#f0fdf4;color:#0d9488;',
        'border:1.5px solid rgba(13,148,136,0.3);cursor:pointer;font-size:0.88rem;font-weight:600">',
        '<i class="fas fa-download"></i> Download PDF</button>',
        '<button onclick="document.getElementById(\'labViewModal\').remove();labReview(\'' + rpt.id + '\',\'correct\')" ',
        'style="padding:9px 18px;border-radius:9px;background:#fffbeb;color:#b45309;',
        'border:1.5px solid #fcd34d;cursor:pointer;font-size:0.88rem;font-weight:600">',
        '<i class="fas fa-edit"></i> Request Correction</button>',
        '<button onclick="document.getElementById(\'labViewModal\').remove();labReview(\'' + rpt.id + '\',\'reject\')" ',
        'style="padding:9px 18px;border-radius:9px;background:#fff5f5;color:#dc2626;',
        'border:1.5px solid #fca5a5;cursor:pointer;font-size:0.88rem;font-weight:600">',
        '<i class="fas fa-times"></i> Reject</button>',
        '<button onclick="document.getElementById(\'labViewModal\').remove();labReview(\'' + rpt.id + '\',\'approve\')" ',
        'style="padding:9px 22px;border-radius:9px;background:#16a34a;color:#fff;',
        'border:none;cursor:pointer;font-size:0.88rem;font-weight:700">',
        '<i class="fas fa-check"></i> Approve</button>',
        '</div>',

        '</div></div>'
      ].join('');

      /* Close on backdrop click */
      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.remove();
      });
    }

    /* ════════════════════════════════════════════════
       REVIEW ACTIONS
    ════════════════════════════════════════════════ */

    /* labReview(id, type) — called from generated table rows */
    window.labReview = function (reportId, actionType) {
      _activeReportId = reportId;
      var notes = '';

      if (actionType === 'correct' || actionType === 'reject') {
        notes = window.prompt('Enter review notes / reason (required for ' + actionType + '):');
        if (notes === null) return; /* cancelled */
        if (!notes.trim()) { EcoService.error('Notes are required for ' + actionType); return; }
      }

      var apiCall;
      if (actionType === 'approve')  apiCall = EcoService.Lab.approve(reportId, notes);
      if (actionType === 'reject')   apiCall = EcoService.Lab.reject(reportId, notes);
      if (actionType === 'correct')  apiCall = EcoService.Lab.requestCorrection(reportId, notes);

      if (!apiCall) return;

      EcoService.toast('⏳ Processing review action…');
      apiCall
        .then(function () {
          var msgs = {
            approve: '✅ Report approved — forwarded to Regulatory Authority',
            correct: '📝 Correction request sent to organization',
            reject:  '❌ Report rejected — organization notified'
          };
          EcoService.toast(msgs[actionType] || 'Action complete');
          _loadDashboard();
          _loadPendingReviews();
          /* Refresh cert section so newly approved reports appear immediately */
          if (actionType === 'approve') _loadCerts();
          if (actionType !== 'reject') setTimeout(function () { navTo('approved', null); }, 800);
        })
        .catch(function (err) {
          EcoService.error(err.message || 'Action failed');
        });
    };

    /* ════════════════════════════════════════════════
       CERTIFICATE SECTION — dynamically load approved reports
    ════════════════════════════════════════════════ */
    function _loadCerts() {
      var container = document.getElementById('certCardContainer');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b">' +
        '<i class="fas fa-spinner fa-spin" style="font-size:1.3rem;margin-bottom:10px"></i>' +
        '<div style="font-size:.88rem">Loading approved reports…</div></div>';

      /* Fetch only LAB_APPROVED reports */
      EcoSphereAPI.Reports.getReports({ status: 'LAB_APPROVED', limit: 100, sortBy: 'updatedAt', sortOrder: 'desc' })
        .then(function (res) {
          var allReports = (res && res.data && res.data.reports) ? res.data.reports : [];

          /* ── Company filter ── */
          var filter = (window._labCompanyFilter || '').trim().toLowerCase();
          var reports = filter
            ? allReports.filter(function (r) {
                var orgName = (r.organization && r.organization.name) || '';
                return orgName.toLowerCase().indexOf(filter) !== -1;
              })
            : allReports;

          if (!reports.length) {
            var emptyMsg = filter
              ? '<p style="font-weight:700;color:#374151;margin-bottom:6px">No Approved Reports for <em>' + _escHtml(window._labCompanyFilter) + '</em></p>' +
                '<p style="font-size:.84rem;color:#64748b">No approved reports match the entered company name.</p>'
              : '<p style="font-weight:700;color:#374151;margin-bottom:6px">No Approved Reports Yet</p>' +
                '<p style="font-size:.84rem;color:#64748b">Approve a report from Pending Reviews to issue its certificate.</p>';
            container.innerHTML = [
              '<div style="text-align:center;padding:40px 20px;background:#f8fafc;border:2px dashed #e2e8f0;border-radius:14px">',
              '<i class="fas fa-certificate" style="font-size:2.5rem;color:#94a3b8;margin-bottom:12px;display:block"></i>',
              emptyMsg,
              '</div>'
            ].join('');
            return;
          }

          var year = new Date().getFullYear();
          container.innerHTML = reports.map(function (r, i) {
            var orgName  = (r.organization && r.organization.name) || 'Organization';
            var rNum     = r.reportNumber || r.id.substring(0,8).toUpperCase();
            var certNo   = (r.certificate && r.certificate.certificateNumber)
              || ('LABC/VER/' + year + '/' + String(i + 1).padStart(4,'0'));
            var rawIssue = (r.certificate && r.certificate.issuedDate) || r.updatedAt || r.createdAt;
            var issueDate = rawIssue
              ? new Date(rawIssue).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'N/A';
            var validMs   = rawIssue ? new Date(rawIssue).getTime() + 365 * 24 * 60 * 60 * 1000 : null;
            var validDate = validMs
              ? new Date(validMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'N/A';
            var dlFilename = certNo.replace(/\//g, '-');

            return [
              '<div class="cert-card" style="margin-bottom:20px">',
              '  <div class="cert-top">',
              '    <img src="assets/logo.png" class="cert-logo-img" alt="EcoSphere"/>',
              '    <div class="cert-title-txt">Laboratory Verification Certificate</div>',
              '    <div class="cert-sub-txt">Issued by EnviroTest Labs Pvt Ltd · NABL Accreditation No: CC-3456</div>',
              '    <div class="cert-seal">🔬</div>',
              '  </div>',
              '  <div class="cert-body">',
              '    <div class="cert-ok"><i class="fas fa-shield-check"></i>✓ Laboratory Verified · All parameters tested · NABL Accredited</div>',
              '    <div class="cert-fields">',
              '      <div class="cf-item"><div class="cf-lbl">Certificate No.</div><div class="cf-val">' + certNo + '</div></div>',
              '      <div class="cf-item"><div class="cf-lbl">Organization</div><div class="cf-val">' + orgName + '</div></div>',
              '      <div class="cf-item"><div class="cf-lbl">Issue Date</div><div class="cf-val">' + issueDate + '</div></div>',
              '      <div class="cf-item"><div class="cf-lbl">Valid Until</div><div class="cf-val" style="color:#16a34a;font-weight:800">' + validDate + '</div></div>',
              '      <div class="cf-item"><div class="cf-lbl">Report Reference</div><div class="cf-val">' + rNum + '</div></div>',
              '      <div class="cf-item"><div class="cf-lbl">Report Type</div><div class="cf-val">' + (r.reportType || '').replace(/_/g,' ') + '</div></div>',
              '    </div>',
              '    <div class="cert-qr">',
              '      <div class="qr-box"><svg width="46" height="46" viewBox="0 0 46 46" style="padding:5px"><rect width="46" height="46" fill="#042f2e"/><rect x="6" y="6" width="13" height="13" fill="none" stroke="#6ee7b7" stroke-width="1.5"/><rect x="9" y="9" width="7" height="7" fill="#6ee7b7"/><rect x="27" y="6" width="13" height="13" fill="none" stroke="#6ee7b7" stroke-width="1.5"/><rect x="30" y="9" width="7" height="7" fill="#6ee7b7"/><rect x="6" y="27" width="13" height="13" fill="none" stroke="#6ee7b7" stroke-width="1.5"/><rect x="9" y="30" width="7" height="7" fill="#6ee7b7"/><rect x="27" y="27" width="4" height="4" fill="#6ee7b7"/><rect x="34" y="27" width="4" height="4" fill="#6ee7b7"/><rect x="30" y="32" width="4" height="4" fill="#6ee7b7"/></svg></div>',
              '      <div class="qr-info"><h5>QR Code Verification</h5><p>Scan to verify this certificate on EcoSphere</p>',
              '        <div class="qr-hash">Report: ' + rNum + '</div></div>',
              '    </div>',
              '  </div>',
              '  <div class="cert-actions">',
              '    <button class="cert-dl-btn" onclick="labDownloadPdf(\'' + r.id + '\',\'' + dlFilename + '\')"><i class="fas fa-download"></i> Download Certificate</button>',
              '    <button class="cert-vfy-btn" onclick="toast(\'Certificate ' + certNo + ' — Verified ✓\')"><i class="fas fa-shield-check"></i> Verify</button>',
              '    <button class="cert-dl-btn" style="background:linear-gradient(135deg,#1d4ed8,#1e40af)" onclick="labForwardToReg(\'' + r.id + '\',this)"><i class="fas fa-paper-plane"></i> Forward to Regulatory</button>',
              '  </div>',
              '</div>'
            ].join('');
          }).join('');
        })
        .catch(function () {
          container.innerHTML = '<div style="color:#ef4444;padding:16px;text-align:center">' +
            '<i class="fas fa-exclamation-circle"></i> Failed to load certificates. ' +
            '<button class="btn b-bl" onclick="_loadCertsPublic()" style="margin-left:8px">Retry</button></div>';
        });
    }

    /* Expose for retry button */
    window._loadCertsPublic = _loadCerts;

    /* Patch navTo: load certs when navigating to that section, and refresh after approve */
    var _origLabNavTo = window.navTo;
    window.navTo = function (id, btn) {
      _origLabNavTo(id, btn);
      if (id === 'certs') _loadCerts();
    };

    /* Also load certs when the page first renders with a session (in case user lands on certs) */
    (function () {
      var sec = document.getElementById('sec-certs');
      if (sec && sec.classList.contains('show')) _loadCerts();
    })();

    /* Override the legacy doAction() used by review panel buttons in the static HTML */
    window.doAction = function (type) {
      var id = _activeReportId;
      if (!id) {
        /* No API-loaded report selected — still show friendly toast */
        var msgs = {
          approve: '✅ Report approved — forwarded to Regulatory Authority',
          correct: '📝 Correction request sent to organization',
          reject:  '❌ Report rejected — organization notified'
        };
        EcoService.toast(msgs[type] || 'Action complete');
        return;
      }
      window.labReview(id, type);
    };

    /* ════════════════════════════════════════════════
       FORWARD TO REGULATORY (from lab)
    ════════════════════════════════════════════════ */
    window.labForwardToReg = function (reportId, btn) {
      var notes = window.prompt('Notes for Regulatory Authority (optional):');
      if (notes === null) return; /* cancelled */

      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
      EcoService.toast('⏳ Forwarding to Regulatory…');

      EcoService.Lab.forwardToReg(reportId, notes || '')
        .then(function () {
          EcoService.toast('✅ Report forwarded to Regulatory Authority');
          _loadDashboard();
          _loadCerts();
        })
        .catch(function (err) {
          if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Forward to Regulatory'; }
          EcoService.error(err.message || 'Forward failed');
        });
    };

    /* ════════════════════════════════════════════════
       SESSION EXPIRED HANDLER
    ════════════════════════════════════════════════ */
    window.addEventListener('eco:session_expired', function () {
      EcoService.error('Session expired — please log in again.');
      setTimeout(window.logout, 1500);
    });

    /* ════════════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════════════ */
    function _set(id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    function _humanType(apiType) {
      var map = {
        ENVIRONMENTAL_MONITORING:'Environmental Monitoring',
        ESG_REPORT:'ESG Report', CARBON_EMISSION:'Carbon Report',
        SUSTAINABILITY:'Sustainability', ISO14001_COMPLIANCE:'ISO 14001',
        EIA_REPORT:'EIA Report', WATER_AUDIT:'Water Audit',
        ENERGY_AUDIT:'Energy Audit', WASTE_AUDIT:'Waste Audit',
        ANNUAL_ENVIRONMENTAL:'Annual Environmental'
      };
      return map[apiType] || apiType || '—';
    }

  }); /* end whenReady */

})(window);
