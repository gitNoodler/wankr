/**
 * Polls /api/restart/status — when restart is requested, backs up chat to server and acks.
 * Enables restart.bat to safely save chat before shutting down.
 */

import { useEffect, useRef } from 'react';
import { api } from '../utils/api';

const POLL_INTERVAL_MS = 2000;

export function useRestartBackup(conversation, currentId) {
  const backingUp = useRef(false);

  useEffect(() => {
    const interval = setInterval(async () => {
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
        // API may be down; ignore
      } finally {
        backingUp.current = false;
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversation, currentId]);
}
