/* ═══════════════════════════════════════════════════════════════════
   eco-export.js  —  QMICS Universal Export Modal
   Reusable download format picker for the EcoSphere platform.

   Public API:
     window.ecoExport({
       title    : string,            // Modal heading
       subtitle : string,            // Modal sub-heading
       formats  : ['pdf','word','pptx','excel','csv'],   // subset to show
       onFormat : function(fmt){}    // called with chosen format key
     });

   Internal:
     window._ecoExportClose()       // close the modal programmatically
════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MODAL_ID = 'ecoExportModal';

  /* ── Format registry ─────────────────────────────────────────── */
  var FMTS = {
    pdf: {
      label : 'PDF Document',
      sub   : 'Professional A4 report — best for printing & sharing',
      icon  : 'fas fa-file-pdf',
      grad  : 'linear-gradient(135deg,#ef4444,#dc2626)',
      ext   : 'PDF'
    },
    word: {
      label : 'Word Document (.docx)',
      sub   : 'Editable report — opens in Microsoft Word & Google Docs',
      icon  : 'fas fa-file-word',
      grad  : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
      ext   : 'DOCX'
    },
    pptx: {
      label : 'PowerPoint Presentation',
      sub   : 'Slide deck — key findings & data visualised',
      icon  : 'fas fa-file-powerpoint',
      grad  : 'linear-gradient(135deg,#d97706,#b45309)',
      ext   : 'PPTX'
    },
    excel: {
      label : 'Excel Spreadsheet (.xlsx)',
      sub   : 'Data tables & metrics — opens in Microsoft Excel',
      icon  : 'fas fa-file-excel',
      grad  : 'linear-gradient(135deg,#059669,#047857)',
      ext   : 'XLSX'
    },
    csv: {
      label : 'CSV Data Export',
      sub   : 'Raw comma-separated data — compatible with any app',
      icon  : 'fas fa-table',
      grad  : 'linear-gradient(135deg,#0891b2,#0e7490)',
      ext   : 'CSV'
    }
  };

  var _cfg = null;

  /* ── Inject modal HTML once ──────────────────────────────────── */
  function _inject() {
    if (document.getElementById(MODAL_ID)) return;

    /* CSS */
    var css = [
      '@keyframes _ecoExpSpin{to{transform:rotate(360deg)}}',
      '@keyframes _ecoExpSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
      '#ecoExportCard{animation:_ecoExpSlideUp .22s ease}',
      '#' + MODAL_ID + '{transition:opacity .18s}',
      '.eco-exp-fbtn{display:flex;align-items:center;gap:14px;padding:13px 16px;border:none;',
        'border-radius:12px;color:#fff;font-family:Poppins,sans-serif;font-size:.86rem;',
        'font-weight:700;cursor:pointer;text-align:left;width:100%;',
        'transition:opacity .15s,transform .15s,box-shadow .15s}',
      '.eco-exp-fbtn:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.22)}',
      '.eco-exp-fbtn:active{transform:translateY(0);opacity:1}'
    ].join('');

    var styleTag = document.createElement('style');
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    /* Markup */
    var wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.style.cssText = [
      'display:none;position:fixed;inset:0;',
      'background:rgba(10,18,38,.70);',
      'z-index:999999;',
      'align-items:center;justify-content:center;',
      'backdrop-filter:blur(5px);',
      '-webkit-backdrop-filter:blur(5px)'
    ].join('');

    wrap.innerHTML = [
      /* ── Card ── */
      '<div id="ecoExportCard" style="background:#fff;border-radius:20px;width:464px;max-width:95vw;',
        'max-height:90vh;overflow-y:auto;box-shadow:0 40px 100px rgba(0,0,0,.38);',
        'font-family:Inter,sans-serif">',

        /* Header */
        '<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);',
          'border-radius:20px 20px 0 0;padding:22px 24px 20px;position:relative">',

          '<button onclick="window._ecoExportClose()" aria-label="Close" style="',
            'position:absolute;top:14px;right:16px;background:rgba(255,255,255,.1);',
            'border:1px solid rgba(255,255,255,.14);border-radius:8px;',
            'width:30px;height:30px;cursor:pointer;color:#94a3b8;',
            'font-size:.88rem;display:flex;align-items:center;justify-content:center;',
            'line-height:1;padding:0;font-family:inherit;transition:.15s">✕</button>',

          '<div style="width:44px;height:44px;background:rgba(74,222,128,.15);',
            'border-radius:12px;display:flex;align-items:center;justify-content:center;',
            'margin-bottom:11px">',
            '<i class="fas fa-download" style="color:#4ade80;font-size:1.1rem"></i>',
          '</div>',
          '<div id="ecoExpTitle" style="font-family:Poppins,sans-serif;font-size:1rem;',
            'font-weight:800;color:#fff;margin-bottom:3px;line-height:1.3">Download Report</div>',
          '<div id="ecoExpSub" style="font-size:.74rem;color:#94a3b8;line-height:1.45">',
            'Select a format to download your report</div>',
        '</div>',

        /* Format list */
        '<div id="ecoExpBody" style="padding:18px 20px 6px">',
          '<div style="font-size:.68rem;font-weight:700;color:#94a3b8;',
            'text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">',
            'Choose Format</div>',
          '<div id="ecoExpFmtList" style="display:flex;flex-direction:column;gap:8px"></div>',
        '</div>',

        /* Loading state */
        '<div id="ecoExpLoading" style="display:none;padding:38px 24px;text-align:center">',
          '<div style="width:50px;height:50px;border:3px solid #e2e8f0;',
            'border-top-color:#0a3d2e;border-radius:50%;',
            'animation:_ecoExpSpin .75s linear infinite;margin:0 auto 16px"></div>',
          '<div id="ecoExpLoadTxt" style="font-family:Poppins,sans-serif;font-size:.88rem;',
            'font-weight:700;color:#0f172a">Preparing download…</div>',
          '<div style="font-size:.73rem;color:#94a3b8;margin-top:5px">Please wait a moment</div>',
        '</div>',

        /* Success state */
        '<div id="ecoExpSuccess" style="display:none;padding:38px 24px;text-align:center">',
          '<div style="width:54px;height:54px;',
            'background:linear-gradient(135deg,#16a34a,#059669);',
            'border-radius:50%;display:flex;align-items:center;justify-content:center;',
            'margin:0 auto 14px;box-shadow:0 6px 22px rgba(22,163,74,.32)">',
            '<i class="fas fa-check" style="color:#fff;font-size:1.3rem"></i>',
          '</div>',
          '<div style="font-family:Poppins,sans-serif;font-size:.92rem;',
            'font-weight:800;color:#0f172a;margin-bottom:5px">Download Started!</div>',
          '<div id="ecoExpSuccessTxt" style="font-size:.76rem;color:#64748b;line-height:1.5">',
            'Your file is being downloaded to your device.</div>',
        '</div>',

        /* Footer */
        '<div style="padding:10px 20px 18px">',
          '<button id="ecoExpCancelBtn" onclick="window._ecoExportClose()" style="',
            'width:100%;padding:10px;background:#f1f5f9;border:1.5px solid #e2e8f0;',
            'border-radius:10px;color:#475569;font-family:Poppins,sans-serif;',
            'font-size:.82rem;font-weight:700;cursor:pointer;transition:.15s">Cancel</button>',
        '</div>',

      '</div>'
    ].join('');

    document.body.appendChild(wrap);

    /* Close on backdrop click */
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) window._ecoExportClose();
    });
  }

  /* ── Build format buttons ────────────────────────────────────── */
  function _renderFormats(formats) {
    var list = document.getElementById('ecoExpFmtList');
    if (!list) return;
    list.innerHTML = '';
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';
    var keys = formats && formats.length ? formats : Object.keys(FMTS);
    keys.forEach(function (fmt) {
      var f = FMTS[fmt];
      if (!f) return;
      var btn = document.createElement('button');
      btn.className = 'eco-exp-fbtn';
      btn.style.background = f.grad;
      btn.innerHTML =
        '<div style="width:36px;height:36px;background:rgba(255,255,255,.18);' +
          'border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<i class="' + f.icon + '" style="font-size:1rem"></i>' +
        '</div>' +
        '<div style="min-width:0">' +
          '<div>' + f.label + '</div>' +
          '<div style="font-size:.69rem;font-weight:400;opacity:.82;margin-top:1px">' +
            f.sub +
          '</div>' +
        '</div>';
      btn.setAttribute('data-fmt', fmt);
      btn.onclick = function () { _pick(fmt); };
      list.appendChild(btn);
    });
  }

  /* ── Handle format selection ─────────────────────────────────── */
  function _pick(fmt) {
    var f       = FMTS[fmt];
    var body    = document.getElementById('ecoExpBody');
    var loading = document.getElementById('ecoExpLoading');
    var success = document.getElementById('ecoExpSuccess');
    var cancel  = document.getElementById('ecoExpCancelBtn');
    var loadTxt = document.getElementById('ecoExpLoadTxt');

    /* Switch to loading state */
    if (body)    body.style.display    = 'none';
    if (loading) loading.style.display = 'block';
    if (success) success.style.display = 'none';
    if (cancel)  cancel.style.display  = 'none';
    if (loadTxt && f) loadTxt.textContent = 'Preparing ' + f.label + '…';

    /* Invoke the caller's handler */
    try {
      if (_cfg && typeof _cfg.onFormat === 'function') {
        _cfg.onFormat(fmt);
      }
    } catch (e) { /* handler errors are non-fatal */ }

    /* Show success after generation time */
    setTimeout(function () {
      if (loading) loading.style.display = 'none';
      if (success) success.style.display = 'block';
      var txt = document.getElementById('ecoExpSuccessTxt');
      if (txt && f) txt.textContent = f.ext + ' file downloaded to your device.';
      /* Auto-close */
      setTimeout(function () { window._ecoExportClose(); }, 2200);
    }, 1800);
  }

  /* ── Open modal ──────────────────────────────────────────────── */
  function _show(cfg) {
    _inject();
    _cfg = cfg || {};

    var el      = document.getElementById(MODAL_ID);
    var title   = document.getElementById('ecoExpTitle');
    var sub     = document.getElementById('ecoExpSub');
    var body    = document.getElementById('ecoExpBody');
    var loading = document.getElementById('ecoExpLoading');
    var success = document.getElementById('ecoExpSuccess');
    var cancel  = document.getElementById('ecoExpCancelBtn');

    if (title) title.textContent = _cfg.title    || 'Download Report';
    if (sub)   sub.textContent   = _cfg.subtitle || 'Select a format to download your report';

    if (body)    body.style.display    = 'block';
    if (loading) loading.style.display = 'none';
    if (success) success.style.display = 'none';
    if (cancel)  cancel.style.display  = 'block';

    _renderFormats(_cfg.formats || null);

    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  /* ── Close modal ─────────────────────────────────────────────── */
  function _close() {
    var el = document.getElementById(MODAL_ID);
    if (el) el.style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ── Utility: trigger blob download ─────────────────────────── */
  window._ecoTriggerDownload = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  /* ── Utility: safe CSV cell ──────────────────────────────────── */
  window._ecoCsvCell = function (v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  };

  /* ── Utility: rows → CSV string ──────────────────────────────── */
  window._ecoRowsToCsv = function (rows) {
    return rows.map(function (r) {
      return r.map(window._ecoCsvCell).join(',');
    }).join('\r\n');
  };

  /* ── Utility: rows → XLS-compatible HTML table ───────────────── */
  window._ecoRowsToXls = function (rows, sheetTitle) {
    var head = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
               'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
               'xmlns="http://www.w3.org/TR/REC-html40">' +
               '<head><meta charset="UTF-8">' +
               '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>' +
               '<x:ExcelWorksheet><x:Name>' + (sheetTitle || 'Data') + '</x:Name>' +
               '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
               '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
               '<style>td,th{mso-number-format:\\@;}</style></head><body>';
    var tableRows = rows.map(function (r, ri) {
      var tag = ri === 0 ? 'th' : 'td';
      return '<tr>' + r.map(function (c) {
        return '<' + tag + ' style="' + (ri === 0 ? 'background:#0a3d2e;color:#fff;font-weight:bold;' : '') + '">'
          + String(c == null ? '' : c).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          + '</' + tag + '>';
      }).join('') + '</tr>';
    }).join('');
    return head + '<table border="1">' + tableRows + '</table></body></html>';
  };

  /* ── Public API ──────────────────────────────────────────────── */
  window.ecoExport      = function (cfg) { _show(cfg); };
  window._ecoExportClose = _close;

}());
