/**
 * eco-api-service.js
 * Axios-style service layer — wraps EcoSphereAPI (api.js) in named service modules.
 * Every portal and the main app imports this single file.
 *
 * Exposes:  window.EcoService  (auth, monitoring, reports, lab, regulatory, ecobot)
 * Requires: api.js loaded first (provides window.EcoSphereAPI)
 */
(function (window) {
  'use strict';

  /* ── Wait for api.js to be ready ── */
  function whenReady(fn) {
    if (window.EcoSphereAPI) { fn(); return; }
    var t = setInterval(function () {
      if (window.EcoSphereAPI) { clearInterval(t); fn(); }
    }, 30);
  }

  /* ══════════════════════════════════════════════════
     TOKEN HELPERS (shared across portals)
  ══════════════════════════════════════════════════ */
  var TokenStore = {
    getAccess:   function () { return localStorage.getItem('eco_access_token'); },
    getRefresh:  function () { return localStorage.getItem('eco_refresh_token'); },
    setAccess:   function (t) { localStorage.setItem('eco_access_token', t); },
    setRefresh:  function (t) { localStorage.setItem('eco_refresh_token', t); },
    setTokens:   function (a, r) { TokenStore.setAccess(a); TokenStore.setRefresh(r); },
    clear:       function () {
      localStorage.removeItem('eco_access_token');
      localStorage.removeItem('eco_refresh_token');
      localStorage.removeItem('eco_user');
      localStorage.removeItem('eco_station_id');
    },
    getUser:     function () {
      try { return JSON.parse(localStorage.getItem('eco_user') || 'null'); } catch (e) { return null; }
    },
    setUser:     function (u) { localStorage.setItem('eco_user', JSON.stringify(u)); },
    storeStation:function (id) {
      if (id && id !== 'null' && id !== 'undefined') {
        localStorage.setItem('eco_station_id', id);
      }
    },
    getStation:  function () {
      var id = localStorage.getItem('eco_station_id');
      /* Reject stale "null"/"undefined" strings written by previous failed attempts */
      if (!id || id === 'null' || id === 'undefined' || id.length < 10) {
        localStorage.removeItem('eco_station_id');
        return null;
      }
      return id;
    },
    clearStation: function () { localStorage.removeItem('eco_station_id'); }
  };

  /* ══════════════════════════════════════════════════
     AUTH SERVICE
  ══════════════════════════════════════════════════ */
  var AuthService = {
    /**
     * login(email, password)
     * Returns { user, accessToken, refreshToken }
     */
    login: function (email, password) {
      return window.EcoSphereAPI.Auth.login(email, password);
    },

    /**
     * logout()
     */
    logout: function () {
      return window.EcoSphereAPI.Auth.logout();
    },

    isLoggedIn: function () {
      return !!TokenStore.getAccess();
    },

    getUser: function () {
      return TokenStore.getUser();
    },

    TokenStore: TokenStore
  };

  /* ══════════════════════════════════════════════════
     MONITORING SERVICE
  ══════════════════════════════════════════════════ */

  /* Map frontend type keys → Prisma MonitoringType enum values
     Prisma enum: AIR | WATER | NOISE | SOIL | TEMPERATURE | HUMIDITY | WASTE | STACK_EMISSION | ... */
  var TYPE_MAP = {
    air:      'AIR',
    water:    'WATER',
    noise:    'NOISE',
    soil:     'SOIL',
    temp:     'TEMPERATURE',
    humidity: 'HUMIDITY',
    waste:    'WASTE',
    carbon:   'STACK_EMISSION'   /* Carbon emission → STACK_EMISSION monitoring type */
  };

  /* Map frontend field ids → parameter key names */
  var FIELD_MAP = {
    air:  { 'aq-pm25':'PM2_5_ug_m3','aq-pm10':'PM10_ug_m3','aq-so2':'SO2_ppb','aq-nox':'NOx_ppb','aq-co2':'CO2_ppm','aq-o3':'O3_ppb','aq-wind':'Wind_Speed_m_s','aq-temp':'Temperature_C' },
    water:{ 'wq-ph':'pH','wq-tds':'TDS_mg_L','wq-bod':'BOD_mg_L','wq-cod':'COD_mg_L','wq-do':'DO_mg_L','wq-tur':'Turbidity_NTU','wq-col':'Total_Coliform_MPN','wq-nit':'Nitrates_mg_L','wq-temp':'Temperature_C' },
    noise:{ 'ns-day':'Day_dB','ns-night':'Night_dB','ns-peak':'Peak_dB','ns-leq':'Leq_dB','ns-bg':'Background_dB','ns-dur':'Duration_hrs','ns-eq':'Equipment','dep-loc':'Location' },
    soil: { 'sl-moist':'Moisture_pct','sl-ph':'pH','sl-n':'Nitrogen_kg_ha','sl-p':'Phosphorus_kg_ha','sl-k':'Potassium_kg_ha','sl-hm':'Heavy_Metals_mg_kg','sl-oc':'Organic_Carbon_pct','sl-ec':'Conductivity_mS_cm' },
    temp: { 'tp-amb':'Ambient_C','tp-proc':'Process_C','tp-eff':'Effluent_C','tp-stack':'Stack_Gas_C','tp-cwi':'Cooling_Water_In_C','tp-cwo':'Cooling_Water_Out_C' },
    humidity:{ 'hm-rh':'Relative_Humidity_pct','hm-ah':'Absolute_Humidity_g_m3','hm-dp':'Dew_Point_C','hm-wb':'Wet_Bulb_C','hm-db':'Dry_Bulb_C','hm-sp':'Specific_Humidity_g_kg' },
    waste:{ 'ws-solid':'Solid_Waste_t','ws-rec':'Recyclable_t','ws-pct':'Recycled_pct','ws-haz':'Hazardous_Waste_kg','ws-ewaste':'E_Waste_kg','ws-bio':'Biomedical_kg','ws-comp':'Composted_kg','ws-div':'Landfill_Diverted_pct' },
    /* Carbon → STACK_EMISSION — Scope 1/2/3 fields */
    carbon:{
      'cb-s1fuel' :'Scope1_Fuel_Combustion_tCO2e',
      'cb-s1proc' :'Scope1_Industrial_Process_tCO2e',
      'cb-s1veh'  :'Scope1_Company_Vehicles_tCO2e',
      'cb-s1fug'  :'Scope1_Fugitive_Emissions_tCO2e',
      'cb-s2elec' :'Scope2_Purchased_Electricity_tCO2e',
      'cb-s2heat' :'Scope2_Purchased_Heat_Steam_tCO2e',
      'cb-s3biz'  :'Scope3_Business_Travel_tCO2e',
      'cb-s3com'  :'Scope3_Employee_Commuting_tCO2e',
      'cb-s3sup'  :'Scope3_Supply_Chain_tCO2e',
      'cb-s3waste':'Scope3_Waste_Disposal_tCO2e'
    }
  };

  /* CPCB regulatory limits for compliance check */
  var LIMITS = {
    'PM2_5_ug_m3':60, 'PM10_ug_m3':100, 'SO2_ppb':80, 'NOx_ppb':40, 'O3_ppb':70,
    'TDS_mg_L':600, 'BOD_mg_L':30, 'COD_mg_L':250, 'DO_mg_L':4,
    'Day_dB':75, 'Night_dB':70, 'Peak_dB':85
  };

  var MonitoringService = {
    /**
     * Ensure a default station exists for this org.
     * Tries to get existing, creates one if empty.
     */
    ensureStation: function () {
      var self = this;
      var stationId = TokenStore.getStation();
      if (stationId) return Promise.resolve(stationId);

      return window.EcoSphereAPI.Monitoring.getStations({ limit: 1 })
        .then(function (res) {
          var stations = (res && res.data && res.data.stations) ? res.data.stations
                       : (res && res.data && Array.isArray(res.data)) ? res.data : [];
          if (stations.length > 0) {
            TokenStore.storeStation(stations[0].id);
            return stations[0].id;
          }
          /* No station exists — create a default one for this org */
          var user    = TokenStore.getUser();
          var orgName = sessionStorage.getItem('ecoOrgName')
                     || (user && user.organization && user.organization.name)
                     || 'Default Facility';
          var uniqueCode = 'STN-' + Date.now().toString().slice(-7);
          return window.EcoSphereAPI.Monitoring.createStation({
            name:          orgName + ' — Station 1',
            stationCode:   uniqueCode,
            monitoringType:'AIR',
            stationType:   'MANUAL',
            isActive:      true
          }).then(function (res2) {
            var id = res2 && res2.data && (res2.data.id || (res2.data.station && res2.data.station.id));
            if (id) {
              TokenStore.storeStation(id);
            } else {
              /* Creation succeeded but no ID returned — clear cache so next call retries */
              TokenStore.clearStation();
            }
            return id;
          }).catch(function (err) {
            /* Station creation failed — clear any stale cached ID and propagate */
            TokenStore.clearStation();
            throw err;
          });
        })
        .catch(function (err) {
          /* getStations failed (e.g. 403 insufficient role) — propagate with clear message */
          TokenStore.clearStation();
          throw new Error(
            err.message && err.message.indexOf('Insufficient') > -1
              ? 'Your role does not have permission to create monitoring records. Please log in as Org Analyst or Org Engineer.'
              : (err.message || 'Failed to initialise monitoring station')
          );
        });
    },

    /**
     * Read all filled field values from the DOM and build a parameters object.
     * @param {string} type  — 'air','water','noise','soil','temp','humidity','waste'
     */
    collectParams: function (type) {
      var fields = FIELD_MAP[type] || {};
      var params = {};
      Object.keys(fields).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var raw = el.value.trim();
        if (!raw) return;
        var key = fields[id];
        var num = parseFloat(raw);
        var val = isNaN(num) ? raw : num;
        var limit = LIMITS[key];
        params[key] = {
          value:  val,
          unit:   '',                                                   /* set below */
          limit:  limit || null,
          status: (limit && typeof val === 'number')
            ? (val > limit ? 'NON_COMPLIANT' : 'COMPLIANT')
            : 'NORMAL'
        };
      });
      /* Patch units for well-known keys */
      var UNITS = {
        PM2_5_ug_m3:'µg/m³',PM10_ug_m3:'µg/m³',SO2_ppb:'ppb',NOx_ppb:'ppb',
        CO2_ppm:'ppm',O3_ppb:'ppb',Wind_Speed_m_s:'m/s',Temperature_C:'°C',
        pH:'-',TDS_mg_L:'mg/L',BOD_mg_L:'mg/L',COD_mg_L:'mg/L',DO_mg_L:'mg/L',
        Turbidity_NTU:'NTU',Total_Coliform_MPN:'MPN',Nitrates_mg_L:'mg/L',
        Day_dB:'dB',Night_dB:'dB',Peak_dB:'dB',Leq_dB:'dB',Background_dB:'dB',
        Duration_hrs:'hrs',Moisture_pct:'%',Nitrogen_kg_ha:'kg/ha',
        Phosphorus_kg_ha:'kg/ha',Potassium_kg_ha:'kg/ha',
        Heavy_Metals_mg_kg:'mg/kg',Organic_Carbon_pct:'%',Conductivity_mS_cm:'mS/cm',
        Ambient_C:'°C',Process_C:'°C',Effluent_C:'°C',Stack_Gas_C:'°C',
        Cooling_Water_In_C:'°C',Cooling_Water_Out_C:'°C',
        Relative_Humidity_pct:'%',Absolute_Humidity_g_m3:'g/m³',
        Dew_Point_C:'°C',Wet_Bulb_C:'°C',Dry_Bulb_C:'°C',Specific_Humidity_g_kg:'g/kg',
        Solid_Waste_t:'t',Recyclable_t:'t',Recycled_pct:'%',
        Hazardous_Waste_kg:'kg',E_Waste_kg:'kg',Biomedical_kg:'kg',
        Composted_kg:'kg',Landfill_Diverted_pct:'%'
      };
      Object.keys(params).forEach(function (k) {
        params[k].unit = UNITS[k] || '-';
      });
      return params;
    },

    /**
     * submitRecord(type) — collect form fields → POST /monitoring/records
     */
    submitRecord: function (type) {
      var self = this;
      var monType = TYPE_MAP[type];
      if (!monType) return Promise.reject(new Error('Unknown monitoring type: ' + type));

      return self.ensureStation().then(function (stationId) {
        if (!stationId) return Promise.reject(new Error('No monitoring station found. Please ensure one is set up.'));

        var dateId   = type + '-date'; // e.g. 'air-date'
        var locId    = type + '-loc';
        /* also check dep-date / dep-loc from the slide panel form */
        var dateEl   = document.getElementById(dateId)   || document.getElementById('dep-date');
        var locEl    = document.getElementById(locId)    || document.getElementById('dep-loc');
        var remEl    = document.getElementById('ipfb-remarks') || document.getElementById('dep-remarks');

        var dateVal  = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
        var params   = self.collectParams(type);

        /* Check compliance */
        var nonCompliant = Object.keys(params).filter(function (k) {
          return params[k].status === 'NON_COMPLIANT';
        });

        return window.EcoSphereAPI.Monitoring.createRecord({
          stationId:      stationId,
          monitoringType: monType,
          recordedAt:     dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
          parameters:     params,
          notes:          (remEl ? remEl.value : '') || '',
          isCompliant:    nonCompliant.length === 0
        });
      });
    },

    getDashboard: function () {
      return window.EcoSphereAPI.Monitoring.getDashboard();
    }
  };

  /* ══════════════════════════════════════════════════
     REPORTS SERVICE
  ══════════════════════════════════════════════════ */
  var REPORT_TYPE_MAP = {
    Monitoring:   'ENVIRONMENTAL_MONITORING',
    ESG:          'ESG_REPORT',
    Carbon:       'CARBON_EMISSION',
    Sustainability:'SUSTAINABILITY',
    'ISO 14001':  'ISO14001_COMPLIANCE',
    EIA:          'EIA_REPORT',
    Water:        'WATER_AUDIT',
    Energy:       'ENERGY_AUDIT',
    Waste:        'WASTE_AUDIT',
    Annual:       'ANNUAL_ENVIRONMENTAL'
  };

  var ReportsService = {
    getReports: function (params) {
      return window.EcoSphereAPI.Reports.getReports(params || {});
    },

    createAndSubmit: function (reportType, title) {
      var rtype = REPORT_TYPE_MAP[reportType] || 'ENVIRONMENTAL_MONITORING';
      var now   = new Date();
      var start = new Date(now.getFullYear(), now.getMonth(), 1);

      return window.EcoSphereAPI.Reports.createReport({
        title: title || (reportType + ' Compliance Report — ' + now.getFullYear()),
        type:  rtype,
        reportingPeriod: {
          startDate: start.toISOString(),
          endDate:   now.toISOString()
        }
      });
    },

    submitToLab: function (reportId, notes) {
      return window.EcoSphereAPI.Reports.submitToLab(reportId, notes || '');
    },

    REPORT_TYPE_MAP: REPORT_TYPE_MAP
  };

  /* ══════════════════════════════════════════════════
     LAB SERVICE
  ══════════════════════════════════════════════════ */
  var LabService = {
    getDashboard:      function ()        { return window.EcoSphereAPI.Laboratory.getDashboard(); },
    getPendingReviews: function (params)  { return window.EcoSphereAPI.Laboratory.getPendingReviews(params); },
    getReportDetails:  function (id)      { return window.EcoSphereAPI.Laboratory.getReportForReview(id); },
    approve:           function (id, notes) { return window.EcoSphereAPI.Laboratory.approveReport(id, { reviewNotes: notes }); },
    reject:            function (id, notes) { return window.EcoSphereAPI.Laboratory.rejectReport(id, { reviewNotes: notes }); },
    requestCorrection: function (id, notes) { return window.EcoSphereAPI.Laboratory.requestCorrection(id, { correctionNotes: notes }); },
    forwardToReg:      function (id, notes) { return window.EcoSphereAPI.Laboratory.forwardToRegulatory(id, { notes: notes }); }
  };

  /* ══════════════════════════════════════════════════
     REGULATORY SERVICE
  ══════════════════════════════════════════════════ */
  var RegService = {
    getDashboard:        function ()        { return window.EcoSphereAPI.Regulatory.getDashboard(); },
    getPendingApprovals: function (params)  { return window.EcoSphereAPI.Regulatory.getPendingApprovals(params); },
    getReport:           function (id)      { return window.EcoSphereAPI.Regulatory.getReport(id); },
    getAllReports:       function (params)  { return window.EcoSphereAPI.Regulatory.getAllReports(params || {}); },
    approve:             function (id, d)   { return window.EcoSphereAPI.Regulatory.approveReport(id, d || {}); },
    reject:              function (id, notes) { return window.EcoSphereAPI.Regulatory.rejectReport(id, { comments: notes }); },
    issueCertificate:    function (id, d)   { return window.EcoSphereAPI.Regulatory.issueCertificate(id, d || {}); },
    issueNotice:         function (id, notes) { return window.EcoSphereAPI.Regulatory.issueNotice(id, notes ? { notes: notes } : {}); },
    scheduleInspection:  function (id, notes) { return window.EcoSphereAPI.Regulatory.scheduleInspection(id, notes ? { notes: notes } : {}); },
    getAnalytics:        function ()        { return window.EcoSphereAPI.Regulatory.getAnalytics(); },
    getMonitoring:       function (params)  { return window.EcoSphereAPI.Regulatory.getMonitoring(params || {}); },
    getAlerts:           function (params)  { return window.EcoSphereAPI.Regulatory.getAlerts(params || {}); }
  };

  /* ══════════════════════════════════════════════════
     ECOBOT SERVICE
  ══════════════════════════════════════════════════ */
  var EcoBotService = {
    _conversationId: null,

    chat: function (message) {
      var self = this;
      return window.EcoSphereAPI.EcoBot.chat(message, self._conversationId)
        .then(function (res) {
          if (res && res.data && res.data.conversationId) {
            self._conversationId = res.data.conversationId;
          }
          return res;
        });
    },

    reset: function () {
      this._conversationId = null;
    }
  };

  /* ══════════════════════════════════════════════════
     NOTIFICATION HELPER (UI toast)
  ══════════════════════════════════════════════════ */
  function uiToast(msg, type) {
    /* Works with both org-portal (toastEl) and lab/reg (rToast / toastEl) */
    var el = document.getElementById('toastEl') ||
             document.getElementById('rToast');
    if (!el) { console.log('[EcoService toast]', msg); return; }
    el.innerHTML = '<i class="fas fa-leaf" style="color:#22c55e;margin-right:7px"></i>' + msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  function uiError(msg) {
    uiToast('❌ ' + (msg || 'An error occurred'), 'error');
  }

  /* ══════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════ */
  window.EcoService = {
    Auth:        AuthService,
    Monitoring:  MonitoringService,
    Reports:     ReportsService,
    Lab:         LabService,
    Regulatory:  RegService,
    EcoBot:      EcoBotService,
    TokenStore:  TokenStore,
    toast:       uiToast,
    error:       uiError,
    typeMap:     TYPE_MAP,
    reportTypeMap: REPORT_TYPE_MAP
  };

  console.log('[EcoService] Service layer ready');
})(window);
