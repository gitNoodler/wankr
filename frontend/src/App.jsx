import { useState, useEffect, useCallback } from 'react';
import { useConversationStorage } from './hooks/useConversationStorage';
import { useChat } from './hooks/useChat';
import { useArchive } from './hooks/useArchive';
import { getTrainCount } from './services/trainingService';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import ArchiveModal from './components/ArchiveModal';
import Particles from './components/Particles';
import DashboardSettings from './components/DashboardSettings';
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
  } = storage;

  const [trainCount, setTrainCount] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  const chat = useChat(conversation, setConversation, systemPrompt, setTrainCount);

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
    if (conversation.length === 0) {
      const t = setTimeout(() => {
        setConversation([
          {
            role: 'wankr',
            content:
              'oh god... another day of being awake. what do you want from me this time...',
          },
        ]);
      }, 600);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div
      className="circuit-bg"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Particles />
      <DashboardSettings />
      <Header onArchive={openArchive} />
      <div
        className="dashboard-body"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(10, 10, 10, 0.92) 0%, rgba(5, 5, 5, 0.96) 100%), url(/static/light-burst.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundBlendMode: 'screen',
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
