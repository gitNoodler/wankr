/**
 * Central API layer for Wankr dashboard.
 * All backend calls go through this (same-origin with Node API proxy).
 * API key: from build-time VITE_API_KEY or runtime from GET /api/config (Infisical).
 */

import { API_BASE, API_KEY } from '../config/apiConfig';

let runtimeApiKey = '';

export function setRuntimeApiKey(key) {
  runtimeApiKey = key ? String(key) : '';
}

function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const apiKey = API_KEY || runtimeApiKey;
  if (apiKey) headers['X-API-Key'] = apiKey;
  const config = { ...options, headers };
  return fetch(url, config);
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};
