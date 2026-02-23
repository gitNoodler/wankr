/**
 * KOL Analysis service — fetch accounts, stats, and analysis from backend.
 */

import { api } from '../utils/api';

export async function getKolAccounts(sort = 'roastPriority', order = 'desc') {
  const res = await api.get(`/api/kol/accounts?sort=${sort}&order=${order}`);
  if (!res.ok) throw new Error(`KOL accounts request failed: ${res.status}`);
  const data = await res.json();
  return data.accounts ?? [];
}

export async function getKolStats() {
  const res = await api.get('/api/kol/stats');
  if (!res.ok) throw new Error(`KOL stats request failed: ${res.status}`);
  return res.json();
}

export async function analyzeKol(handle) {
  const res = await api.get(`/api/kol/analyze/${encodeURIComponent(handle)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`KOL analysis failed: ${res.status}`);
  }
  return res.json();
}

export async function reloadKolDatabase() {
  const res = await api.post('/api/kol/reload');
  if (!res.ok) throw new Error(`KOL reload failed: ${res.status}`);
  return res.json();
}
