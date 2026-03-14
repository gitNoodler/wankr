/**
 * Wallet service — API wrappers for wallet auth endpoints.
 * Connection + signing is handled by wagmi hooks in components.
 */
import { api } from '../utils/api';
import { storeSession } from './authService';

// --- Nonce ---
export async function fetchNonce(chain, address) {
  const res = await api.post('/api/auth/wallet/nonce', { chain, address });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get nonce');
  return data; // { nonceId, message }
}

// --- API wrappers ---
export async function walletLogin(nonceId, chain, address, signature) {
  const res = await api.post('/api/auth/wallet/login', { nonceId, chain, address, signature });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Wallet login failed');
  if (data.token) storeSession(data.token, data.username, data.isDev);
  return data;
}

export async function walletRegister(nonceId, chain, address, signature, username) {
  const res = await api.post('/api/auth/wallet/register', { nonceId, chain, address, signature, username });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Wallet registration failed');
  if (data.token) storeSession(data.token, data.username, data.isDev);
  return data;
}

export async function walletLink(token, nonceId, chain, address, signature) {
  const res = await api.post('/api/auth/wallet/link', { token, nonceId, chain, address, signature });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Wallet linking failed');
  return data;
}
