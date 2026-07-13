/**
 * EcoSphere — Shared PDF Download Utility
 * Works in all portals: Org, Lab, Regulatory
 *
 * Strategy: fetch() + Blob + hidden <a download="...">
 *   - No window.open  → no popup-blocker issues
 *   - a.download attr → browser saves to Downloads folder automatically
 *   - Token auto-refresh before every download
 */

(function () {
  'use strict';

  /* ── Toast helper (works even if portal's own toast isn't loaded yet) ── */
  function _notify(msg) {
    if (typeof showToast === 'function') return showToast(msg);
    if (typeof toast   === 'function') return toast(msg);
    console.info('[EcoPDF]', msg);
  }

  /* ── Trigger actual browser download from a Blob ── */
  function _triggerBlobDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  /* ── Core fetch-and-download with auth token ── */
  function _fetchAndDownload(apiUrl, filename) {
    _notify('⏳ Preparing ' + filename + '…');

    fetch(apiUrl)
      .then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            var msg = '';
            try { msg = JSON.parse(t).message || t; } catch (e) { msg = t; }
            throw new Error('Server error ' + r.status + ': ' + msg);
          });
        }
        return r.blob();
      })
      .then(function (blob) {
        _triggerBlobDownload(blob, filename);
        _notify('✅ ' + filename + ' saved to Downloads!');
      })
      .catch(function (err) {
        console.error('[EcoPDF] Download failed:', err);
        _notify('❌ Download failed — ' + err.message);
      });
  }

  /* ── Refresh token then download ── */
  function _withFreshToken(callback) {
    var token        = localStorage.getItem('eco_access_token');
    var refreshToken = localStorage.getItem('eco_refresh_token');

    if (!token && !refreshToken) {
      _notify('🔒 Please log in to download reports');
      return;
    }

    if (refreshToken) {
      fetch('/api/v1/auth/refresh-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: refreshToken })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success && res.data && res.data.accessToken) {
            localStorage.setItem('eco_access_token', res.data.accessToken);
            if (res.data.refreshToken) localStorage.setItem('eco_refresh_token', res.data.refreshToken);
            callback(res.data.accessToken);
          } else {
            callback(token);
          }
        })
        .catch(function () { callback(token); });
    } else {
      callback(token);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════ */

  /**
   * ecoPdfDownload(apiPath, filename)
   * Download any EcoSphere API endpoint as a PDF file.
   *
   * @param {string} apiPath   — e.g. '/api/v1/reports/quick-pdf?type=ESG_REPORT'
   * @param {string} filename  — e.g. 'ESG_Report_Jun2025.pdf'
   */
  window.ecoPdfDownload = function (apiPath, filename) {
    _withFreshToken(function (freshToken) {
      var sep = apiPath.includes('?') ? '&' : '?';
      var url = apiPath + sep + 'token=' + encodeURIComponent(freshToken);
      _fetchAndDownload(url, filename || 'EcoSphere_Report.pdf');
    });
  };

  /**
   * ecoDownloadReport(reportType, label)
   * One-shot: create + generate + download a compliance report PDF.
   *
   * reportType: 'ESG' | 'ISO 14001' | 'EIA' | 'Sustainability' | 'Carbon' | 'Monitoring' | 'Annual'
   */
  window.ecoDownloadReport = function (reportType, label) {
    var TYPE_MAP = {
      'ESG':          'ESG_REPORT',
      'ISO':          'ISO14001_COMPLIANCE',
      'ISO 14001':    'ISO14001_COMPLIANCE',
      'EIA':          'EIA_REPORT',
      'Sustainability':'SUSTAINABILITY',
      'Carbon':       'CARBON_EMISSION',
      'Monitoring':   'ENVIRONMENTAL_MONITORING',
      'Annual':       'ANNUAL_ENVIRONMENTAL',
      'Water':        'WATER_AUDIT',
      'Energy':       'ENERGY_AUDIT',
      'Waste':        'WASTE_AUDIT'
    };
    var rtype    = TYPE_MAP[reportType] || 'ENVIRONMENTAL_MONITORING';
    var lbl      = label || (reportType + ' Compliance Report');
    var filename = reportType.replace(/\s+/g, '_') + '_Report_' + _datestamp() + '.pdf';
    var apiPath  = '/api/v1/reports/quick-pdf?type=' + encodeURIComponent(rtype) +
                   '&label=' + encodeURIComponent(lbl);
    window.ecoPdfDownload(apiPath, filename);
  };

  /**
   * ecoDownloadMonitoringRecord(recordId, recordType)
   * Download a PDF for a specific monitoring record by its database ID.
   *
   * recordId: UUID from the database
   * recordType: 'Air' | 'Water' | 'Noise' | 'Soil' | 'Temp' | 'Humidity' | 'Waste'
   */
  window.ecoDownloadMonitoringRecord = function (recordId, recordType) {
    var filename = (recordType || 'Monitoring') + '_Record_' + _datestamp() + '.pdf';
    var apiPath  = '/api/v1/monitoring/records/' + recordId + '/pdf';
    window.ecoPdfDownload(apiPath, filename);
  };

  /**
   * ecoDownloadMonitoringType(monType, label)
   * Quick-download a monitoring-type PDF (no existing record ID needed).
   * Uses the quick-pdf endpoint with the appropriate report type mapping.
   */
  window.ecoDownloadMonitoringType = function (monType, label) {
    var TYPE_MAP = {
      'air':      'ENVIRONMENTAL_MONITORING',
      'water':    'WATER_AUDIT',
      'noise':    'ENVIRONMENTAL_MONITORING',
      'soil':     'ENVIRONMENTAL_MONITORING',
      'temp':     'ENVIRONMENTAL_MONITORING',
      'humidity': 'ENVIRONMENTAL_MONITORING',
      'waste':    'WASTE_AUDIT'
    };
    var rtype    = TYPE_MAP[(monType || '').toLowerCase()] || 'ENVIRONMENTAL_MONITORING';
    var lbl      = label || (monType + ' Monitoring Report');
    var filename = (monType || 'Monitoring') + '_Report_' + _datestamp() + '.pdf';
    var apiPath  = '/api/v1/reports/quick-pdf?type=' + encodeURIComponent(rtype) +
                   '&label=' + encodeURIComponent(lbl);
    window.ecoPdfDownload(apiPath, filename);
  };

  /**
   * labDownloadPdf(reportId, reportNumber)
   * Download the actual submitted report PDF by its DB ID.
   * Uses POST /reports/:id/pdf — allowed for LAB_ADMIN (report:read).
   * This downloads the report as it was submitted (with linked monitoring records),
   * NOT a freshly-created generic report.
   */
  window.labDownloadPdf = function (reportId, reportNumber) {
    if (!reportId) { _notify('❌ No report ID — cannot download'); return; }
    _withFreshToken(function (freshToken) {
      var filename = (reportNumber || 'Report') + '_Lab.pdf';
      _notify('⏳ Preparing ' + filename + '…');
      fetch('/api/v1/reports/' + reportId + '/pdf', {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + freshToken, 'Content-Type': 'application/json' }
      })
        .then(function (r) {
          if (!r.ok) {
            return r.text().then(function (t) {
              var msg = '';
              try { msg = JSON.parse(t).message || t; } catch (e) { msg = t; }
              throw new Error('Server error ' + r.status + ': ' + msg);
            });
          }
          return r.blob();
        })
        .then(function (blob) {
          _triggerBlobDownload(blob, filename);
          _notify('✅ ' + filename + ' saved to Downloads!');
        })
        .catch(function (err) {
          console.error('[EcoPDF] Lab download failed:', err);
          _notify('❌ Download failed — ' + err.message);
        });
    });
  };

  /* Keep backward-compat with old generateReport calls */
  window.generateReport        = function (t) { window.ecoDownloadReport(t, t + ' Compliance Report'); };
  window.generateAnnualReport  = function ()  { window.ecoDownloadReport('Annual', 'Annual Environmental Report'); };

  /* ── Helpers ── */
  function _datestamp() {
    var d = new Date();
    return d.getFullYear() + '' +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }

})();
