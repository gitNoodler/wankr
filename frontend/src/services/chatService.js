/**
 * Chat service — Wankr agent API.
 */

import { api } from '../utils/api';

export async function sendChat(message, history = [], signal) {
  const res = await api.post('/api/chat', { message, history }, { signal });
  if (!res.ok) {
    const err = res.status === 401 ? new Error('Unauthorized') : new Error('Chat request failed');
    throw err;
  }
  const data = await res.json();
  return data.reply ?? null;
}
