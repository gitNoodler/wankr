/**
 * Training service — add examples and get count.
 */

import { api } from '../utils/api';

export async function addTraining(messages, systemPrompt = '') {
  const payload = { messages };
  if (systemPrompt.trim()) payload.system_prompt = systemPrompt.trim();
  const res = await api.post('/api/train', payload);
  if (!res.ok) {
    throw new Error(`Training request failed: ${res.status}`);
  }
  const data = await res.json();
  return data.count ?? 0;
}

export async function getTrainCount() {
  try {
    const res = await api.get('/api/train/count');
    if (!res.ok) return 0;
    const text = await res.text();
    if (!text.trim()) return 0;
    const data = JSON.parse(text);
    return data.count ?? 0;
  } catch {
    return 0;
  }
}
