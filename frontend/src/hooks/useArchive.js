/**
 * Archive modal — open/close, name, save (archive + new chat), discard.
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

  const openArchive = useCallback(() => {
    setArchiveName('');
    setArchiveOpen(true);
  }, []);

  const closeArchive = useCallback(() => {
    setArchiveOpen(false);
  }, []);

  const handleArchiveSave = useCallback(() => {
    const name = (archiveName || '').trim() || 'Unnamed';
    if (conversation.length === 0) {
      startNewChat();
      setArchiveOpen(false);
      return;
    }
    const next = [
      ...archived,
      {
        id: currentId,
        name,
        messages: [...conversation],
        createdAt: new Date().toISOString(),
      },
    ];
    persistArchived(next);
    setArchiveName('');
    startNewChat();
    setArchiveOpen(false);
  }, [archiveName, conversation, currentId, archived, persistArchived, startNewChat]);

  const handleArchiveDiscard = useCallback(() => {
    setArchiveName('');
    startNewChat();
    setArchiveOpen(false);
  }, [startNewChat]);

  return {
    archiveOpen,
    archiveName,
    setArchiveName,
    openArchive,
    closeArchive,
    handleArchiveSave,
    handleArchiveDiscard,
  };
}
