/**
 * EcoSphere Runtime Config
 * On localhost  → apiBase is empty, so /api/v1 calls go to the same-origin Express server.
 * On Vercel     → set ECOSPHERE_API_BASE to your deployed backend URL
 *                 e.g. https://ecosphere-api.railway.app
 */
(function () {
  var isLocal = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === ''
  );

  window.ECOSPHERE_CONFIG = {
    /* Empty on localhost — relative paths work because Express serves frontend+API together.
       On Vercel, this is replaced by the ECOSPHERE_API_BASE env variable at deploy time. */
    apiBase: isLocal ? '' : (window.__ECOSPHERE_API_BASE__ || '')
  };
})();
