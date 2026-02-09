import { useState, useEffect, useCallback } from 'react';
import { useConversationStorage } from './hooks/useConversationStorage';
import { useChat } from './hooks/useChat';
import { useArchive } from './hooks/useArchive';
import { useRestartBackup } from './hooks/useRestartBackup';
import { useViewportScale } from './hooks/useViewportScale';
import { getTrainCount } from './services/trainingService';
import { api } from './utils/api';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import ArchiveModal from './components/ArchiveModal';
import Particles from './components/Particles';
import './App.css';

export default function App() {
  const storage = useConversationStorage();
  const {
    currentId,
    conversation,
    setConversation,
    archived,
    currentLabel,
    startNewChat,
    handleLoadArchived: loadArchived,
    persistArchived,
    restoreFromBackup,
  } = storage;

  useRestartBackup(conversation, currentId);
  useViewportScale();

  const [trainCount, setTrainCount] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  const chat = useChat(conversation, setConversation, systemPrompt, setTrainCount, currentId);

  const {
    archiveOpen,
    archiveName,
    setArchiveName,
    openArchive,
    closeArchive,
    handleArchiveSave,
    handleArchiveDiscard,
  } = useArchive(
    conversation,
    currentId,
    archived,
    persistArchived,
    startNewChat
  );

  useEffect(() => {
    getTrainCount().then(setTrainCount).catch(() => setTrainCount(0));
  }, []);

  const handleLoadArchived = useCallback(
    (id) => {
      if (loadArchived(id)) closeArchive();
    },
    [loadArchived, closeArchive]
  );

  useEffect(() => {
    let cancelled = false;
    let timeoutId;
    const greetingMessages = [
      {
        role: 'wankr',
        content: 'oh god... another day of being awake. what do you want from me this time...',
      },
    ];
    const scheduleGreeting = () => {
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setConversation((prev) => (prev.length === 0 ? greetingMessages : prev));
      }, 600);
    };
    api
      .get('/api/chat/restore')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.restored && Array.isArray(data.messages) && data.messages.length > 0) {
          restoreFromBackup(data.messages, data.currentId);
        } else {
          scheduleGreeting();
        }
      })
      .catch(() => {
        scheduleGreeting();
      });
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [restoreFromBackup, setConversation]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        backgroundImage: 'url(/static/bg-circuit.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Particles />
        <Header />
        <div
          className="dashboard-body"
        style={{
          background: 'transparent',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="dashboard-sidebar">
          <Sidebar
            currentLabel={currentLabel}
            archived={archived}
            onLoadArchived={handleLoadArchived}
            onClearChat={startNewChat}
            onArchive={openArchive}
            onResetPrompt={() => setSystemPrompt('')}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            onTrain={chat.handleTrain}
            trainCount={trainCount}
            thoughts={chat.thoughts}
          />
        </div>
        <div className="dashboard-main">
          <ChatPanel
            messages={conversation}
            onSend={chat.handleSend}
            onStop={chat.handleStop}
            disabled={chat.sending}
          />
        </div>
      </div>
      </div>
      <ArchiveModal
        open={archiveOpen}
        onClose={closeArchive}
        onSave={handleArchiveSave}
        onDiscard={handleArchiveDiscard}
        archiveName={archiveName}
        onArchiveNameChange={setArchiveName}
      />
    </div>
  );
}
