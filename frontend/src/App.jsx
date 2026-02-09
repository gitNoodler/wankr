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
import TrainingPanel from './components/TrainingPanel';
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
  const [trainingMode, setTrainingMode] = useState(() => {
    try {
      return localStorage.getItem('wankr_training_mode') === 'true';
    } catch {
      return false;
    }
  });
  
  // Persist training mode to localStorage
  const handleTrainingModeChange = useCallback((enabled) => {
    setTrainingMode(enabled);
    try {
      localStorage.setItem('wankr_training_mode', String(enabled));
    } catch {}
  }, []);
  
  const chat = useChat(conversation, setConversation, systemPrompt, setTrainCount, currentId, handleTrainingModeChange);

  const {
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

  // Sync training mode to backend whenever it changes or on page load
  useEffect(() => {
    if (currentId) {
      console.log(`🔄 Syncing training mode: ${trainingMode} for client: ${currentId}`);
      fetch('/api/chat/sync-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: currentId, trainingMode }),
      })
        .then(r => r.json())
        .then(data => console.log('Sync response:', data))
        .catch(err => console.error('Sync failed:', err));
    }
  }, [trainingMode, currentId]);

  const handleLoadArchived = useCallback(
    async (id) => {
      // Capture current state BEFORE switching
      const shouldAutoArchive = conversation.length > 0 && !isRecalledChat();
      const messagesSnapshot = shouldAutoArchive ? [...conversation] : null;
      const idSnapshot = shouldAutoArchive ? currentId : null;
      
      // Switch to the target archived chat FIRST (immediately)
      if (loadArchived(id)) closeArchive();
      
      // THEN auto-archive the old chat in background (non-blocking)
      if (shouldAutoArchive && messagesSnapshot && idSnapshot) {
        // Fire-and-forget auto-archive with timeout
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const response = await fetch('/api/chat/generate-name', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: messagesSnapshot }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            const name = data.name || 'Unnamed Degen Session';
            
            const archivedChat = {
              id: idSnapshot,
              name,
              messages: messagesSnapshot,
              createdAt: new Date().toISOString(),
              autoNamed: true,
            };
            
            // Add to sidebar
            persistArchived(prev => [...prev, archivedChat]);
            
            // Send to backend silently
            fetch('/api/chat/archive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat: archivedChat }),
            }).catch(() => {});
            
            console.log(`🎭 Wankr named your chat: "${name}"`);
          } catch (err) {
            console.error('Auto-archive failed:', err.name === 'AbortError' ? 'timeout' : err);
          }
        })();
      }
    },
    [loadArchived, closeArchive, conversation, currentId, isRecalledChat, persistArchived]
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
          className={`dashboard-body ${trainingMode ? 'with-training' : 'closed-training'}`}
          style={{
            background: 'transparent',
            position: 'relative',
            zIndex: 10,
            gridTemplateColumns: trainingMode
              ? 'var(--dashboard-sidebar-width) 1fr var(--training-panel-width)'
              : 'var(--dashboard-sidebar-width) 1fr 0px',
          }}
        >
          <div className="dashboard-sidebar">
            <Sidebar
              currentId={currentId}
              hasMessages={conversation.length > 0}
              archived={archived}
              onLoadArchived={handleLoadArchived}
              onStartNewChat={startNewChat}
              onClearChat={clearChat}
              onArchive={openArchive}
              onDeleteArchived={deleteArchivedChat}
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
          <TrainingPanel
            trainingMode={trainingMode}
            onConfigChange={(newConfig) => {
              console.log('Training config updated', newConfig);
            }}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            onResetPrompt={() => setSystemPrompt('')}
            onTrain={chat.handleTrain}
            trainCount={trainCount}
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
