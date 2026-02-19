/**
 * API configuration for Wankr dashboard.
 * - Dev: empty base + Vite proxy (vite.config.js) sends /api to http://127.0.0.1:5000.
 * - Production: empty base; backend serves frontend and /api on same origin.
 * - Optional: set VITE_API_BASE at build time for a different API origin (e.g. separate backend URL).
 * - Optional: set VITE_API_KEY at build time to send an API key header with every request.
 */
const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE != null
  ? import.meta.env.VITE_API_BASE
  : '';

const API_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY != null
  ? import.meta.env.VITE_API_KEY
  : '';

export { API_BASE, API_KEY };
