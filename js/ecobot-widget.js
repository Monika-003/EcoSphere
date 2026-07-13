/* ═══════════════════════════════════════════════════════════════════
   ECO BOT — Floating AI Assistant Widget
   Brand Identity: Intelligent Tree Mascot
   "Monitor Intelligently. Predict Risks. Protect the Environment."
   v2.0 — Dual Mode: Public Website Assistant / Organisation AI Workspace
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.__ecobotWidgetLoaded) return;
  window.__ecobotWidgetLoaded = true;

  /* ══════════════════ LOGIN DETECTION ══════════════════ */
  function isLoggedIn() {
    var token = localStorage.getItem('eco_access_token');
    if (token && token !== '' && token !== 'null' && token !== 'undefined') return true;
    var orgId = sessionStorage.getItem('eco_org_id') || localStorage.getItem('eco_org_id');
    return !!(orgId && orgId !== '' && orgId !== 'null' && orgId !== 'undefined' && orgId !== 'default');
  }

  /* Only activate workspace mode on actual portal/app pages, never on the public homepage */
  function isPortalPage() {
    var path = (window.location.pathname || '').toLowerCase();
    var portalKeywords = [
      'org-portal', 'eia-analytics', 'eia-wizard', 'esg-wizard', 'lab-portal',
      'reg-portal', 'ai-insights', 'report-center', 'eia-report', 'esg-report',
      'sustainability-report', 'sustainability-platform', 'sustainability-report-builder',
      'daily-sustainability', 'portal-select', 'ecobot-ai', 'eco-bot-workspace',
      'eia-report-builder', 'eia-report-generator'
    ];
    for (var i = 0; i < portalKeywords.length; i++) {
      if (path.indexOf(portalKeywords[i]) >= 0) return true;
    }
    return false;
  }

  /* True only when inside the org portal AND logged in — drives workspace FAB behaviour */
  function shouldShowWorkspace() {
    return isLoggedIn() && isPortalPage();
  }

  function getOrgId() {
    return (new URLSearchParams(window.location.search).get('orgId'))
      || sessionStorage.getItem('eco_org_id')
      || localStorage.getItem('eco_org_id')
      || '';
  }

  function getProfile() {
    var orgId = getOrgId();
    var raw = sessionStorage.getItem('ecoCorpProfile')
      || localStorage.getItem('ecoDashProfile_' + orgId)
      || localStorage.getItem('ecoCorpProfile');
    if (raw) { try { return JSON.parse(raw); } catch (e) { } }
    var name = sessionStorage.getItem('ecoOrgName') || '';
    var industry = sessionStorage.getItem('ecoIndustry') || '';
    if (name || industry) return { orgName: name, industry: industry };
    return {};
  }

  function getPmData() {
    var orgId = getOrgId();
    var raw = localStorage.getItem('pmContent_' + orgId);
    if (raw) { try { return JSON.parse(raw); } catch (e) { } }
    return {};
  }

  /* ══════════════════ MASCOT SVG ══════════════════ */
  function getMascotSVG(size) {
    var s = size || 100;
    return '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<radialGradient id="eb-bg-g" cx="45%" cy="38%" r="65%">'
      + '<stop offset="0%" stop-color="#103a24"/>'
      + '<stop offset="100%" stop-color="#061410"/>'
      + '</radialGradient>'
      + '<radialGradient id="eb-can-g" cx="50%" cy="30%" r="60%">'
      + '<stop offset="0%" stop-color="#4ade80"/>'
      + '<stop offset="55%" stop-color="#16a34a"/>'
      + '<stop offset="100%" stop-color="#14532d"/>'
      + '</radialGradient>'
      + '<radialGradient id="eb-eye-g" cx="30%" cy="30%" r="70%">'
      + '<stop offset="0%" stop-color="#ffffff"/>'
      + '<stop offset="100%" stop-color="#e0f2fe"/>'
      + '</radialGradient>'
      + '<filter id="eb-glow-f" x="-40%" y="-40%" width="180%" height="180%">'
      + '<feGaussianBlur stdDeviation="2.5" result="blur"/>'
      + '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter>'
      + '<filter id="eb-soft" x="-20%" y="-20%" width="140%" height="140%">'
      + '<feGaussianBlur stdDeviation="1" result="blur"/>'
      + '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter>'
      + '</defs>'
      + '<circle cx="50" cy="50" r="50" fill="url(#eb-bg-g)"/>'
      + '<ellipse cx="50" cy="87" rx="19" ry="4.5" fill="#0a2e14" opacity="0.55"/>'
      + '<rect x="44.5" y="61" width="11" height="23" rx="5" fill="#7c4f1e"/>'
      + '<rect x="46" y="63" width="4" height="19" rx="2" fill="#a16207" opacity="0.45"/>'
      + '<rect x="51.5" y="64" width="3" height="17" rx="1.5" fill="#5a3612" opacity="0.35"/>'
      + '<path d="M45 81 Q40 85 34 87" stroke="#5a3612" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.6"/>'
      + '<path d="M55 81 Q60 85 66 87" stroke="#5a3612" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.6"/>'
      + '<ellipse cx="50" cy="61" rx="27" ry="7" fill="#061410" opacity="0.45"/>'
      + '<path d="M50 15 C66 13,82 22,83 37 C84 50,75 60,61 63 L50 65 L39 63 C25 60,16 50,17 37 C18 22,34 13,50 15Z" fill="url(#eb-can-g)"/>'
      + '<path d="M50 17 C64 15,78 24,78 37 C78 48,69 57,57 61 L50 63 L43 61 C31 57,22 48,22 37 C22 24,36 15,50 17Z" fill="#22c55e" opacity="0.55"/>'
      + '<path d="M50 19 C62 17,72 25,72 36 C72 44,64 52,56 55 L50 57 L44 55 C36 52,28 44,28 36 C28 25,38 17,50 19Z" fill="#4ade80" opacity="0.28"/>'
      + '<ellipse cx="50" cy="41" rx="14.5" ry="12.5" fill="#000000" opacity="0.12"/>'
      + '<path d="M41 33.5 Q44 31.5 47 33.5" stroke="#0a2e14" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.75"/>'
      + '<path d="M53 33.5 Q56 31.5 59 33.5" stroke="#0a2e14" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.75"/>'
      + '<ellipse cx="44" cy="39.5" rx="4" ry="4.2" fill="url(#eb-eye-g)"/>'
      + '<circle cx="44.8" cy="40.2" r="2.5" fill="#0c2a14"/>'
      + '<circle cx="44.8" cy="40.2" r="1.6" fill="#15542c" opacity="0.7"/>'
      + '<circle cx="43.8" cy="38.7" r="1.3" fill="white" opacity="0.95"/>'
      + '<circle cx="46" cy="41.4" r="0.5" fill="white" opacity="0.5"/>'
      + '<ellipse cx="56" cy="39.5" rx="4" ry="4.2" fill="url(#eb-eye-g)"/>'
      + '<circle cx="56.8" cy="40.2" r="2.5" fill="#0c2a14"/>'
      + '<circle cx="56.8" cy="40.2" r="1.6" fill="#15542c" opacity="0.7"/>'
      + '<circle cx="55.8" cy="38.7" r="1.3" fill="white" opacity="0.95"/>'
      + '<circle cx="58" cy="41.4" r="0.5" fill="white" opacity="0.5"/>'
      + '<path d="M45 46.5 Q50 52.5 55 46.5" stroke="#0a2e14" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="40.5" cy="43" rx="4.2" ry="2.5" fill="#f97316" opacity="0.1"/>'
      + '<ellipse cx="59.5" cy="43" rx="4.2" ry="2.5" fill="#f97316" opacity="0.1"/>'
      + '<g filter="url(#eb-soft)">'
      + '<path d="M22 27 C18 22,25 17,28 22 C25 22,22 27,22 27Z" fill="#4ade80"/>'
      + '<path d="M22 27 C25 22,28 22,25 17" stroke="#16a34a" stroke-width="0.8" fill="none" opacity="0.6"/>'
      + '</g>'
      + '<g filter="url(#eb-soft)">'
      + '<path d="M78 27 C82 22,75 17,72 22 C75 22,78 27,78 27Z" fill="#4ade80"/>'
      + '<path d="M78 27 C75 22,72 22,75 17" stroke="#16a34a" stroke-width="0.8" fill="none" opacity="0.6"/>'
      + '</g>'
      + '<ellipse cx="50" cy="10" rx="4.5" ry="2.5" fill="#86efac" transform="rotate(-8 50 10)" filter="url(#eb-soft)"/>'
      + '<path d="M79 45 C84 41,82 35,78 38 C80 40,79 45,79 45Z" fill="#34d399" opacity="0.8" filter="url(#eb-soft)"/>'
      + '<circle cx="80" cy="24" r="1.8" fill="#6ee7b7" opacity="0.85"/>'
      + '<circle cx="20" cy="34" r="1.2" fill="#6ee7b7" opacity="0.65"/>'
      + '<circle cx="77" cy="55" r="1.6" fill="#34d399" opacity="0.7"/>'
      + '<circle cx="23" cy="58" r="1.3" fill="#34d399" opacity="0.55"/>'
      + '<circle cx="50" cy="7" r="1.4" fill="#a7f3d0" opacity="0.9"/>'
      + '<circle cx="50" cy="50" r="48.5" fill="none" stroke="#1a5c3a" stroke-width="1.5" opacity="0.6"/>'
      + '<circle cx="50" cy="50" r="47" fill="none" stroke="#22c55e" stroke-width="0.5" opacity="0.25"/>'
      + '</svg>';
  }

  /* ══════════════════ INJECT CSS ══════════════════ */
  function injectCSS() {
    var id = 'ecobot-widget-styles';
    if (document.getElementById(id)) return;
    var style = document.createElement('style');
    style.id = id;
    style.textContent = [
      '/* ─ ECO BOT Widget ─ */',
      '#eb-container{position:fixed;bottom:90px;right:24px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;gap:0;pointer-events:none}',
      '#eb-container *{box-sizing:border-box;font-family:"Segoe UI",system-ui,sans-serif}',
      '#eb-fab-wrap{position:relative;margin-bottom:12px;pointer-events:auto}',
      '#eb-fab{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:radial-gradient(circle at 40% 35%,#1a5c3a,#071a10);box-shadow:0 4px 20px rgba(13,148,136,0.5),0 0 0 0 rgba(13,148,136,0.35);display:flex;align-items:center;justify-content:center;animation:eb-breathe 3.5s ease-in-out infinite,eb-pulse-ring 2.5s ease-in-out infinite;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s;outline:none;overflow:hidden;position:relative;}',
      '#eb-fab:hover{transform:scale(1.12)!important;box-shadow:0 8px 30px rgba(13,148,136,0.65),0 0 0 0 rgba(13,148,136,0)!important}',
      '#eb-fab svg{width:46px;height:46px;pointer-events:none;transition:transform .3s}',
      '#eb-fab:hover svg{transform:scale(1.05) rotate(-3deg)}',
      '#eb-tooltip{position:absolute;right:68px;top:50%;transform:translateY(-50%);background:#0f172a;color:#fff;font-size:.72rem;font-weight:700;padding:6px 12px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s;box-shadow:0 4px 16px rgba(0,0,0,.25);}',
      '#eb-tooltip::after{content:"";position:absolute;left:100%;top:50%;transform:translateY(-50%);border:6px solid transparent;border-left-color:#0f172a}',
      '#eb-fab-wrap:hover #eb-tooltip{opacity:1}',
      '.eb-leaf{position:absolute;pointer-events:none;opacity:0;animation:eb-leaf-rise 4s ease-in-out infinite}',
      '.eb-leaf-1{width:10px;height:6px;background:#4ade80;border-radius:50% 0 50% 0;top:-2px;left:14px;animation-delay:0s}',
      '.eb-leaf-2{width:8px;height:5px;background:#86efac;border-radius:0 50% 0 50%;top:8px;right:-5px;animation-delay:1s;transform:rotate(40deg)}',
      '.eb-leaf-3{width:9px;height:5px;background:#34d399;border-radius:50% 0 50% 0;bottom:6px;left:-4px;animation-delay:2s;transform:rotate(-20deg)}',
      '.eb-leaf-4{width:7px;height:4px;background:#a7f3d0;border-radius:0 50% 0 50%;top:-4px;right:14px;animation-delay:1.6s}',
      '.eb-leaf-5{width:8px;height:5px;background:#6ee7b7;border-radius:50% 0 50% 0;bottom:2px;right:0px;animation-delay:3s;transform:rotate(30deg)}',
      '.eb-ripple{position:absolute;border-radius:50%;background:rgba(74,222,128,0.35);width:0;height:0;top:50%;left:50%;transform:translate(-50%,-50%);animation:eb-ripple-anim .6s ease-out forwards}',
      '@keyframes eb-ripple-anim{to{width:80px;height:80px;opacity:0}}',
      /* Panel */
      '#eb-panel{width:380px;max-height:0;overflow:hidden;background:#fff;border-radius:20px 20px 20px 20px;box-shadow:0 20px 60px rgba(0,0,0,.18),0 4px 20px rgba(13,148,136,.15);transition:max-height .4s cubic-bezier(.4,0,.2,1),opacity .3s,transform .3s;opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;margin-bottom:10px;display:flex;flex-direction:column;border:1px solid rgba(13,148,136,.18);}',
      '#eb-panel.open{max-height:570px;opacity:1;transform:none;pointer-events:auto}',
      '.eb-ph{background:linear-gradient(135deg,#0d3321 0%,#1a5c3a 100%);padding:16px 18px;display:flex;align-items:center;gap:12px;border-radius:19px 19px 0 0;flex-shrink:0;}',
      '.eb-ph-mascot{width:46px;height:46px;flex-shrink:0;filter:drop-shadow(0 2px 8px rgba(74,222,128,.4))}',
      '.eb-ph-info{flex:1}',
      '.eb-ph-name{font-size:.95rem;font-weight:900;color:#fff;letter-spacing:.02em}',
      '.eb-ph-name span{color:#4ade80}',
      '.eb-ph-tagline{font-size:.68rem;color:rgba(255,255,255,.6);margin-top:1px}',
      '.eb-ph-status{display:flex;align-items:center;gap:5px;font-size:.7rem;color:#4ade80;font-weight:700;margin-top:3px}',
      '.eb-status-dot{width:7px;height:7px;background:#4ade80;border-radius:50%;animation:eb-blink 2s ease-in-out infinite}',
      '.eb-ph-close{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(255,255,255,.7);font-size:.75rem;flex-shrink:0;transition:.15s}',
      '.eb-ph-close:hover{background:rgba(255,255,255,.22);color:#fff}',
      '.eb-quick-strip{padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;gap:6px;overflow-x:auto;flex-shrink:0;background:#f8fafc}',
      '.eb-quick-strip::-webkit-scrollbar{height:0}',
      '.eb-qa{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:5px 12px;font-size:.69rem;font-weight:700;color:#0f172a;cursor:pointer;white-space:nowrap;transition:.15s;flex-shrink:0}',
      '.eb-qa:hover{border-color:#0d9488;color:#0d9488;background:#f0fdfa}',
      '.eb-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0}',
      '.eb-msgs::-webkit-scrollbar{width:3px}.eb-msgs::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px}',
      '.eb-msg{display:flex;gap:8px;max-width:90%}',
      '.eb-msg.user{align-self:flex-end;flex-direction:row-reverse}',
      '.eb-msg-av{width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;align-self:flex-end}',
      '.eb-msg.bot .eb-msg-av{background:linear-gradient(135deg,#0d3321,#1a5c3a)}',
      '.eb-msg.user .eb-msg-av{background:#f1f5f9;font-size:.75rem;color:#64748b}',
      '.eb-bubble{padding:10px 13px;border-radius:12px;font-size:.8rem;line-height:1.6;color:#0f172a}',
      '.eb-msg.bot .eb-bubble{background:#f1f5f9;border-radius:12px 12px 12px 0}',
      '.eb-msg.user .eb-bubble{background:#0d9488;color:#fff;border-radius:12px 12px 0 12px}',
      '.eb-typing{display:flex;gap:4px;padding:8px 12px;align-items:center}',
      '.eb-td{width:7px;height:7px;background:#94a3b8;border-radius:50%;animation:eb-bounce .8s ease-in-out infinite}',
      '.eb-td:nth-child(2){animation-delay:.15s}.eb-td:nth-child(3){animation-delay:.3s}',
      '.eb-input-row{padding:12px 14px;border-top:1px solid #f1f5f9;display:flex;gap:8px;background:#fff;border-radius:0 0 19px 19px;flex-shrink:0}',
      '.eb-inp{flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 13px;font-size:.8rem;font-family:inherit;resize:none;outline:none;height:40px;transition:.15s}',
      '.eb-inp:focus{border-color:#0d9488;box-shadow:0 0 0 3px rgba(13,148,136,.1)}',
      '.eb-send{width:40px;height:40px;background:#0d9488;border:none;border-radius:10px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;transition:.15s}',
      '.eb-send:hover{background:#0f766e}',
      '#eb-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:10px;min-width:18px;height:18px;font-size:.65rem;font-weight:900;display:none;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;pointer-events:none}',
      /* Workspace nav badge on FAB */
      '#eb-ws-badge{position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);background:linear-gradient(90deg,#0d9488,#059669);color:#fff;border-radius:6px;padding:1px 6px;font-size:.55rem;font-weight:900;white-space:nowrap;border:1.5px solid #fff;pointer-events:none;letter-spacing:.04em;display:none}',
      '@keyframes eb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}',
      '@keyframes eb-pulse-ring{0%{box-shadow:0 4px 20px rgba(13,148,136,.5),0 0 0 0 rgba(13,148,136,.3)}70%{box-shadow:0 4px 20px rgba(13,148,136,.5),0 0 0 14px rgba(13,148,136,0)}100%{box-shadow:0 4px 20px rgba(13,148,136,.5),0 0 0 0 rgba(13,148,136,0)}}',
      '@keyframes eb-leaf-rise{0%{opacity:0;transform:translateY(0) rotate(0deg) scale(0.7)}20%{opacity:.85}70%{opacity:.6}100%{opacity:0;transform:translateY(-28px) rotate(200deg) scale(1.1)}}',
      '@keyframes eb-blink{0%,100%{opacity:1}50%{opacity:.3}}',
      '@keyframes eb-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',
      '@keyframes eb-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '.eb-msg{animation:eb-fade-in .2s ease}',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ══════════════════ BUILD DOM ══════════════════ */
  function buildWidget() {
    var workspaceMode = shouldShowWorkspace();
    var container = document.createElement('div');
    container.id = 'eb-container';

    /* Panel — only shown in public/website mode */
    var panel = document.createElement('div');
    panel.id = 'eb-panel';
    panel.innerHTML = buildPanelHTML(workspaceMode);
    container.appendChild(panel);

    /* FAB wrapper */
    var fabWrap = document.createElement('div');
    fabWrap.id = 'eb-fab-wrap';
    fabWrap.innerHTML = buildFabHTML(workspaceMode);
    container.appendChild(fabWrap);

    document.body.appendChild(container);

    /* FAB click — workspace mode (portal pages + logged in) vs website assistant */
    document.getElementById('eb-fab').addEventListener('click', function (e) {
      createRipple(e);
      if (shouldShowWorkspace()) {
        var orgId = getOrgId();
        var path = (window.location.pathname || '').toLowerCase();
        var portal = path.indexOf('lab-portal') >= 0 ? 'lab'
                   : path.indexOf('reg-portal') >= 0 ? 'reg'
                   : 'org';
        var qs = '?portal=' + portal + (orgId ? '&orgId=' + encodeURIComponent(orgId) : '');
        var url = '/eco-bot-workspace.html' + qs;
        window.location.href = url;
      } else {
        togglePanel();
      }
    });

    /* Close button (public mode only) */
    var closeBtn = document.getElementById('eb-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    /* Send button */
    var sendBtn = document.getElementById('eb-send');
    var inp = document.getElementById('eb-inp');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (inp) {
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
    }

    /* Quick action chips */
    var qas = document.querySelectorAll('.eb-qa');
    for (var i = 0; i < qas.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var msg = btn.dataset.msg;
          if (msg) { if (!panelOpen) openPanel(); setTimeout(function () { processMessage(msg); }, 150); }
        });
      })(qas[i]);
    }

    /* Show welcome in website assistant mode (public pages, or logged out) */
    if (!workspaceMode) showPublicWelcome();
    else setBadge(1);
  }

  /* ══════════════════ PANEL HTML ══════════════════ */
  function buildPanelHTML(loggedIn) {
    var html = '';
    /* Header */
    html += '<div class="eb-ph">';
    html += '<div class="eb-ph-mascot">' + getMascotSVG(46) + '</div>';
    html += '<div class="eb-ph-info">';
    html += '<div class="eb-ph-name">ECO <span>BOT</span></div>';
    if (loggedIn) {
      html += '<div class="eb-ph-tagline">Opening AI Workspace…</div>';
    } else {
      html += '<div class="eb-ph-tagline">EcoSphere Website Assistant</div>';
      html += '<div class="eb-ph-status"><span class="eb-status-dot"></span> Online — Ask me anything about EcoSphere</div>';
    }
    html += '</div>';
    html += '<button class="eb-ph-close" id="eb-close" title="Close"><i class="fas fa-times"></i></button>';
    html += '</div>';

    if (!loggedIn) {
      /* Quick actions for public mode */
      html += '<div class="eb-quick-strip">';
      var chips = [
        ['What is EcoSphere?', 'What is EcoSphere?'],
        ['Our Products', 'What products does EcoSphere offer?'],
        ['Industries', 'Which industries does EcoSphere serve?'],
        ['Request Demo', 'How do I request a demo?'],
        ['ESG & EIA', 'What is ESG and EIA assessment?'],
        ['Contact Us', 'How can I contact EcoSphere?']
      ];
      for (var i = 0; i < chips.length; i++) {
        html += '<button class="eb-qa" data-msg="' + escAttr(chips[i][1]) + '">' + escHtml(chips[i][0]) + '</button>';
      }
      html += '</div>';
      html += '<div class="eb-msgs" id="eb-msgs"></div>';
      html += '<div class="eb-input-row">';
      html += '<textarea class="eb-inp" id="eb-inp" placeholder="Ask about EcoSphere features, services, industries…" rows="1"></textarea>';
      html += '<button class="eb-send" id="eb-send" title="Send"><i class="fas fa-paper-plane"></i></button>';
      html += '</div>';
    }

    return html;
  }

  function buildFabHTML(workspaceMode) {
    var html = '';
    html += '<div id="eb-badge">1</div>';
    /* Only show "AI WORKSPACE" badge on actual portal pages where workspace mode is active */
    if (workspaceMode) {
      html += '<div id="eb-ws-badge" style="display:flex">AI WORKSPACE</div>';
    }
    html += '<button id="eb-fab" title="ECO BOT AI" aria-label="ECO BOT AI Assistant">';
    html += getMascotSVG(46);
    html += '</button>';
    html += '<div class="eb-leaf eb-leaf-1"></div>';
    html += '<div class="eb-leaf eb-leaf-2"></div>';
    html += '<div class="eb-leaf eb-leaf-3"></div>';
    html += '<div class="eb-leaf eb-leaf-4"></div>';
    html += '<div class="eb-leaf eb-leaf-5"></div>';
    var tooltipText = workspaceMode ? 'ECO BOT — Open AI Workspace' : 'ECO BOT — Ask about EcoSphere';
    html += '<div id="eb-tooltip">' + escHtml(tooltipText) + '</div>';
    return html;
  }

  /* ══════════════════ PANEL STATE ══════════════════ */
  var panelOpen = false;
  var unreadCount = 0;

  function togglePanel() { if (panelOpen) { closePanel(); } else { openPanel(); } }

  function openPanel() {
    var panel = document.getElementById('eb-panel');
    var badge = document.getElementById('eb-badge');
    if (panel) panel.classList.add('open');
    if (badge) badge.style.display = 'none';
    panelOpen = true;
    unreadCount = 0;
    var inp = document.getElementById('eb-inp');
    if (inp) setTimeout(function () { inp.focus(); }, 400);
  }

  function closePanel() {
    var panel = document.getElementById('eb-panel');
    if (panel) panel.classList.remove('open');
    panelOpen = false;
  }

  /* ══════════════════ MESSAGES (PUBLIC MODE) ══════════════════ */
  function showPublicWelcome() {
    appendBotMsg('🌳 Hello! I\'m <strong>ECO BOT</strong>, your EcoSphere website guide.\n\nI can tell you about our environmental monitoring platform, products, services, and how EcoSphere can help your organisation achieve environmental compliance.\n\nWhat would you like to know?');
    setBadge(1);
  }

  function appendBotMsg(text) {
    var msgsEl = document.getElementById('eb-msgs');
    if (!msgsEl) return;
    var div = document.createElement('div');
    div.className = 'eb-msg bot';
    div.innerHTML = '<div class="eb-msg-av">' + getMascotSVG(22) + '</div>'
      + '<div class="eb-bubble">' + text.replace(/\n/g, '<br>') + '</div>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    if (!panelOpen) { unreadCount++; setBadge(unreadCount); }
  }

  function appendUserMsg(text) {
    var msgsEl = document.getElementById('eb-msgs');
    if (!msgsEl) return;
    var div = document.createElement('div');
    div.className = 'eb-msg user';
    div.innerHTML = '<div class="eb-msg-av"><i class="fas fa-user"></i></div>'
      + '<div class="eb-bubble">' + escHtml(text) + '</div>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function showTypingIndicator() {
    var msgsEl = document.getElementById('eb-msgs');
    if (!msgsEl) return;
    var div = document.createElement('div');
    div.className = 'eb-msg bot';
    div.id = 'eb-typing-ind';
    div.innerHTML = '<div class="eb-msg-av">' + getMascotSVG(22) + '</div>'
      + '<div class="eb-bubble"><div class="eb-typing">'
      + '<span class="eb-td"></span><span class="eb-td"></span><span class="eb-td"></span>'
      + '</div></div>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function removeTypingIndicator() {
    var t = document.getElementById('eb-typing-ind');
    if (t) t.remove();
  }

  function setBadge(count) {
    var badge = document.getElementById('eb-badge');
    if (!badge) return;
    if (count > 0 && !panelOpen) { badge.textContent = count > 9 ? '9+' : count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }

  /* ══════════════════ SEND (PUBLIC MODE) ══════════════════ */
  function sendMessage() {
    var inp = document.getElementById('eb-inp');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    processMessage(text);
  }

  function processMessage(text) {
    appendUserMsg(text);
    showTypingIndicator();
    setTimeout(function () {
      removeTypingIndicator();
      appendBotMsg(generatePublicResponse(text));
    }, 700 + Math.random() * 400);
  }

  /* ══════════════════ PUBLIC WEBSITE RESPONSES ══════════════════
     ONLY answers questions about EcoSphere as a company/product.
     Never reveals org-specific data, scores, or monitoring records.
  ══════════════════════════════════════════════════════════════ */
  function generatePublicResponse(question) {
    var q = question.toLowerCase();

    if (q.indexOf('what is ecosphere') >= 0 || q.indexOf('about ecosphere') >= 0 || q.indexOf('tell me about') >= 0) {
      return '<strong>EcoSphere</strong> is an enterprise Environmental Intelligence Platform developed by <strong>QMICS Solutions</strong>.\n\nIt helps organisations across pharmaceuticals, manufacturing, chemicals, food processing, and other regulated industries:\n\n• Monitor environmental parameters in real time\n• Generate EIA & ESG compliance reports\n• Track carbon footprint & sustainability KPIs\n• Manage regulatory submissions\n• Use AI-powered analysis and predictions\n\nEcoSphere is trusted by industries that require precision environmental compliance under CPCB, MoEFCC, ISO 14001, and other frameworks.';
    }

    if (q.indexOf('product') >= 0 || q.indexOf('feature') >= 0 || q.indexOf('module') >= 0 || q.indexOf('offer') >= 0 || q.indexOf('service') >= 0) {
      return 'EcoSphere offers a complete suite of environmental management modules:\n\n🌿 <strong>Environmental Monitoring</strong> — Air, water, noise, soil, energy, waste\n📋 <strong>EIA Assessment</strong> — Environmental Impact Assessment builder & reports\n📊 <strong>ESG Assessment</strong> — Environmental, Social & Governance scoring\n💨 <strong>Carbon Emission</strong> — Scope 1, 2, 3 carbon footprint calculation\n🔬 <strong>Lab Portal</strong> — NABL laboratory data submission & management\n📄 <strong>Regulatory Portal</strong> — Direct submission to regulatory authorities\n🤖 <strong>ECO BOT AI</strong> — AI-powered environmental intelligence workspace\n📈 <strong>Report Centre</strong> — Professional PDF, DOCX, PPTX report generation';
    }

    if (q.indexOf('industry') >= 0 || q.indexOf('industries') >= 0 || q.indexOf('sector') >= 0 || q.indexOf('who') >= 0) {
      return 'EcoSphere serves the following regulated industries:\n\n🏥 Pharmaceuticals & Biotechnology\n🏭 Manufacturing & Engineering\n⚗️ Chemical & Petrochemical\n🍽️ Food Processing & Beverages\n💊 Medical Devices\n🔌 Power Generation\n🏗️ Construction & Infrastructure\n🚗 Automotive\n⛏️ Mining & Minerals\n🧵 Textiles\n\nAny industry required to maintain environmental compliance, submit to regulatory authorities, or track ESG metrics can benefit from EcoSphere.';
    }

    if (q.indexOf('demo') >= 0 || q.indexOf('trial') >= 0 || q.indexOf('signup') >= 0 || q.indexOf('sign up') >= 0 || q.indexOf('register') >= 0 || q.indexOf('get started') >= 0) {
      return 'To request a <strong>free demo</strong> of EcoSphere:\n\n1. Click <strong>Get Started</strong> or <strong>Request Demo</strong> on the homepage\n2. Select your industry\n3. Complete the registration form\n4. Our team will contact you within <strong>24 hours</strong> to schedule a personalised demonstration\n\nYou can also contact us directly:\n📧 Email: info@qmicssolutions.com\n📞 Phone: Available on the Contact page\n\nThe demo is completely free and tailored to your industry\'s specific environmental compliance requirements.';
    }

    if (q.indexOf('esg') >= 0 || q.indexOf('environmental social') >= 0 || q.indexOf('sustainability') >= 0) {
      return '<strong>ESG Assessment</strong> on EcoSphere helps organisations measure and report their Environmental, Social, and Governance performance:\n\n🌍 <strong>Environmental</strong> — Carbon emissions, energy, water, waste, air & water quality\n👥 <strong>Social</strong> — Employee health & safety, training hours, incidents\n🏛️ <strong>Governance</strong> — Board independence, compliance violations, policy adherence\n\nEcoSphere calculates ESG scores aligned with:\n• GRI (Global Reporting Initiative) Standards\n• SEBI BRSR (Business Responsibility & Sustainability Reporting)\n• ISO 14001 Environmental Management\n• UN Sustainable Development Goals (SDGs)\n\nReports are generated in PDF, DOCX, PPTX, and XLSX formats.';
    }

    if (q.indexOf('eia') >= 0 || q.indexOf('environmental impact') >= 0 || q.indexOf('impact assessment') >= 0) {
      return '<strong>EIA (Environmental Impact Assessment)</strong> on EcoSphere provides a complete workflow for:\n\n📌 <strong>Project Setup</strong> — Organisation details, project parameters, team management\n📊 <strong>Baseline Data</strong> — Air quality, water, noise, soil baseline measurements\n🔬 <strong>Environmental Monitoring</strong> — Real-time parameter tracking\n📄 <strong>Professional Reports</strong> — Publication-quality EIA reports auto-generated from data\n\nEcoSphere EIA reports comply with:\n• MoEFCC EIA Notification 2006\n• EIA Guidance Manuals\n• CPCB Standards\n• ISO 14001:2015\n\nThe report generator creates A4-format professional documents with cover page, executive summary, monitoring data, and recommendations.';
    }

    if (q.indexOf('carbon') >= 0 || q.indexOf('emission') >= 0 || q.indexOf('co2') >= 0 || q.indexOf('ghg') >= 0 || q.indexOf('greenhouse') >= 0) {
      return 'EcoSphere\'s <strong>Carbon Emission Module</strong> calculates your complete GHG footprint:\n\n🔴 <strong>Scope 1</strong> — Direct emissions (diesel, LPG, natural gas, coal combustion)\n🟡 <strong>Scope 2</strong> — Indirect emissions (grid electricity consumption)\n🟢 <strong>Scope 3</strong> — Value chain emissions (transport, logistics)\n\nFeatures:\n• India-specific emission factors (IPCC, MoEFCC guidelines)\n• Monthly & annual trend tracking\n• Carbon reduction pathway modelling\n• Integration with ESG reporting\n• Offset credit tracking\n\nAll calculations follow IPCC AR6 methodology and MoEFCC national reporting guidelines.';
    }

    if (q.indexOf('monitor') >= 0 || q.indexOf('air quality') >= 0 || q.indexOf('water quality') >= 0 || q.indexOf('noise') >= 0 || q.indexOf('parameter') >= 0) {
      return 'EcoSphere\'s <strong>Environmental Monitoring</strong> module tracks:\n\n💨 <strong>Air Quality</strong> — PM2.5, PM10, CO₂, NOₓ, SO₂, VOCs\n💧 <strong>Water Quality</strong> — pH, TDS, BOD, COD, DO, turbidity\n🔊 <strong>Noise</strong> — Day/night boundary levels (CPCB standards)\n🌡️ <strong>Temperature & Humidity</strong> — Ambient, process, effluent\n⚡ <strong>Energy</strong> — Power consumption, peak demand, efficiency\n🗑️ <strong>Waste</strong> — Solid, liquid, hazardous, recycled\n🌫️ <strong>Stack Emissions</strong> — CEMS integration, emission rates\n\nData can be entered manually, via IoT device integration, or bulk CSV import.\nAI-powered analysis automatically classifies readings as Normal / Attention / Warning / Critical / Emergency.';
    }

    if (q.indexOf('iso') >= 0 || q.indexOf('compliance') >= 0 || q.indexOf('regulation') >= 0 || q.indexOf('standard') >= 0 || q.indexOf('cpcb') >= 0) {
      return 'EcoSphere supports compliance with major environmental standards and regulations:\n\n🏆 <strong>ISO 14001:2015</strong> — Environmental Management System\n🏆 <strong>ISO 50001</strong> — Energy Management System\n📋 <strong>CPCB Standards</strong> — Central Pollution Control Board norms\n📋 <strong>MoEFCC Regulations</strong> — EIA Notification, EP Rules 1986\n📋 <strong>SEBI BRSR</strong> — Business Responsibility & Sustainability Reporting\n📋 <strong>GRI Standards</strong> — Global Reporting Initiative\n📋 <strong>BIS Standards</strong> — Bureau of Indian Standards\n\nEcoSphere automatically checks monitoring data against applicable limits and flags non-compliance instantly.';
    }

    if (q.indexOf('contact') >= 0 || q.indexOf('support') >= 0 || q.indexOf('help') >= 0 || q.indexOf('qmics') >= 0) {
      return 'To get in touch with <strong>QMICS Solutions</strong> — the team behind EcoSphere:\n\n📧 <strong>Email:</strong> info@qmicssolutions.com\n🌐 <strong>Website:</strong> www.qmicssolutions.com\n📍 <strong>Location:</strong> India\n\n<strong>Support Options:</strong>\n• Technical Support — Contact our support team\n• Sales Enquiry — Request a personalised demo\n• Partnership — Explore reseller & integration opportunities\n• Training — EcoSphere user training programmes\n\nOur team typically responds within 24 hours on business days.';
    }

    if (q.indexOf('price') >= 0 || q.indexOf('cost') >= 0 || q.indexOf('pricing') >= 0 || q.indexOf('plan') >= 0 || q.indexOf('subscription') >= 0) {
      return 'EcoSphere pricing is tailored to your organisation\'s size, industry, and module requirements.\n\nPricing depends on:\n• Number of monitoring stations\n• Modules required (EIA, ESG, Carbon, Lab, etc.)\n• Number of users\n• Report volume\n• Support level\n\nTo get a <strong>customised quote</strong> for your organisation, please:\n1. Request a demo via the homepage\n2. Contact us at info@qmicssolutions.com\n3. Speak with our sales team\n\nWe offer flexible plans for SMEs, large enterprises, and multi-site organisations.';
    }

    if (q.indexOf('ai') >= 0 || q.indexOf('ecobot') >= 0 || q.indexOf('intelligent') >= 0 || q.indexOf('artificial') >= 0) {
      return '<strong>ECO BOT AI</strong> is EcoSphere\'s built-in AI Environmental Intelligence system.\n\nIt provides:\n🤖 <strong>AI Copilot</strong> — Natural language questions about your monitoring data\n📊 <strong>Intelligent Analysis</strong> — Auto-classification of all parameters\n🔮 <strong>Predictive Analytics</strong> — Forecast exceedances before they happen\n🚨 <strong>Smart Alerts</strong> — AI-prioritised alerts with root cause analysis\n💡 <strong>AI Insights</strong> — Daily environmental health summaries\n📄 <strong>Report Generation</strong> — AI-assisted PDF/DOCX/PPTX/XLSX reports\n\nAfter signing in to the EcoSphere Organisation Portal, ECO BOT transforms into a complete <strong>AI Workspace</strong> giving your team enterprise-grade environmental intelligence.';
    }

    if (q.indexOf('login') >= 0 || q.indexOf('sign in') >= 0 || q.indexOf('signin') >= 0 || q.indexOf('account') >= 0 || q.indexOf('portal') >= 0) {
      return 'To access the <strong>EcoSphere Organisation Portal</strong>:\n\n1. Click <strong>Sign In</strong> or <strong>Organisation Portal</strong> on the homepage\n2. Select your industry\n3. Enter your organisation credentials\n4. Access your complete environmental management dashboard\n\n<strong>First time?</strong> Click <strong>Register</strong> to create your organisation account, or request a demo to get started with a guided onboarding session.\n\nOnce logged in, ECO BOT will give you access to the full <strong>AI Workspace</strong> with your organisation\'s environmental data, reports, and AI analysis.';
    }

    /* Default public response */
    return 'Thank you for your question! As the <strong>EcoSphere Website Assistant</strong>, I can help you learn about:\n\n• EcoSphere platform features and modules\n• Environmental monitoring capabilities\n• EIA, ESG, and Carbon emission management\n• Industries we serve\n• Compliance standards supported\n• How to request a demo or contact us\n\nFor detailed analysis of your organisation\'s environmental data, please <strong>sign in</strong> to the Organisation Portal — ECO BOT will provide complete AI-powered insights from your data.\n\nWhat would you like to know about EcoSphere?';
  }

  /* ══════════════════ RIPPLE ══════════════════ */
  function createRipple(e) {
    var btn = document.getElementById('eb-fab');
    if (!btn) return;
    var ripple = document.createElement('span');
    ripple.className = 'eb-ripple';
    btn.appendChild(ripple);
    setTimeout(function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 700);
  }

  /* ══════════════════ UTILS ══════════════════ */
  function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ══════════════════ GLOBAL API ══════════════════ */
  window.ecoBotOpen = function () { if (!shouldShowWorkspace()) openPanel(); };
  window.ecoBotClose = closePanel;
  window.ecoBotMascotSVG = getMascotSVG;

  /* ══════════════════ INIT ══════════════════ */
  function init() { injectCSS(); buildWidget(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
