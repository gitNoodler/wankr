/**
 * Chat service — Wankr agent API.
 */

import { api } from '../utils/api';

export async function sendChat(message, history = [], signal, options = {}) {
  const { clientId, command, trainingKey } = options;
  const res = await api.post(
    '/api/chat',
    { message, history, clientId, command, trainingKey },
    { signal }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || (res.status === 503 ? 'API not configured. Check XAI_API_KEY in .env or Infisical.' : 'Chat request failed');
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data.reply ?? null;
}
