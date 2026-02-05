/**
 * Central API layer for Wankr dashboard.
 * All backend calls go through this (same-origin with Flask proxy).
 */

import { API_BASE } from '../config/apiConfig';

function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
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
};
