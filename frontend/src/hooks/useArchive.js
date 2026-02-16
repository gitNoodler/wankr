/**
 * Archive hook - Silent archive/delete: instant localStorage update + POST to backend
 */

import { useCallback } from 'react';

export function useArchive(
  conversation,
  currentId,
  archived,
  persistArchived,
  startNewChat
) {
  const isRecalledChat = useCallback(() => {
    return archived.some(c => c.id === currentId);
  }, [archived, currentId]);

  /**
   * Archive current chat silently: remove from view, add to sidebar, fire POST.
   * No modal - uses "Unnamed" for new archives.
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
          fetch('/api/chat/archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat: updatedChat }),
          }).catch(err => console.error('Archive update backend failed:', err));
          return updatedChat;
        }
        return c;
      });
      persistArchived(updated);
      startNewChat();
      return;
    }

    const archivedChat = {
      id: currentId,
      name: 'Unnamed',
      messages: [...conversation],
      createdAt: new Date().toISOString(),
    };
    persistArchived(prev => [...prev, archivedChat]);
    startNewChat();

    fetch('/api/chat/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat: archivedChat }),
    }).catch(err => console.error('Archive backend failed:', err));
  }, [conversation, currentId, archived, isRecalledChat, persistArchived, startNewChat]);

  /**
   * Delete an archived chat: remove from sidebar, fire POST as delete.
   */
  const deleteArchivedChat = useCallback((chatToDelete) => {
    if (!chatToDelete) return;
    const updated = archived.filter(c => c.id !== chatToDelete.id);
    persistArchived(updated);
    fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat: chatToDelete }),
    }).catch(err => console.error('Delete backend failed:', err));
  }, [archived, persistArchived]);

  /**
   * Clear chat: if recalled archive, delete it; then start new chat.
   */
  const clearChat = useCallback(() => {
    if (isRecalledChat()) {
      const chatToDelete = archived.find(c => c.id === currentId);
      if (chatToDelete) {
        persistArchived(archived.filter(c => c.id !== currentId));
        fetch('/api/chat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat: chatToDelete }),
        }).catch(err => console.error('Clear/delete backend failed:', err));
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
      const response = await fetch('/api/chat/generate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToArchive }),
      });
      const data = await response.json();
      const name = data.name || 'Unnamed Degen Session';

      const archivedChat = {
        id: chatIdToArchive,
        name,
        messages: messagesToArchive,
        createdAt: new Date().toISOString(),
        autoNamed: true,
      };

      fetch('/api/chat/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat: archivedChat }),
      }).catch(err => console.error('Auto-archive backend failed:', err));

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
