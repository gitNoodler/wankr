/**
 * Auth service — register, login, session management
 */
import { api } from '../utils/api';

const TOKEN_KEY = 'wankr_session_token';
const USER_KEY = 'wankr_username';

// --- Token storage ---
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUsername() {
  return localStorage.getItem(USER_KEY);
}

function storeSession(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// --- Check username availability (real-time) ---
export async function checkUsername(username) {
  const res = await api.get(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  return data;
}

// --- Register new user ---
export async function register(username, password, email) {
  const body = { username, password };
  if (email !== undefined && email !== null && String(email).trim() !== '') body.email = String(email).trim();
  const res = await api.post('/api/auth/register', body);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  if (data.token) storeSession(data.token, data.username);
  return data;
}

// --- Login existing user ---
export async function login(username, password) {
  const res = await api.post('/api/auth/login', { username, password });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  if (data.token) storeSession(data.token, data.username);
  return data;
}

// --- Validate session (for auto-login on refresh) ---
export async function validateSession() {
  const token = getStoredToken();
  if (!token) return { valid: false };
  try {
    const res = await api.post('/api/auth/validate', { token });
    const data = await res.json();
    if (!data.valid) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'authService.js:validateSession',message:'validate response invalid',data:{ok:res.ok,status:res?.status},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      clearSession();
      return { valid: false };
    }
    return { valid: true, username: data.username };
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'authService.js:validateSession.catch',message:'validate threw',data:{errMsg:err?.message},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    clearSession();
    return { valid: false };
  }
}

// --- Logout ---
export async function logout() {
  const token = getStoredToken();
  if (token) {
    try {
      await api.post('/api/auth/logout', { token });
    } catch {
      // Ignore errors, clear locally anyway
    }
  }
  clearSession();
}
