/**
 * Polls /api/restart/status — when restart is requested, backs up chat to server and acks.
 * Enables wankr.bat to safely save chat before shutting down.
 */

import { useEffect, useRef } from 'react';
import { api } from '../utils/api';

const POLL_INTERVAL_MS = 2000;

export function useRestartBackup(conversation, currentId) {
  const backingUp = useRef(false);
  const pollingDisabled = useRef(false);

  useEffect(() => {
    if (pollingDisabled.current) return;

    const interval = setInterval(async () => {
      if (pollingDisabled.current) return;
      if (backingUp.current) return;
      try {
        const res = await api.get('/api/restart/status');
        const data = await res.json();
        if (!data?.restartRequested) return;
        backingUp.current = true;
        await api.post('/api/chat/backup', {
          messages: conversation,
          currentId: currentId || '',
        });
        await api.get('/api/restart/ack');
      } catch {
        // If the backend is down, stop polling to avoid spam.
        pollingDisabled.current = true;
      } finally {
        backingUp.current = false;
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversation, currentId]);
}
