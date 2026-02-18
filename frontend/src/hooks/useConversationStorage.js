/**
 * Conversation storage — current chat + archived list (localStorage).
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_CURRENT_ID = 'wankr_current_id';
const STORAGE_CURRENT_MESSAGES = 'wankr_current_messages';
const STORAGE_ARCHIVED = 'wankr_archived';
const MAX_ARCHIVED = 20;

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

  const persistArchived = useCallback((listOrFn) => {
    setArchived(prev => {
      const newList = typeof listOrFn === 'function' ? listOrFn(prev) : listOrFn;
      const trimmed = newList.slice(-MAX_ARCHIVED);
      localStorage.setItem(STORAGE_ARCHIVED, JSON.stringify(trimmed));
      return trimmed;
    });
  }, []);

  useEffect(() => {
    saveCurrent(currentId, conversation);
  }, [currentId, conversation, saveCurrent]);

  // Update an archived chat's messages if it exists in the archive
  const UPDATE_ARCHIVED_IF_EXISTS = useCallback((id, messages) => {
    setArchived(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev; // Not an archived chat, no update needed
      
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        messages: [...messages],
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_ARCHIVED, JSON.stringify(updated.slice(-MAX_ARCHIVED)));
      return updated;
    });
  }, []);

  const startNewChat = useCallback(() => {
    // Update current archived chat before switching (if it exists in archive)
    setArchived(prev => {
      const idx = prev.findIndex(c => c.id === currentId);
      if (idx === -1) return prev;
      
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        messages: [...conversation],
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_ARCHIVED, JSON.stringify(updated.slice(-MAX_ARCHIVED)));
      return updated;
    });
    
    setCurrentId(`c-${Date.now()}`);
    setConversation([]);
  }, [currentId, conversation]);

  const handleLoadArchived = useCallback(
    (id) => {
      const idx = archived.findIndex((c) => c.id === id);
      if (idx === -1) return;
      
      // Update current archived chat before switching (if it exists in archive)
      const currentIdx = archived.findIndex(c => c.id === currentId);
      if (currentIdx !== -1 && currentId !== id) {
        const updated = [...archived];
        updated[currentIdx] = {
          ...updated[currentIdx],
          messages: [...conversation],
          updatedAt: new Date().toISOString(),
        };
        persistArchived(updated);
      }
      
      const c = archived[idx];
      setConversation(Array.isArray(c.messages) ? [...c.messages] : []);
      setCurrentId(c.id);
      // Keep in sidebar - only remove on explicit delete or logout
      return true;
    },
    [archived, currentId, conversation, persistArchived]
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
