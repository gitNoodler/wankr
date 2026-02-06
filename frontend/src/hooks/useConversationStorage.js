/**
 * Conversation storage — current chat + archived list (localStorage).
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_CURRENT_ID = 'wankr_current_id';
const STORAGE_CURRENT_MESSAGES = 'wankr_current_messages';
const STORAGE_ARCHIVED = 'wankr_archived';
const MAX_ARCHIVED = 50;

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_MESSAGES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadCurrentId() {
  return localStorage.getItem(STORAGE_CURRENT_ID) || `c-${Date.now()}`;
}

function loadArchived() {
  try {
    const raw = localStorage.getItem(STORAGE_ARCHIVED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useConversationStorage() {
  const [currentId, setCurrentId] = useState(loadCurrentId);
  const [conversation, setConversation] = useState(loadMessages);
  const [archived, setArchived] = useState(loadArchived);

  const saveCurrent = useCallback((id, messages) => {
    localStorage.setItem(STORAGE_CURRENT_ID, id);
    localStorage.setItem(STORAGE_CURRENT_MESSAGES, JSON.stringify(messages));
  }, []);

  const persistArchived = useCallback((list) => {
    const trimmed = list.slice(-MAX_ARCHIVED);
    localStorage.setItem(STORAGE_ARCHIVED, JSON.stringify(trimmed));
    setArchived(trimmed);
  }, []);

  useEffect(() => {
    saveCurrent(currentId, conversation);
  }, [currentId, conversation, saveCurrent]);

  const startNewChat = useCallback(() => {
    setCurrentId(`c-${Date.now()}`);
    setConversation([]);
  }, []);

  const handleLoadArchived = useCallback(
    (id) => {
      const idx = archived.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const c = archived[idx];
      setConversation(Array.isArray(c.messages) ? [...c.messages] : []);
      setCurrentId(c.id);
      const next = archived.filter((x) => x.id !== id);
      persistArchived(next);
      return true; // caller can close archive modal
    },
    [archived, persistArchived]
  );

  const currentLabel = conversation.length ? 'Current chat' : 'New chat';

  const restoreFromBackup = useCallback((messages, id) => {
    setConversation(Array.isArray(messages) ? [...messages] : []);
    if (id != null && id !== '') setCurrentId(id);
  }, []);

  return {
    currentId,
    setCurrentId,
    conversation,
    setConversation,
    archived,
    currentLabel,
    saveCurrent,
    persistArchived,
    startNewChat,
    handleLoadArchived,
    restoreFromBackup,
  };
}
