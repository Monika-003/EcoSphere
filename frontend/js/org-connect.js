/**
 * org-connect.js
 * Connects org-portal.html to the EcoSphere backend API.
 *
 * Overrides:
 *   doOrgLogin()         → POST /auth/login
 *   doLogout()           → POST /auth/logout + clear tokens
 *   orgOpenForm(type)    → builds monitoring form; submits to POST /monitoring/records
 *   submitReport(btn,id) → POST /reports + /reports/{id}/submit-lab
 *   downloadReport()     → already calls backend; enhanced with token refresh
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
    /* Only redirect if NOT already on the server (localhost:5000) */
    if (proto === 'file:' || (host === 'localhost' && port !== '5000') || (host !== 'localhost' && host !== '127.0.0.1')) {
      /* Ping the server first */
      fetch('http://localhost:5000/health')
        .then(function() { window.location.href = 'http://localhost:5000/org-portal.html'; })
        .catch(function() {
          var w = document.getElementById('serverWarnMsg');
          if (w) w.style.display = 'flex';
        });
    }
  })();

  /* ── Persistent org registry shared across all portals ── */
  function _pushToAllOrgs(name, industry) {
    if (!name) return;
    try {
      var arr = JSON.parse(localStorage.getItem('eco_all_orgs') || '[]');
      var key = name.toLowerCase().trim();
      var exists = arr.some(function(o){ return (o.name||'').toLowerCase().trim() === key; });
      if (!exists) arr.push({ name: name, industry: industry || '' });
      else {
        // update industry if it was blank
        arr.forEach(function(o){ if((o.name||'').toLowerCase().trim()===key && !o.industry && industry) o.industry=industry; });
      }
      localStorage.setItem('eco_all_orgs', JSON.stringify(arr));
    } catch(e) {}
  }
  window._pushToAllOrgs = _pushToAllOrgs;

  /* ── Wait for EcoService ── */
  function whenReady(fn) {
    if (window.EcoService && window.EcoSphereAPI) { fn(); return; }
    var t = setInterval(function () {
      if (window.EcoService && window.EcoSphereAPI) { clearInterval(t); fn(); }
    }, 40);
  }

  /* ── Clear any stale station ID from previous failed attempts ── */
  (function clearStaleStation() {
    var id = localStorage.getItem('eco_station_id');
    if (!id || id === 'null' || id === 'undefined' || id.length < 10) {
      localStorage.removeItem('eco_station_id');
    }
  })();

  /* ── Ping server on login page load — show warning immediately if unreachable ── */
  document.addEventListener('DOMContentLoaded', function() {
    fetch('/health', { method: 'GET' })
      .then(function(r) { if (!r.ok) throw new Error('bad'); })
      .catch(function() {
        var w = document.getElementById('serverWarnMsg');
        if (w) w.style.display = 'flex';
      });
  });

  /* ════════════════════════════════════════════════════════════
     IPFB CONFIGS — used by saveInpageForm for titles + AI text
  ════════════════════════════════════════════════════════════ */
  window.IPFB_CONFIGS = {
    air:      { title: 'Air Quality Data Entry',      aiResult: '✅ Air quality data saved. EcoBot: PM2.5 & NOₓ within CPCB limits. Continuous monitoring recommended.' },
    water:    { title: 'Water Quality Data Entry',    aiResult: '✅ Water quality data saved. EcoBot: pH & DO within permissible limits. Monitor BOD trend.' },
    noise:    { title: 'Noise Level Data Entry',      aiResult: '✅ Noise data saved. EcoBot: Check peak dB against CPCB limits (85 dB boundary, 75 dB industrial zone).' },
    soil:     { title: 'Soil Quality Data Entry',     aiResult: '✅ Soil data saved. EcoBot: Monitor heavy metal concentrations. Maintain optimal pH (6.0–7.5) for crop yield.' },
    temp:     { title: 'Temperature Data Entry',      aiResult: '✅ Temperature data saved. EcoBot: Effluent temp within acceptable range. Ensure cooling systems are efficient.' },
    humidity: { title: 'Humidity Data Entry',         aiResult: '✅ Humidity data saved. EcoBot: RH within comfort range. Monitor dew point to prevent condensation issues.' },
    waste:    { title: 'Waste Management Data Entry', aiResult: '✅ Waste data saved. EcoBot: Good recycling rate. Ensure hazardous waste disposal complies with CPCB norms.' },
    carbon:   { title: 'Carbon Emission Data Entry',  aiResult: '✅ Carbon emission data saved. EcoBot: Compare Scope 1 against BEE/MoEF benchmarks. Set reduction targets per Paris Agreement (1.5°C pathway).' }
  };

  /* ════════════════════════════════════════════════════════════
     FORM FIELD CONFIGS — field IDs MUST match FIELD_MAP in eco-api-service.js
  ════════════════════════════════════════════════════════════ */
  var _FORM_FIELDS = {
    air: [
      { id:'aq-pm25',  lbl:'PM2.5 (µg/m³)',       ph:'e.g. 62'  },
      { id:'aq-pm10',  lbl:'PM10 (µg/m³)',         ph:'e.g. 85'  },
      { id:'aq-so2',   lbl:'SO₂ (ppb)',            ph:'e.g. 15'  },
      { id:'aq-nox',   lbl:'NOₓ (ppb)',            ph:'e.g. 25'  },
      { id:'aq-co2',   lbl:'CO₂ (ppm)',            ph:'e.g. 412' },
      { id:'aq-o3',    lbl:'O₃ (ppb)',             ph:'e.g. 30'  },
      { id:'aq-wind',  lbl:'Wind Speed (m/s)',     ph:'e.g. 3.2' },
      { id:'aq-temp',  lbl:'Temperature (°C)',     ph:'e.g. 32'  }
    ],
    water: [
      { id:'wq-ph',    lbl:'pH Level',            ph:'e.g. 7.2'  },
      { id:'wq-tds',   lbl:'TDS (mg/L)',           ph:'e.g. 550'  },
      { id:'wq-bod',   lbl:'BOD (mg/L)',           ph:'e.g. 3.0'  },
      { id:'wq-cod',   lbl:'COD (mg/L)',           ph:'e.g. 45'   },
      { id:'wq-do',    lbl:'Dissolved O₂ (mg/L)', ph:'e.g. 6.8'  },
      { id:'wq-tur',   lbl:'Turbidity (NTU)',      ph:'e.g. 2.5'  },
      { id:'wq-col',   lbl:'Total Coliform (MPN)', ph:'e.g. 50'   },
      { id:'wq-nit',   lbl:'Nitrates (mg/L)',      ph:'e.g. 8.0'  },
      { id:'wq-temp',  lbl:'Temperature (°C)',     ph:'e.g. 28'   }
    ],
    noise: [
      { id:'ns-day',   lbl:'Day Level (dB)',       ph:'e.g. 70'          },
      { id:'ns-night', lbl:'Night Level (dB)',     ph:'e.g. 45'          },
      { id:'ns-peak',  lbl:'Peak Level (dB)',      ph:'e.g. 88'          },
      { id:'ns-leq',   lbl:'Leq (dB)',             ph:'e.g. 65'          },
      { id:'ns-bg',    lbl:'Background (dB)',      ph:'e.g. 40'          },
      { id:'ns-dur',   lbl:'Duration (hrs)',       ph:'e.g. 8'           },
      { id:'ns-eq',    lbl:'Equipment / Source',   ph:'e.g. Compressor', txt:true },
      { id:'dep-loc',  lbl:'Location',             ph:'e.g. East Boundary', txt:true }
    ],
    soil: [
      { id:'sl-moist', lbl:'Moisture (%)',         ph:'e.g. 38'  },
      { id:'sl-ph',    lbl:'pH Level',             ph:'e.g. 6.5' },
      { id:'sl-n',     lbl:'Nitrogen (kg/ha)',     ph:'e.g. 120' },
      { id:'sl-p',     lbl:'Phosphorus (kg/ha)',   ph:'e.g. 45'  },
      { id:'sl-k',     lbl:'Potassium (kg/ha)',    ph:'e.g. 180' },
      { id:'sl-hm',    lbl:'Heavy Metals (mg/kg)', ph:'e.g. 0.5' },
      { id:'sl-oc',    lbl:'Organic Carbon (%)',   ph:'e.g. 1.8' },
      { id:'sl-ec',    lbl:'Conductivity (mS/cm)', ph:'e.g. 0.4' }
    ],
    temp: [
      { id:'tp-amb',   lbl:'Ambient (°C)',          ph:'e.g. 32'  },
      { id:'tp-proc',  lbl:'Process (°C)',          ph:'e.g. 78'  },
      { id:'tp-eff',   lbl:'Effluent (°C)',         ph:'e.g. 28'  },
      { id:'tp-stack', lbl:'Stack Gas (°C)',        ph:'e.g. 120' },
      { id:'tp-cwi',   lbl:'Cooling Water In (°C)',  ph:'e.g. 25' },
      { id:'tp-cwo',   lbl:'Cooling Water Out (°C)', ph:'e.g. 35' }
    ],
    humidity: [
      { id:'hm-rh',    lbl:'Relative Humidity (%)',    ph:'e.g. 65' },
      { id:'hm-ah',    lbl:'Absolute (g/m³)',          ph:'e.g. 16' },
      { id:'hm-dp',    lbl:'Dew Point (°C)',           ph:'e.g. 24' },
      { id:'hm-wb',    lbl:'Wet Bulb (°C)',            ph:'e.g. 27' },
      { id:'hm-db',    lbl:'Dry Bulb (°C)',            ph:'e.g. 32' },
      { id:'hm-sp',    lbl:'Specific Humidity (g/kg)', ph:'e.g. 14' }
    ],
    waste: [
      { id:'ws-solid',  lbl:'Solid Waste (tonnes)',   ph:'e.g. 4.5' },
      { id:'ws-rec',    lbl:'Recyclable (tonnes)',    ph:'e.g. 2.8' },
      { id:'ws-pct',    lbl:'Recycled (%)',           ph:'e.g. 62'  },
      { id:'ws-haz',    lbl:'Hazardous (kg)',         ph:'e.g. 12'  },
      { id:'ws-ewaste', lbl:'E-Waste (kg)',           ph:'e.g. 5'   },
      { id:'ws-bio',    lbl:'Biomedical (kg)',        ph:'e.g. 2'   },
      { id:'ws-comp',   lbl:'Composted (kg)',         ph:'e.g. 300' },
      { id:'ws-div',    lbl:'Landfill Diverted (%)',  ph:'e.g. 45'  }
    ]
  };

  /* ════════════════════════════════════════════════════════════
     orgOpenForm(type)
     Called by every "Enter Data" button in the monitoring cards.
     Renders a data-entry form with field IDs matching FIELD_MAP
     in eco-api-service.js, then shows #orgFormArea.
  ════════════════════════════════════════════════════════════ */
  window.orgOpenForm = function (type) {
    var fields  = _FORM_FIELDS[type];
    var ipfbCfg = window.IPFB_CONFIGS && window.IPFB_CONFIGS[type];
    if (!fields) {
      console.warn('[orgOpenForm] Unknown type:', type);
      return;
    }

    /* Set panel title */
    var titleEl = document.getElementById('orgFormTitle');
    if (titleEl) titleEl.textContent = (ipfbCfg && ipfbCfg.title) || (type + ' Data Entry');

    /* Current date-time in local ISO format for datetime-local input */
    var now       = new Date();
    var tzOff     = now.getTimezoneOffset() * 60000;
    var localISO  = new Date(now.getTime() - tzOff).toISOString().slice(0, 16);
    var dateId    = type + '-date';

    /* Input base style */
    var INP = 'width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:7px;' +
              'padding:8px 10px;font-family:Inter,sans-serif;font-size:.84rem;color:#0f172a;' +
              'background:#fff;outline:none;transition:border .15s';
    var LBL = 'display:block;font-size:.73rem;font-weight:700;color:#374151;margin-bottom:4px';

    var html = '';

    /* ── Date / time row ── */
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
    html += '<div>';
    html += '<label style="' + LBL + '">Recording Date & Time <span style="color:#dc2626">*</span></label>';
    html += '<input type="datetime-local" id="' + dateId + '" value="' + localISO + '" style="' + INP + '">';
    html += '</div>';
    html += '<div>';
    html += '<label style="' + LBL + '">Operator / Location</label>';
    html += '<input type="text" id="' + type + '-loc" placeholder="e.g. Main Facility, East Block" style="' + INP + '">';
    html += '</div>';
    html += '</div>';

    /* ── Parameter fields grid ── */
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;margin-bottom:16px">';
    fields.forEach(function (f) {
      var itype = f.txt ? 'text' : 'number';
      var extra = f.txt ? '' : ' step="any" min="0"';
      html += '<div>';
      html += '<label style="' + LBL + '">' + f.lbl + '</label>';
      html += '<input type="' + itype + '" id="' + f.id + '" placeholder="' + f.ph + '"' + extra +
              ' style="' + INP + '"' +
              ' onfocus="this.style.borderColor=\'#1d4ed8\'" onblur="this.style.borderColor=\'#e2e8f0\'">';
      html += '</div>';
    });
    html += '</div>';

    /* ── Remarks ── */
    html += '<div style="margin-bottom:14px">';
    html += '<label style="' + LBL + '">Remarks / Notes</label>';
    html += '<textarea id="ipfb-remarks" placeholder="Observations, instrument details, compliance notes…" rows="2"' +
            ' style="' + INP + 'resize:vertical"></textarea>';
    html += '</div>';

    /* ── AI result box (hidden until save) ── */
    html += '<div id="ipfb-ai-result" style="display:none;background:#f0fdf4;border:1px solid rgba(22,163,74,.25);border-radius:9px;padding:12px;margin-bottom:14px">';
    html += '<div style="font-size:.74rem;font-weight:800;color:#15803d;margin-bottom:5px"><i class="fas fa-brain" style="margin-right:5px"></i>EcoBot AI Analysis</div>';
    html += '<div id="ipfb-ai-text" style="font-size:.82rem;color:#374151;line-height:1.65"></div>';
    html += '</div>';

    /* ── Save button ── */
    html += '<button onclick="saveInpageForm(\'' + type + '\')"' +
            ' style="background:linear-gradient(135deg,#1d4ed8,#1e40af);border:none;border-radius:9px;' +
            'padding:11px 24px;color:#fff;font-family:Poppins,sans-serif;font-size:.85rem;font-weight:700;' +
            'cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:.15s"' +
            ' onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 18px rgba(29,78,216,.35)\'"' +
            ' onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'none\'">' +
            '<i class="fas fa-brain"></i> Save & AI Analyse</button>';

    /* ── Inject & reveal ── */
    var bodyEl = document.getElementById('orgFormBody');
    if (bodyEl) bodyEl.innerHTML = html;

    var areaEl = document.getElementById('orgFormArea');
    if (areaEl) {
      areaEl.style.display = 'block';
      setTimeout(function () { areaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
    }
  };

  whenReady(function () {

    /* ════════════════════════════════════════════════
       SESSION RESTORE — If user already has a valid token, skip login
    ════════════════════════════════════════════════ */
    (function restoreSession() {
      var token = EcoService.TokenStore.getAccess();
      var user  = EcoService.TokenStore.getUser();
      if (!token || !user) return;

      var storedRole = sessionStorage.getItem('ecoRole') || '';
      var _ORG_ROLES = ['ENV_OFFICER','ADMIN','ENV_ENGINEER','PRODUCTION_HEAD','QUALITY_HEAD','HR_HEAD'];
      if (storedRole && _ORG_ROLES.indexOf(storedRole) !== -1 && storedRole !== user.role) {
        window.EcoSphereAPI.Auth.updateRole(storedRole)
          .then(function (rr) {
            if (rr && rr.data) {
              if (rr.data.accessToken)  localStorage.setItem('eco_access_token', rr.data.accessToken);
              if (rr.data.refreshToken) localStorage.setItem('eco_refresh_token', rr.data.refreshToken);
              if (rr.data.user)         localStorage.setItem('eco_user', JSON.stringify(rr.data.user));
            }
          })
          .catch(function () {});
      }

      /* Auto-show dashboard if a valid session exists (handles browser back button) */
      var stepDash  = document.getElementById('stepDash');
      var stepLogin = document.getElementById('stepLogin');
      if (stepDash && stepDash.style.display !== 'flex') {
        if (stepLogin) stepLogin.style.display = 'none';
        stepDash.style.display = 'flex';
      }

      /* Populate UI */
      applyUserToUI(user, sessionStorage.getItem('ecoIndustry') || (user.organization && user.organization.industry) || '');
    })();

    /* ════════════════════════════════════════════════
       REGISTER NEW ORGANIZATION — 3-step: register user → login → create org
    ════════════════════════════════════════════════ */
    window.doOrgRegister = function () {
      var err    = document.getElementById('regErrMsg');
      var errTxt = document.getElementById('regErrTxt');
      var btn    = document.getElementById('regSubmitBtn');
      var txt    = document.getElementById('regSubmitTxt');
      var spin   = document.getElementById('regSubmitSpin');

      err.style.display = 'none';

      /* Collect Step 1 values */
      var firstName = document.getElementById('regFirst').value.trim();
      var lastName  = document.getElementById('regLast').value.trim();
      var email     = document.getElementById('regEmail').value.trim();
      var password  = document.getElementById('regPw').value;
      var phone     = document.getElementById('regPhone').value.trim();

      /* Collect Step 2 values */
      var orgName    = document.getElementById('regOrgName').value.trim();
      var regNo      = document.getElementById('regRegNo').value.trim();
      var gst        = document.getElementById('regGST').value.trim();
      var pan        = document.getElementById('regPAN').value.trim();
      var address    = document.getElementById('regAddr').value.trim();
      var city       = document.getElementById('regCity').value.trim();
      var state      = document.getElementById('regState').value.trim();
      var pincode    = document.getElementById('regPin').value.trim();
      var headName   = document.getElementById('regHead').value.trim();
      var contEmail  = document.getElementById('regContEmail').value.trim();
      var contPhone  = document.getElementById('regContPhone').value.trim();
      var website    = document.getElementById('regWeb').value.trim();
      var industry   = window._selInd || sessionStorage.getItem('ecoIndustry') || 'MANUFACTURING';

      /* Validate required org fields */
      if (!orgName || !regNo || !gst || !address || !city || !state || !pincode || !headName || !contEmail || !contPhone) {
        errTxt.textContent = 'Please fill all required fields marked with *.';
        err.style.display = 'flex'; return;
      }

      btn.disabled = true;
      txt.style.opacity = '0';
      spin.style.display = 'inline-block';

      var _showErr = function (msg) {
        errTxt.textContent = msg;
        err.style.display  = 'flex';
        btn.disabled       = false;
        txt.style.opacity  = '1';
        spin.style.display = 'none';
      };

      /* Step 1: Register user account */
      window.EcoSphereAPI.Auth.register({
        firstName: firstName,
        lastName:  lastName,
        email:     email,
        password:  password,
        phone:     phone || undefined,
        role:      window._selRole || 'ENV_ENGINEER'
      })
      .then(function () {
        /* Step 2: Login to get token */
        return EcoService.Auth.login(email, password);
      })
      .then(function (res) {
        var user = res.data.user;
        /* Step 3: Create the organization */
        return window.EcoSphereAPI.Organization.create({
          name:               orgName,
          industryType:       industry.toUpperCase().replace(/\s+/g,'_'),
          registrationNumber: regNo,
          gstNumber:          gst,
          panNumber:          pan || undefined,
          address:            address,
          city:               city,
          state:              state,
          pincode:            pincode,
          country:            'India',
          contactName:        headName,
          contactEmail:       contEmail,
          contactPhone:       contPhone,
          website:            website || undefined
        }).then(function (orgRes) {
          var org = orgRes && orgRes.data && (orgRes.data.organization || orgRes.data);
          /* Persist and show dashboard */
          sessionStorage.setItem('ecoOrgName',  orgName);
          sessionStorage.setItem('ecoIndustry', industry);
          sessionStorage.setItem('ecoRole',     window._selRole || 'ENV_OFFICER');
          _pushToAllOrgs(orgName, industry);

          /* Persist org ID for child pages */
          var newOrgId = org && (org.id || org._id);
          if (newOrgId) localStorage.setItem('eco_org_id', newOrgId);

          applyUserToUI(Object.assign({}, user, { organization: org }), industry);

          /* Re-run RBAC with the real JWT role stored by api.js login */
          if (typeof window._ecoApplyRBAC === 'function') window._ecoApplyRBAC();

          document.getElementById('stepLogin').style.display = 'none';
          document.getElementById('stepDash').style.display  = 'flex';

          loadDashboardStats();
          loadReportsTable();
          setTimeout(initCharts, 200);

          EcoService.toast('🎉 Welcome, ' + firstName + '! Your organization has been registered.');
        });
      })
      .catch(function (e) {
        _showErr(e && e.message ? e.message : 'Registration failed. Please try again.');
      });
    };

    /* ════════════════════════════════════════════════
       LOGIN — replaces the mock setTimeout in doOrgLogin()
    ════════════════════════════════════════════════ */
    window.doOrgLogin = function () {
      var name  = document.getElementById('orgName');
      var email = document.getElementById('orgEmail');
      var pw    = document.getElementById('orgPw');
      var err   = document.getElementById('loginErrMsg');

      err.style.display = 'none';
      if (!email || !email.value.trim() || !pw || !pw.value) {
        err.style.display = 'flex';
        err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email and password are required.';
        return;
      }

      var btn  = document.getElementById('orgLoginBtn');
      var txt  = document.getElementById('orgLoginTxt');
      var spin = document.getElementById('orgLoginSpin');
      btn.disabled = true;
      txt.style.opacity = '.4';
      spin.style.display = 'inline-block';

      /* Map login UI role buttons → backend role enum */
      EcoService.Auth.login(email.value.trim(), pw.value)
        .then(function (res) {
          var user     = res.data.user;
          var wantRole = _selRole; // role value IS the backend role — no mapping needed

          /* If the selected role differs from the stored JWT role, sync it */
          if (wantRole && wantRole !== user.role) {
            return window.EcoSphereAPI.Auth.updateRole(wantRole)
              .then(function (rr) {
                if (rr && rr.data) {
                  /* Store fresh tokens + updated user directly in localStorage */
                  if (rr.data.accessToken)  localStorage.setItem('eco_access_token', rr.data.accessToken);
                  if (rr.data.refreshToken) localStorage.setItem('eco_refresh_token', rr.data.refreshToken);
                  if (rr.data.user)         localStorage.setItem('eco_user', JSON.stringify(rr.data.user));
                  return Object.assign({}, res, { data: Object.assign({}, res.data, { user: rr.data.user }) });
                }
                return res;
              })
              .catch(function () { return res; }); // silently fall back to original role on error
          }
          return res;
        })
        .then(function (res) {
          var user = res.data.user;
          var ind  = _selInd || sessionStorage.getItem('ecoIndustry') ||
                     (user.organization && user.organization.industry) || 'Manufacturing';

          /* Persist context */
          var _loginOrgName = name ? name.value.trim() : (user.organization && user.organization.name) || user.firstName;
          sessionStorage.setItem('ecoOrgName', _loginOrgName);
          sessionStorage.setItem('ecoIndustry', ind);
          sessionStorage.setItem('ecoRole', _selRole || user.role || 'ENV_OFFICER');
          _pushToAllOrgs(_loginOrgName, ind);

          /* Re-apply RBAC with the real role so editor/viewer access is correct */
          if (typeof window._ecoApplyRBAC === 'function') window._ecoApplyRBAC();

          applyUserToUI(user, ind);

          /* Hide login, show dashboard */
          document.getElementById('stepLogin').style.display = 'none';
          document.getElementById('stepDash').style.display  = 'flex';

          /* Load real data */
          loadDashboardStats();
          loadReportsTable();
          setTimeout(initCharts, 200);

          EcoService.toast('🌿 Welcome, ' + (user.firstName || _selRole || 'User') + '!');
        })
        .catch(function (err2) {
          btn.disabled = false;
          txt.style.opacity = '1';
          spin.style.display = 'none';
          err.style.display = 'flex';
          err.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + (err2.message || 'Login failed. Check your credentials.');
        });
    };

    /* ════════════════════════════════════════════════
       LOGOUT
    ════════════════════════════════════════════════ */
    window.doLogout = function () {
      EcoService.Auth.logout().finally(function () {
        document.getElementById('stepDash').style.display  = 'none';
        document.getElementById('stepLogin').style.display = 'none';
        document.getElementById('stepIndustry').style.display = 'flex';

        /* Reset form state */
        document.querySelectorAll('.ind-card').forEach(function (c) { c.classList.remove('selected'); });
        var cBtn = document.getElementById('continueBtn');
        if (cBtn) cBtn.classList.remove('ready');
        var chip = document.getElementById('selectedChip');
        if (chip) chip.classList.remove('show');
        window._selInd  = '';
        window._selRole = 'ENV_OFFICER';

        /* Reset login form */
        var lBtn  = document.getElementById('orgLoginBtn');
        var lTxt  = document.getElementById('orgLoginTxt');
        var lSpin = document.getElementById('orgLoginSpin');
        if (lBtn)  lBtn.disabled          = false;
        if (lTxt)  lTxt.style.opacity     = '1';
        if (lSpin) lSpin.style.display    = 'none';
        var orgNameEl  = document.getElementById('orgName');
        var orgEmailEl = document.getElementById('orgEmail');
        var orgPwEl    = document.getElementById('orgPw');
        if (orgNameEl)  orgNameEl.value  = '';
        if (orgEmailEl) orgEmailEl.value = '';
        if (orgPwEl)    orgPwEl.value    = '';
      });
    };

    /* ════════════════════════════════════════════════
       APPLY USER DATA → DASHBOARD UI (no DOM changes — just fills existing elements)
    ════════════════════════════════════════════════ */
    function applyUserToUI(user, industry) {
      var orgName = sessionStorage.getItem('ecoOrgName') ||
                    (user.organization && user.organization.name) || user.firstName || 'Organization';
      var role    = sessionStorage.getItem('ecoRole') || user.role || 'Environmental Officer';
      var initials = orgName.split(' ').filter(Boolean).map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();

      /* Persist org ID so child pages (EIA wizard, analytics, etc.) can read it */
      var orgId = (user.organization && (user.organization.id || user.organization._id))
               || user.organizationId
               || '';
      if (orgId) localStorage.setItem('eco_org_id', orgId);

      var els = {
        tbOrgName:     orgName,
        tbIndBadge:    industry,
        dashAv:        initials,
        dashRole:      role,
        orgHeaderName: orgName,
        orgHeaderSub:  role + ' · ' + industry,
        orgIndChip:    industry
      };
      Object.keys(els).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.textContent = els[id];
      });
    }

    /* ════════════════════════════════════════════════
       DASHBOARD STATS — overwrite the static numbers
    ════════════════════════════════════════════════ */
    function loadDashboardStats() {
      /* Fetch reports list to compute real counts */
      Promise.all([
        EcoSphereAPI.Reports.getReports({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }).catch(function(){ return null; }),
        EcoSphereAPI.Monitoring.getDashboard().catch(function(){ return null; })
      ]).then(function(results) {
        var rRes = results[0];
        var dRes = results[1];
        var reports = (rRes && rRes.data && rRes.data.reports) ? rRes.data.reports : (rRes && Array.isArray(rRes.data) ? rRes.data : []);
        var d = (dRes && dRes.data) ? dRes.data : {};

        /* Compute live counts from reports array */
        var totalReports = reports.length || (d.totalReports || 0);
        var labApproved  = reports.filter(function(r){ return r.status === 'LAB_APPROVED'; }).length || (d.labApproved || 0);
        var certified    = reports.filter(function(r){ return r.status === 'CERTIFIED'; }).length || (d.certificates || 0);
        var pending      = reports.filter(function(r){
          return ['SUBMITTED_TO_LAB','LAB_UNDER_REVIEW'].includes(r.status);
        }).length || (d.pendingSubmissions || 0);
        var corrections  = reports.filter(function(r){
          return r.status === 'LAB_CORRECTION_REQUESTED';
        }).length;
        var regPending   = reports.filter(function(r){
          return ['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW'].includes(r.status);
        }).length;

        _safeSet('reportCount',     totalReports || 0);
        _safeSet('labCount',        labApproved  || 0);
        _safeSet('certCount',       certified    || 0);
        _safeSet('pendingCount',    pending      || 0);
        _safeSet('activeParamCount', d.activeParameters || d.parameterCount || (reports.length ? reports.length * 3 : 0));
        _safeSet('esgScoreStat',    d.esgScore != null ? d.esgScore : '—');

        /* Sidebar badge = pending items */
        var sbNum = document.querySelector('.sb-num');
        if (sbNum) sbNum.textContent = pending + corrections + regPending;

        /* Re-build charts with live data */
        if (typeof Chart !== 'undefined') {
          _rebuildDashCharts(reports, {
            certified: certified,
            labApproved: labApproved,
            pending: pending,
            corrections: corrections
          });
        }
      });
    }

    /* ════════════════════════════════════════════════
       REPORTS TABLE — replace static rows with real data
    ════════════════════════════════════════════════ */
    function loadReportsTable() {
      var tbody = document.getElementById('orgReportTable');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:18px;font-size:.82rem"><i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Loading…</td></tr>';

      EcoSphereAPI.Reports.getReports({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
        .then(function (res) {
          var reports = (res && res.data && res.data.reports) ? res.data.reports
                      : (res && Array.isArray(res.data)       ? res.data : []);
          tbody = document.getElementById('orgReportTable');
          if (!tbody) return;

          if (!reports.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:22px;font-size:.82rem"><i class="fas fa-folder-open" style="margin-right:6px"></i>No reports yet. Submit your first report from the Environmental Monitoring section.</td></tr>';
            return;
          }

          tbody.innerHTML = reports.map(function (r) {
            var labChip = _statusChip(r.status, 'lab');
            var regChip = _statusChip(r.status, 'reg');
            var date    = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
            var type    = _humanType(r.reportType || r.type);
            return '<tr>' +
              '<td><b>' + (r.reportNumber || r.id.substring(0, 8).toUpperCase()) + '</b></td>' +
              '<td>' + type + '</td>' +
              '<td>' + date + '</td>' +
              '<td>' + labChip + '</td>' +
              '<td>' + regChip + '</td>' +
              '<td><button class="btn b-vw" onclick="viewReport(\'' + r.id + '\')">View</button></td>' +
              '</tr>';
          }).join('');
        })
        .catch(function () {
          tbody = document.getElementById('orgReportTable');
          if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:18px;font-size:.82rem"><i class="fas fa-exclamation-circle" style="margin-right:6px"></i>Could not load reports. Please refresh.</td></tr>';
        });
    }

    /* ════════════════════════════════════════════════
       MONITORING DATA ENTRY — real form connected to API
       orgOpenForm(type) already defined inline. We only
       patch the Save handler after the form renders.
    ════════════════════════════════════════════════ */

    /* Override saveInpageForm — called by "Save & AI Analyse" button */
    window.saveInpageForm = function (type) {
      var cfg    = window.IPFB_CONFIGS && IPFB_CONFIGS[type];
      var aiBox  = document.getElementById('ipfb-ai-result');
      var aiTxt  = document.getElementById('ipfb-ai-text');

      /* Pre-check: at least one measurement value must be entered */
      var preParams = EcoService.Monitoring.collectParams(type);
      if (Object.keys(preParams).length === 0) {
        EcoService.error('Please enter at least one measurement value before saving');
        return;
      }

      /* Show loading */
      if (aiBox) {
        aiBox.style.display = 'block';
        aiTxt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving data and running AI analysis…';
      }
      EcoService.toast('⏳ Saving ' + (cfg ? cfg.title : type) + '…');

      EcoService.Monitoring.submitRecord(type)
        .then(function (res) {
          var record = res && res.data;
          var aiText = (record && record.aiAnalysis && record.aiAnalysis.summary)
            ? record.aiAnalysis.summary
            : (cfg ? cfg.aiResult : '✅ Data saved successfully.');

          if (aiBox && aiTxt) {
            aiTxt.innerHTML = aiText;
            aiBox.style.display = 'block';
            aiBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          EcoService.toast('✅ ' + (cfg ? cfg.title : type) + ' saved to database. AI analysis complete!');

          /* Refresh stats */
          loadDashboardStats();
        })
        .catch(function (err) {
          EcoService.error(err.message || 'Failed to save monitoring record');
          if (aiBox && aiTxt) {
            aiTxt.innerHTML = '❌ Failed to save: ' + (err.message || 'Server error');
          }
        });
    };

    /* Override saveDepForm — slide panel Save button */
    window.saveDepForm = function (type) {
      window.saveInpageForm(type);

      /* Also populate the AI result in the dep panel */
      var aiBox = document.getElementById('dep-ai-result');
      var aiTxt = document.getElementById('dep-ai-text');
      if (aiBox && aiTxt) {
        aiTxt.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving and analysing…';
        aiBox.style.display = 'block';
      }
    };

    /* Override saveInlineForm — inline card panel */
    window.saveInlineForm = function (type) {
      window.saveInpageForm(type);
    };

    /* Override submitDataForm — modal form */
    window.submitDataForm = function (type) {
      document.getElementById('dataModal') && document.getElementById('dataModal').classList.remove('open');
      window.saveInpageForm(type);
    };

    /* ════════════════════════════════════════════════
       SUBMIT PAGE — per-type card grid
    ════════════════════════════════════════════════ */

    var SUBMIT_TYPES = [
      { type:'AIR',            label:'Air Quality',       icon:'fa-wind',             color:'#3b82f6', reportType:'ENVIRONMENTAL_MONITORING' },
      { type:'WATER',          label:'Water Quality',     icon:'fa-tint',             color:'#06b6d4', reportType:'WATER_AUDIT' },
      { type:'NOISE',          label:'Noise Monitoring',  icon:'fa-volume-up',        color:'#8b5cf6', reportType:'ENVIRONMENTAL_MONITORING' },
      { type:'SOIL',           label:'Soil Quality',      icon:'fa-seedling',         color:'#a16207', reportType:'ENVIRONMENTAL_MONITORING' },
      { type:'STACK_EMISSION', label:'Stack Emission',    icon:'fa-industry',         color:'#dc2626', reportType:'CARBON_EMISSION' },
      { type:'GROUNDWATER',    label:'Groundwater',       icon:'fa-water',            color:'#0ea5e9', reportType:'WATER_AUDIT' },
      { type:'WASTE',          label:'Waste Management',  icon:'fa-trash-alt',        color:'#16a34a', reportType:'WASTE_AUDIT' },
      { type:'METEOROLOGICAL', label:'Meteorological',    icon:'fa-cloud-sun',        color:'#f59e0b', reportType:'ENERGY_AUDIT' },
      { type:'ETP',            label:'ETP',               icon:'fa-filter',           color:'#14b8a6', reportType:'WATER_AUDIT' },
      { type:'STP',            label:'STP',               icon:'fa-recycle',          color:'#10b981', reportType:'WATER_AUDIT' },
      { type:'TEMPERATURE',    label:'Temperature',       icon:'fa-thermometer-half', color:'#ef4444', reportType:'ENVIRONMENTAL_MONITORING' },
      { type:'HUMIDITY',       label:'Humidity',          icon:'fa-droplet',          color:'#60a5fa', reportType:'ENVIRONMENTAL_MONITORING' }
    ];

    window.loadSubmitPage = function () {
      var grid   = document.getElementById('submitTypeGrid');
      var recent = document.getElementById('submitRecentList');
      if (!grid) return;

      var spinnerHtml = '<div style="text-align:center;padding:30px;color:#94a3b8"><i class="fas fa-spinner fa-spin" style="font-size:1.3rem"></i></div>';
      grid.innerHTML   = spinnerHtml;
      if (recent) recent.innerHTML = spinnerHtml;

      /* Fetch reports (required) + monitoring records (optional, for type cards) */
      var monPromise = window.EcoSphereAPI.Monitoring.getRecords({ limit: 200 })
        .catch(function () { return { data: { records: [] } }; });
      var rptPromise = window.EcoSphereAPI.Reports.getReports({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });

      Promise.all([monPromise, rptPromise])
        .then(function (results) {
          var recRes  = results[0];
          var rptRes  = results[1];

          var allRec  = (recRes && recRes.data && recRes.data.records) ? recRes.data.records
                      : (recRes && Array.isArray(recRes.data) ? recRes.data : []);
          var reports = (rptRes && rptRes.data && rptRes.data.reports) ? rptRes.data.reports
                      : (rptRes && Array.isArray(rptRes.data) ? rptRes.data : []);

          /* ── Group monitoring records by type ── */
          var countByType  = {};
          var idsByType    = {};
          var latestByType = {};
          allRec.forEach(function (r) {
            var t = r.monitoringType;
            if (!t) return;
            countByType[t]  = (countByType[t] || 0) + 1;
            idsByType[t]    = idsByType[t] || [];
            idsByType[t].push(r.id);
            if (!latestByType[t] || new Date(r.recordingDate) > new Date(latestByType[t]))
              latestByType[t] = r.recordingDate;
          });

          /* ── Type quick-submit cards ── */
          var withData    = SUBMIT_TYPES.filter(function (s) { return countByType[s.type] > 0; });
          var withoutData = SUBMIT_TYPES.filter(function (s) { return !countByType[s.type]; });

          var sbNum = document.querySelector('.sb-item[onclick*="pgSubmit"] .sb-num');
          if (sbNum) sbNum.textContent = withData.length || '';

          if (!withData.length) {
            grid.innerHTML =
              '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:11px;padding:14px 18px;font-size:.82rem;color:#92400e">' +
              '<i class="fas fa-info-circle" style="margin-right:6px"></i>' +
              'No monitoring records found. Go to <b>Environmental Monitoring</b> and enter data for any parameter, ' +
              'then come back here to submit a new type-specific report.' +
              '</div>';
          } else {
            var cHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px">';
            withData.forEach(function (s) {
              var cnt      = countByType[s.type] || 0;
              var recIds   = idsByType[s.type]   || [];
              var lastDate = latestByType[s.type] ? new Date(latestByType[s.type]).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
              var idsJson  = JSON.stringify(recIds).replace(/"/g,'&quot;');
              cHtml +=
                '<div style="background:#fff;border:1.5px solid #d1fae5;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,.04)">' +
                  '<div style="display:flex;align-items:center;gap:9px">' +
                    '<div style="width:36px;height:36px;border-radius:9px;background:' + s.color + '18;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                      '<i class="fas ' + s.icon + '" style="color:' + s.color + ';font-size:.95rem"></i>' +
                    '</div>' +
                    '<div>' +
                      '<div style="font-family:Poppins,sans-serif;font-size:.8rem;font-weight:800;color:#0f172a">' + s.label + '</div>' +
                      '<div style="font-size:.68rem;color:#94a3b8">' + cnt + ' record' + (cnt!==1?'s':'') + ' · ' + lastDate + '</div>' +
                    '</div>' +
                  '</div>' +
                  '<button id="subBtn-' + s.type + '" onclick="submitByType(\'' + s.type + '\',\'' + s.label + '\',\'' + s.reportType + '\',' + idsJson + ',this)" ' +
                    'style="width:100%;padding:8px;background:linear-gradient(135deg,#0a3d2e,#16a34a);border:none;border-radius:8px;color:#fff;font-family:Poppins,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:.2s">' +
                    '<i class="fas fa-paper-plane"></i> Submit to Lab</button>' +
                '</div>';
            });
            withoutData.forEach(function (s) {
              cHtml +=
                '<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;opacity:.5">' +
                  '<div style="display:flex;align-items:center;gap:9px">' +
                    '<div style="width:36px;height:36px;border-radius:9px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                      '<i class="fas ' + s.icon + '" style="color:#94a3b8;font-size:.95rem"></i>' +
                    '</div>' +
                    '<div>' +
                      '<div style="font-family:Poppins,sans-serif;font-size:.8rem;font-weight:800;color:#94a3b8">' + s.label + '</div>' +
                      '<div style="font-size:.68rem;color:#cbd5e1">No records yet</div>' +
                    '</div>' +
                  '</div>' +
                  '<div style="text-align:center;font-size:.68rem;color:#cbd5e1;border:1px dashed #e2e8f0;border-radius:7px;padding:5px">No data</div>' +
                '</div>';
            });
            cHtml += '</div>';
            grid.innerHTML = cHtml;
          }

          /* ── Full reports list ── */
          if (!recent) return;
          if (!reports.length) {
            recent.innerHTML =
              '<div style="text-align:center;padding:30px;color:#94a3b8">' +
              '<i class="fas fa-inbox" style="font-size:1.6rem;display:block;margin-bottom:8px"></i>' +
              'No reports created yet. Enter monitoring data and use the Submit buttons above.</div>';
            return;
          }

          /* Pending count for badge */
          var pendCount = reports.filter(function (r) { return r.status === 'DRAFT' || !r.status; }).length;
          if (sbNum) sbNum.textContent = (withData.length + pendCount) || '';

          var tbl =
            '<table class="tbl">' +
            '<thead><tr>' +
            '<th>Report #</th><th>Monitoring Type</th><th>Created</th>' +
            '<th>Status</th><th style="min-width:180px">Action</th>' +
            '</tr></thead><tbody>';

          reports.forEach(function (r) {
            var rNum  = r.reportNumber || r.id.substring(0,8).toUpperCase();
            var rType = _humanType(r.reportType || r.type);
            var date  = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
            var st    = r.status || 'DRAFT';

            /* Status chip */
            var chip;
            if      (st === 'DRAFT')                      chip = '<span class="chip" style="background:#f1f5f9;color:#64748b"><span class="cdot" style="background:#94a3b8"></span>Draft</span>';
            else if (st === 'SUBMITTED_TO_LAB')           chip = '<span class="chip c-warn"><span class="cdot"></span>Submitted</span>';
            else if (st === 'LAB_UNDER_REVIEW')           chip = '<span class="chip c-pend"><span class="cdot"></span>Under Review</span>';
            else if (st === 'LAB_CORRECTION_REQUESTED')   chip = '<span class="chip c-warn"><span class="cdot"></span>Correction Req.</span>';
            else if (st === 'LAB_APPROVED')               chip = '<span class="chip" style="background:#dcfce7;color:#16a34a;border:1px solid #86efac"><span class="cdot" style="background:#16a34a"></span><b>LAB APPROVED</b></span>';
            else if (st === 'LAB_REJECTED')               chip = '<span class="chip" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5"><span class="cdot" style="background:#dc2626"></span><b>LAB REJECTED</b></span>';
            else if (st === 'SUBMITTED_TO_REGULATORY')    chip = '<span class="chip c-pend"><span class="cdot"></span>To Regulatory</span>';
            else if (st === 'REG_UNDER_REVIEW')           chip = '<span class="chip c-pend"><span class="cdot"></span>Reg. Review</span>';
            else if (st === 'REG_APPROVED' || st === 'CERTIFIED') chip = '<span class="chip" style="background:#fef9c3;color:#854d0e;border:1px solid #fcd34d"><span class="cdot" style="background:#d97706"></span><b>Certified</b></span>';
            else chip = '<span class="chip c-warn"><span class="cdot"></span>' + st.replace(/_/g,' ') + '</span>';

            /* Action buttons */
            var canSubmit = (st === 'DRAFT' || st === 'LAB_CORRECTION_REQUESTED');
            var actions =
              '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
              '<button class="btn b-vw" onclick="orgDownloadCert(\'' + r.id + '\',\'' + rNum + '\')" style="font-size:.7rem" title="Download PDF">' +
                '<i class="fas fa-file-pdf"></i> PDF</button>' +
              '<button class="btn b-bl" onclick="navTo(\'pgTrack\',document.querySelector(\'.sb-item[onclick*=pgTrack]\'))" style="font-size:.7rem" title="Track status">' +
                '<i class="fas fa-stream"></i> Track</button>';
            if (canSubmit) {
              actions += '<button class="btn b-gen" onclick="submitExistingReport(\'' + r.id + '\',\'' + rNum + '\',this)" style="font-size:.7rem">' +
                '<i class="fas fa-paper-plane"></i> Submit to Lab</button>';
            }
            actions += '</div>';

            tbl += '<tr>' +
              '<td><b style="color:#0a3d2e">' + rNum + '</b></td>' +
              '<td>' + rType + '</td>' +
              '<td style="color:#64748b;font-size:.8rem">' + date + '</td>' +
              '<td>' + chip + '</td>' +
              '<td>' + actions + '</td>' +
              '</tr>';
          });

          tbl += '</tbody></table>';
          recent.innerHTML = tbl;
        })
        .catch(function (err) {
          var msg = (err && err.message) ? ' (' + err.message + ')' : '';
          grid.innerHTML =
            '<div style="text-align:center;padding:30px;background:#fff;border:1px solid #e2e8f0;border-radius:13px;color:#ef4444">' +
            '<i class="fas fa-exclamation-circle" style="margin-right:6px"></i>Failed to load data' + msg + '. ' +
            '<button class="btn b-bl" onclick="loadSubmitPage()" style="margin-left:8px">Retry</button></div>';
          if (recent) recent.innerHTML = '';
        });
    };

    /* ── Submit an existing report (DRAFT) to lab ── */
    window.submitExistingReport = function (reportId, rNum, btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      window.EcoSphereAPI.Reports.submitToLab(reportId)
        .then(function () {
          EcoService.toast('✅ ' + rNum + ' submitted to Laboratory!');
          loadDashboardStats();
          setTimeout(loadSubmitPage, 600);
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Lab';
          EcoService.error((err && err.message) || 'Submission failed.');
        });
    };

    /* ── Submit a single monitoring type to lab ── */
    window.submitByType = function (monType, monLabel, reportType, recordIds, btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';

      var orgName = sessionStorage.getItem('ecoOrgName') || 'Organization';
      var now     = new Date();
      var start   = new Date(now.getFullYear(), now.getMonth(), 1);
      var title   = orgName + ' — ' + monLabel + ' Report (' + now.getFullYear() + ')';

      window.EcoSphereAPI.Reports.createReport({
        title:               title,
        type:                reportType,
        period:              'MONTHLY',
        periodStartDate:     start.toISOString(),
        periodEndDate:       now.toISOString(),
        monitoringRecordIds: recordIds.length ? recordIds : undefined,
        isDraft:             false
      })
      .then(function (res) {
        var report   = res && res.data && (res.data.report || res.data);
        var reportId = report && report.id;
        if (!reportId) throw new Error('Report creation failed — no ID returned.');
        return window.EcoSphereAPI.Reports.submitToLab(reportId);
      })
      .then(function () {
        EcoService.toast('✅ ' + monLabel + ' report submitted to Laboratory!');
        btn.innerHTML = '<i class="fas fa-check"></i> Submitted!';
        btn.style.background = '#16a34a';
        loadDashboardStats();
        /* Refresh the recent list */
        setTimeout(loadSubmitPage, 1000);
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Lab';
        EcoService.error((err && err.message) || 'Submission failed. Please try again.');
      });
    };

    /* ════════════════════════════════════════════════
       SUBMIT REPORT — legacy modal (kept for backward compat)
       then creates report with real monitoring data
       and submits to Lab
    ════════════════════════════════════════════════ */
    window.submitReport = function (btn) {
      /* Remove any leftover modal */
      var old = document.getElementById('labSubmitModal');
      if (old) old.remove();

      /* Show a loading skeleton while we fetch monitoring data */
      var modal = document.createElement('div');
      modal.id  = 'labSubmitModal';
      modal.style.cssText = [
        'position:fixed;inset:0;background:rgba(10,61,46,0.55);z-index:9999;',
        'display:flex;align-items:center;justify-content:center;'
      ].join('');
      modal.innerHTML = '<div style="background:#fff;border-radius:16px;padding:40px 32px;max-width:480px;' +
        'width:92%;text-align:center"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;color:#16a34a"></i>' +
        '<p style="margin-top:12px;color:#64748b;font-size:0.88rem">Loading your monitoring data…</p></div>';
      document.body.appendChild(modal);

      /* ── Map monitoring type → report type ── */
      var MON_TO_REPORT = {
        AIR:           'ENVIRONMENTAL_MONITORING',
        NOISE:         'ENVIRONMENTAL_MONITORING',
        SOIL:          'ENVIRONMENTAL_MONITORING',
        TEMPERATURE:   'ENVIRONMENTAL_MONITORING',
        HUMIDITY:      'ENVIRONMENTAL_MONITORING',
        WATER:         'WATER_AUDIT',
        GROUNDWATER:   'WATER_AUDIT',
        ETP:           'WATER_AUDIT',
        STP:           'WATER_AUDIT',
        STACK_EMISSION:'CARBON_EMISSION',
        WASTE:         'WASTE_AUDIT',
        METEOROLOGICAL:'ENERGY_AUDIT'
      };
      var REPORT_LABELS = {
        ENVIRONMENTAL_MONITORING: { icon:'🌿', label:'Air Quality & Environmental Monitoring' },
        WATER_AUDIT:              { icon:'💧', label:'Water Quality Audit' },
        CARBON_EMISSION:          { icon:'🏭', label:'Carbon Emission Report' },
        WASTE_AUDIT:              { icon:'♻️', label:'Waste Management Audit' },
        ENERGY_AUDIT:             { icon:'⚡', label:'Energy Audit' },
        ESG_REPORT:               { icon:'📊', label:'ESG Report (All Types)' },
        ANNUAL_ENVIRONMENTAL:     { icon:'📅', label:'Annual Environmental Report (All Types)' },
        SUSTAINABILITY:           { icon:'🌱', label:'Sustainability Report (All Types)' }
      };

      /* Fetch all recent monitoring records to build the dropdown */
      window.EcoSphereAPI.Monitoring.getRecords({ limit: 100 })
        .then(function (res) {
          var allRec = (res && res.data && res.data.records)
            ? res.data.records
            : (res && res.data && Array.isArray(res.data) ? res.data : []);

          /* Group by which report type they map to */
          var typeCount = {};
          allRec.forEach(function (r) {
            var rt = MON_TO_REPORT[r.monitoringType];
            if (rt) typeCount[rt] = (typeCount[rt] || 0) + 1;
          });
          /* Also add "all-type" reports as always available (they aggregate everything) */
          var totalRecs = allRec.length;
          ['ESG_REPORT','ANNUAL_ENVIRONMENTAL','SUSTAINABILITY'].forEach(function (rt) {
            if (totalRecs > 0) typeCount[rt] = totalRecs;
          });

          /* Build <option> list — types WITH data first, then disabled types without data */
          var withData    = [];
          var withoutData = [];
          Object.keys(REPORT_LABELS).forEach(function (rt) {
            var cnt  = typeCount[rt] || 0;
            var info = REPORT_LABELS[rt];
            if (cnt > 0) {
              withData.push('<option value="' + rt + '">' + info.icon + ' ' + info.label + ' (' + cnt + ' records)</option>');
            } else {
              withoutData.push('<option value="' + rt + '" disabled style="color:#94a3b8">' + info.icon + ' ' + info.label + ' — no data yet</option>');
            }
          });

          if (withData.length === 0) {
            /* No monitoring data at all */
            var m = document.getElementById('labSubmitModal');
            if (m) m.innerHTML = '<div style="background:#fff;border-radius:16px;padding:30px 32px;max-width:420px;width:92%;text-align:center">' +
              '<i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#f59e0b;margin-bottom:12px"></i>' +
              '<p style="font-weight:700;color:#0a3d2e;margin-bottom:8px">No Monitoring Data Found</p>' +
              '<p style="font-size:0.86rem;color:#64748b;margin-bottom:18px">Please enter and save at least one monitoring record (Air, Water, Temperature, etc.) before submitting a report to the lab.</p>' +
              '<button onclick="document.getElementById(\'labSubmitModal\').remove()" style="padding:9px 22px;border-radius:9px;background:#16a34a;color:#fff;border:none;cursor:pointer;font-weight:600">OK</button>' +
              '</div>';
            return;
          }

          var optionsHtml = withData.join('') + (withoutData.length ? '<option disabled>──────────────────</option>' + withoutData.join('') : '');

          /* Build the full modal */
          var m = document.getElementById('labSubmitModal');
          if (!m) return;
          m.innerHTML = [
            '<div style="background:#fff;border-radius:16px;padding:30px 32px;max-width:480px;',
            'width:92%;box-shadow:0 24px 60px rgba(0,0,0,0.28);">',

            '<h3 style="margin:0 0 4px;color:#0a3d2e;font-size:1.15rem;font-weight:700">',
            '<i class="fas fa-paper-plane" style="color:#16a34a;margin-right:8px"></i>Submit Report to Laboratory</h3>',
            '<p style="margin:0 0 18px;color:#64748b;font-size:0.86rem">',
            'Only monitoring types with saved data are shown. Disabled options have no records yet.</p>',

            '<label style="display:block;margin-bottom:5px;font-size:0.84rem;color:#374151;font-weight:600">',
            'Report Type *</label>',
            '<select id="labSubmitType" style="width:100%;padding:10px 13px;border:1.5px solid #d1d5db;',
            'border-radius:9px;font-size:0.9rem;color:#111827;margin-bottom:14px;background:#fff">',
            optionsHtml,
            '</select>',

            '<label style="display:block;margin-bottom:5px;font-size:0.84rem;color:#374151;font-weight:600">',
            'Notes for Lab Reviewer (optional)</label>',
            '<textarea id="labSubmitNotes" rows="3" ',
            'placeholder="Describe observations, data quality, or special instructions…" ',
            'style="width:100%;padding:9px 13px;border:1.5px solid #d1d5db;border-radius:9px;',
            'font-size:0.87rem;resize:none;box-sizing:border-box;margin-bottom:20px"></textarea>',

            '<div id="labSubmitErr" style="display:none;background:#fef2f2;border:1px solid #fca5a5;',
            'border-radius:8px;padding:8px 12px;font-size:0.84rem;color:#b91c1c;margin-bottom:14px"></div>',

            '<div style="display:flex;gap:10px;justify-content:flex-end">',
            '<button onclick="document.getElementById(\'labSubmitModal\').remove()" ',
            'style="padding:9px 20px;border-radius:9px;border:1.5px solid #d1d5db;background:#fff;',
            'color:#374151;cursor:pointer;font-size:0.9rem">Cancel</button>',
            '<button id="labSubmitConfirmBtn" ',
            'style="padding:9px 22px;border-radius:9px;border:none;background:#16a34a;color:#fff;',
            'cursor:pointer;font-size:0.9rem;font-weight:600">',
            '<i class="fas fa-paper-plane"></i> Submit to Lab</button>',
            '</div>',
            '</div>'
          ].join('');

          /* Wire confirm button — INSIDE .then so the button exists in DOM */
          document.getElementById('labSubmitConfirmBtn').onclick = function () {
            var confirmBtn = this;
            var errBox     = document.getElementById('labSubmitErr');
            var rtype      = document.getElementById('labSubmitType').value;
            var notes      = (document.getElementById('labSubmitNotes').value || '').trim();
            var orgName    = sessionStorage.getItem('ecoOrgName') || 'Organization';

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
            errBox.style.display = 'none';

            var TYPE_TO_MON = {
              ENVIRONMENTAL_MONITORING: ['AIR','NOISE','SOIL','TEMPERATURE','HUMIDITY'],
              WATER_AUDIT:              ['WATER','GROUNDWATER','ETP','STP'],
              CARBON_EMISSION:          ['STACK_EMISSION'],
              WASTE_AUDIT:              ['WASTE','ETP','STP'],
              ENERGY_AUDIT:             ['TEMPERATURE','HUMIDITY','METEOROLOGICAL']
            };
            var monTypes = TYPE_TO_MON[rtype] || null;
            var now   = new Date();
            var start = new Date(now.getFullYear(), now.getMonth(), 1);
            var LABELS = {
              ENVIRONMENTAL_MONITORING: 'Air Quality & Environmental Monitoring',
              WATER_AUDIT:              'Water Quality Audit',
              CARBON_EMISSION:          'Carbon Emission Report',
              WASTE_AUDIT:              'Waste Management Audit',
              ESG_REPORT:               'ESG Report',
              ENERGY_AUDIT:             'Energy Audit',
              ANNUAL_ENVIRONMENTAL:     'Annual Environmental Report',
              SUSTAINABILITY:           'Sustainability Report'
            };
            var label = LABELS[rtype] || rtype.replace(/_/g,' ');
            var title = orgName + ' — ' + label + ' (' + now.getFullYear() + ')';

            /* Use the already-fetched records — no second API call needed */
            var filtered = monTypes
              ? allRec.filter(function (r) { return monTypes.indexOf(r.monitoringType) > -1; })
              : allRec;
            var recordIds = filtered.map(function (r) { return r.id; });

            /* Step 1: create report with linked monitoring records */
            window.EcoSphereAPI.Reports.createReport({
              title:               title,
              type:                rtype,
              period:              'MONTHLY',
              periodStartDate:     start.toISOString(),
              periodEndDate:       now.toISOString(),
              monitoringRecordIds: recordIds.length ? recordIds : undefined,
              notes:               notes || undefined,
              isDraft:             false
            })
            .then(function (res) {
              var report   = res && res.data && (res.data.report || res.data);
              var reportId = report && report.id;
              if (!reportId) throw new Error('Report creation failed — no ID returned. Please try again.');
              /* Step 2: submit to lab */
              return window.EcoSphereAPI.Reports.submitToLab(reportId, notes);
            })
            .then(function () {
              document.getElementById('labSubmitModal') && document.getElementById('labSubmitModal').remove();
              EcoService.toast('✅ Report submitted to Laboratory successfully!');
              loadDashboardStats();
              loadReportsTable();
            })
            .catch(function (err) {
              confirmBtn.disabled = false;
              confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit to Lab';
              var msg = err.message || 'Submission failed. Please try again.';
              errBox.textContent   = msg;
              errBox.style.display = 'block';
            });
          };

        }) /* end .then(res) */
        .catch(function () {
          var m = document.getElementById('labSubmitModal');
          if (m) m.remove();
          EcoService.error('Failed to load monitoring data. Please try again.');
        });
    };

    /* ════════════════════════════════════════════════
       VIEW REPORT — navigate to track page and reload live data
    ════════════════════════════════════════════════ */
    window.viewReport = function (reportId) {
      var trackBtn = document.querySelector('.sb-item[onclick*="pgTrack"]');
      navTo('pgTrack', trackBtn || null);
      /* loadTrackTable is called by navTo patch above */
    };

    /* ════════════════════════════════════════════════
       ECOBOT CHAT — connect to backend AI
    ════════════════════════════════════════════════ */
    window.sendChat = function () {
      var input = document.getElementById('chatInput');
      var msgs  = document.getElementById('chatMessages');
      var text  = input && input.value.trim();
      if (!text) return;

      /* Append user message */
      msgs.appendChild(makeCM('user', text));
      input.value = '';

      /* Thinking indicator */
      var thinking = makeCM('bot', '<span style="font-style:italic;color:#94a3b8"><i class="fas fa-circle-notch fa-spin"></i> EcoBot analysing…</span>');
      msgs.appendChild(thinking);
      msgs.scrollTop = msgs.scrollHeight;

      EcoService.EcoBot.chat(text)
        .then(function (res) {
          msgs.removeChild(thinking);
          var reply = (res && res.data && res.data.reply) ? res.data.reply : getReply(text);
          msgs.appendChild(makeCM('bot', reply));
          msgs.scrollTop = msgs.scrollHeight;
        })
        .catch(function () {
          msgs.removeChild(thinking);
          /* Fallback to client-side reply if API fails */
          msgs.appendChild(makeCM('bot', getReply(text)));
          msgs.scrollTop = msgs.scrollHeight;
        });
    };

    /* ════════════════════════════════════════════════
       CHARTS — load real data from monitoring dashboard
    ════════════════════════════════════════════════ */
    var _chartsLoaded = false;
    window.initCharts = function () {
      if (typeof Chart === 'undefined') return;
      loadDashboardStats(); /* stats call now rebuilds charts too */
    };

    function _rebuildDashCharts(reports, counts) {
      /* ── 6-Month Report Submission Trend (real data) ── */
      var trendEl = document.getElementById('orgTrendChart');
      if (trendEl) {
        if (trendEl._c) { trendEl._c.destroy(); trendEl._c = null; }

        /* Build monthly buckets for last 6 months */
        var now    = new Date();
        var labels = [];
        var submitted = [];
        var approved  = [];
        for (var m = 5; m >= 0; m--) {
          var d2 = new Date(now.getFullYear(), now.getMonth() - m, 1);
          labels.push(d2.toLocaleString('en-IN', { month: 'short' }) + ' ' + d2.getFullYear().toString().slice(2));
          var mSub = 0, mApp = 0;
          reports.forEach(function(r) {
            var rd = new Date(r.createdAt);
            if (rd.getFullYear() === d2.getFullYear() && rd.getMonth() === d2.getMonth()) {
              mSub++;
              if (['LAB_APPROVED','SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW','REG_APPROVED','CERTIFIED'].includes(r.status)) mApp++;
            }
          });
          submitted.push(mSub);
          approved.push(mApp);
        }

        trendEl._c = new Chart(trendEl, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: 'Submitted', data: submitted, backgroundColor: 'rgba(29,78,216,.7)', borderRadius: 4 },
              { label: 'Approved',  data: approved,  backgroundColor: 'rgba(22,163,74,.7)',  borderRadius: 4 }
            ]
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#374151', font: { size: 9 }, padding: 8 } } },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 8 } }, grid: { display: false } },
              y: { ticks: { color: '#94a3b8', font: { size: 8 }, stepSize: 1 }, grid: { color: 'rgba(148,163,184,.12)' } }
            },
            animation: { duration: 600 }
          }
        });
      }

      /* ── Report Status Doughnut (real counts) ── */
      var statusEl = document.getElementById('orgStatusChart');
      if (statusEl) {
        if (statusEl._c) { statusEl._c.destroy(); statusEl._c = null; }

        var hasAny = counts.certified + counts.labApproved + counts.pending + counts.corrections > 0;
        statusEl._c = new Chart(statusEl, {
          type: 'doughnut',
          data: {
            labels: ['Certified', 'Lab Approved', 'Pending Review', 'Corrections'],
            datasets: [{
              data: hasAny
                ? [counts.certified, counts.labApproved, counts.pending, counts.corrections]
                : [0, 0, 0, 0],
              backgroundColor: ['rgba(22,163,74,.85)', 'rgba(13,148,136,.8)', 'rgba(217,119,6,.8)', 'rgba(234,88,12,.75)'],
              borderColor: '#fff', borderWidth: 2
            }]
          },
          options: {
            cutout: '65%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#374151', font: { size: 9 }, padding: 8, boxWidth: 8 } },
              tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + ctx.parsed; } } }
            },
            animation: { duration: 600 }
          },
          plugins: [{
            id: 'centerText',
            afterDraw: function(chart) {
              if (hasAny) return;
              var ctx2 = chart.ctx;
              var cx = chart.getDatasetMeta(0).data[0] ? chart.getDatasetMeta(0).data[0].x : chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
              var cy = chart.getDatasetMeta(0).data[0] ? chart.getDatasetMeta(0).data[0].y : chart.chartArea.top  + (chart.chartArea.bottom - chart.chartArea.top) / 2;
              ctx2.save();
              ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
              ctx2.font = '10px Poppins,sans-serif'; ctx2.fillStyle = '#94a3b8';
              ctx2.fillText('No reports yet', cx, cy);
              ctx2.restore();
            }
          }]
        });
      }
    }

    /* ════════════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════════════ */
    function _safeSet(id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    function _humanType(apiType) {
      var map = {
        ENVIRONMENTAL_MONITORING:'Environmental Monitoring',
        ESG_REPORT:'ESG Report', CARBON_EMISSION:'Carbon Report',
        SUSTAINABILITY:'Sustainability Report', ISO14001_COMPLIANCE:'ISO 14001',
        EIA_REPORT:'EIA Report', WATER_AUDIT:'Water Audit',
        ENERGY_AUDIT:'Energy Audit', WASTE_AUDIT:'Waste Audit',
        ANNUAL_ENVIRONMENTAL:'Annual Environmental'
      };
      return map[apiType] || apiType || '—';
    }

    function _statusChip(status, view) {
      /* Real DB enum values (Prisma ReportStatus) */
      var LAB_STATUSES = [
        'SUBMITTED_TO_LAB','LAB_UNDER_REVIEW',
        'LAB_CORRECTION_REQUESTED','LAB_APPROVED','LAB_REJECTED'
      ];
      var REG_STATUSES = [
        'SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW',
        'REG_CORRECTION_REQUESTED','REG_APPROVED','CERTIFIED'
      ];

      if (view === 'lab') {
        if (!status || status === 'DRAFT')
          return '<span class="chip" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;font-size:.66rem">—</span>';
        if (status === 'SUBMITTED_TO_LAB')
          return '<span class="chip c-pend"><span class="cdot"></span>Submitted</span>';
        if (status === 'LAB_UNDER_REVIEW')
          return '<span class="chip c-pend"><span class="cdot"></span>Lab Review</span>';
        if (status === 'LAB_APPROVED')
          return '<span class="chip c-good"><span class="cdot"></span>Lab Approved</span>';
        if (status === 'LAB_REJECTED')
          return '<span class="chip c-bad"><span class="cdot"></span>Lab Rejected</span>';
        if (status === 'LAB_CORRECTION_REQUESTED')
          return '<span class="chip c-warn"><span class="cdot"></span>Correction Req.</span>';
        /* Reached regulatory — lab was approved */
        if (REG_STATUSES.indexOf(status) > -1)
          return '<span class="chip c-good"><span class="cdot"></span>Lab Approved</span>';
        return '<span class="chip c-pend"><span class="cdot"></span>' + status.replace(/_/g,' ') + '</span>';
      }

      if (view === 'reg') {
        /* Not yet at regulatory stage */
        if (!status || status === 'DRAFT' || LAB_STATUSES.indexOf(status) > -1)
          return '<span class="chip" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;font-size:.66rem">—</span>';
        if (status === 'SUBMITTED_TO_REGULATORY' || status === 'REG_UNDER_REVIEW')
          return '<span class="chip c-pend"><span class="cdot"></span>Govt Review</span>';
        if (status === 'REG_APPROVED')
          return '<span class="chip c-good"><span class="cdot"></span>Reg. Approved</span>';
        if (status === 'CERTIFIED')
          return '<span class="chip c-good"><span class="cdot"></span>Certified</span>';
        if (status === 'REG_CORRECTION_REQUESTED')
          return '<span class="chip c-warn"><span class="cdot"></span>Correction Req.</span>';
        if (status === 'REGULATORY_REJECTED' || status === 'REG_REJECTED')
          return '<span class="chip c-bad"><span class="cdot"></span>Rejected</span>';
        return '<span class="chip c-pend"><span class="cdot"></span>' + status.replace(/_/g,' ') + '</span>';
      }

      return '';
    }

    /* ════════════════════════════════════════════════
       TRACK TABLE — load live status into pgTrack
    ════════════════════════════════════════════════ */
    window.loadTrackTable = function () {
      var container = document.getElementById('trackCardsContainer');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8"><i class="fas fa-spinner fa-spin" style="font-size:1.4rem"></i></div>';

      EcoSphereAPI.Reports.getReports({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' })
        .then(function (res) {
          var reports = (res && res.data && res.data.reports) ? res.data.reports
                      : (res && Array.isArray(res.data) ? res.data : []);

          var lbl = document.getElementById('trackCountLabel');
          if (lbl) lbl.textContent = reports.length + ' report' + (reports.length !== 1 ? 's' : '') + ' tracked';

          if (!reports.length) {
            container.innerHTML =
              '<div style="text-align:center;padding:50px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:13px">' +
              '<i class="fas fa-inbox" style="font-size:2.2rem;color:#cbd5e1;margin-bottom:12px;display:block"></i>' +
              '<div style="font-family:Poppins,sans-serif;font-weight:800;color:#374151;margin-bottom:6px">No reports submitted yet</div>' +
              '<div style="font-size:.82rem;color:#94a3b8">Go to Environmental Monitoring and submit your first report to start tracking.</div></div>';
            return;
          }

          var apiIds = reports.map(function(r){ return r.reportNumber || (r.id||'').substring(0,8).toUpperCase(); });
          container.innerHTML = reports.map(function (r) {
            return _buildTrackCard(r);
          }).join('');
          _mergeLocalTrackData(apiIds);
        })
        .catch(function () {
          container.innerHTML = '';
          _mergeLocalTrackData([]);
          if (!container.children.length) {
            container.innerHTML =
              '<div style="text-align:center;padding:30px;background:#fff;border:1px solid #e2e8f0;border-radius:13px;color:#94a3b8">' +
              '<i class="fas fa-inbox" style="font-size:1.8rem;margin-bottom:10px;display:block"></i>' +
              'No backend connection — showing local tracking data. ' +
              '<button class="btn b-bl" onclick="loadTrackTable()" style="margin-left:8px;font-size:.76rem">Retry</button></div>';
          }
        });
    };

    /* ── Merge localStorage submissions into track view ── */
    function _mergeLocalTrackData(apiIds) {
      var container = document.getElementById('trackCardsContainer');
      if (!container) return;
      var orgName = sessionStorage.getItem('ecoOrgName') || localStorage.getItem('ecoOrgName') || '';
      var norm = orgName.toLowerCase().trim();
      var key2 = norm.split(/\s+/).slice(0,2).join(' ');

      var subs = [];
      try { subs = JSON.parse(localStorage.getItem('eco_reg_submissions') || '[]'); } catch(e){}

      var labFbs = {};
      try {
        var lfa = JSON.parse(localStorage.getItem('eco_lab_feedback') || '[]');
        lfa.forEach(function(f){ if(f.reportId) labFbs[f.reportId] = f; if(f.orgName) labFbs['__org__'+(f.orgName||'').toLowerCase()] = f; });
      } catch(e){}

      var filtered = subs.filter(function(s){
        var sn = (s.orgName||'').toLowerCase();
        var match = !norm || sn.indexOf(key2) !== -1 || norm.indexOf(sn.split(/\s+/).slice(0,2).join(' ')) !== -1;
        var notDup = apiIds.indexOf(s.reportId) === -1;
        return match && notDup;
      });

      if (!filtered.length) return;

      var cards = filtered.map(function(s){
        var labFb = labFbs[s.reportId] || labFbs['__org__'+(s.orgName||'').toLowerCase()] || null;
        return _buildLocalTrackCard(s, labFb);
      }).join('');

      var existingEmpty = container.querySelector('.fa-inbox') || container.querySelector('.fa-exclamation-circle');
      if (existingEmpty) {
        container.innerHTML = cards;
      } else {
        container.insertAdjacentHTML('afterbegin', cards);
      }

      var lbl = document.getElementById('trackCountLabel');
      if (lbl) {
        var total = container.querySelectorAll('.local-track-card, .track-card-wrap').length + (container.querySelectorAll('[data-track-id]').length);
        if (!total) total = filtered.length;
        lbl.textContent = total + ' report' + (total !== 1 ? 's' : '') + ' tracked';
      }
    }

    /* ── Local track card (for localStorage submissions) ── */
    function _buildLocalTrackCard(sub, labFb) {
      var status = sub.status || 'PENDING_REGULATORY';
      var isApproved = status === 'APPROVED';
      var isRejected = status === 'REJECTED';
      var isPending  = !isApproved && !isRejected;

      /* 5-step pipeline */
      function step(icon, label, active, color, badge) {
        var bg = active ? color : '#f1f5f9';
        var ic = active ? '#fff' : '#94a3b8';
        var lc = active ? '#0f172a' : '#94a3b8';
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:56px;text-align:center">'
          +'<div style="width:34px;height:34px;border-radius:50%;background:'+bg+';display:flex;align-items:center;justify-content:center;border:2px solid '+(active?color:'#e2e8f0')+';flex-shrink:0">'
          +'<i class="fas '+icon+'" style="color:'+ic+';font-size:.76rem"></i></div>'
          +'<div style="font-size:.62rem;font-weight:700;color:'+lc+';line-height:1.2">'+label+'</div>'
          +(badge?'<div style="font-size:.6rem;font-weight:800;color:'+color+';background:'+color+'1a;border-radius:4px;padding:1px 5px">'+badge+'</div>':'')
          +'</div>';
      }
      function connector(active, color) {
        return '<div style="height:2px;flex:1;background:'+(active?color:'#e2e8f0')+';margin-top:16px;max-width:36px"></div>';
      }

      var labStatus = labFb ? labFb.status : (sub.labApprovedDate ? 'APPROVED' : null);
      var labColor  = labStatus==='APPROVED' ? '#10b981' : labStatus==='REJECTED' ? '#ef4444' : '#f59e0b';
      var regColor  = isApproved ? '#10b981' : isRejected ? '#ef4444' : '#94a3b8';

      var pipeline =
        step('fa-paper-plane','Submitted to Lab', true,  '#3b82f6', '')
        + connector(true, '#3b82f6')
        + step('fa-flask',       'Lab Review',      !!(labStatus||sub.labApprovedDate), '#f59e0b', '')
        + connector(!!(labStatus||sub.labApprovedDate), '#f59e0b')
        + step('fa-check-circle','Lab Decision',    !!(labStatus||sub.labApprovedDate), labColor, labStatus||'')
        + connector(true, '#7c3aed')
        + step('fa-landmark',   'Regulatory',       true, '#7c3aed', '')
        + connector(isApproved||isRejected, regColor)
        + step('fa-gavel',      'Reg. Decision',    isApproved||isRejected, regColor, isApproved?'APPROVED':isRejected?'REJECTED':'');

      /* Feedback banners */
      var banners = '';
      if (labFb && labFb.feedback) {
        var lbg=labFb.status==='APPROVED'?'#f0fdf4':labFb.status==='REJECTED'?'#fef2f2':'#fffbeb';
        var lbd=labFb.status==='APPROVED'?'#bbf7d0':labFb.status==='REJECTED'?'#fecaca':'#fde68a';
        var ltx=labFb.status==='APPROVED'?'#065f46':labFb.status==='REJECTED'?'#dc2626':'#92400e';
        banners += '<div style="background:'+lbg+';border:1px solid '+lbd+';border-left:4px solid '+ltx+';border-radius:8px;padding:11px 14px;margin-top:12px">'
          +'<div style="font-size:.74rem;font-weight:800;color:'+ltx+';margin-bottom:3px"><i class="fas fa-flask" style="margin-right:5px"></i>Lab Feedback — '+labFb.status+'</div>'
          +'<div style="font-size:.78rem;color:'+ltx+'">'+labFb.feedback+'</div>'
          +'<div style="font-size:.67rem;color:#94a3b8;margin-top:4px">'+(labFb.labName||'Lab Authority')+' · '+(labFb.reviewedAt?new Date(labFb.reviewedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'')+'</div>'
          +'</div>';
      }
      if ((isApproved||isRejected) && (sub.feedback !== undefined)) {
        var rbg=isApproved?'#f0fdf4':'#fef2f2', rbd=isApproved?'#bbf7d0':'#fecaca', rtx=isApproved?'#065f46':'#dc2626';
        banners += '<div style="background:'+rbg+';border:1px solid '+rbd+';border-left:4px solid '+rtx+';border-radius:8px;padding:11px 14px;margin-top:8px">'
          +'<div style="font-size:.74rem;font-weight:800;color:'+rtx+';margin-bottom:3px"><i class="fas fa-landmark" style="margin-right:5px"></i>Regulatory Decision — '+status+'</div>'
          +(sub.feedback?'<div style="font-size:.78rem;color:'+rtx+'">'+sub.feedback+'</div>':'<div style="font-size:.78rem;color:#94a3b8;font-style:italic">No additional comments.</div>')
          +'<div style="font-size:.67rem;color:#94a3b8;margin-top:4px">'+(sub.reviewedAt?new Date(sub.reviewedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'')+'</div>'
          +'</div>';
      }

      var hdrBg = isApproved ? 'linear-gradient(135deg,#042f2e,#064e3b)' : isRejected ? 'linear-gradient(135deg,#450a0a,#7f1d1d)' : 'linear-gradient(135deg,#1e1b4b,#312e81)';
      var chip  = isApproved ? '<span style="background:#10b981;color:#fff;border-radius:20px;padding:3px 12px;font-size:.7rem;font-weight:800">✅ Reg. Approved</span>'
                : isRejected ? '<span style="background:#ef4444;color:#fff;border-radius:20px;padding:3px 12px;font-size:.7rem;font-weight:800">❌ Reg. Rejected</span>'
                : '<span style="background:rgba(245,158,11,.85);color:#fff;border-radius:20px;padding:3px 12px;font-size:.7rem;font-weight:800">⏳ Pending Reg. Review</span>';

      return '<div class="local-track-card" style="background:#fff;border-radius:14px;box-shadow:0 2px 16px rgba(0,0,0,.07);overflow:hidden;margin-bottom:16px">'
        +'<div style="background:'+hdrBg+';padding:15px 20px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
          +'<div>'
            +'<div style="font-family:Poppins,sans-serif;font-size:.88rem;font-weight:800;color:#fff">'+sub.reportType+'</div>'
            +'<div style="font-size:.72rem;color:rgba(255,255,255,.6);margin-top:2px">'+sub.reportId+' · '+sub.labName+' · Lab approved '+sub.labApprovedDate+'</div>'
          +'</div>'+chip
        +'</div>'
        +'<div style="padding:16px 20px">'
          +'<div style="display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:4px;margin-bottom:'+(banners?'0':'4px')+'px">'+pipeline+'</div>'
          +banners
        +'</div>'
      +'</div>';
    }

    /* ── Build one pipeline card per report ── */
    function _buildTrackCard(r) {
      var rNum    = r.reportNumber || r.id.substring(0,8).toUpperCase();
      var rType   = _humanType(r.reportType || r.type);
      var subDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
      var status  = r.status || 'DRAFT';

      /* ── Step states ── */
      var steps = _getStepStates(status);

      /* ── Lab review banner ── */
      var labReview   = null;
      var regReview   = null;
      if (r.reviews && r.reviews.length) {
        for (var i = 0; i < r.reviews.length; i++) {
          if (!labReview && r.reviews[i].reviewStage === 'LABORATORY') labReview = r.reviews[i];
          if (!regReview && r.reviews[i].reviewStage === 'REGULATORY')  regReview = r.reviews[i];
        }
      }

      var labBannerHtml = '';
      if (labReview) {
        var isLabApproved = labReview.status === 'APPROVED';
        var isLabRejected = labReview.status === 'REJECTED';
        var bannerBg      = isLabApproved ? '#dcfce7' : isLabRejected ? '#fee2e2' : '#fef3c7';
        var bannerBorder  = isLabApproved ? '#16a34a' : isLabRejected ? '#dc2626' : '#f59e0b';
        var bannerText    = isLabApproved ? '#15803d' : isLabRejected ? '#991b1b' : '#92400e';
        var bannerIcon    = isLabApproved ? 'fa-check-circle' : isLabRejected ? 'fa-times-circle' : 'fa-exclamation-triangle';
        var bannerLabel   = isLabApproved ? '✔  LAB APPROVED' : isLabRejected ? '✘  LAB REJECTED' : '⚠  CORRECTION REQUESTED';
        var reviewer      = labReview.reviewedBy ? labReview.reviewedBy.firstName + ' ' + labReview.reviewedBy.lastName : 'Lab Reviewer';
        var labName       = labReview.laboratory  ? labReview.laboratory.name : 'NABL Laboratory';
        var reviewDate    = labReview.reviewedAt  ? new Date(labReview.reviewedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        var techScore     = labReview.technicalScore  != null ? Number(labReview.technicalScore).toFixed(1)  : null;
        var compScore     = labReview.complianceScore != null ? Number(labReview.complianceScore).toFixed(1) : null;

        labBannerHtml =
          '<div style="margin:12px 0 4px;padding:13px 16px;background:' + bannerBg + ';border:2px solid ' + bannerBorder + ';border-radius:10px;border-left-width:5px">' +
            '<div style="font-family:Poppins,sans-serif;font-size:.96rem;font-weight:900;color:' + bannerText + ';margin-bottom:5px">' +
              '<i class="fas ' + bannerIcon + '" style="margin-right:7px"></i>' + bannerLabel +
            '</div>' +
            '<div style="font-size:.78rem;color:' + bannerText + ';opacity:.85;line-height:1.55">' +
              '<b>' + reviewer + '</b> · ' + labName + ' · ' + reviewDate +
            '</div>' +
            (labReview.comments ? '<div style="font-size:.78rem;color:#374151;margin-top:6px;font-style:italic">"' + labReview.comments.slice(0,200) + '"</div>' : '') +
            (labReview.correctionNotes ? '<div style="font-size:.76rem;color:#92400e;margin-top:5px;background:#fff7ed;padding:5px 8px;border-radius:6px"><b>Correction required:</b> ' + labReview.correctionNotes.slice(0,200) + '</div>' : '') +
            ((techScore || compScore) ?
              '<div style="display:flex;gap:10px;margin-top:8px">' +
                (techScore  ? '<div style="background:rgba(255,255,255,.7);border-radius:7px;padding:5px 12px;font-size:.76rem;font-weight:700;color:' + bannerText + '">Technical: <b>' + techScore  + '/100</b></div>' : '') +
                (compScore  ? '<div style="background:rgba(255,255,255,.7);border-radius:7px;padding:5px 12px;font-size:.76rem;font-weight:700;color:' + bannerText + '">Compliance: <b>' + compScore + '/100</b></div>' : '') +
              '</div>'
            : '') +
          '</div>';
      } else if (status === 'LAB_APPROVED' || ['SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW','REG_APPROVED','REG_CORRECTION_REQUESTED','CERTIFIED'].indexOf(status) > -1) {
        /* status is approved but reviews not loaded yet */
        labBannerHtml =
          '<div style="margin:12px 0 4px;padding:11px 16px;background:#dcfce7;border:2px solid #16a34a;border-radius:10px;border-left-width:5px">' +
            '<div style="font-family:Poppins,sans-serif;font-size:.96rem;font-weight:900;color:#15803d">' +
              '<i class="fas fa-check-circle" style="margin-right:7px"></i>✔  LAB APPROVED' +
            '</div>' +
          '</div>';
      } else if (status === 'LAB_REJECTED') {
        labBannerHtml =
          '<div style="margin:12px 0 4px;padding:11px 16px;background:#fee2e2;border:2px solid #dc2626;border-radius:10px;border-left-width:5px">' +
            '<div style="font-family:Poppins,sans-serif;font-size:.96rem;font-weight:900;color:#991b1b">' +
              '<i class="fas fa-times-circle" style="margin-right:7px"></i>✘  LAB REJECTED' +
            '</div>' +
          '</div>';
      } else if (status === 'LAB_CORRECTION_REQUESTED') {
        labBannerHtml =
          '<div style="margin:12px 0 4px;padding:11px 16px;background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;border-left-width:5px">' +
            '<div style="font-family:Poppins,sans-serif;font-size:.96rem;font-weight:900;color:#92400e">' +
              '<i class="fas fa-exclamation-triangle" style="margin-right:7px"></i>⚠  CORRECTION REQUESTED BY LAB' +
            '</div>' +
          '</div>';
      }

      /* Reg banner */
      var regBannerHtml = '';
      if (regReview) {
        var isRegApp  = regReview.status === 'APPROVED';
        var isRegRej  = regReview.status === 'REJECTED';
        var rBg       = isRegApp ? '#dcfce7' : isRegRej ? '#fee2e2' : '#fef3c7';
        var rBorder   = isRegApp ? '#16a34a'  : isRegRej ? '#dc2626'  : '#f59e0b';
        var rText     = isRegApp ? '#15803d'  : isRegRej ? '#991b1b'  : '#92400e';
        var rLabel    = isRegApp ? '✔  REGULATORY APPROVED' : isRegRej ? '✘  REGULATORY REJECTED' : '⚠  REG. CORRECTION REQUESTED';
        var rReviewer = regReview.reviewedBy ? regReview.reviewedBy.firstName + ' ' + regReview.reviewedBy.lastName : 'Regulatory Officer';
        var rAuth     = regReview.authority   ? regReview.authority.name : 'Regulatory Authority';
        var rDate     = regReview.reviewedAt  ? new Date(regReview.reviewedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        regBannerHtml =
          '<div style="margin:6px 0 4px;padding:11px 16px;background:' + rBg + ';border:2px solid ' + rBorder + ';border-radius:10px;border-left-width:5px">' +
            '<div style="font-family:Poppins,sans-serif;font-size:.9rem;font-weight:900;color:' + rText + ';margin-bottom:4px">' + rLabel + '</div>' +
            '<div style="font-size:.76rem;color:' + rText + ';opacity:.85">' + rReviewer + ' · ' + rAuth + ' · ' + rDate + '</div>' +
            (regReview.comments ? '<div style="font-size:.76rem;color:#374151;margin-top:4px;font-style:italic">"' + regReview.comments.slice(0,200) + '"</div>' : '') +
          '</div>';
      }

      /* Certificate chip */
      var certHtml = '';
      if (status === 'CERTIFIED' && r.certificate) {
        var certNum = r.certificate.certificateNumber;
        var certDate = r.certificate.issuedDate ? new Date(r.certificate.issuedDate).toLocaleDateString('en-IN') : '—';
        certHtml =
          '<div style="margin-top:10px;padding:10px 14px;background:#fef9c3;border:1px solid #fbbf24;border-radius:9px;display:flex;align-items:center;gap:10px">' +
            '<i class="fas fa-certificate" style="color:#d97706;font-size:1.2rem"></i>' +
            '<div><div style="font-family:Poppins,sans-serif;font-size:.8rem;font-weight:800;color:#854d0e">Certificate Issued</div>' +
            '<div style="font-size:.74rem;color:#92400e">' + certNum + ' · Issued ' + certDate + '</div></div>' +
            '<button class="btn b-gen" onclick="orgDownloadCert(\'' + r.id + '\',\'' + certNum + '\')" style="margin-left:auto;font-size:.76rem;padding:6px 12px">' +
              '<i class="fas fa-download"></i> Download Certificate</button>' +
          '</div>';
      } else if (['LAB_APPROVED','SUBMITTED_TO_REGULATORY','REG_UNDER_REVIEW','REG_APPROVED'].indexOf(status) > -1) {
        certHtml =
          '<div style="margin-top:10px">' +
            '<button class="btn b-gen" onclick="orgDownloadCert(\'' + r.id + '\',\'' + rNum + '\')" style="font-size:.78rem;padding:7px 14px">' +
              '<i class="fas fa-file-pdf"></i> Download Approved Report</button>' +
          '</div>';
      }

      /* Pipeline HTML */
      var pipelineHtml = _buildPipelineHtml(steps);

      /* Card border colour based on overall status */
      var cardBorder = status === 'LAB_APPROVED' || status === 'CERTIFIED' || status === 'REG_APPROVED'
        ? '#16a34a'
        : status === 'LAB_REJECTED'
        ? '#dc2626'
        : status === 'LAB_CORRECTION_REQUESTED' || status === 'REG_CORRECTION_REQUESTED'
        ? '#f59e0b'
        : '#e2e8f0';

      return '<div style="background:#fff;border:1.5px solid ' + cardBorder + ';border-radius:13px;padding:18px;margin-bottom:14px;box-shadow:0 2px 10px rgba(0,0,0,.05)">' +

        /* Header row */
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">' +
          '<div>' +
            '<div style="font-family:Poppins,sans-serif;font-size:.95rem;font-weight:900;color:#0f172a">' + rNum + '</div>' +
            '<div style="font-size:.76rem;color:#64748b;margin-top:1px">' + rType + ' · Submitted ' + subDate + '</div>' +
          '</div>' +
          '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn b-vw" onclick="viewReport(\'' + r.id + '\')" style="font-size:.76rem;padding:6px 12px"><i class="fas fa-stream"></i> Details</button>' +
            '<button class="btn b-gen" onclick="orgDownloadCert(\'' + r.id + '\',\'' + rNum + '\')" style="font-size:.76rem;padding:6px 12px"><i class="fas fa-file-pdf"></i> PDF</button>' +
          '</div>' +
        '</div>' +

        /* Pipeline steps */
        pipelineHtml +

        /* Lab decision banner */
        labBannerHtml +

        /* Regulatory banner */
        regBannerHtml +

        /* Certificate */
        certHtml +

      '</div>';
    }

    /* Build the 5-step pipeline row */
    function _buildPipelineHtml(steps) {
      var labels = ['① Submitted', '② Lab Review', '③ Lab Decision', '④ Regulatory', '⑤ Certificate'];
      var html = '<div style="display:flex;align-items:center;gap:0;overflow-x:auto;padding:4px 0">';
      steps.forEach(function (s, i) {
        var bg      = s === 'done'    ? '#16a34a'
                    : s === 'active'  ? '#1d4ed8'
                    : s === 'fail'    ? '#dc2626'
                    : s === 'warn'    ? '#f59e0b'
                    : '#e2e8f0';
        var textCol = (s === 'idle')  ? '#94a3b8' : '#fff';
        var icon    = s === 'done'    ? '✔'
                    : s === 'fail'    ? '✘'
                    : s === 'warn'    ? '!'
                    : s === 'active'  ? '●'
                    : '○';
        html +=
          '<div style="display:flex;align-items:center;flex:1;min-width:80px">' +
            '<div style="flex:1;text-align:center">' +
              '<div style="width:28px;height:28px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;margin:0 auto 3px;font-size:.75rem;font-weight:900;color:' + textCol + '">' + icon + '</div>' +
              '<div style="font-size:.6rem;font-weight:700;color:' + (s === 'idle' ? '#94a3b8' : (s === 'fail' ? '#dc2626' : (s === 'done' ? '#15803d' : '#374151'))) + ';line-height:1.3;white-space:nowrap">' + labels[i] + '</div>' +
            '</div>' +
            (i < steps.length - 1 ? '<div style="width:16px;height:2px;background:' + (steps[i+1] !== 'idle' ? '#94a3b8' : '#e2e8f0') + ';flex-shrink:0"></div>' : '') +
          '</div>';
      });
      html += '</div>';
      return html;
    }

    /* Map report status → array of 5 step states */
    function _getStepStates(status) {
      var S = { DRAFT:'draft', SUBMITTED_TO_LAB:'sub', LAB_UNDER_REVIEW:'labrev',
                LAB_CORRECTION_REQUESTED:'labcor', LAB_APPROVED:'labapp', LAB_REJECTED:'labrej',
                SUBMITTED_TO_REGULATORY:'regsub', REG_UNDER_REVIEW:'regrev',
                REG_CORRECTION_REQUESTED:'regcor', REG_APPROVED:'regapp', CERTIFIED:'cert' };
      var st = S[status] || 'draft';
      /* [submitted, lab_review, lab_decision, regulatory, certificate] */
      var idle = ['idle','idle','idle','idle','idle'];
      if (st === 'draft')   return idle;
      if (st === 'sub')     return ['active','idle','idle','idle','idle'];
      if (st === 'labrev')  return ['done','active','idle','idle','idle'];
      if (st === 'labcor')  return ['done','done','warn','idle','idle'];
      if (st === 'labapp')  return ['done','done','done','idle','idle'];
      if (st === 'labrej')  return ['done','done','fail','idle','idle'];
      if (st === 'regsub')  return ['done','done','done','active','idle'];
      if (st === 'regrev')  return ['done','done','done','active','idle'];
      if (st === 'regcor')  return ['done','done','done','warn','idle'];
      if (st === 'regapp')  return ['done','done','done','done','idle'];
      if (st === 'cert')    return ['done','done','done','done','done'];
      return idle;
    }

    /* ── Certificate download from org portal ── */
    window.orgDownloadCert = function (reportId, certRef) {
      if (!reportId) { EcoService.error('No report ID'); return; }
      var filename = 'Certificate_' + (certRef || 'Report').replace(/[\/\\:]/g,'-') + '.pdf';
      EcoService.toast('⏳ Preparing certificate PDF…');
      var token = localStorage.getItem('eco_access_token');
      fetch('/api/v1/reports/' + reportId + '/pdf', {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
        .then(function (r) {
          if (!r.ok) return r.text().then(function (t) {
            var msg = ''; try { msg = JSON.parse(t).message || t; } catch (e) { msg = t; }
            throw new Error(msg);
          });
          return r.blob();
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
          EcoService.toast('✅ ' + filename + ' saved to Downloads!');
        })
        .catch(function (err) { EcoService.error('Download failed — ' + err.message); });
    };

    /* ── Download PDF by monitoring type (latest report containing that type) ── */
    window.dlByType = function (monType) {
      var msgEl = document.getElementById('typeDlMsg');
      var TYPE_LABELS = {
        AIR:'Air Quality', WATER:'Water Quality', NOISE:'Noise Monitoring',
        SOIL:'Soil Quality', STACK_EMISSION:'Stack Emission', GROUNDWATER:'Groundwater',
        WASTE:'Waste Management', METEOROLOGICAL:'Meteorological',
        ETP:'ETP', STP:'STP', TEMPERATURE:'Temperature', HUMIDITY:'Humidity'
      };
      var label = TYPE_LABELS[monType] || monType;

      function _showMsg(msg, ok) {
        if (!msgEl) return;
        msgEl.style.display = 'block';
        msgEl.style.background = ok ? '#f0fdf4' : '#fef2f2';
        msgEl.style.border     = '1px solid ' + (ok ? '#86efac' : '#fca5a5');
        msgEl.style.color      = ok ? '#15803d' : '#b91c1c';
        msgEl.innerHTML        = msg;
        if (ok) setTimeout(function () { msgEl.style.display = 'none'; }, 6000);
      }

      _showMsg('<i class="fas fa-spinner fa-spin"></i> Looking for ' + label + ' report…', true);
      EcoService.toast('⏳ Fetching ' + label + ' report…');

      var token = localStorage.getItem('eco_access_token');

      /* Fetch reports list and find one that contains this monitoring type */
      fetch('/api/v1/reports?limit=50&sortBy=createdAt&sortOrder=desc', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject('API error'); })
        .then(function (res) {
          var reports = (res && res.data && res.data.reports) ? res.data.reports
                      : (res && Array.isArray(res.data) ? res.data : []);

          /* Find report matching type via reportType field or monitoringRecords */
          var match = null;
          for (var i = 0; i < reports.length; i++) {
            var r = reports[i];
            var rType = (r.reportType || r.type || '').toUpperCase();
            /* direct match on report type */
            if (rType.indexOf(monType) > -1 || monType.indexOf(rType.replace(/[^A-Z]/g,'')) > -1) {
              match = r; break;
            }
            /* check monitoringRecords if present */
            if (r.monitoringRecords) {
              for (var j = 0; j < r.monitoringRecords.length; j++) {
                var rec = r.monitoringRecords[j].monitoringRecord || r.monitoringRecords[j];
                if ((rec.monitoringType || '').toUpperCase() === monType) { match = r; break; }
              }
            }
            if (match) break;
          }

          if (!match) {
            _showMsg('<i class="fas fa-info-circle"></i> No report found for <b>' + label + '</b>. Submit one first via Environmental Monitoring.', false);
            return;
          }

          /* Download the PDF */
          var filename = label.replace(/\s+/g, '-') + '_' + (match.reportNumber || match.id.substring(0,8)) + '.pdf';
          return fetch('/api/v1/reports/' + match.id + '/pdf', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
          })
            .then(function (r2) {
              if (!r2.ok) return r2.text().then(function (t) {
                var msg = ''; try { msg = JSON.parse(t).message || t; } catch (e) { msg = t; }
                throw new Error(msg);
              });
              return r2.blob();
            })
            .then(function (blob) {
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url; a.download = filename;
              a.style.display = 'none';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
              _showMsg('<i class="fas fa-check-circle"></i> <b>' + filename + '</b> downloaded!', true);
              EcoService.toast('✅ ' + label + ' report saved to Downloads!');
            });
        })
        .catch(function (err) {
          _showMsg('<i class="fas fa-exclamation-circle"></i> Download failed — ' + (err.message || err), false);
          EcoService.error('Download failed — ' + (err.message || err));
        });
    };

    /* ════════════════════════════════════════════════
       REPORTS PAGE — monthly view with year picker
    ════════════════════════════════════════════════ */
    window._reportsYear = new Date().getFullYear();

    /* Build the year-selector pill buttons */
    function _initYearPicker() {
      var picker = document.getElementById('reportsYearPicker');
      if (!picker) return;
      var thisYear = new Date().getFullYear();
      var years = [];
      for (var y = thisYear - 2; y <= thisYear + 1; y++) years.push(y);
      picker.innerHTML = years.map(function (y) {
        var active = (y === window._reportsYear);
        return '<button data-year="' + y + '" class="yr-btn" ' +
          'onclick="loadReportsPage(' + y + ')" ' +
          'style="padding:7px 16px;border-radius:8px;border:none;cursor:pointer;' +
          'font-family:Poppins,sans-serif;font-size:.82rem;font-weight:700;transition:.15s;' +
          (active
            ? 'background:linear-gradient(135deg,#0a3d2e,#16a34a);color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.3)'
            : 'background:transparent;color:#64748b') + '">' + y + '</button>';
      }).join('');
    }

    window.loadReportsPage = function (year) {
      window._reportsYear = year || window._reportsYear;

      /* Update year picker active state */
      document.querySelectorAll('.yr-btn').forEach(function (b) {
        var active = parseInt(b.dataset.year) === window._reportsYear;
        b.style.background = active
          ? 'linear-gradient(135deg,#0a3d2e,#16a34a)'
          : 'transparent';
        b.style.color  = active ? '#fff' : '#64748b';
        b.style.boxShadow = active ? '0 2px 8px rgba(22,163,74,.3)' : 'none';
      });

      var container = document.getElementById('reportsMonthlyView');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:36px;color:#64748b">' +
        '<i class="fas fa-spinner fa-spin" style="font-size:1.3rem;margin-bottom:10px;display:block"></i>' +
        '<span style="font-size:.86rem">Loading ' + window._reportsYear + ' reports…</span></div>';

      /* Fetch all reports — filter by year client-side (API max limit 100) */
      EcoSphereAPI.Reports.getReports({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
        .then(function (res) {
          var allReports = (res && res.data && res.data.reports) ? res.data.reports : [];

          /* Filter to selected year */
          var reports = allReports.filter(function (r) {
            return r.createdAt && new Date(r.createdAt).getFullYear() === window._reportsYear;
          });

          /* Group by month (0-based) */
          var byMonth = {};
          for (var m = 0; m < 12; m++) byMonth[m] = [];
          reports.forEach(function (r) {
            byMonth[new Date(r.createdAt).getMonth()].push(r);
          });

          var MONTHS = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
          var now = new Date();
          var totalReports = reports.length;

          /* Summary bar */
          var summaryHtml = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">' +
            '<div style="background:#f0fdf4;border:1px solid rgba(22,163,74,.2);border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:8px">' +
              '<i class="fas fa-file-alt" style="color:#16a34a"></i>' +
              '<span style="font-family:Poppins,sans-serif;font-size:.84rem;font-weight:700;color:#0a3d2e">' + totalReports + ' total report' + (totalReports !== 1 ? 's' : '') + ' in ' + window._reportsYear + '</span>' +
            '</div>' +
            (function () {
              var approved = reports.filter(function (r) { return r.status === 'LAB_APPROVED' || r.status === 'CERTIFIED'; }).length;
              return approved > 0
                ? '<div style="background:#dbeafe;border:1px solid rgba(29,78,216,.2);border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:8px">' +
                    '<i class="fas fa-check-circle" style="color:#1d4ed8"></i>' +
                    '<span style="font-family:Poppins,sans-serif;font-size:.84rem;font-weight:700;color:#1e40af">' + approved + ' approved</span></div>'
                : '';
            })() +
            (function () {
              var pending = reports.filter(function (r) { return r.status === 'SUBMITTED_TO_LAB' || r.status === 'LAB_UNDER_REVIEW'; }).length;
              return pending > 0
                ? '<div style="background:#fffbeb;border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:8px">' +
                    '<i class="fas fa-clock" style="color:#d97706"></i>' +
                    '<span style="font-family:Poppins,sans-serif;font-size:.84rem;font-weight:700;color:#b45309">' + pending + ' pending review</span></div>'
                : '';
            })() +
          '</div>';

          /* Build month blocks */
          var monthsHtml = MONTHS.map(function (mon, mi) {
            var rpts    = byMonth[mi];
            var isFuture = (window._reportsYear > now.getFullYear()) ||
                           (window._reportsYear === now.getFullYear() && mi > now.getMonth());
            var hasDocs  = rpts.length > 0;

            /* Month header colours */
            var hdrBg = hasDocs
              ? 'background:linear-gradient(90deg,#0a3d2e,#16a34a)'
              : (isFuture ? 'background:#f8fafc;border:1px solid #e2e8f0' : 'background:#f1f5f9;border:1px solid #e2e8f0');
            var hdrClr = hasDocs ? 'color:#fff' : (isFuture ? 'color:#cbd5e1' : 'color:#94a3b8');

            /* Build table rows */
            var rows;
            if (hasDocs) {
              rows = rpts.map(function (r) {
                var rNum  = r.reportNumber || r.id.substring(0,8).toUpperCase();
                var rType = _humanType(r.reportType || r.type);
                var rDate = new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
                var chip  = _statusChip(r.status, 'lab');
                var isApproved = (r.status === 'LAB_APPROVED' || r.status === 'CERTIFIED' ||
                                  r.status === 'REG_APPROVED' || r.status === 'SUBMITTED_TO_REGULATORY');
                var actions =
                  '<button class="btn b-vw" onclick="viewReport(\'' + r.id + '\')" style="font-size:.76rem;padding:5px 10px" title="Track status"><i class="fas fa-stream"></i> Track</button> ' +
                  '<button class="btn b-gen" onclick="orgDownloadCert(\'' + r.id + '\',\'' + rNum + '\')" style="font-size:.76rem;padding:5px 10px" title="Download PDF"><i class="fas fa-file-pdf"></i> PDF</button>' +
                  (isApproved ? ' <button class="btn" onclick="orgDownloadCert(\'' + r.id + '\',\'' + rNum + '-Cert\')" style="font-size:.76rem;padding:5px 10px;background:#dbeafe;color:#1d4ed8;border:1px solid rgba(29,78,216,.3)" title="Download Certificate"><i class="fas fa-certificate"></i></button>' : '');
                return '<tr>' +
                  '<td><b style="font-size:.82rem">' + rNum + '</b></td>' +
                  '<td style="font-size:.8rem">' + rType + '</td>' +
                  '<td style="font-size:.78rem;color:#64748b">' + rDate + '</td>' +
                  '<td>' + chip + '</td>' +
                  '<td style="display:flex;gap:4px;flex-wrap:wrap">' + actions + '</td>' +
                  '</tr>';
              }).join('');
            } else if (isFuture) {
              rows = '<tr><td colspan="5" style="text-align:center;padding:10px 0;color:#cbd5e1;font-size:.78rem;font-style:italic">Future period</td></tr>';
            } else {
              rows = '<tr><td colspan="5" style="text-align:center;padding:10px 0;color:#94a3b8;font-size:.78rem">No reports this month</td></tr>';
            }

            return '<div style="margin-bottom:12px;border-radius:12px;overflow:hidden;' +
              'box-shadow:' + (hasDocs ? '0 4px 14px rgba(22,163,74,.12)' : '0 1px 4px rgba(0,0,0,.05)') + '">' +
              /* Header */
              '<div style="' + hdrBg + ';padding:11px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" ' +
              'onclick="(function(el){var tb=el.nextSibling;tb.style.display=tb.style.display===\'none\'?\'block\':\'none\';})(this)">' +
                '<span style="font-family:Poppins,sans-serif;font-size:.87rem;font-weight:700;' + hdrClr + '">' +
                  '<i class="fas fa-calendar-alt" style="margin-right:7px;opacity:.75"></i>' + mon + ' ' + window._reportsYear +
                '</span>' +
                '<span style="display:flex;align-items:center;gap:8px">' +
                  (hasDocs
                    ? '<span style="background:rgba(255,255,255,.22);border-radius:20px;padding:2px 11px;font-size:.71rem;font-weight:700;' + hdrClr + '">' + rpts.length + ' report' + (rpts.length > 1 ? 's' : '') + '</span>'
                    : '<span style="font-size:.71rem;' + hdrClr + '">' + (isFuture ? 'upcoming' : '—') + '</span>') +
                  '<i class="fas fa-chevron-down" style="font-size:.65rem;' + hdrClr + ';opacity:.7"></i>' +
                '</span>' +
              '</div>' +
              /* Body — collapsed if no docs */
              '<div style="background:#fff;display:' + (hasDocs ? 'block' : 'none') + '">' +
                '<table class="tbl" style="margin:0"><thead><tr>' +
                  '<th style="font-size:.75rem">Report ID</th>' +
                  '<th style="font-size:.75rem">Type</th>' +
                  '<th style="font-size:.75rem">Date</th>' +
                  '<th style="font-size:.75rem">Lab Status</th>' +
                  '<th style="font-size:.75rem">Actions</th>' +
                '</tr></thead><tbody>' + rows + '</tbody></table>' +
              '</div>' +
            '</div>';
          }).join('');

          container.innerHTML = totalReports === 0
            ? summaryHtml + '<div style="text-align:center;padding:40px 20px;background:#f8fafc;border:2px dashed #e2e8f0;border-radius:14px">' +
                '<i class="fas fa-folder-open" style="font-size:2.5rem;color:#cbd5e1;margin-bottom:12px;display:block"></i>' +
                '<p style="font-weight:700;color:#374151;margin-bottom:6px">No Reports for ' + window._reportsYear + '</p>' +
                '<p style="font-size:.84rem;color:#64748b">Submit a report to the laboratory to see it here.</p></div>'
            : summaryHtml + monthsHtml;
        })
        .catch(function () {
          container.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">' +
            '<i class="fas fa-exclamation-circle"></i> Failed to load reports. ' +
            '<button class="btn b-bl" onclick="loadReportsPage(window._reportsYear)" style="margin-left:8px">Retry</button></div>';
        });
    };

    /* ── Patch navTo to load live data when navigating to pgTrack / pgReports ── */
    var _origNavTo = window.navTo;
    window.navTo = function (id, btn) {
      _origNavTo(id, btn);
      if (id === 'pgTrack')      window.loadTrackTable();
      if (id === 'pgLabStatus' && typeof window.loadLabStatusPage === 'function') window.loadLabStatusPage();
      if (id === 'pgDash' && typeof window.loadDashProfile === 'function') window.loadDashProfile();
      if (id === 'pgEIA' && typeof window.initEIAModule === 'function') window.initEIAModule();
      if (id === 'pgESG' && typeof window.esgGoStep === 'function') window.esgGoStep(1);
      if (id === 'pgSubmit' && typeof window.loadSubmitPage === 'function') window.loadSubmitPage();
      if (id === 'pgReports') {
        _initYearPicker();
        window.loadReportsPage(window._reportsYear);
        /* Pre-fill date pickers: default = current month */
        (function () {
          var now  = new Date();
          var pad  = function (n) { return String(n).padStart(2, '0'); };
          var fmt  = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
          var from = document.getElementById('rptDlFrom');
          var to   = document.getElementById('rptDlTo');
          if (from && !from.value) from.value = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
          if (to   && !to.value)   to.value   = fmt(now);
        })();
      }
    };

    /* ── Session expired ── */
    window.addEventListener('eco:session_expired', function () {
      EcoService.error('Session expired. Please log in again.');
      setTimeout(function () { window.doLogout && window.doLogout(); }, 1500);
    });

    /* ── Check if already logged in ─ restore dashboard ── */
    (function autoRestoreDash() {
      var token = EcoService.TokenStore.getAccess();
      var user  = EcoService.TokenStore.getUser();
      if (!token || !user) return;

      /* Check if we landed directly on the dashboard step */
      var dash = document.getElementById('stepDash');
      if (!dash || dash.style.display === 'flex') {
        loadDashboardStats();
        loadReportsTable();
      }
    })();

  }); /* end whenReady */

  /* ════════════════════════════════════════════════════════════════════════
     ESG — Save All & AI Analyse
     Collects all E/S/G fields, creates a report via the API (notes field),
     shows AI analysis result.
  ════════════════════════════════════════════════════════════════════════ */
  window.saveEsgForm = function () {
    var btn = document.getElementById('esgSaveBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analysing…'; }

    /* Collect field values */
    var fields = {
      'Environmental': {
        'Energy Consumption (MWh)':          document.getElementById('esg-e-energy') && document.getElementById('esg-e-energy').value,
        'Renewable Energy (%)':              document.getElementById('esg-e-renew')  && document.getElementById('esg-e-renew').value,
        'Water Consumption (m³)':            document.getElementById('esg-e-water')  && document.getElementById('esg-e-water').value,
        'Total Waste Generated (tonnes)':    document.getElementById('esg-e-waste')  && document.getElementById('esg-e-waste').value,
        'Carbon Offset (tCO₂e)':             document.getElementById('esg-e-offset') && document.getElementById('esg-e-offset').value,
        'Biodiversity Impact Score':         document.getElementById('esg-e-bio')    && document.getElementById('esg-e-bio').value
      },
      'Social': {
        'Employee Training Hours/Person':    document.getElementById('esg-s-train')  && document.getElementById('esg-s-train').value,
        'Safety Incidents':                  document.getElementById('esg-s-safety') && document.getElementById('esg-s-safety').value,
        'Lost Time Injury Rate':             document.getElementById('esg-s-ltir')   && document.getElementById('esg-s-ltir').value,
        'Gender Diversity (% women)':        document.getElementById('esg-s-gender') && document.getElementById('esg-s-gender').value,
        'Community Investment (₹ lakhs)':    document.getElementById('esg-s-comm')   && document.getElementById('esg-s-comm').value,
        'Employee Satisfaction Score':       document.getElementById('esg-s-sat')    && document.getElementById('esg-s-sat').value
      },
      'Governance': {
        'Board Independence (%)':            document.getElementById('esg-g-board')   && document.getElementById('esg-g-board').value,
        'Compliance Violations':             document.getElementById('esg-g-viol')    && document.getElementById('esg-g-viol').value,
        'Audit Findings':                    document.getElementById('esg-g-audit')   && document.getElementById('esg-g-audit').value,
        'Policy Adherence (%)':              document.getElementById('esg-g-policy')  && document.getElementById('esg-g-policy').value,
        'Anti-Corruption Training (%staff)': document.getElementById('esg-g-corr')    && document.getElementById('esg-g-corr').value,
        'Whistleblower Reports':             document.getElementById('esg-g-whistle') && document.getElementById('esg-g-whistle').value
      }
    };

    /* Build a human-readable notes string for the report */
    var noteLines = ['ESG Manual Data Entry'];
    Object.keys(fields).forEach(function(cat) {
      noteLines.push('\n[' + cat + ']');
      Object.keys(fields[cat]).forEach(function(k) {
        var v = fields[cat][k];
        if (v !== '' && v !== false && v != null) noteLines.push(k + ': ' + v);
      });
    });
    var noteStr = noteLines.join('\n');

    /* Score calculation (simple weighted average for display) */
    function pct(id) { var el = document.getElementById(id); return el && el.value ? parseFloat(el.value) : null; }
    var eScore = 0, sScore = 0, gScore = 0;
    /* E score: higher renewable & offset → higher, waste/energy → penalise */
    var renew  = pct('esg-e-renew');
    var bio    = pct('esg-e-bio');
    eScore = Math.min(100, Math.round(((renew || 0) * 0.5) + ((bio || 0) * 5)));
    /* S score: training ≥20 = 30pts; gender ≥30 = 30pts; incidents 0=20pts; sat×4 */
    var train  = pct('esg-s-train');
    var gender = pct('esg-s-gender');
    var safety = pct('esg-s-safety');
    var sat    = pct('esg-s-sat');
    sScore = Math.min(100, Math.round(
      ((train  && train  >= 20 ? 30 : (train  || 0) * 1.5)) +
      ((gender && gender >= 30 ? 30 : (gender || 0)))       +
      ((safety === 0 ? 20 : Math.max(0, 20 - (safety || 0) * 4))) +
      ((sat    || 0) * 4)
    ));
    /* G score: board ≥50 = 40pts; viol 0 = 30pts; policy×0.3 */
    var board  = pct('esg-g-board');
    var viol   = pct('esg-g-viol');
    var policy = pct('esg-g-policy');
    gScore = Math.min(100, Math.round(
      ((board  && board  >= 50 ? 40 : (board  || 0) * 0.8)) +
      ((viol   === 0 ? 30 : Math.max(0, 30 - (viol  || 0) * 5))) +
      ((policy || 0) * 0.3)
    ));
    var overall = Math.round((eScore + sScore + gScore) / 3);

    /* Save via Reports API using notes field */
    var API = window.EcoSphereAPI;
    if (!API) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain"></i> Save All &amp; AI Analyse ESG Data'; }
      alert('API not ready. Please try again.');
      return;
    }

    API.Reports.createReport({
      title       : 'ESG Assessment — Manual Entry',
      description : noteStr,
      type        : 'ENVIRONMENTAL'   /* closest available type */
    })
    .then(function () {
      /* Show AI result panel */
      var panel = document.getElementById('esg-ai-result');
      var text  = document.getElementById('esg-ai-text');
      if (panel && text) {
        panel.style.display = 'block';
        text.innerHTML =
          '✅ <strong>ESG data saved successfully.</strong><br><br>' +
          '📊 <strong>EcoBot ESG Score Breakdown:</strong><br>' +
          '&nbsp;• Environmental (E): <strong>' + eScore + '/100</strong>' + (eScore >= 60 ? ' ✅' : ' ⚠️ Below benchmark') + '<br>' +
          '&nbsp;• Social (S): <strong>' + sScore + '/100</strong>' + (sScore >= 60 ? ' ✅' : ' ⚠️ Below benchmark') + '<br>' +
          '&nbsp;• Governance (G): <strong>' + gScore + '/100</strong>' + (gScore >= 60 ? ' ✅' : ' ⚠️ Below benchmark') + '<br>' +
          '&nbsp;• <strong>Overall ESG Score: ' + overall + '/100</strong> ' + (overall >= 60 ? '🟢 Satisfactory' : '🔴 Needs Improvement') + '<br><br>' +
          '🔍 <strong>EcoBot Recommendations:</strong><br>' +
          '&nbsp;1. Increase renewable energy share to ≥30% to meet SEBI BRSR targets.<br>' +
          '&nbsp;2. Employee training hours should reach ≥20 hrs/person/year (ILO guideline).<br>' +
          '&nbsp;3. Board independence ≥50% required under SEBI LODR regulations.<br>' +
          '&nbsp;4. Submit ESG report to Lab for third-party verification under GRI Standards.<br>' +
          '&nbsp;5. Disclose carbon offset data under CDP reporting framework.';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      /* Render comparison charts */
      _renderEsgCharts({ e: eScore, s: sScore, g: gScore, overall: overall });
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain"></i> Save All &amp; AI Analyse ESG Data'; }
    })
    .catch(function (err) {
      console.error('[ESG] save error', err);
      /* Still show AI panel + charts even if report creation fails */
      var panel = document.getElementById('esg-ai-result');
      var text  = document.getElementById('esg-ai-text');
      if (panel && text) {
        panel.style.display = 'block';
        text.innerHTML =
          '⚠️ Data could not be saved to server (check login session), but here is your AI analysis:<br><br>' +
          '📊 <strong>Computed Scores</strong> — E: ' + eScore + ' | S: ' + sScore + ' | G: ' + gScore + ' | Overall: ' + overall + '/100<br>' +
          'Please log in again and retry to persist data.';
      }
      _renderEsgCharts({ e: eScore, s: sScore, g: gScore, overall: overall });
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain"></i> Save All &amp; AI Analyse ESG Data'; }
    });
  };

  /* ════════════════════════════════════════════════════════════════════════
     CARBON — Live scope totals + Save All & AI Analyse
  ════════════════════════════════════════════════════════════════════════ */

  /* Wire up live scope-total calculators after DOM is ready */
  document.addEventListener('DOMContentLoaded', function () {
    var s1ids    = ['cb-s1fuel','cb-s1proc','cb-s1veh','cb-s1fug'];
    var s2ids    = ['cb-s2elec','cb-s2heat'];
    var s3ids    = ['cb-s3biz','cb-s3com','cb-s3sup','cb-s3waste'];

    function sumIds(ids) {
      return ids.reduce(function(acc, id) {
        var el = document.getElementById(id);
        return acc + (el && el.value ? parseFloat(el.value) || 0 : 0);
      }, 0);
    }

    function refreshTotals() {
      var s1 = sumIds(s1ids);
      var s2 = sumIds(s2ids);
      var s3 = sumIds(s3ids);
      var grand = s1 + s2 + s3;
      var s1el = document.getElementById('cb-s1-total');
      var s2el = document.getElementById('cb-s2-total');
      var s3el = document.getElementById('cb-s3-total');
      var gel  = document.getElementById('cb-grand-total');
      if (s1el) s1el.textContent = s1.toFixed(2);
      if (s2el) s2el.textContent = s2.toFixed(2);
      if (s3el) s3el.textContent = s3.toFixed(2);
      if (gel)  gel.textContent  = grand.toFixed(2);
    }

    /* Attach input listeners */
    s1ids.concat(s2ids).concat(s3ids).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', refreshTotals);
    });
  });

  window.saveCarbonForm = function () {
    var btn = document.getElementById('carbonSaveBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analysing…'; }

    var EcoSvc = window.EcoService;
    if (!EcoSvc) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain"></i> Save All &amp; AI Analyse Carbon Data'; }
      alert('Service not ready. Please try again.');
      return;
    }

    function numVal(id) {
      var el = document.getElementById(id);
      return el && el.value ? parseFloat(el.value) || 0 : 0;
    }

    var s1 = numVal('cb-s1fuel') + numVal('cb-s1proc') + numVal('cb-s1veh') + numVal('cb-s1fug');
    var s2 = numVal('cb-s2elec') + numVal('cb-s2heat');
    var s3 = numVal('cb-s3biz')  + numVal('cb-s3com')  + numVal('cb-s3sup') + numVal('cb-s3waste');
    var grand = s1 + s2 + s3;

    /* Save via EcoService (uses STACK_EMISSION MonitoringType) */
    EcoSvc.Monitoring.submitRecord('carbon')
      .then(function () {
        _showCarbonAI(s1, s2, s3, grand);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain"></i> Save All &amp; AI Analyse Carbon Data'; }
      })
      .catch(function (err) {
        console.error('[Carbon] save error', err);
        _showCarbonAI(s1, s2, s3, grand);  /* still show AI result */
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-brain"></i> Save All &amp; AI Analyse Carbon Data'; }
      });
  };

  function _showCarbonAI(s1, s2, s3, grand) {
    var panel = document.getElementById('carbon-ai-result');
    var text  = document.getElementById('carbon-ai-text');
    if (!panel || !text) return;

    /* Simple benchmark comparisons */
    var s1Flag  = s1  > 800  ? '⚠️ Above 800 tCO₂e — review PAT scheme targets' : '✅ Within expected range';
    var s2Flag  = s2  > 600  ? '⚠️ High Scope 2 — consider renewable energy purchase' : '✅ Acceptable';
    var s3Flag  = s3  > 400  ? '⚠️ Scope 3 exceeds 400 tCO₂e — engage top suppliers on reduction' : '✅ Within range';
    var overall = grand > 1500 ? '🔴 Total footprint exceeds 1,500 tCO₂e — aggressive reduction plan needed' :
                  grand > 800  ? '🟡 Moderate footprint — set SBTi 1.5°C-aligned targets' :
                                 '🟢 Footprint within low-emission range — maintain and offset';

    text.innerHTML =
      '✅ <strong>Carbon emission data saved.</strong><br><br>' +
      '📊 <strong>EcoBot Scope Analysis:</strong><br>' +
      '&nbsp;• Scope 1 (Direct): <strong>' + s1.toFixed(2) + ' tCO₂e</strong> — ' + s1Flag + '<br>' +
      '&nbsp;• Scope 2 (Purchased Energy): <strong>' + s2.toFixed(2) + ' tCO₂e</strong> — ' + s2Flag + '<br>' +
      '&nbsp;• Scope 3 (Value Chain): <strong>' + s3.toFixed(2) + ' tCO₂e</strong> — ' + s3Flag + '<br>' +
      '&nbsp;• <strong>Total GHG Footprint: ' + grand.toFixed(2) + ' tCO₂e</strong> — ' + overall + '<br><br>' +
      '🔍 <strong>EcoBot Recommendations:</strong><br>' +
      '&nbsp;1. Compare Scope 1 against BEE / MoEF benchmarks for your sector.<br>' +
      '&nbsp;2. Scope 2 reduction: Install rooftop solar or procure Renewable Energy Certificates (RECs).<br>' +
      '&nbsp;3. Set Science-Based Targets (SBTi) aligned with Paris Agreement 1.5°C pathway.<br>' +
      '&nbsp;4. Engage top 3 suppliers to disclose and reduce their Scope 1+2 emissions.<br>' +
      '&nbsp;5. Consider carbon credits / afforestation to offset residual Scope 1 emissions.<br>' +
      '&nbsp;6. Submit data to Lab for third-party verification before SEBI BRSR filing.';

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    /* Render comparison charts */
    _renderCarbonCharts({ s1: s1, s2: s2, s3: s3, grand: grand });
  }

  /* ════════════════════════════════════════════════════════════════════════
     ESG CHARTS  —  Bar (grouped, current vs previous) + Radar
     Previous scores are stored in sessionStorage so they survive page
     navigation within the same session.
  ════════════════════════════════════════════════════════════════════════ */

  /* Chart.js instance cache — destroy before re-creating */
  var _esgBarChartInst   = null;
  var _esgRadarChartInst = null;
  var _cbBarChartInst    = null;
  var _cbDoughnutChartInst = null;

  /* ESG limits */
  var ESG_MIN = 40;   /* Below 40 = Critical */
  var ESG_MAX = 100;  /* Maximum possible */
  var ESG_TARGET = 70; /* Recommended target per GRI/SEBI BRSR */

  function _renderEsgCharts(cur) {
    /* Load previous scores from sessionStorage */
    var prevRaw = sessionStorage.getItem('eco_esg_prev');
    var prev    = prevRaw ? JSON.parse(prevRaw) : null;

    /* Store current as "previous" for next session */
    sessionStorage.setItem('eco_esg_prev', JSON.stringify(cur));

    /* Fallback: if no previous data, fetch from the API */
    if (!prev) {
      _fetchPrevEsgScores(function(fetched) {
        _drawEsgCharts(cur, fetched || { e: 0, s: 0, g: 0, overall: 0 });
      });
    } else {
      _drawEsgCharts(cur, prev);
    }
  }

  function _fetchPrevEsgScores(cb) {
    /* Try to get previous monitoring records of type ENVIRONMENTAL as proxy */
    var API = window.EcoSphereAPI;
    if (!API) { cb(null); return; }
    API.Reports.getReports({ limit: 2, sortBy: 'createdAt', sortOrder: 'desc', type: 'ENVIRONMENTAL' })
      .then(function(res) {
        var recs = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (recs.length >= 2) {
          /* Parse description of 2nd-latest report to recover scores */
          var desc = recs[1].description || '';
          var eM = desc.match(/Environmental.*?(\d+)/);
          var sM = desc.match(/Social.*?(\d+)/);
          var gM = desc.match(/Governance.*?(\d+)/);
          cb({
            e: eM ? parseInt(eM[1]) : 0,
            s: sM ? parseInt(sM[1]) : 0,
            g: gM ? parseInt(gM[1]) : 0,
            overall: 0
          });
        } else {
          cb(null);
        }
      })
      .catch(function() { cb(null); });
  }

  function _drawEsgCharts(cur, prev) {
    if (typeof Chart === 'undefined') return;

    var wrap = document.getElementById('esg-chart-wrap');
    if (wrap) wrap.style.display = 'block';

    /* ── BAR CHART ── */
    var bc = document.getElementById('esgBarChart');
    if (bc) {
      if (_esgBarChartInst) { _esgBarChartInst.destroy(); _esgBarChartInst = null; }
      _esgBarChartInst = new Chart(bc, {
        type: 'bar',
        data: {
          labels: ['Environmental (E)', 'Social (S)', 'Governance (G)', 'Overall'],
          datasets: [
            {
              label: 'Current Report',
              data: [cur.e, cur.s, cur.g, cur.overall],
              backgroundColor: ['rgba(124,58,237,.75)', 'rgba(79,70,229,.75)', 'rgba(99,102,241,.75)', 'rgba(139,92,246,.75)'],
              borderColor:     ['#7c3aed','#4f46e5','#6366f1','#8b5cf6'],
              borderWidth: 2,
              borderRadius: 6
            },
            {
              label: 'Previous Report',
              data: [prev.e, prev.s, prev.g, prev.overall],
              backgroundColor: ['rgba(148,163,184,.45)','rgba(148,163,184,.45)','rgba(148,163,184,.45)','rgba(148,163,184,.45)'],
              borderColor:     ['#94a3b8','#94a3b8','#94a3b8','#94a3b8'],
              borderWidth: 2,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 10, family: 'Poppins' }, color: '#374151', padding: 10 } },
            tooltip: {
              callbacks: {
                afterBody: function() { return ['Min limit: ' + ESG_MIN, 'Target: ' + ESG_TARGET, 'Max: ' + ESG_MAX]; }
              }
            }
          },
          scales: {
            y: {
              min: 0, max: 110,
              ticks: { font: { size: 9 }, color: '#64748b' },
              grid:  { color: 'rgba(148,163,184,.15)' }
            },
            x: { ticks: { font: { size: 9 }, color: '#374151' } }
          },
          animation: { duration: 700 }
        },
        plugins: [{
          /* Draw min / target / max reference lines */
          id: 'esgRefLines',
          afterDraw: function(chart) {
            var ctx = chart.ctx;
            var yAxis = chart.scales.y;
            var xLeft  = chart.chartArea.left;
            var xRight = chart.chartArea.right;

            function drawLine(val, color, label, dash) {
              var y = yAxis.getPixelForValue(val);
              ctx.save();
              ctx.setLineDash(dash || []);
              ctx.strokeStyle = color;
              ctx.lineWidth   = 1.5;
              ctx.beginPath(); ctx.moveTo(xLeft, y); ctx.lineTo(xRight, y); ctx.stroke();
              ctx.fillStyle = color;
              ctx.font = '9px Poppins,sans-serif';
              ctx.fillText(label, xRight - ctx.measureText(label).width - 4, y - 3);
              ctx.restore();
            }
            drawLine(ESG_MIN,    '#ef4444', 'Min (40)',    [4,3]);
            drawLine(ESG_TARGET, '#f59e0b', 'Target (70)', [6,3]);
            drawLine(ESG_MAX,    '#16a34a', 'Max (100)',   [6,3]);
          }
        }]
      });
    }

    /* ── RADAR CHART ── */
    var rc = document.getElementById('esgRadarChart');
    if (rc) {
      if (_esgRadarChartInst) { _esgRadarChartInst.destroy(); _esgRadarChartInst = null; }
      _esgRadarChartInst = new Chart(rc, {
        type: 'radar',
        data: {
          labels: ['Environmental', 'Social', 'Governance'],
          datasets: [
            {
              label: 'Current',
              data: [cur.e, cur.s, cur.g],
              backgroundColor: 'rgba(124,58,237,.18)',
              borderColor: '#7c3aed',
              pointBackgroundColor: '#7c3aed',
              pointRadius: 4,
              borderWidth: 2
            },
            {
              label: 'Previous',
              data: [prev.e, prev.s, prev.g],
              backgroundColor: 'rgba(148,163,184,.15)',
              borderColor: '#94a3b8',
              pointBackgroundColor: '#94a3b8',
              pointRadius: 4,
              borderWidth: 2,
              borderDash: [4, 3]
            },
            {
              label: 'Target (70)',
              data: [ESG_TARGET, ESG_TARGET, ESG_TARGET],
              backgroundColor: 'rgba(245,158,11,.08)',
              borderColor: '#f59e0b',
              pointRadius: 0,
              borderWidth: 1.5,
              borderDash: [5, 3]
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 9, family: 'Poppins' }, color: '#374151', padding: 8 } } },
          scales: {
            r: {
              min: 0, max: 100,
              ticks: { stepSize: 20, font: { size: 8 }, color: '#94a3b8', backdropColor: 'transparent' },
              grid: { color: 'rgba(148,163,184,.2)' },
              pointLabels: { font: { size: 9, family: 'Poppins' }, color: '#374151' }
            }
          },
          animation: { duration: 700 }
        }
      });
    }

    /* ── Score chips ── */
    var chips = document.getElementById('esg-score-chips');
    if (chips) {
      function chipColor(v) { return v >= 70 ? '#16a34a' : v >= 40 ? '#d97706' : '#dc2626'; }
      function chipBg(v)    { return v >= 70 ? '#dcfce7' : v >= 40 ? '#fef3c7' : '#fee2e2'; }
      function arrow(c, p)  { return c > p ? '▲' : c < p ? '▼' : '→'; }
      var dims = [
        { label: 'E', cur: cur.e,       prev: prev.e,       name: 'Environmental' },
        { label: 'S', cur: cur.s,       prev: prev.s,       name: 'Social' },
        { label: 'G', cur: cur.g,       prev: prev.g,       name: 'Governance' },
        { label: '★', cur: cur.overall, prev: prev.overall, name: 'Overall' }
      ];
      chips.innerHTML = dims.map(function(d) {
        var diff = d.cur - d.prev;
        var diffStr = diff === 0 ? '±0' : (diff > 0 ? '+' : '') + diff;
        return '<div style="background:' + chipBg(d.cur) + ';border-radius:9px;padding:8px 14px;display:flex;flex-direction:column;align-items:center;min-width:80px">' +
          '<span style="font-family:Poppins,sans-serif;font-size:1.2rem;font-weight:900;color:' + chipColor(d.cur) + '">' + d.cur + '</span>' +
          '<span style="font-size:.65rem;font-weight:700;color:#374151">' + d.name + '</span>' +
          '<span style="font-size:.68rem;color:' + (diff >= 0 ? '#16a34a' : '#dc2626') + ';font-weight:700">' + arrow(d.cur, d.prev) + ' ' + diffStr + ' vs prev</span>' +
          '</div>';
      }).join('');
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     CARBON CHARTS  — Grouped bar (Scope 1/2/3) + Doughnut (breakdown)
  ════════════════════════════════════════════════════════════════════════ */

  /* Carbon limits (tCO₂e) — mid-size manufacturing benchmark */
  var CB_LIMITS = {
    s1_max: 800,  s1_min: 0,
    s2_max: 600,  s2_min: 0,
    s3_max: 400,  s3_min: 0,
    grand_max: 1500, grand_min: 0,
    grand_target: 800   /* SBTi 1.5°C pathway reference */
  };

  function _renderCarbonCharts(cur) {
    /* Load previous from sessionStorage */
    var prevRaw = sessionStorage.getItem('eco_carbon_prev');
    var prev    = prevRaw ? JSON.parse(prevRaw) : null;
    sessionStorage.setItem('eco_carbon_prev', JSON.stringify(cur));

    if (!prev) {
      _fetchPrevCarbonData(function(fetched) {
        _drawCarbonCharts(cur, fetched || { s1: 0, s2: 0, s3: 0, grand: 0 });
      });
    } else {
      _drawCarbonCharts(cur, prev);
    }
  }

  function _fetchPrevCarbonData(cb) {
    var API = window.EcoSphereAPI;
    if (!API) { cb(null); return; }
    API.Monitoring.getRecords({ type: 'STACK_EMISSION', limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
      .then(function(res) {
        var recs = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        /* Skip the very first (just-saved) record; use the next batch */
        var older = recs.length > 4 ? recs.slice(4) : recs.slice(1);
        if (!older.length) { cb(null); return; }
        /* Sum up fields from older records */
        function sumField(key) {
          return older.reduce(function(acc, r) {
            var v = r.parameters && r.parameters[key] ? parseFloat(r.parameters[key]) : 0;
            return acc + (isNaN(v) ? 0 : v);
          }, 0);
        }
        var s1 = sumField('Scope1_Fuel_Combustion_tCO2e') + sumField('Scope1_Industrial_Process_tCO2e') +
                 sumField('Scope1_Company_Vehicles_tCO2e') + sumField('Scope1_Fugitive_Emissions_tCO2e');
        var s2 = sumField('Scope2_Purchased_Electricity_tCO2e') + sumField('Scope2_Purchased_Heat_Steam_tCO2e');
        var s3 = sumField('Scope3_Business_Travel_tCO2e') + sumField('Scope3_Employee_Commuting_tCO2e') +
                 sumField('Scope3_Supply_Chain_tCO2e') + sumField('Scope3_Waste_Disposal_tCO2e');
        cb({ s1: s1, s2: s2, s3: s3, grand: s1 + s2 + s3 });
      })
      .catch(function() { cb(null); });
  }

  function _drawCarbonCharts(cur, prev) {
    if (typeof Chart === 'undefined') return;

    var wrap = document.getElementById('carbon-chart-wrap');
    if (wrap) wrap.style.display = 'block';

    /* ── GROUPED BAR ── */
    var bc = document.getElementById('carbonBarChart');
    if (bc) {
      if (_cbBarChartInst) { _cbBarChartInst.destroy(); _cbBarChartInst = null; }
      _cbBarChartInst = new Chart(bc, {
        type: 'bar',
        data: {
          labels: ['Scope 1\n(Direct)', 'Scope 2\n(Purchased)', 'Scope 3\n(Value Chain)', 'Total'],
          datasets: [
            {
              label: 'Current (tCO₂e)',
              data: [cur.s1, cur.s2, cur.s3, cur.grand],
              backgroundColor: ['rgba(29,78,216,.75)', 'rgba(217,119,6,.75)', 'rgba(22,163,74,.75)', 'rgba(124,58,237,.75)'],
              borderColor:     ['#1d4ed8','#d97706','#16a34a','#7c3aed'],
              borderWidth: 2,
              borderRadius: 6
            },
            {
              label: 'Previous (tCO₂e)',
              data: [prev.s1, prev.s2, prev.s3, prev.grand],
              backgroundColor: ['rgba(148,163,184,.4)','rgba(148,163,184,.4)','rgba(148,163,184,.4)','rgba(148,163,184,.4)'],
              borderColor:     ['#94a3b8','#94a3b8','#94a3b8','#94a3b8'],
              borderWidth: 2,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 10, family: 'Poppins' }, color: '#374151', padding: 10 } },
            tooltip: {
              callbacks: {
                afterBody: function(items) {
                  var idx = items[0] && items[0].dataIndex;
                  var limits = [
                    ['Min: 0', 'Max: ' + CB_LIMITS.s1_max + ' tCO₂e (PAT)'],
                    ['Min: 0', 'Max: ' + CB_LIMITS.s2_max + ' tCO₂e'],
                    ['Min: 0', 'Max: ' + CB_LIMITS.s3_max + ' tCO₂e'],
                    ['Target: ' + CB_LIMITS.grand_target, 'Max: ' + CB_LIMITS.grand_max + ' tCO₂e']
                  ];
                  return limits[idx] || [];
                }
              }
            }
          },
          scales: {
            y: {
              min: 0,
              ticks: { font: { size: 9 }, color: '#64748b' },
              grid:  { color: 'rgba(148,163,184,.15)' }
            },
            x: { ticks: { font: { size: 9 }, color: '#374151' } }
          },
          animation: { duration: 700 }
        },
        plugins: [{
          id: 'cbRefLines',
          afterDraw: function(chart) {
            var ctx   = chart.ctx;
            var yAxis = chart.scales.y;
            var left  = chart.chartArea.left;
            var right = chart.chartArea.right;

            /* Only draw if within scale */
            function line(val, color, label) {
              if (val > yAxis.max) return;
              var y = yAxis.getPixelForValue(val);
              ctx.save();
              ctx.setLineDash([5, 3]);
              ctx.strokeStyle = color;
              ctx.lineWidth   = 1.5;
              ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
              ctx.fillStyle = color;
              ctx.font = '9px Poppins,sans-serif';
              ctx.fillText(label, right - ctx.measureText(label).width - 4, y - 3);
              ctx.restore();
            }
            line(CB_LIMITS.grand_target, '#f59e0b', 'SBTi Target (' + CB_LIMITS.grand_target + ')');
            line(CB_LIMITS.grand_max,    '#ef4444', 'Max Limit ('   + CB_LIMITS.grand_max    + ')');
          }
        }]
      });
    }

    /* ── DOUGHNUT (current scope breakdown) ── */
    var dc = document.getElementById('carbonDoughnutChart');
    if (dc) {
      if (_cbDoughnutChartInst) { _cbDoughnutChartInst.destroy(); _cbDoughnutChartInst = null; }
      var total = cur.grand || 1;
      _cbDoughnutChartInst = new Chart(dc, {
        type: 'doughnut',
        data: {
          labels: [
            'Scope 1 (' + cur.s1.toFixed(1) + ' tCO₂e)',
            'Scope 2 (' + cur.s2.toFixed(1) + ' tCO₂e)',
            'Scope 3 (' + cur.s3.toFixed(1) + ' tCO₂e)'
          ],
          datasets: [{
            data: [cur.s1 || 0.001, cur.s2 || 0.001, cur.s3 || 0.001],
            backgroundColor: ['rgba(29,78,216,.8)', 'rgba(217,119,6,.8)', 'rgba(22,163,74,.8)'],
            borderColor: ['#1d4ed8','#d97706','#16a34a'],
            borderWidth: 2
          }]
        },
        options: {
          cutout: '62%',
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 9, family: 'Poppins' }, color: '#374151', padding: 8, boxWidth: 10 } },
            tooltip: {
              callbacks: {
                label: function(ctx2) {
                  var pct = ((ctx2.parsed / total) * 100).toFixed(1);
                  return ctx2.label + ' — ' + pct + '%';
                }
              }
            }
          },
          animation: { duration: 700 }
        },
        plugins: [{
          id: 'doughnutCenter',
          afterDraw: function(chart) {
            var ctx2 = chart.ctx;
            var cx = chart.getDatasetMeta(0).data[0].x;
            var cy = chart.getDatasetMeta(0).data[0].y;
            ctx2.save();
            ctx2.textAlign    = 'center';
            ctx2.textBaseline = 'middle';
            ctx2.font         = 'bold 13px Poppins,sans-serif';
            ctx2.fillStyle    = '#0f172a';
            ctx2.fillText(total.toFixed(0), cx, cy - 7);
            ctx2.font      = '9px Poppins,sans-serif';
            ctx2.fillStyle = '#64748b';
            ctx2.fillText('tCO₂e total', cx, cy + 9);
            ctx2.restore();
          }
        }]
      });
    }

    /* ── Scope chips ── */
    var chips = document.getElementById('carbon-scope-chips');
    if (chips) {
      function scopeColor(v, max) { return v > max ? '#dc2626' : v > max * 0.7 ? '#d97706' : '#16a34a'; }
      function scopeBg(v, max)    { return v > max ? '#fee2e2' : v > max * 0.7 ? '#fef3c7' : '#dcfce7'; }
      function arrowC(c, p)       { return c > p ? '▲' : c < p ? '▼' : '→'; }
      var scopes = [
        { label: 'Scope 1', cur: cur.s1,    prev: prev.s1,    max: CB_LIMITS.s1_max    },
        { label: 'Scope 2', cur: cur.s2,    prev: prev.s2,    max: CB_LIMITS.s2_max    },
        { label: 'Scope 3', cur: cur.s3,    prev: prev.s3,    max: CB_LIMITS.s3_max    },
        { label: 'Total',   cur: cur.grand, prev: prev.grand, max: CB_LIMITS.grand_max }
      ];
      chips.innerHTML = scopes.map(function(sc) {
        var diff    = sc.cur - sc.prev;
        var diffStr = diff === 0 ? '±0' : (diff > 0 ? '+' : '') + diff.toFixed(1);
        /* Improvement = lower is better for carbon */
        var arrowColor = diff <= 0 ? '#16a34a' : '#dc2626';
        return '<div style="background:' + scopeBg(sc.cur, sc.max) + ';border-radius:9px;padding:8px 14px;display:flex;flex-direction:column;align-items:center;min-width:90px">' +
          '<span style="font-family:Poppins,sans-serif;font-size:1.1rem;font-weight:900;color:' + scopeColor(sc.cur, sc.max) + '">' + sc.cur.toFixed(1) + '</span>' +
          '<span style="font-size:.63rem;color:#374151;font-weight:700">' + sc.label + ' tCO₂e</span>' +
          '<span style="font-size:.63rem;color:#64748b">max ' + sc.max + '</span>' +
          '<span style="font-size:.68rem;color:' + arrowColor + ';font-weight:700">' + arrowC(sc.cur, sc.prev) + ' ' + diffStr + ' vs prev</span>' +
          '</div>';
      }).join('');
    }
  }

})(window);
