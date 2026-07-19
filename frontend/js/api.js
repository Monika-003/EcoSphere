/**
 * EcoSphere Frontend API Client
 * Frontend and backend run on the same port — always use a relative base path.
 * localStorage overrides are intentionally removed to prevent stale-URL 405 errors.
 */

(function(window) {
  'use strict';

  /* ════════════════════════════════════════════════
     CONFIGURATION
     Always relative — works on any host/port because
     Express serves both frontend and API on one server.
  ════════════════════════════════════════════════ */
  const API_BASE = (window.ECOSPHERE_CONFIG && window.ECOSPHERE_CONFIG.apiBase)
    ? window.ECOSPHERE_CONFIG.apiBase + '/api/v1'
    : '/api/v1';

  /* Remove any stale API URL from previous sessions */
  try { localStorage.removeItem('ecosphere_api_url'); } catch(_) {}

  /* ════════════════════════════════════════════════
     TOKEN MANAGEMENT
  ════════════════════════════════════════════════ */
  const TokenStore = {
    getAccess:  ()    => localStorage.getItem('eco_access_token'),
    getRefresh: ()    => localStorage.getItem('eco_refresh_token'),
    setAccess:  (t)   => localStorage.setItem('eco_access_token', t),
    setRefresh: (t)   => localStorage.setItem('eco_refresh_token', t),
    setTokens:  (a,r) => { TokenStore.setAccess(a); TokenStore.setRefresh(r); },
    clear:      ()    => { localStorage.removeItem('eco_access_token'); localStorage.removeItem('eco_refresh_token'); localStorage.removeItem('eco_user'); }
  };

  const UserStore = {
    get:    ()  => { try { return JSON.parse(localStorage.getItem('eco_user') || 'null'); } catch { return null; } },
    set:    (u) => localStorage.setItem('eco_user', JSON.stringify(u)),
    clear:  ()  => localStorage.removeItem('eco_user')
  };

  /* ════════════════════════════════════════════════
     CORE HTTP CLIENT
  ════════════════════════════════════════════════ */
  let _refreshing = false;
  let _refreshQueue = [];

  async function request(method, path, body, options = {}) {
    const url     = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };

    const token = TokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const init = {
      method:  method.toUpperCase(),
      headers,
      credentials: 'include'
    };

    if (body && method !== 'GET') {
      init.body = body instanceof FormData ? body : JSON.stringify(body);
      if (body instanceof FormData) delete headers['Content-Type'];
    }

    let res = await fetch(url, init);

    /* Auto-refresh on 401 */
    if (res.status === 401 && !options._retry) {
      const refreshToken = TokenStore.getRefresh();
      if (refreshToken) {
        if (_refreshing) {
          return new Promise((resolve, reject) => {
            _refreshQueue.push({ resolve, reject });
          }).then(() => request(method, path, body, { ...options, _retry: true }));
        }

        _refreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh-token`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refreshToken })
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            TokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
            _refreshQueue.forEach(p => p.resolve());
            _refreshQueue = [];
            _refreshing = false;
            return request(method, path, body, { ...options, _retry: true });
          } else {
            /* Refresh failed — force logout */
            _refreshQueue.forEach(p => p.reject(new Error('Session expired')));
            _refreshQueue = [];
            TokenStore.clear();
            window.dispatchEvent(new CustomEvent('eco:session_expired'));
          }
        } catch (err) {
          TokenStore.clear();
          _refreshing = false;
        }
      }
    }

    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch {}

      /* Human-readable fallbacks — never expose raw HTTP codes to the UI */
      const STATUS_MESSAGES = {
        400: 'Invalid request — please check your input.',
        401: 'Invalid email or password.',
        403: 'You do not have permission to perform this action.',
        404: 'The requested resource was not found.',
        405: 'Server configuration error — please contact support.',
        409: 'A conflict occurred (duplicate entry).',
        422: 'Validation failed — please check your input.',
        429: 'Too many attempts — please wait a few minutes and try again.',
        500: 'Server error — please try again shortly.',
        502: 'Server is temporarily unavailable.',
        503: 'Service unavailable — please try again shortly.'
      };

      const message = errData.message
        || STATUS_MESSAGES[res.status]
        || `Request failed (${res.status})`;

      const err = new Error(message);
      err.status  = res.status;
      err.code    = errData.code;
      err.details = errData.details;
      throw err;
    }

    if (res.status === 204) return null;
    return res.json();
  }

  const http = {
    get:    (path, query = {}) => {
      const qs = Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : '';
      return request('GET', path + qs);
    },
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    patch:  (path, body)   => request('PATCH',  path, body),
    delete: (path)         => request('DELETE', path),
    upload: (path, form)   => request('POST',   path, form)
  };

  /* ════════════════════════════════════════════════
     AUTH API
  ════════════════════════════════════════════════ */
  const Auth = {
    register: (data)   => http.post('/auth/register', data),

    login: async (email, password) => {
      const res = await http.post('/auth/login', { email, password });
      if (res?.data?.accessToken) {
        TokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        UserStore.set(res.data.user);
        window.dispatchEvent(new CustomEvent('eco:login', { detail: res.data.user }));
      }
      return res;
    },

    logout: async () => {
      try {
        await http.post('/auth/logout', { refreshToken: TokenStore.getRefresh() });
      } catch {}
      TokenStore.clear();
      UserStore.clear();
      window.dispatchEvent(new CustomEvent('eco:logout'));
    },

    me:             ()     => http.get('/auth/me'),
    changePassword: (data) => http.put('/auth/change-password', data),
    forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
    resetPassword:  (data) => http.post('/auth/reset-password', data),
    updateRole:     (role) => http.patch('/auth/role', { role }),

    isLoggedIn: () => !!TokenStore.getAccess(),
    getUser:    () => UserStore.get()
  };

  /* ════════════════════════════════════════════════
     MONITORING API
  ════════════════════════════════════════════════ */
  const Monitoring = {
    /* Stations */
    getStations: (params = {}) => http.get('/monitoring/stations', params),
    createStation: (data)       => http.post('/monitoring/stations', data),

    /* Records */
    getRecords:    (params = {}) => http.get('/monitoring/records', params),
    getRecord:     (id)          => http.get(`/monitoring/records/${id}`),
    createRecord:  (data)        => http.post('/monitoring/records', data),
    updateRecord:  (id, data)    => http.put(`/monitoring/records/${id}`, data),
    deleteRecord:  (id)          => http.delete(`/monitoring/records/${id}`),
    getDashboard:  ()            => http.get('/monitoring/records/dashboard'),

    /* IoT */
    iotSync: (data) => http.post('/monitoring/iot-sync', data),

    /* Bulk import */
    bulkImport: (file, monitoringType) => {
      const form = new FormData();
      form.append('file', file);
      form.append('monitoringType', monitoringType);
      return http.upload('/monitoring/bulk-import', form);
    }
  };

  /* ════════════════════════════════════════════════
     REPORTS API
  ════════════════════════════════════════════════ */
  const Reports = {
    getReports:    (params = {}) => http.get('/reports', params),
    getReport:     (id)          => http.get(`/reports/${id}`),
    createReport:  (data)        => http.post('/reports', data),
    submitToLab:          (id, notes) => http.post(`/reports/${id}/submit-lab`, { notes }),
    submitToRegulatory:   (id, notes) => http.post(`/reports/${id}/submit-regulatory`, { notes }),
    generatePdf:   (id)          => {
      /* Returns raw PDF — handle separately */
      const token = TokenStore.getAccess();
      return fetch(`${API_BASE}/reports/${id}/pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    getDownloadUrl: (id) => http.get(`/reports/${id}/download`)
  };

  /* ════════════════════════════════════════════════
     LABORATORY API
  ════════════════════════════════════════════════ */
  const Laboratory = {
    getDashboard:       ()       => http.get('/laboratory/dashboard'),
    getPendingReviews:  (params) => http.get('/laboratory/pending', params),
    getReportForReview: (id)     => http.get(`/laboratory/reports/${id}`),
    approveReport:      (id, d)  => http.post(`/laboratory/reports/${id}/approve`, d),
    rejectReport:       (id, d)  => http.post(`/laboratory/reports/${id}/reject`, d),
    requestCorrection:  (id, d)  => http.post(`/laboratory/reports/${id}/correct`, d),
    forwardToRegulatory:(id, d)  => http.post(`/laboratory/reports/${id}/forward`, d)
  };

  /* ════════════════════════════════════════════════
     REGULATORY API
  ════════════════════════════════════════════════ */
  const Regulatory = {
    getDashboard:       ()       => http.get('/regulatory/dashboard'),
    getPendingApprovals:(params) => http.get('/regulatory/pending', params),
    getAnalytics:       ()       => http.get('/regulatory/analytics'),
    getMonitoring:      (params) => http.get('/regulatory/monitoring', params),
    getAlerts:          (params) => http.get('/regulatory/alerts', params),
    getReport:          (id)     => http.get(`/regulatory/reports/${id}`),
    getAllReports:      (params) => http.get('/regulatory/reports', params),
    approveReport:      (id, d)  => http.post(`/regulatory/reports/${id}/approve`, d),
    rejectReport:       (id, d)  => http.post(`/regulatory/reports/${id}/reject`, d),
    issueCertificate:   (id, d)  => http.post(`/regulatory/reports/${id}/certify`, d),
    issueNotice:        (d)      => http.post('/regulatory/notices', d),
    scheduleInspection: (d)      => http.post('/regulatory/inspections', d)
  };

  /* ════════════════════════════════════════════════
     ORGANIZATION API
  ════════════════════════════════════════════════ */
  const Organization = {
    create:         (data)    => http.post('/organizations', data),
    getMyOrg:       ()        => http.get('/organizations/me'),
    getTeam:        ()        => http.get('/organizations/team'),
    update:         (id, d)   => http.put(`/organizations/${id}`, d),
    uploadDocument: (id, file, type) => {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', type || 'GENERAL');
      return http.upload(`/organizations/${id}/documents`, form);
    }
  };

  /* ════════════════════════════════════════════════
     CERTIFICATES API
  ════════════════════════════════════════════════ */
  const Certificates = {
    getCertificates: (params) => http.get('/certificates', params),
    getCertificate:  (id)     => http.get(`/certificates/${id}`),
    verify:          (hash)   => http.get(`/certificates/verify/${hash}`),
    revoke:          (id, r)  => http.post(`/certificates/${id}/revoke`, { reason: r }),
    download:        (id)     => {
      const token = TokenStore.getAccess();
      return fetch(`${API_BASE}/certificates/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };

  /* ════════════════════════════════════════════════
     NOTIFICATIONS API
  ════════════════════════════════════════════════ */
  const Notifications = {
    getAll:       (params) => http.get('/notifications', params),
    getUnread:    ()       => http.get('/notifications/unread-count'),
    markRead:     (id)     => http.put(`/notifications/${id}/read`, {}),
    markAllRead:  ()       => http.put('/notifications/mark-all-read', {}),
    delete:       (id)     => http.delete(`/notifications/${id}`)
  };

  /* ════════════════════════════════════════════════
     ECOBOT AI
  ════════════════════════════════════════════════ */
  const EcoBot = {
    chat:             (message, conversationId) => http.post('/ecobot/chat', { message, conversationId }),
    getConversations: ()   => http.get('/ecobot/conversations'),
    getConversation:  (id) => http.get(`/ecobot/conversations/${id}`),
    deleteConversation:(id) => http.delete(`/ecobot/conversations/${id}`),
    getRecommendations: () => http.get('/ecobot/recommendations')
  };

  /* ════════════════════════════════════════════════
     BILLING API
  ════════════════════════════════════════════════ */
  const Billing = {
    getSubscription: ()         => http.get('/billing/subscription'),
    createOrder:     (plan)     => http.post('/billing/order', { plan }),
    verifyPayment:   (data)     => http.post('/billing/verify', data),
    getHistory:      ()         => http.get('/billing/history')
  };

  /* ════════════════════════════════════════════════
     ADMIN API
  ════════════════════════════════════════════════ */
  const Admin = {
    getDashboard:          ()        => http.get('/admin/dashboard'),
    getUsers:              (params)  => http.get('/admin/users', params),
    getUser:               (id)      => http.get(`/admin/users/${id}`),
    updateUser:            (id, d)   => http.put(`/admin/users/${id}`, d),
    deactivateUser:        (id)      => http.post(`/admin/users/${id}/deactivate`, {}),
    getOrganizations:      (params)  => http.get('/admin/organizations', params),
    verifyOrganization:    (id)      => http.post(`/admin/organizations/${id}/verify`, {}),
    getLaboratories:       ()        => http.get('/admin/laboratories'),
    getConfig:             ()        => http.get('/admin/config'),
    updateConfig:          (d)       => http.put('/admin/config', d),
    getAuditLogs:          (params)  => http.get('/admin/audit-logs', params),
    broadcast:             (d)       => http.post('/admin/broadcast', d)
  };

  /* ════════════════════════════════════════════════
     SOCKET.IO INTEGRATION
  ════════════════════════════════════════════════ */
  const Socket = {
    _io:    null,
    _handlers: {},

    connect: function() {
      if (this._io) return this._io;
      if (!window.io) { console.warn('[EcoSphere] Socket.IO not loaded'); return null; }

      const token = TokenStore.getAccess();
      /* For relative API_BASE ('/api/v1'), connect to current origin; for absolute, strip path */
      const socketUrl = API_BASE.startsWith('http')
        ? API_BASE.replace('/api/v1', '')
        : window.location.origin;
      this._io = window.io(socketUrl, {
        auth:       { token },
        transports: ['websocket', 'polling']
      });

      this._io.on('connect',    () => console.log('[Socket] Connected:', this._io.id));
      this._io.on('disconnect', (r) => console.log('[Socket] Disconnected:', r));
      this._io.on('error',      (e) => console.error('[Socket] Error:', e));

      /* Re-emit registered handlers */
      for (const [event, fn] of Object.entries(this._handlers)) {
        this._io.on(event, fn);
      }

      return this._io;
    },

    on: function(event, handler) {
      this._handlers[event] = handler;
      if (this._io) this._io.on(event, handler);
    },

    emit: function(event, data) {
      if (this._io) this._io.emit(event, data);
    },

    disconnect: function() {
      if (this._io) { this._io.disconnect(); this._io = null; }
    }
  };

  /* ════════════════════════════════════════════════
     FRONTEND FORM BRIDGE
     Wires existing frontend form submission handlers
     to the backend API seamlessly.
  ════════════════════════════════════════════════ */
  function wireFormBridge() {
    /* ── Login Form Bridge (works for all portals) ── */
    document.addEventListener('eco:login_attempt', async function(e) {
      const { email, password, onSuccess, onError } = e.detail || {};
      try {
        const res = await Auth.login(email, password);
        if (onSuccess) onSuccess(res.data);
      } catch (err) {
        if (onError) onError(err.message);
      }
    });

    /* ── Monitoring Record Submission ── */
    document.addEventListener('eco:submit_monitoring', async function(e) {
      const { data, onSuccess, onError } = e.detail || {};
      try {
        const res = await Monitoring.createRecord(data);
        if (onSuccess) onSuccess(res.data);
      } catch (err) {
        if (onError) onError(err.message);
      }
    });

    /* ── Report Submission ── */
    document.addEventListener('eco:submit_report', async function(e) {
      const { data, onSuccess, onError } = e.detail || {};
      try {
        const res = await Reports.createReport(data);
        if (onSuccess) onSuccess(res.data);
      } catch (err) {
        if (onError) onError(err.message);
      }
    });

    /* ── EcoBot Chat Bridge ── */
    document.addEventListener('eco:chatbot_message', async function(e) {
      const { message, conversationId, onReply, onError } = e.detail || {};
      try {
        const res = await EcoBot.chat(message, conversationId);
        if (onReply) onReply(res.data.reply, res.data.conversationId);
      } catch (err) {
        if (onError) onError(err.message);
        /* Fallback: use existing client-side reply logic */
      }
    });

    /* ── Dashboard Data Bridge ── */
    document.addEventListener('eco:load_dashboard', async function(e) {
      const { portal, onData, onError } = e.detail || {};
      try {
        let data;
        if (portal === 'org')  data = await Monitoring.getDashboard();
        if (portal === 'lab')  data = await Laboratory.getDashboard();
        if (portal === 'reg')  data = await Regulatory.getDashboard();
        if (portal === 'admin') data = await Admin.getDashboard();
        if (onData && data) onData(data.data);
      } catch (err) {
        /* Non-blocking — frontend renders with local data */
        if (onError) onError(err.message);
      }
    });
  }

  /* ════════════════════════════════════════════════
     SESSION EXPIRY HANDLER
  ════════════════════════════════════════════════ */
  window.addEventListener('eco:session_expired', function() {
    console.warn('[EcoSphere] Session expired. Please log in again.');
    /* Show toast if available */
    if (window.showToast) window.showToast('Session expired. Please log in again.', 'error');
  });

  /* ════════════════════════════════════════════════
     AUTO-POPULATE USER ON LOAD
  ════════════════════════════════════════════════ */
  (function autoSync() {
    const user = UserStore.get();
    if (user && TokenStore.getAccess()) {
      window.dispatchEvent(new CustomEvent('eco:user_loaded', { detail: user }));
    }
  })();

  /* ════════════════════════════════════════════════
     WIRE FORM BRIDGES ON DOM READY
  ════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireFormBridge);
  } else {
    wireFormBridge();
  }

  /* ════════════════════════════════════════════════
     PUBLIC API — window.EcoSphereAPI
  ════════════════════════════════════════════════ */
  window.EcoSphereAPI = {
    /* Core HTTP */
    http,

    /* Modules */
    Auth,
    Monitoring,
    Reports,
    Laboratory,
    Regulatory,
    Organization,
    Certificates,
    Notifications,
    EcoBot,
    Billing,
    Admin,
    Socket,

    /* Helpers */
    getToken: TokenStore.getAccess,
    getUser:  UserStore.get,
    isLoggedIn: Auth.isLoggedIn,

    /* Config */
    API_BASE,
    version: '1.0.0'
  };

  console.log(`[EcoSphere] API client initialized. Base: ${API_BASE}`);

})(window);
