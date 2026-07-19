/**
 * Vercel serverless function: /config.js
 * Returns the runtime config script with the backend URL injected from env.
 * Set ECOSPHERE_API_BASE in Vercel project settings to your Render backend URL.
 */
module.exports = function handler(req, res) {
  var apiBase = process.env.ECOSPHERE_API_BASE || '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end('window.ECOSPHERE_CONFIG = { apiBase: ' + JSON.stringify(apiBase) + ' };');
};
