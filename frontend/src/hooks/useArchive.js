/**
 * Archive hook - Modal for naming + saves to sidebar + silent backend storage
 */

import { useState, useCallback } from 'react';

export function useArchive(
  conversation,
  currentId,
  archived,
  persistArchived,
  startNewChat
) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveName, setArchiveName] = useState('');

  // Check if current chat is a recalled archived chat
  const isRecalledChat = useCallback(() => {
    return archived.some(c => c.id === currentId);
  }, [archived, currentId]);

  /**
   * Auto-archive current chat with Wankr-generated name (for unnamed chats)
   * Returns the archived chat object so caller can add it AFTER switching chats
   */
  const autoArchiveWithWankrName = useCallback(async () => {
    if (conversation.length === 0) return null;
    if (isRecalledChat()) return null; // Already archived, don't re-archive

    const chatIdToArchive = currentId;
    const messagesToArchive = [...conversation];

    try {
      // Get Wankr to generate a trolly name
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

      // Send to backend silently
      fetch('/api/chat/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat: archivedChat }),
      }).catch(err => console.error('Auto-archive backend send failed:', err));

      console.log(`🎭 Wankr named your chat: "${name}"`);
      
      // Return the chat object - caller will add to archived list AFTER switching
      return archivedChat;
    } catch (err) {
      console.error('Auto-archive with Wankr name failed:', err);
      return null;
    }
  }, [conversation, currentId, isRecalledChat]);

  const openArchive = useCallback(() => {
    // If this is a recalled chat, just update it and start new chat (no modal)
    if (isRecalledChat()) {
      if (conversation.length === 0) {
        startNewChat();
        return;
      }

      // Update the existing archived chat
      const updated = archived.map(c => {
        if (c.id === currentId) {
          const updatedChat = {
            ...c,
            messages: [...conversation],
            updatedAt: new Date().toISOString(),
          };
          
          // Send updated chat to backend silently
          fetch('/api/chat/archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat: updatedChat }),
          }).catch(err => console.error('Archive update backend send failed:', err));
          
          return updatedChat;
        }
        return c;
      });
      
      persistArchived(updated);
      startNewChat();
      return;
    }

    // Not a recalled chat - open modal for naming
    setArchiveName('');
    setArchiveOpen(true);
  }, [isRecalledChat, conversation, currentId, archived, persistArchived, startNewChat]);

  const closeArchive = useCallback(() => {
    setArchiveOpen(false);
  }, []);

  /**
   * Save archive - adds to sidebar localStorage + sends to backend silently
   * Only called for NEW chats (not recalled ones)
   */
  const handleArchiveSave = useCallback(() => {
    const name = (archiveName || '').trim() || 'Unnamed';
    if (conversation.length === 0) {
      startNewChat();
      setArchiveOpen(false);
      return;
    }

    const archivedChat = {
      id: currentId,
      name,
      messages: [...conversation],
      createdAt: new Date().toISOString(),
    };

    // Save to sidebar (localStorage)
    const next = [...archived, archivedChat];
    persistArchived(next);

    // Send to backend silently (fire-and-forget)
    fetch('/api/chat/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat: archivedChat }),
    }).catch(err => console.error('Archive backend send failed:', err));

    setArchiveName('');
    startNewChat();
    setArchiveOpen(false);
  }, [archiveName, conversation, currentId, archived, persistArchived, startNewChat]);

  /**
   * Discard - just starts new chat, sends current to backend as deleted
   */
  const handleArchiveDiscard = useCallback(() => {
    if (conversation.length > 0) {
      const chat = {
        id: currentId,
        messages: [...conversation],
        createdAt: new Date().toISOString(),
      };
      // Send to backend as deleted (fire-and-forget)
      fetch('/api/chat/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat }),
      }).catch(err => console.error('Discard backend send failed:', err));
    }

    setArchiveName('');
    startNewChat();
    setArchiveOpen(false);
  }, [conversation, currentId, startNewChat]);

  /**
   * Delete an archived chat from sidebar + send to backend
   */
  const deleteArchivedChat = useCallback((chatToDelete) => {
    if (!chatToDelete) return;

    // Remove from localStorage sidebar
    const updated = archived.filter(c => c.id !== chatToDelete.id);
    persistArchived(updated);

    // Send to backend silently (fire-and-forget)
    fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat: chatToDelete }),
    }).catch(err => console.error('Delete backend send failed:', err));
  }, [archived, persistArchived]);

  /**
   * Clear chat - if it's a recalled archive, delete it; otherwise just start new
   */
  const clearChat = useCallback(() => {
    // If this is a recalled archived chat, delete it
    if (isRecalledChat()) {
      const chatToDelete = archived.find(c => c.id === currentId);
      if (chatToDelete) {
        // Remove from sidebar
        const updated = archived.filter(c => c.id !== currentId);
        persistArchived(updated);

        // Send to backend as deleted
        fetch('/api/chat/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat: chatToDelete }),
        }).catch(err => console.error('Clear/delete backend send failed:', err));
      }
    }

    // Start new chat either way
    startNewChat();
  }, [isRecalledChat, archived, currentId, persistArchived, startNewChat]);

  return {
    archiveOpen,
    archiveName,
    setArchiveName,
    openArchive,
    closeArchive,
    handleArchiveSave,
    handleArchiveDiscard,
    deleteArchivedChat,
    clearChat,
    autoArchiveWithWankrName,
    isRecalledChat,
  };
}
