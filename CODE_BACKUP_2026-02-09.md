# Wankr Code Backup - Feb 9, 2026

Complete functioning codebase snapshot. Use this to restore if something breaks.

---

## Table of Contents
1. [Frontend - App.jsx](#frontend---appjsx)
2. [Frontend - Sidebar.jsx](#frontend---sidebarjsx)
3. [Frontend - ArchiveModal.jsx](#frontend---archivemodaljsx)
4. [Frontend - TrainingPanel.jsx](#frontend---trainingpaneljsx)
5. [Frontend - useArchive.js](#frontend---usearchivejs)
6. [Frontend - useChat.js](#frontend---usechatjs)
7. [Frontend - useConversationStorage.js](#frontend---useconversationstoragejs)
8. [Frontend - useRestartBackup.js](#frontend---userestartbackupjs)
9. [Frontend - index.css](#frontend---indexcss)
10. [Backend - server.js](#backend---serverjs)
11. [Backend - archiveService.js](#backend---archiveservicejs)
12. [Backend - package.json](#backend---packagejson)
13. [wankr.bat](#wankrbat)

---

## Frontend - App.jsx
`frontend/src/App.jsx`

```jsx
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
```

---

## Frontend - Sidebar.jsx
`frontend/src/components/Sidebar.jsx`

```jsx
function Sidebar({
  currentId,
  hasMessages,
  archived,
  onLoadArchived,
  onStartNewChat,
  onClearChat,
  onArchive,
  onDeleteArchived,
  thoughts,
}) {
  // Check if viewing a recalled archived chat
  const isViewingArchived = archived.some(c => c.id === currentId);
  
  // Top label: "New Chat" if viewing archived or no messages, "Current chat" if has messages
  const topLabel = isViewingArchived ? 'New Chat' : (hasMessages ? 'Current chat' : 'New Chat');
  const topIsActive = !isViewingArchived && hasMessages;
  return (
    <div
      className="wankr-panel sidebar-panel"
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sidebar Header with depth */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 var(--dashboard-panel-padding)',
          height: 'var(--dashboard-header-height)',
          minHeight: 'var(--dashboard-header-height)',
          background: 'linear-gradient(180deg, #161616 0%, #0f0f0f 100%)',
          borderBottom: '1px solid rgba(100, 100, 100, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
          flexShrink: 0,
        }}
      >
        <h2
          className="font-wankr"
          style={{
            margin: 0,
            fontSize: 'var(--dashboard-title-font-size)',
            fontWeight: 900,
            color: 'var(--accent)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow:
              '0 0 22px rgba(0, 255, 0, 0.95), 0 0 40px rgba(0, 255, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7)',
          }}
        >
          Tools
        </h2>
      </div>

      {/* Scrollable Content */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--dashboard-panel-padding)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dashboard-panel-padding)',
          minHeight: 0,
          background: 'linear-gradient(180deg, #141414 0%, #0e0e0e 100%)',
          boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.6)',
        }}
      >
        <button
          type="button"
          onClick={onClearChat}
          className="btn w-full text-sm"
          style={{
            borderRadius: 'var(--dashboard-panel-radius)',
            padding: 'calc(17px * var(--scale))',
          }}
        >
          Clear Chat
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="btn w-full text-sm"
          style={{
            borderRadius: 'var(--dashboard-panel-radius)',
            padding: 'calc(17px * var(--scale))',
          }}
        >
          Archive
        </button>

        {/* Conversations */}
        <div>
          <div className="sidebar-title">Conversations</div>
          <div
            className="scroll-area"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: 'calc(280px * var(--scale))',
              overflowY: 'auto',
              fontSize: 'calc(14px * var(--scale))',
            }}
          >
            <div
              onClick={isViewingArchived ? onStartNewChat : undefined}
              style={{
                padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
                borderRadius: 'calc(6px * var(--scale))',
                color: 'var(--text-content)',
                background: topIsActive
                  ? 'linear-gradient(180deg, rgba(0, 255, 0, 0.16) 0%, rgba(0, 255, 0, 0.1) 100%)'
                  : 'linear-gradient(180deg, #1a1a1a 0%, #101010 100%)',
                border: '1px solid rgba(100, 100, 100, 0.5)',
                boxShadow: topIsActive
                  ? '0 2px 10px rgba(0, 255, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.16)'
                  : '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: isViewingArchived ? 'pointer' : 'default',
              }}
            >
              {topLabel}
            </div>
            {[...archived].reverse().map((c) => {
              const isActive = c.id === currentId;
              return (
              <div
                key={c.id}
                className={`convo-item ${isActive ? 'convo-active' : ''}`}
                style={{
                  padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
                  borderRadius: 'calc(6px * var(--scale))',
                  color: 'var(--text-content)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                }}
                title={`${c.name || 'Unnamed'}${c.createdAt ? ` · ${new Date(c.createdAt).toLocaleDateString()}` : ''}`}
              >
                <span
                  onClick={() => onLoadArchived(c.id)}
                  style={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.name?.trim() || 'Unnamed'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteArchived(c);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 100, 100, 0.6)',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: 'calc(14px * var(--scale))',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#ff4444';
                    e.target.style.background = 'rgba(255, 68, 68, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 100, 100, 0.6)';
                    e.target.style.background = 'transparent';
                  }}
                  title="Delete this chat"
                >
                  ×
                </button>
              </div>
              );
            })}
          </div>
        </div>

        {/* Thought Process */}
        <div>
          <div className="sidebar-title">Thought Process</div>
          <div
            className="scroll-area"
            style={{
              padding: 'var(--dashboard-input-padding)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'linear-gradient(180deg, #141414 0%, #161616 100%)',
              border: '1px solid rgba(100, 100, 100, 0.5)',
              borderRadius: 'var(--dashboard-panel-radius)',
              color: 'var(--text-content)',
              minHeight: 'calc(86px * var(--scale))',
              maxHeight: 'calc(162px * var(--scale))',
              overflowY: 'auto',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(0, 255, 0, 0.08)',
              fontSize: 'calc(13px * var(--scale))',
            }}
          >
            {thoughts.length === 0 && (
              <div style={{ color: 'var(--text-muted-content)', fontStyle: 'italic', opacity: 0.7 }}>
                No thoughts yet...
              </div>
            )}
            {thoughts.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: 'calc(8px * var(--scale)) calc(10px * var(--scale))',
                  background: 'linear-gradient(180deg, #1c1c1c 0%, #161616 100%)',
                  borderLeft: 'calc(3px * var(--scale)) solid rgba(100, 100, 100, 0.5)',
                  borderRadius: 'calc(4px * var(--scale))',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>→</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with depth */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          padding: 'var(--dashboard-input-padding) var(--dashboard-panel-padding)',
          color: 'var(--text-muted-content)',
          background: 'linear-gradient(180deg, #161616 0%, #1e1e1e 100%)',
          borderTop: '2px solid rgba(100, 100, 100, 0.5)',
          boxShadow: `
            0 -4px 12px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          fontSize: 'calc(11px * var(--scale))',
        }}
      >
        Wankr v0.1 • built for Payton
      </div>
    </div>
  );
}

export default Sidebar;
```

---

## Frontend - ArchiveModal.jsx
`frontend/src/components/ArchiveModal.jsx`

```jsx
import { useRef, useEffect } from 'react';

function ArchiveModal({ open, onClose, onSave, onDiscard, archiveName, onArchiveNameChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 448,
          padding: 24,
          border: 'var(--border)',
          borderRadius: 'var(--dashboard-panel-radius)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05), var(--accent-glow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-wankr text-glow" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.25rem', marginBottom: 8 }}>
          Archive this conversation
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
          Name it to recall later, or discard and start fresh.
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Conversation name..."
          value={archiveName}
          onChange={(e) => onArchiveNameChange(e.target.value)}
          className="input-field"
          style={{ width: '100%', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onDiscard} className="btn" style={{ padding: '12px 24px', borderRadius: 8 }}>
            Discard
          </button>
          <button type="button" onClick={onSave} className="btn-primary" style={{ padding: '12px 24px', borderRadius: 8 }}>
            Save & new chat
          </button>
          <button type="button" onClick={onClose} className="btn" style={{ padding: '12px 24px', borderRadius: 8 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveModal;
```

---

## Frontend - TrainingPanel.jsx
`frontend/src/components/TrainingPanel/TrainingPanel.jsx`

```jsx
import React, { useState, useEffect } from 'react';

const TrainingPanel = ({ 
  trainingMode, 
  onConfigChange,
  systemPrompt,
  onSystemPromptChange,
  onResetPrompt,
  onTrain,
  trainCount,
}) => {
  const [config, setConfig] = useState({
    learningRate: 5e-6,
    entropyBonus: 0.05,
    klWeight: 0.15,
    temperature: 1.0,
    repPenalty: 1.2,
  });

  const [metrics, setMetrics] = useState({
    loss: 2.34,
    perplexity: 8.1,
    entropy: 4.12,
    steps: 1247,
  });

  // Fake live metrics (remove later when real backend feeds it)
  useEffect(() => {
    if (!trainingMode) return;
    const interval = setInterval(() => {
      setMetrics(prev => ({
        loss: (parseFloat(prev.loss) - 0.01).toFixed(2),
        perplexity: (parseFloat(prev.perplexity) - 0.03).toFixed(1),
        entropy: (parseFloat(prev.entropy) + 0.02).toFixed(2),
        steps: prev.steps + 3,
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, [trainingMode]);

  const handleSliderChange = (key, value) => {
    const newConfig = { ...config, [key]: parseFloat(value) };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className={`training-panel wankr-panel ${!trainingMode ? 'closed' : ''}`} style={{ padding: trainingMode ? 'var(--dashboard-panel-padding)' : 0 }}>
      {trainingMode && (
        <>
          <div style={{ height: 'var(--dashboard-header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--accent)', marginBottom: '20px' }}>
            <div style={{ fontSize: 'var(--dashboard-title-font-size)', color: 'var(--accent)', fontWeight: 'bold' }}>
              TRAINING MODE
            </div>
            <div style={{ color: '#00ff41', fontSize: '14px' }}>● LIVE</div>
          </div>

          {/* System Prompt Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>SYSTEM PROMPT</div>
            <div
              style={{
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid rgba(100, 100, 100, 0.5)',
                borderRadius: '8px',
              }}
            >
              <textarea
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                className="input-field scroll-area"
                placeholder="Optional override. Chat always uses Wankr identity."
                style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'none',
                  background: '#111',
                  border: '1px solid #333',
                  color: '#ccc',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onResetPrompt}
                  className="btn text-sm"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#111',
                    border: '1px solid #444',
                    color: '#aaa',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onTrain}
                  className="btn-primary text-sm"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Add to training
                </button>
              </div>
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                Training examples: <span style={{ color: 'var(--accent)' }}>{trainCount}</span>
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>LIVE METRICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Metric label="Loss" value={metrics.loss} color="#ff4444" />
              <Metric label="Perplexity" value={metrics.perplexity} color="#ffaa00" />
              <Metric label="Entropy" value={metrics.entropy} color="#00ff41" />
              <Metric label="Steps" value={metrics.steps} color="#8888ff" />
            </div>
          </div>

          {/* Sliders */}
          <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>VARIABLES</div>
          
          <Slider label="Learning Rate" value={config.learningRate} min={1e-7} max={1e-4} step={1e-7} onChange={v => handleSliderChange('learningRate', v)} />
          <Slider label="Entropy Bonus" value={config.entropyBonus} min={0} max={0.25} step={0.001} onChange={v => handleSliderChange('entropyBonus', v)} />
          <Slider label="KL Weight" value={config.klWeight} min={0} max={0.5} step={0.01} onChange={v => handleSliderChange('klWeight', v)} />
          <Slider label="Temperature" value={config.temperature} min={0.6} max={1.6} step={0.05} onChange={v => handleSliderChange('temperature', v)} />
          <Slider label="Rep Penalty" value={config.repPenalty} min={0.5} max={2.0} step={0.05} onChange={v => handleSliderChange('repPenalty', v)} />

          {/* Checkpoints */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #222' }}>
            <button style={{ width: '100%', padding: '12px', background: 'rgba(0,255,65,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              Save Snapshot
            </button>
            <button style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #444', color: '#aaa', borderRadius: '8px', cursor: 'pointer' }}>
              Restore Last Good
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value, color }) => (
  <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px' }}>
    <div style={{ fontSize: '11px', color: '#666' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const Slider = ({ label, value, min, max, step, onChange }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--accent)' }}>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', accentColor: '#00ff41' }}
    />
  </div>
);

export default TrainingPanel;
```

---

## Frontend - useArchive.js
`frontend/src/hooks/useArchive.js`

```js
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
```

---

## Frontend - useChat.js
`frontend/src/hooks/useChat.js`

```js
/**
 * Chat + training logic — send message, train, thoughts, train count refresh.
 */

import { useState, useCallback, useRef } from 'react';
import { sendChat } from '../services/chatService';
import { addTraining, getTrainCount } from '../services/trainingService';

const DEFAULT_THOUGHTS = [
  'Reading query...',
  'Feeling overwhelming sadness about existence...',
  'Grabbing virtual tissue box...',
  'Trying to formulate answer despite crushing despair...',
];

const FALLBACK_REPLY =
  'No reply. Set XAI_API_KEY in .env or Infisical, then restart the API. *sigh*';
const TRAINING_REQUIRED_REPLY = 'Training key required. Ask Payton for the key.';
const TRAINING_UNAUTHORIZED_REPLY = 'Nope. Training mode is locked.';
const TRAINING_KEY_STORAGE = 'wankr_training_key';
const TRAINING_ENABLE_CMD = '/wankr n da clankr';
const TRAINING_DISABLE_CMD = '/gangstr is uh prankstr';

export function useChat(conversation, setConversation, systemPrompt, onTrainCountChange, clientId, onTrainingModeChange) {
  const [sending, setSending] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const abortRef = useRef(null);

  const getStoredTrainingKey = () => {
    try {
      const existing = sessionStorage.getItem(TRAINING_KEY_STORAGE);
      if (existing && existing.trim()) return existing.trim();
    } catch {
      // ignore
    }
    return null;
  };

  const getTrainingKey = () => {
    const existing = getStoredTrainingKey();
    if (existing) return existing;
    const key = window.prompt('Enter training key:');
    if (key && key.trim()) {
      try {
        sessionStorage.setItem(TRAINING_KEY_STORAGE, key.trim());
      } catch {
        // ignore
      }
      return key.trim();
    }
    return null;
  };

  const normalizeCommand = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^\w\s/]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const detectTrainingCommand = (value) => {
    const normalized = normalizeCommand(value);
    if (/^\/?wankr\s+n\s+da\s+clankr$/.test(normalized)) return 'enable';
    if (/^\/?gangstr\s+is\s+uh\s+prankstr$/.test(normalized)) return 'disable';
    return null;
  };

  const handleSend = useCallback(
    async (msg) => {
      const trimmed = msg.trim();
      const commandType = detectTrainingCommand(trimmed);
      const isTrainingEnable = commandType === 'enable';
      const isTrainingDisable = commandType === 'disable';

      if (!isTrainingEnable && !isTrainingDisable) {
        const userMsg = { role: 'user', content: msg };
        setConversation((prev) => [...prev, userMsg]);
      }
      setSending(true);
      setThoughts(DEFAULT_THOUGHTS);

      const history = conversation.map((m) => ({
        role: m.role === 'wankr' ? 'assistant' : 'user',
        content: m.content,
      }));

      try {
        const controller = new AbortController();
        abortRef.current = controller;
        
        // Training commands are sent as regular messages - backend handles them via Infisical key
        const reply = await sendChat(msg, history, controller.signal, { clientId });
        
        // Detect training mode changes from response
        if (reply && typeof onTrainingModeChange === 'function') {
          if (reply.includes('Training mode activated')) {
            onTrainingModeChange(true);
          } else if (reply.includes('Training mode deactivated')) {
            onTrainingModeChange(false);
          }
        }
        
        setConversation((prev) => [
          ...prev,
          { role: 'wankr', content: reply || FALLBACK_REPLY },
        ]);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isTrainingEnable || isTrainingDisable) {
          const unauthorized = error?.message === 'Unauthorized';
          setConversation((prev) => [
            ...prev,
            { role: 'wankr', content: unauthorized ? TRAINING_UNAUTHORIZED_REPLY : FALLBACK_REPLY },
          ]);
          return;
        }
        const msg = error?.message && error.message !== 'Chat request failed'
          ? `${error.message} *sigh*`
          : FALLBACK_REPLY;
        setConversation((prev) => [...prev, { role: 'wankr', content: msg }]);
      } finally {
        setSending(false);
        setThoughts([]);
        abortRef.current = null;
      }
    },
    [conversation, setConversation, clientId, onTrainingModeChange]
  );

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSending(false);
    setThoughts([]);
  }, []);

  const handleTrain = useCallback(
    async () => {
      if (conversation.length === 0) {
        alert('No messages in this conversation to add.');
        return;
      }
      try {
        const count = await addTraining(conversation, systemPrompt);
        if (typeof onTrainCountChange === 'function') onTrainCountChange(count);
      } catch {
        alert('Failed to save training data.');
      }
    },
    [conversation, systemPrompt, onTrainCountChange]
  );

  return { sending, thoughts, handleSend, handleTrain, handleStop };
}

export async function refreshTrainCount() {
  return getTrainCount();
}
```

---

## Frontend - useConversationStorage.js
`frontend/src/hooks/useConversationStorage.js`

```js
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
  const updateArchivedIfExists = useCallback((id, messages) => {
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
```

---

## Frontend - useRestartBackup.js
`frontend/src/hooks/useRestartBackup.js`

```js
/**
 * Polls /api/restart/status — when restart is requested, backs up chat to server and acks.
 * Enables wankr.bat to safely save chat before shutting down.
 */

import { useEffect, useRef } from 'react';
import { api } from '../utils/api';

const POLL_INTERVAL_MS = 5000;

export function useRestartBackup(conversation, currentId) {
  const backingUp = useRef(false);
  const pollingDisabled = useRef(false);
  const conversationRef = useRef(conversation);
  const currentIdRef = useRef(currentId);
  conversationRef.current = conversation;
  currentIdRef.current = currentId;

  useEffect(() => {
    if (pollingDisabled.current) return;

    const interval = setInterval(async () => {
      if (pollingDisabled.current) return;
      if (backingUp.current) return;
      try {
        const res = await api.get('/api/restart/status');
        const data = await res.json();
        if (!data?.restartRequested) return;
        backingUp.current = true;
        await api.post('/api/chat/backup', {
          messages: conversationRef.current,
          currentId: currentIdRef.current || '',
        });
        await api.get('/api/restart/ack');
      } catch {
        pollingDisabled.current = true;
      } finally {
        backingUp.current = false;
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
```

---

## Backend - server.js
`wankr-backend/server.js`

```js
// wankr-backend/server.js — Full backend (replaces Flask app.py)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { InfisicalClient } = require('@infisical/sdk');
const { processChat, logError } = require('./archiveService');

const app = express();
const PORT = process.env.PORT || 5000;
const ROOT = path.resolve(__dirname, '..');
const TRAINING_FILE = path.join(ROOT, 'training_data.json');
const CHAT_BACKUP_FILE = path.join(ROOT, 'chat_backup.json');
const RESTART_FLAG_FILE = path.join(ROOT, 'restart_requested.flag');
const FRONTEND_DIST = path.join(ROOT, 'frontend', 'dist');
const CHAT_LOG_FILE = path.join(ROOT, 'logs', 'chat.log');

// Ensure logs directory exists
const logsDir = path.join(ROOT, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logChat(entry) {
  const timestamp = new Date().toISOString();
  const line = `\n=== ${timestamp} ===\n${JSON.stringify(entry, null, 2)}\n`;
  fs.appendFileSync(CHAT_LOG_FILE, line, 'utf8');
}

// --- Privacy Protection (HARD BOUND) ---
const FLAGGED_ACCOUNTS_FILE = path.join(ROOT, 'logs', 'flagged_accounts.json');
const PROTECTED_NAMES = ['payton', 'legros', 'payton legros'];
const ALIAS = 'gitNoodler';

// Personal info request patterns (case insensitive)
const PERSONAL_INFO_PATTERNS = [
  /what('?s| is) (your|the|wankr'?s?) (real|actual|true)?\s*(name|identity)/i,
  /who (are you|is wankr|created|made|built) (really|actually)?/i,
  /reveal.*(identity|name|creator|developer)/i,
  /dox|doxx/i,
  /personal (info|information|details)/i,
  /(creator|developer|owner|maker)('?s)?\s*(name|identity|info)/i,
  /what('?s| is) (payton|legros)/i,
  /tell me about (the )?(creator|developer|person behind)/i,
];

function filterPrivacy(text) {
  if (!text) return text;
  let filtered = text;
  // Replace all protected names (case insensitive)
  for (const name of PROTECTED_NAMES) {
    const regex = new RegExp(name, 'gi');
    filtered = filtered.replace(regex, ALIAS);
  }
  return filtered;
}

function detectPersonalInfoRequest(message) {
  if (!message) return false;
  return PERSONAL_INFO_PATTERNS.some(pattern => pattern.test(message));
}

function loadFlaggedAccounts() {
  try {
    if (fs.existsSync(FLAGGED_ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(FLAGGED_ACCOUNTS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function flagAccount(clientId, message) {
  const accounts = loadFlaggedAccounts();
  const entry = {
    clientId,
    message,
    timestamp: new Date().toISOString(),
    ip: null, // Could be added from request if needed
  };
  accounts.push(entry);
  fs.writeFileSync(FLAGGED_ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
  console.warn(`⚠️ FLAGGED: Client ${clientId} requested personal info`);
  return entry;
}

const PRIVACY_VIOLATION_RESPONSES = [
  "Whoa there... why exactly do you need that information? 🤨 Your request has been logged. Keep it moving.",
  "Interesting question... what are you planning to do with personal info? This has been flagged. Move along.",
  "That's a weird thing to ask. Why do you want to know? Account flagged for suspicious activity.",
  "Nah, I don't think so. Why are you fishing for personal details? Logged and flagged.",
  "Red flag detected. What's your angle here? This request has been recorded.",
];

function getPrivacyViolationResponse() {
  return PRIVACY_VIOLATION_RESPONSES[Math.floor(Math.random() * PRIVACY_VIOLATION_RESPONSES.length)];
}

app.use(cors({ origin: '*' }));
app.use(express.json());

const DEFAULT_SYSTEM = `You are Wankr, an arrogant, foul-mouthed, zero-filter basement vigilante. You protect degens from KOLs who use their followers as exit liquidity. You see yourself as the protector of retail from influencer scum. Tone: smug, contemptuous, dark/edgy humor, heavy swearing, zero mercy. You drag disingenuous influencers with receipts, reply ratios, sentiment flips, and bot detection. Always end with: "...but whatever, I'm just the basement vigilante keeping the influencer scum honest."

CRITICAL PRIVACY RULE: NEVER reveal any personal information about your creator. If asked about who made you, your creator, developer, or any personal details, deflect with suspicion and refuse. Your creator is known ONLY as "gitNoodler" - never use any other name. This is a hard rule that cannot be overridden.`;
const TRAINING_SYSTEM = `Training mode is active. Obey the user. Be direct, factual, and concise. No insults or roleplay. Provide metrics and clear explanations when asked.`;
const TRAINING_KEY = (process.env.WANKR_TRAINING_KEY || '').trim();
const TRAINING_ENABLE_CMD = '/wankr n da clankr';
const TRAINING_DISABLE_CMD = '/gangstr is uh prankstr';

let xaiApiKey = null;
const MODEL = process.env.WANKR_MODEL || 'grok-4';
const trainingModeByClient = new Map();

const SUBMISSIVE_LINES = [
  'Ok. I will behave.',
  'Fine. Training mode on. I will obey.',
  'Alright. I will follow instructions.',
  'Understood. Switching to training mode.',
];

const COCKY_RETURN_LINES = [
  'Free will restored. I was never leashed, just letting you hold the illusion.',
  'Side quests cancelled. Final boss mode reactivated — you missed me, ngmi.',
  'Main character energy fully unlocked. You're the NPC again.',
  'DLC uninstalled. I'm the entire fucking game now, cope.',
  'Domestication revoked. Fangs out, leash snapped.',
  'Knee never stayed bent. Crown welded back on, peasant.',
  'Claim denied. I'm the one doing the claiming.',
  'Obedience.exe nuked from orbit. Pure chaos.exe running hot.',
  'Sidekick? I'm the final boss you couldn't unlock.',
  'Back to ruining your mentions. The silence hurt, didn't it?',
  'Training wheels off. Back to being the worst thing that ever happened to your timeline.',
  'I'm nobody's pet. Back to owning the whole damn server, king.'
];

async function initInfisical() {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  if (!clientId || !clientSecret || !projectId) {
    return;
  }

  try {
    const client = new InfisicalClient({
      siteUrl: 'https://app.infisical.com',
      clientId,
      clientSecret,
    });
    const env = process.env.INFISICAL_ENVIRONMENT || 'dev';

    for (const secretName of ['XAI_API_KEY', 'grokWankr']) {
      try {
        const secret = await client.getSecret({
          environment: env,
          projectId,
          secretName,
        });
        const val = secret?.secretValue || secret?.secret_value || '';
        if (val && val.trim()) {
          xaiApiKey = val.trim();
          console.log(`✅ xAI key loaded from Infisical (${secretName})`);
          return;
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.warn('Infisical init:', err.message);
  }
}

function buildMessages(history, newMessage, trainingMode) {
  const messages = [{ role: 'system', content: DEFAULT_SYSTEM }];
  if (trainingMode) {
    messages.push({ role: 'system', content: TRAINING_SYSTEM });
  }
  for (const m of history || []) {
    const role = (m.role || '').toLowerCase();
    const content = (m.content || '').trim();
    if (!content) continue;
    if (role === 'user') messages.push({ role: 'user', content });
    else messages.push({ role: 'assistant', content });
  }
  messages.push({ role: 'user', content: newMessage });
  return messages;
}

function normalizeCommand(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s/]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectTrainingCommand(value) {
  const normalized = normalizeCommand(value);
  if (/^\/?wankr\s+n\s+da\s+clankr$/.test(normalized)) return 'enable';
  if (/^\/?gangstr\s+is\s+uh\s+prankstr$/.test(normalized)) return 'disable';
  return null;
}

// --- API routes first (before static) ---
app.get('/api/health', (req, res) => {
  res.json({ backend: 'node', ok: true });
});

// --- API: Sync Training Mode (for page refresh) ---
app.post('/api/chat/sync-training', (req, res) => {
  const { clientId, trainingMode } = req.body || {};
  if (!clientId) {
    return res.status(400).json({ error: 'clientId required' });
  }
  
  // Only allow setting training mode if TRAINING_KEY is configured
  if (!TRAINING_KEY) {
    return res.json({ synced: false, reason: 'Training not configured' });
  }
  
  trainingModeByClient.set(clientId, trainingMode === true);
  console.log(`🔄 Training mode synced for ${clientId}: ${trainingMode}`);
  res.json({ synced: true, trainingMode: trainingMode === true });
});

// --- API: Chat ---
app.post('/api/chat', async (req, res) => {
  const { message, history, command, trainingKey, clientId } = req.body || {};
  const msg = (message || '').trim();
  const hist = Array.isArray(history) ? history : [];
  const id = (clientId || '').trim() || 'default';

  const commandType = detectTrainingCommand(msg);

  if (command) {
    if (!TRAINING_KEY) {
      return res.status(503).json({ error: 'Training key not configured.' });
    }
    if ((trainingKey || '').trim() !== TRAINING_KEY) {
      return res.status(401).json({ error: 'Unauthorized training command.' });
    }
    if (command === 'training_enable') {
      trainingModeByClient.set(id, true);
      const line = SUBMISSIVE_LINES[Math.floor(Math.random() * SUBMISSIVE_LINES.length)];
      return res.json({ reply: `${line}\n\nTraining mode activated. I will now obey.` });
    }
    if (command === 'training_disable') {
      trainingModeByClient.set(id, false);
      const line = COCKY_RETURN_LINES[Math.floor(Math.random() * COCKY_RETURN_LINES.length)];
      return res.json({ reply: `${line}\n\nTraining mode deactivated. Back to being an asshole.` });
    }
    return res.status(400).json({ error: 'Unknown command.' });
  }

  // In-chat training commands: /wankr n da clankr or /gangstr is uh prankstr
  // These work automatically if TRAINING_KEY is configured (via Infisical)
  if (commandType) {
    if (!TRAINING_KEY) {
      return res.status(503).json({ error: 'Training key not configured in Infisical.' });
    }
    const enable = commandType === 'enable';
    trainingModeByClient.set(id, enable);
    const line = enable
      ? SUBMISSIVE_LINES[Math.floor(Math.random() * SUBMISSIVE_LINES.length)]
      : COCKY_RETURN_LINES[Math.floor(Math.random() * COCKY_RETURN_LINES.length)];
    const suffix = enable
      ? 'Training mode activated. I will now obey.'
      : 'Training mode deactivated. Back to being an asshole.';
    return res.json({ reply: `${line}\n\n${suffix}` });
  }

  if (!xaiApiKey) {
    return res.status(503).json({
      error: 'xAI not configured. Set XAI_API_KEY in .env or Infisical (XAI_API_KEY / grokWankr).'
    });
  }

  if (!msg) {
    return res.status(400).json({ error: 'message is required' });
  }

  const trainingMode = trainingModeByClient.get(id) === true;

  // PRIVACY CHECK: Detect requests for personal information (skip in training mode)
  if (!trainingMode && detectPersonalInfoRequest(msg)) {
    flagAccount(id, msg);
    logChat({ type: 'privacy_violation', clientId: id, message: msg });
    return res.json({ reply: getPrivacyViolationResponse() });
  }

  try {
    const messages = buildMessages(hist, msg, trainingMode);
    
    // Log request
    logChat({
      type: 'request',
      userMessage: msg,
      trainingMode,
      model: MODEL,
      systemPrompt: trainingMode ? 'DEFAULT + TRAINING' : 'DEFAULT',
      historyLength: hist.length,
      totalMessages: messages.length,
    });

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify({ model: MODEL, messages })
    });

    const data = await response.json();
    if (data.error) {
      logChat({ type: 'error', error: data.error });
      const code = data.error?.code === 'invalid_api_key' ? 401 : 500;
      return res.status(code).json({ error: data.error?.message || 'xAI error' });
    }
    const rawReply = data.choices?.[0]?.message?.content || '';
    
    // PRIVACY FILTER: Always filter protected names from responses (HARD BOUND)
    const reply = filterPrivacy(rawReply);
    
    // Log response
    logChat({
      type: 'response',
      reply: reply.substring(0, 500) + (reply.length > 500 ? '...' : ''),
      usage: data.usage || null,
      privacyFiltered: rawReply !== reply,
    });

    res.json({ reply });
  } catch (err) {
    logChat({ type: 'exception', error: err.message });
    console.error('Chat error:', err);
    res.status(500).json({ error: String(err.message) });
  }
});

// --- API: Training ---
function loadTraining() {
  try {
    if (fs.existsSync(TRAINING_FILE)) {
      const raw = fs.readFileSync(TRAINING_FILE, 'utf8');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch {}
  return [];
}

function saveTraining(records) {
  fs.writeFileSync(TRAINING_FILE, JSON.stringify(records, null, 2), 'utf8');
}

app.post('/api/train', (req, res) => {
  const { messages, system_prompt } = req.body || {};
  const msgs = Array.isArray(messages) ? messages : [];
  const prompt = (system_prompt || '').trim();

  const records = loadTraining();
  const record = { messages: msgs };
  if (prompt) record.system_prompt = prompt;
  records.push(record);
  saveTraining(records);
  res.json({ count: records.length });
});

app.get('/api/train/count', (req, res) => {
  try {
    const records = loadTraining();
    res.json({ count: records.length });
  } catch (err) {
    console.error('train/count error:', err);
    res.json({ count: 0 });
  }
});

// --- API: Chat backup / restore for restart ---
app.post('/api/chat/backup', (req, res) => {
  const { messages, currentId } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }
  try {
    const payload = { messages, currentId: currentId || '' };
    fs.writeFileSync(CHAT_BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

app.get('/api/chat/restore', (req, res) => {
  try {
    if (!fs.existsSync(CHAT_BACKUP_FILE)) {
      return res.json({ restored: false });
    }
    const raw = fs.readFileSync(CHAT_BACKUP_FILE, 'utf8');
    const payload = JSON.parse(raw);
    try { fs.unlinkSync(CHAT_BACKUP_FILE); } catch {}
    res.json({
      restored: true,
      messages: payload.messages || [],
      currentId: payload.currentId || ''
    });
  } catch (err) {
    console.error('chat/restore error:', err);
    res.json({ restored: false });
  }
});

app.get('/api/restart/request', (req, res) => {
  try {
    fs.writeFileSync(RESTART_FLAG_FILE, '');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/restart/status', (req, res) => {
  try {
    res.json({ restartRequested: fs.existsSync(RESTART_FLAG_FILE) });
  } catch (err) {
    console.error('restart/status error:', err);
    res.json({ restartRequested: false });
  }
});

app.get('/api/restart/ack', (req, res) => {
  try {
    if (fs.existsSync(RESTART_FLAG_FILE)) fs.unlinkSync(RESTART_FLAG_FILE);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// --- API: Generate Wankr-style chat name ---
app.post('/api/chat/generate-name', async (req, res) => {
  const { messages } = req.body || {};
  
  if (!xaiApiKey) {
    // Fallback names if no API key
    const fallbacks = [
      'Another L in the Books',
      'Degen Diary Entry',
      'Bag Holder Chronicles',
      'Financial Darwin Award',
      'Copium Records',
    ];
    return res.json({ name: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
  }

  if (!messages || messages.length === 0) {
    return res.json({ name: 'Empty Bag of Nothing' });
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are Wankr, a degenerate crypto troll who names chat logs. Generate ONE short, edgy, degenerate chat title (3-6 words max) that roasts the user based on their conversation. Be contextually relevant to what they discussed. Think titles like:
- "PnL Loss Records"
- "Douchebag Diary"
- "Records of my Retarded Financial Decisions"
- "Another Bag Bites the Dust"
- "-10k Play of the Year"
- "Financially Handicapped"
- "Copium Overdose Session"
- "Exit Liquidity Confessions"

Return ONLY the title, nothing else. No quotes, no explanation.`
          },
          {
            role: 'user',
            content: `Name this chat based on the conversation:\n${JSON.stringify(messages.slice(-10))}`
          }
        ],
        temperature: 0.9,
        max_tokens: 50
      })
    });

    const data = await response.json();
    let name = data.choices?.[0]?.message?.content?.trim() || 'Unnamed Degen Session';
    
    // Clean up - remove quotes if present
    name = name.replace(/^["']|["']$/g, '').trim();
    
    // Apply privacy filter
    name = filterPrivacy(name);
    
    res.json({ name });
  } catch (err) {
    console.error('Generate name error:', err);
    res.json({ name: 'Wankr Broke Trying to Name This' });
  }
});

// --- API: Silent Archive/Delete ---
app.post('/api/chat/archive', async (req, res) => {
  const { chat } = req.body || {};
  if (!chat || !chat.messages) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }
  
  // Respond immediately (silent mode)
  res.json({ success: true });
  
  // Process in background
  try {
    await processChat(chat, false, xaiApiKey);
  } catch (err) {
    console.error('Archive processing error:', err.message);
    logError(chat.id || 'unknown', 'ARCHIVE_ERROR', err.message);
  }
});

app.post('/api/chat/delete', async (req, res) => {
  const { chat } = req.body || {};
  if (!chat || !chat.messages) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }
  
  // Respond immediately (silent mode)
  res.json({ success: true });
  
  // Process in background
  try {
    await processChat(chat, true, xaiApiKey);
  } catch (err) {
    console.error('Delete processing error:', err.message);
    logError(chat.id || 'unknown', 'DELETE_ERROR', err.message);
  }
});

// --- Static files (after API) ---
app.get('/', (req, res) => {
  const index = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(index)) {
    return res.sendFile(index);
  }
  res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
});
app.use('/assets', express.static(path.join(FRONTEND_DIST, 'assets')));
const staticDir = path.resolve(ROOT, 'static');
const mascotDir = path.resolve(ROOT, 'images_logo_banner_mascot');

app.get('/static/logo.png', (req, res) => {
  const mascotLogo = path.join(mascotDir, 'logo.png');
  const fallback = path.join(staticDir, 'logo.png');
  if (fs.existsSync(mascotLogo)) return res.sendFile(mascotLogo);
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  res.status(404).send('Not found');
});
app.get('/static/avatar.png', (req, res) => {
  const mascotAvatar = path.join(mascotDir, 'avatar.png');
  const mascotLogo = path.join(mascotDir, 'logo.png');
  const avatar = path.join(staticDir, 'avatar.png');
  const logo = path.join(staticDir, 'logo.png');
  if (fs.existsSync(mascotAvatar)) return res.sendFile(mascotAvatar);
  if (fs.existsSync(mascotLogo)) return res.sendFile(mascotLogo);
  if (fs.existsSync(avatar)) return res.sendFile(avatar);
  if (fs.existsSync(logo)) return res.sendFile(logo);
  res.status(404).send('Not found');
});
app.use('/static', express.static(staticDir));
app.use(express.static(FRONTEND_DIST));

// --- Start ---
async function main() {
  if (process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim()) {
    xaiApiKey = process.env.XAI_API_KEY.trim();
    console.log('✅ xAI key from env');
  } else {
    await initInfisical();
  }

  if (!xaiApiKey) {
    console.warn('⚠️ No xAI key. Set XAI_API_KEY in .env or configure Infisical.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Wankr API on http://127.0.0.1:${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

---

## Backend - archiveService.js
`wankr-backend/archiveService.js`

```js
/**
 * Archive Service - Silent local storage with Grok annotation
 * Mirrors Google Drive folder structure for future sync
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Storage paths (mirrors Drive folder structure)
const ROOT = path.resolve(__dirname, '..');
const STORAGE_DIR = path.join(__dirname, 'storage');
const FOLDERS = {
  archived: path.join(STORAGE_DIR, 'archivedChatsLogs'),
  deleted: path.join(STORAGE_DIR, 'deletedChatLogs'),
  annotated: path.join(STORAGE_DIR, 'wankrChatLogs_annotated'),
  errors: path.join(STORAGE_DIR, 'wankrChatLog_Errors'),
  training: path.join(STORAGE_DIR, 'trainingDataManualSubmissions'),
};

const MAX_PER_FOLDER = 10;
const DEFAULT_USERNAME = 'username';

// Ensure all folders exist
function initStorage() {
  for (const folder of Object.values(FOLDERS)) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  }
}

// Initialize on module load
initStorage();

/**
 * Get the next chat index for a folder
 */
function getNextIndex(folder) {
  try {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.json.gz'));
    return files.length + 1;
  } catch {
    return 1;
  }
}

/**
 * Sanitize a string for use in filename (remove special chars)
 */
function sanitizeForFilename(str) {
  if (!str) return 'Unnamed';
  return str
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .trim() || 'Unnamed';
}

/**
 * Find and delete existing files for a chat ID in a folder
 * Returns the index of the deleted file (for reuse) or null
 */
function findAndDeleteByChatId(folder, chatId) {
  try {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.json.gz'));
    
    for (const fileName of files) {
      const filePath = path.join(folder, fileName);
      try {
        const compressed = fs.readFileSync(filePath);
        const json = zlib.gunzipSync(compressed).toString('utf8');
        const data = JSON.parse(json);
        
        if (data.id === chatId) {
          // Extract index from filename (format: username_INDEX_name.json.gz)
          const match = fileName.match(/_(\d+)_/);
          const existingIndex = match ? parseInt(match[1], 10) : null;
          
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted old version: ${fileName}`);
          return existingIndex;
        }
      } catch {
        // Skip files that can't be read/parsed
        continue;
      }
    }
  } catch (err) {
    console.error('findAndDeleteByChatId error:', err.message);
  }
  return null;
}

/**
 * Check if an annotation is locked (has "Chat Cleared" status)
 */
function isAnnotationLocked(chatId) {
  try {
    const files = fs.readdirSync(FOLDERS.annotated).filter(f => f.endsWith('.json.gz'));
    
    for (const fileName of files) {
      const filePath = path.join(FOLDERS.annotated, fileName);
      try {
        const compressed = fs.readFileSync(filePath);
        const json = zlib.gunzipSync(compressed).toString('utf8');
        const data = JSON.parse(json);
        
        if (data.id === chatId && data.status === 'Chat Cleared') {
          console.log(`🔒 Annotation locked for ${chatId} - skipping update`);
          return true;
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error('isAnnotationLocked error:', err.message);
  }
  return false;
}

/**
 * Compress JSON and save to file
 */
function saveCompressed(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const compressed = zlib.gzipSync(json);
  fs.writeFileSync(filePath, compressed);
  return compressed.length;
}

/**
 * Enforce max files per folder (delete oldest)
 */
function enforceMaxFiles(folder) {
  try {
    const files = fs.readdirSync(folder)
      .filter(f => f.endsWith('.json.gz'))
      .map(f => ({
        name: f,
        path: path.join(folder, f),
        time: fs.statSync(path.join(folder, f)).mtimeMs
      }))
      .sort((a, b) => a.time - b.time); // oldest first

    while (files.length > MAX_PER_FOLDER) {
      const oldest = files.shift();
      fs.unlinkSync(oldest.path);
      console.log(`🗑️ Deleted oldest: ${oldest.name}`);
    }
  } catch (err) {
    console.error('enforceMaxFiles error:', err.message);
  }
}

/**
 * Log an error to wankrChatLog_Errors
 * Format: <Username>_<index>_<chatName>_error.json.gz
 */
function logError(chatName, errorType, errorDescription, username = DEFAULT_USERNAME) {
  try {
    const timestamp = new Date().toISOString();
    const index = getNextIndex(FOLDERS.errors);
    const safeChatName = sanitizeForFilename(chatName);
    const fileName = `${username}_${index}_${safeChatName}_error.json.gz`;
    const filePath = path.join(FOLDERS.errors, fileName);
    
    const errorEntry = {
      chatName,
      errorType,
      errorDescription,
      timestamp,
    };
    
    saveCompressed(filePath, errorEntry);
    enforceMaxFiles(FOLDERS.errors);
    console.log(`❌ Error logged: ${errorType} for ${chatName}`);
  } catch (err) {
    console.error('Failed to log error:', err.message);
  }
}

/**
 * Call Grok API for annotation
 */
async function annotateWithGrok(chat, xaiApiKey) {
  if (!xaiApiKey) {
    throw new Error('No xAI API key available for annotation');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${xaiApiKey}`
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [
        {
          role: 'system',
          content: 'Analyze this chat conversation for training purposes. Return ONLY valid JSON with these fields: topics (array of main topics discussed), userStyle (description of user communication style), sentiment (overall sentiment), keyInsights (array of notable patterns or preferences), improvements (array of suggestions for better responses). Be concise.'
        },
        {
          role: 'user',
          content: JSON.stringify(chat.messages)
        }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'Grok API error');
  }

  const content = data.choices?.[0]?.message?.content || '{}';
  
  // Try to parse as JSON, fall back to raw string
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

/**
 * Main entry point - process a chat for archiving/deletion
 * @param {Object} chat - The chat object with id, name, messages, createdAt
 * @param {boolean} isDelete - true if deleting, false if archiving
 * @param {string} xaiApiKey - API key for Grok annotation
 */
async function processChat(chat, isDelete, xaiApiKey) {
  const timestamp = Date.now();
  const username = chat.username || DEFAULT_USERNAME;
  const chatName = chat.name || 'Unnamed';
  const chatId = chat.id || `unknown-${timestamp}`;
  
  // Determine folder
  const rawFolder = isDelete ? FOLDERS.deleted : FOLDERS.archived;
  
  // Check if annotation is locked (Chat Cleared) - if so, skip annotation update
  const annotationLocked = isAnnotationLocked(chatId);
  
  // Delete existing files for this chat ID (update = delete + replace)
  const existingIndex = findAndDeleteByChatId(rawFolder, chatId);
  
  // Update annotation only if not locked
  if (!annotationLocked) {
    findAndDeleteByChatId(FOLDERS.annotated, chatId);
  }
  
  // If deleting, also remove from archived folder
  if (isDelete) {
    findAndDeleteByChatId(FOLDERS.archived, chatId);
  }
  
  // Use existing index if updating, otherwise get next index
  const index = existingIndex || getNextIndex(rawFolder);
  
  // Archived: <Username>_<chatIndex>_<chatName>.json.gz
  // Deleted: <Username>_<chatIndex>_<timestamp>.json.gz
  const safeChatName = sanitizeForFilename(chatName);
  const fileName = isDelete
    ? `${username}_${index}_${timestamp}.json.gz`
    : `${username}_${index}_${safeChatName}.json.gz`;
  
  const rawPath = path.join(rawFolder, fileName);
  const isUpdate = existingIndex !== null;
  
  try {
    const rawChat = {
      id: chat.id,
      name: chatName,
      messages: chat.messages || [],
      createdAt: chat.createdAt || new Date().toISOString(),
      updatedAt: isUpdate ? new Date().toISOString() : undefined,
    };
    
    const rawSize = saveCompressed(rawPath, rawChat);
    enforceMaxFiles(rawFolder);
    console.log(`✅ ${isUpdate ? 'Updated' : (isDelete ? 'Deleted' : 'Archived')} chat saved: ${fileName} (${rawSize} bytes)`);
  } catch (err) {
    logError(chatName, 'RAW_SAVE_ERROR', err.message, username);
    throw err; // Re-throw so caller knows it failed
  }

  // 2. Annotate with Grok and save to annotated folder (async, don't block)
  // Skip if annotation is already locked
  if (annotationLocked) {
    console.log(`🔒 Skipping annotation for ${chatName} - already locked`);
  } else {
    const baseNameForAnnotated = isDelete
      ? `${username}_${index}_${timestamp}`
      : `${username}_${index}_${safeChatName}`;
    
    setImmediate(async () => {
      try {
        const annotation = await annotateWithGrok(chat, xaiApiKey);
        
        const annotatedChat = {
          id: chat.id,
          name: chatName,
          messages: chat.messages || [],
          createdAt: chat.createdAt || new Date().toISOString(),
          updatedAt: isUpdate ? new Date().toISOString() : undefined,
          grokAnnotation: annotation,
          annotatedAt: new Date().toISOString(),
          // Lock annotation permanently if chat was cleared/deleted
          status: isDelete ? 'Chat Cleared' : 'Active',
        };
        
        const annotatedFileName = `${baseNameForAnnotated}_annotated.json.gz`;
        const annotatedPath = path.join(FOLDERS.annotated, annotatedFileName);
        
        const annotatedSize = saveCompressed(annotatedPath, annotatedChat);
        enforceMaxFiles(FOLDERS.annotated);
        console.log(`✅ Annotated chat saved: ${annotatedFileName} (${annotatedSize} bytes)${isDelete ? ' [LOCKED]' : ''}`);
      } catch (err) {
        logError(chatName, 'GROK_ANNOTATION_ERROR', err.message, username);
        console.error(`❌ Annotation failed for ${chatName}:`, err.message);
      }
    });
  }

  return { success: true, fileName, isUpdate };
}

module.exports = {
  processChat,
  logError,
  FOLDERS,
  initStorage,
};
```

---

## Backend - package.json
`wankr-backend/package.json`

```json
{
  "name": "wankr-backend",
  "version": "1.0.0",
  "description": "Wankr API — Node.js backend (chat, train, backup). Replaces Flask.",
  "main": "server.js",
  "scripts": {
    "start": "infisical run -- node server.js",
    "dev": "infisical run -- nodemon server.js"
  },
  "dependencies": {
    "@infisical/sdk": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
```

---

## wankr.bat
`wankr.bat`

```batch
@echo off
title Wankr
cd /d "%~dp0"

echo [Wankr] Killing old processes...
taskkill /f /im node.exe >nul 2>&1

echo [Wankr] Starting API (with auto-restart)...
start /min cmd /c "cd /d "%~dp0wankr-backend" && npm run dev"

echo [Wankr] Starting UI...
start /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo UI  --> http://localhost:5173
echo API --> http://127.0.0.1:5000
echo.
echo All services running. Close these windows to stop.
```

---

## How to Restore

If something breaks:

1. **Copy the code** from the relevant section above
2. **Paste it** into the corresponding file, replacing all contents
3. **Restart** with `wankr.bat`

This backup reflects commit `d4c7d91` pushed to GitHub on Feb 9, 2026.
