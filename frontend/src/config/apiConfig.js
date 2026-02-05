/**
 * API configuration for Wankr dashboard.
 * Same-origin when using Vite proxy (/api → Flask).
 */

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE != null
  ? import.meta.env.VITE_API_BASE
  : '';

export { API_BASE };
