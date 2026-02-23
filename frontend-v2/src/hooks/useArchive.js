/**
 * Archive hook - Silent archive/delete: instant localStorage update + POST to backend.
 * Names prompts run at convenient times: pre-generated after 4+ messages, or when archiving/switching.
 */

import { useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { getStoredUsername, getStoredToken } from '../services/authService';

const PRE_GENERATE_MESSAGE_COUNT = 4;

export function useArchive(
  conversation,
  currentId,
  archived,
  persistArchived,
  startNewChat,
  onChatNamed
) {
  const isRecalledChat = useCallback(() => {
    return archived.some(c => c.id === currentId);
  }, [archived, currentId]);

  const pendingNameRef = useRef({});
  const requestedForRef = useRef(new Set());

  // Pre-generate name at a convenient time (after enough back-and-forth)
  useEffect(() => {
    if (conversation.length < PRE_GENERATE_MESSAGE_COUNT || isRecalledChat()) return;
    if (requestedForRef.current.has(currentId)) return;

    requestedForRef.current.add(currentId);
    api.post('/api/chat/generate-name', { messages: [...conversation] })
      .then((res) => res.json())
      .then((data) => {
        const name = (data.name || '').trim();
        if (name) pendingNameRef.current[currentId] = name;
      })
      .catch(() => {});
  }, [conversation, currentId, isRecalledChat]);

  /**
   * Archive current chat silently: remove from view, add to sidebar, fire POST.
   * Uses pre-generated name if ready, otherwise "Unnamed" and names in background.
   */
  const openArchive = useCallback(() => {
    if (conversation.length === 0) {
      startNewChat();
      return;
    }

    if (isRecalledChat()) {
      // Update existing archived chat in place and start new
      const updated = archived.map(c => {
        if (c.id === currentId) {
          const updatedChat = {
            ...c,
            messages: [...conversation],
            updatedAt: new Date().toISOString(),
          };
          api.post('/api/chat/archive', { chat: updatedChat, username: getStoredUsername(), token: getStoredToken() }).catch(err => console.error('Archive update backend failed:', err));
          return updatedChat;
        }
        return c;
      });
      persistArchived(updated);
      startNewChat();
      return;
    }

    const initialName = pendingNameRef.current[currentId] || 'Unnamed';
    if (pendingNameRef.current[currentId]) delete pendingNameRef.current[currentId];

    const archivedChat = {
      id: currentId,
      name: initialName,
      messages: [...conversation],
      createdAt: new Date().toISOString(),
    };
    persistArchived(prev => [...prev, archivedChat]);
    startNewChat();

    api.post('/api/chat/archive', { chat: archivedChat, username: getStoredUsername(), token: getStoredToken() }).catch(err => console.error('Archive backend failed:', err));

    if (initialName !== 'Unnamed') {
      onChatNamed?.(currentId, initialName);
      return;
    }

    // Get Wankr-generated name in background and update the archive entry
    api.post('/api/chat/generate-name', { messages: [...conversation] })
      .then((res) => res.json())
      .then((data) => {
        const name = (data.name || '').trim() || 'Unnamed Degen Session';
        persistArchived(prev => prev.map(c => c.id === currentId ? { ...c, name } : c));
        api.post('/api/chat/archive', { chat: { ...archivedChat, name }, username: getStoredUsername(), token: getStoredToken() }).catch(() => {});
        onChatNamed?.(currentId, name);
      })
      .catch(() => {});
  }, [conversation, currentId, archived, isRecalledChat, persistArchived, startNewChat, onChatNamed]);

  /**
   * Delete an archived chat: remove from sidebar, DELETE from active store (backend routes overflow to global archive).
   */
  const deleteArchivedChat = useCallback((chatToDelete) => {
    if (!chatToDelete) return;
    const updated = archived.filter(c => c.id !== chatToDelete.id);
    persistArchived(updated);
    const token = getStoredToken();
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    api.delete(`/api/chats/active/${encodeURIComponent(chatToDelete.id)}${q}`).catch(err => console.error('Delete active chat failed:', err));
  }, [archived, persistArchived]);

  /**
   * Clear chat: if recalled archive, delete it; then start new chat.
   */
  const clearChat = useCallback(() => {
    if (isRecalledChat()) {
      const chatToDelete = archived.find(c => c.id === currentId);
      if (chatToDelete) {
        persistArchived(archived.filter(c => c.id !== currentId));
        const token = getStoredToken();
        const q = token ? `?token=${encodeURIComponent(token)}` : '';
        api.delete(`/api/chats/active/${encodeURIComponent(chatToDelete.id)}${q}`).catch(err => console.error('Clear/delete active failed:', err));
      }
    }
    startNewChat();
  }, [isRecalledChat, archived, currentId, persistArchived, startNewChat]);

  /**
   * Auto-archive with Wankr-generated name (e.g. when switching chats). Returns archived chat for caller to add.
   */
  const autoArchiveWithWankrName = useCallback(async () => {
    if (conversation.length === 0) return null;
    if (isRecalledChat()) return null;

    const chatIdToArchive = currentId;
    const messagesToArchive = [...conversation];

    try {
      const response = await api.post('/api/chat/generate-name', { messages: messagesToArchive });
      const data = await response.json();
      const name = data.name || 'Unnamed Degen Session';

      const archivedChat = {
        id: chatIdToArchive,
        name,
        messages: messagesToArchive,
        createdAt: new Date().toISOString(),
        autoNamed: true,
      };

      api.post('/api/chat/archive', { chat: archivedChat, username: getStoredUsername(), token: getStoredToken() }).catch(err => console.error('Auto-archive backend failed:', err));

      return archivedChat;
    } catch (err) {
      console.error('Auto-archive with Wankr name failed:', err);
      return null;
    }
  }, [conversation, currentId, isRecalledChat]);

  return {
    openArchive,
    deleteArchivedChat,
    clearChat,
    autoArchiveWithWankrName,
    isRecalledChat,
  };
}
