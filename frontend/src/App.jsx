import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversationStorage } from './hooks/useConversationStorage';
import { useChat } from './hooks/useChat';
import { useArchive } from './hooks/useArchive';
import { useRestartBackup } from './hooks/useRestartBackup';
import { useViewportScale } from './hooks/useViewportScale';
import { getTrainCount } from './services/trainingService';
import { validateSession, logout as authLogout, getStoredToken, getStoredUsername } from './services/authService';
import { api } from './utils/api';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import TrainingPanel from './components/TrainingPanel';
import PlaceholderPanel from './components/PlaceholderPanel';
import LoginScreen from './components/LoginScreen';
import SpectatorView from './components/SpectatorView';
import DashboardSettings from './components/DashboardSettings';
import MeasureTool from './components/MeasureTool';
import { isDevToolsAllowed } from './utils/devToolsAllowed';
import OriginCrosshair from './components/OriginCrosshair';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [sessionValidating, setSessionValidating] = useState(true);
  const [loginCollapsing, setLoginCollapsing] = useState(false);
  const [dashboardSweepIn, setDashboardSweepIn] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [showOriginCrosshair, setShowOriginCrosshair] = useState(true);
  const [, setOrientationKey] = useState(0);
  const [namedToast, setNamedToast] = useState(null);
  const namedToastTimeoutRef = useRef(null);
  const transitionRef = useRef(null);
  const storage = useConversationStorage();

  // Universal dev panel: only on dev port (Vite). Ctrl+Alt+D or Ctrl+Shift+D. Rejected elsewhere.
  const [universalDevPanelOpen, setUniversalDevPanelOpen] = useState(false);
  useEffect(() => {
    if (!isDevToolsAllowed) return;
    const handler = (e) => {
      const isD = e.key === 'D' || e.key === 'd' || e.code === 'KeyD';
      const isCtrlAltD = e.ctrlKey && e.altKey && !e.shiftKey && isD;
      const isCtrlShiftD = e.ctrlKey && e.shiftKey && !e.altKey && isD;
      if (!isCtrlAltD && !isCtrlShiftD) return;
      const onLoginScreen = !loggedIn && !spectatorMode && !sessionValidating;
      const willHandle = onLoginScreen || getStoredUsername()?.toLowerCase() === 'gitnoodler';
      if (!willHandle) return;
      e.preventDefault();
      e.stopPropagation();
      setUniversalDevPanelOpen((o) => !o);
    };
    const opts = { capture: true };
    document.addEventListener('keydown', handler, opts);
    return () => document.removeEventListener('keydown', handler, opts);
  }, [loggedIn, spectatorMode, sessionValidating]);

  // Reorient layout when iOS (or any device) rotates, resizes, or app is opened from background
  useEffect(() => {
    const reflow = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--viewport-height', `${h}px`);
      setOrientationKey((k) => k + 1);
    };
    reflow();
    window.addEventListener('orientationchange', reflow);
    window.addEventListener('resize', reflow);
    window.visualViewport?.addEventListener('resize', reflow);
    window.visualViewport?.addEventListener('scroll', reflow);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reflow(); });
    return () => {
      window.removeEventListener('orientationchange', reflow);
      window.removeEventListener('resize', reflow);
      window.visualViewport?.removeEventListener('resize', reflow);
      window.visualViewport?.removeEventListener('scroll', reflow);
      document.removeEventListener('visibilitychange', reflow);
    };
  }, []);
  const {
    currentId,
    conversation,
    setConversation,
    archived,
    currentLabel: _currentLabel,
    startNewChat,
    handleLoadArchived: loadArchived,
    persistArchived,
    restoreFromBackup,
  } = storage;

  useRestartBackup(conversation, currentId);
  useViewportScale();

  const [trainCount, setTrainCount] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  // Default off; only the secret command (backend + TRAINING_KEY) can enable it
  const [trainingMode, setTrainingMode] = useState(false);

  const handleTrainingModeChange = useCallback((enabled) => {
    setTrainingMode(enabled);
    try {
      localStorage.setItem('wankr_training_mode', String(enabled));
    } catch { /* ignore */ }
  }, []);
  
  const chat = useChat(conversation, setConversation, systemPrompt, setTrainCount, currentId, handleTrainingModeChange);

  const showNamedToast = useCallback((name) => {
    if (namedToastTimeoutRef.current) clearTimeout(namedToastTimeoutRef.current);
    setNamedToast({ name });
    namedToastTimeoutRef.current = setTimeout(() => {
      setNamedToast(null);
      namedToastTimeoutRef.current = null;
    }, 2800);
  }, []);

  const {
    openArchive,
    deleteArchivedChat,
    clearChat,
    autoArchiveWithWankrName: _autoArchiveWithWankrName,
    isRecalledChat,
  } = useArchive(
    conversation,
    currentId,
    archived,
    persistArchived,
    startNewChat,
    showNamedToast
  );

  useEffect(() => {
    return () => {
      if (namedToastTimeoutRef.current) clearTimeout(namedToastTimeoutRef.current);
    };
  }, []);

  // Auto-login: validate session token on page load
  useEffect(() => {
    const token = getStoredToken();
    const port = typeof window !== 'undefined' ? window.location.port : '';
    // #region agent log
    if (!token) {
      fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'App.jsx:sessionValidation',message:'no token, skip validate',data:{port,hasToken:false},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    }
    // #endregion
    if (!token) {
      queueMicrotask(() => setSessionValidating(false));
      return;
    }
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'App.jsx:validateSession.start',message:'calling validateSession',data:{port},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    validateSession()
      .then((result) => {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'App.jsx:validateSession.then',message:'session validated',data:{port,valid:result?.valid},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        if (result.valid) {
          setLoggedIn(true);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'App.jsx:validateSession.finally',message:'validation finished',data:{port},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setSessionValidating(false);
      });
  }, []);

  // After login: fetch active chats from backend and merge with localStorage (prefer newer updatedAt)
  useEffect(() => {
    if (!loggedIn) return;
    const token = getStoredToken();
    if (!token) return;
    api.get(`/api/chats/active?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : { chats: [] }))
      .then((data) => {
        const serverChats = Array.isArray(data.chats) ? data.chats : [];
        if (serverChats.length === 0) return;
        persistArchived((prev) => {
          const byId = new Map();
          for (const c of prev) {
            byId.set(c.id, { ...c, updatedAt: c.updatedAt || c.createdAt || '' });
          }
          for (const c of serverChats) {
            const existing = byId.get(c.id);
            const updatedAt = c.updatedAt || c.createdAt || '';
            if (!existing || (updatedAt && updatedAt > (existing.updatedAt || ''))) {
              byId.set(c.id, { ...c, updatedAt });
            }
          }
          const merged = Array.from(byId.values()).sort(
            (a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')
          );
          return merged.slice(-20);
        });
      })
      .catch(() => {});
  }, [loggedIn, persistArchived]);

  const handleLoginSuccess = useCallback(() => {
    if (transitionRef.current) return;
    setLoginCollapsing(true);
    transitionRef.current = setTimeout(() => {
      transitionRef.current = null;
      // Token is already stored by authService.login/register
      setLoggedIn(true);
      setLoginCollapsing(false);
      setDashboardSweepIn(true);
      setTimeout(() => setDashboardSweepIn(false), 500);
    }, 300);
  }, []);

  const handleSpectate = useCallback(() => {
    if (transitionRef.current) return;
    setLoginCollapsing(true);
    transitionRef.current = setTimeout(() => {
      transitionRef.current = null;
      setSpectatorMode(true);
      setLoginCollapsing(false);
    }, 300);
  }, []);

  const handleExitSpectator = useCallback(() => {
    setSpectatorMode(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authLogout();
    } catch { /* ignore */ }
    setLoggedIn(false);
    setSpectatorMode(false);
  }, []);

  useEffect(() => {
    getTrainCount().then(setTrainCount).catch(() => setTrainCount(0));
  }, []);

  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  // Sync training mode to backend whenever it changes or on page load
  useEffect(() => {
    if (currentId) {
      if (import.meta.env.DEV) console.log(`🔄 Syncing training mode: ${trainingMode} for client: ${currentId}`);
      api.post('/api/chat/sync-training', { clientId: currentId, trainingMode })
        .then(async (r) => {
          if (!r.ok) {
            if (r.status === 405) console.warn('Sync-training 405: backend not reached (is wankrbot.com on Tunnel + backend, not Workers?)');
            return null;
          }
          const text = await r.text();
          if (!text.trim()) return null;
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        })
        .then((data) => { if (import.meta.env.DEV && data != null) console.log('Sync response:', data); })
        .catch((err) => console.warn('Sync-training failed:', err.message || err));
    }
  }, [trainingMode, currentId]);

  const handleLoadArchived = useCallback(
    async (id) => {
      // Capture current state BEFORE switching
      const shouldAutoArchive = conversation.length > 0 && !isRecalledChat();
      const messagesSnapshot = shouldAutoArchive ? [...conversation] : null;
      const idSnapshot = shouldAutoArchive ? currentId : null;
      
      // Switch to the target archived chat FIRST (immediately)
      loadArchived(id);
      
      // THEN auto-archive the old chat in background (non-blocking)
      if (shouldAutoArchive && messagesSnapshot && idSnapshot) {
        // Fire-and-forget auto-archive with timeout
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const response = await api.post('/api/chat/generate-name', { messages: messagesSnapshot }, { signal: controller.signal });
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
            api.post('/api/chat/archive', { chat: archivedChat }).catch(() => {});

            // Show name at a convenient time (right after switch)
            showNamedToast(name);
          } catch (err) {
            console.error('Auto-archive failed:', err.name === 'AbortError' ? 'timeout' : err);
          }
        })();
      }
    },
    [loadArchived, conversation, currentId, isRecalledChat, persistArchived, showNamedToast]
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
      .then(async (res) => {
        if (!res.ok) return { restored: false };
        const text = await res.text();
        if (!text.trim()) return { restored: false };
        try {
          return JSON.parse(text);
        } catch {
          return { restored: false };
        }
      })
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

  const showLogin = !loggedIn && !spectatorMode;

  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c5d30'},body:JSON.stringify({sessionId:'9c5d30',location:'App.jsx:render',message:'app render branch',data:{port:window.location.port,isDevToolsAllowed,showLogin,loggedIn,sessionValidating,spectatorMode},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  }
  // #endregion

  // Spectator mode takes over the entire screen
  if (spectatorMode) {
    return <SpectatorView onExit={handleExitSpectator} />;
  }

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
      }}
    >
      {/* Solid black background; no image, no visual effects (login + robot + panel only). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: '#000',
        }}
      />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {showLogin ? (
          <LoginScreen
            onLogin={handleLoginSuccess}
            onSpectate={handleSpectate}
            collapsing={loginCollapsing}
            onOpenMeasure={isDevToolsAllowed ? () => setMeasureOpen(true) : undefined}
            devPanelOpen={isDevToolsAllowed && universalDevPanelOpen}
            onDevPanelClose={isDevToolsAllowed ? () => setUniversalDevPanelOpen(false) : undefined}
            onRequestDevPanel={isDevToolsAllowed ? () => setUniversalDevPanelOpen(true) : undefined}
            showOriginCrosshair={showOriginCrosshair}
            onToggleOriginCrosshair={isDevToolsAllowed ? () => setShowOriginCrosshair((v) => !v) : undefined}
          />
        ) : (
          <>
            <Header onLogout={handleLogout} />
            {isDevToolsAllowed && <DashboardSettings />}
            <div
              className={`dashboard-body ${dashboardSweepIn ? 'sweep-in' : ''} ${trainingMode ? 'with-training' : 'with-placeholder'}`}
              style={{
                background: 'transparent',
                position: 'relative',
                zIndex: 10,
                gridTemplateColumns: 'var(--dashboard-sidebar-width) 1fr var(--training-panel-width)',
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
              <div className="dashboard-right">
                {trainingMode ? (
                  <TrainingPanel
                    trainingMode={trainingMode}
                    onConfigChange={(newConfig) => {
                      api.post('/api/training/config', newConfig).catch(() => {});
                    }}
                    systemPrompt={systemPrompt}
                    onSystemPromptChange={setSystemPrompt}
                    onResetPrompt={() => setSystemPrompt('')}
                    onTrain={chat.handleTrain}
                    trainCount={trainCount}
                  />
                ) : (
                  <PlaceholderPanel
                    onOpenMeasure={isDevToolsAllowed ? () => setMeasureOpen(true) : undefined}
                    devPanelOpen={isDevToolsAllowed ? universalDevPanelOpen : false}
                    onDevPanelClose={isDevToolsAllowed ? () => setUniversalDevPanelOpen(false) : undefined}
                    showOriginCrosshair={showOriginCrosshair}
                    onToggleOriginCrosshair={isDevToolsAllowed ? () => setShowOriginCrosshair((v) => !v) : undefined}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {isDevToolsAllowed && <OriginCrosshair visible={showOriginCrosshair} />}
      {isDevToolsAllowed && measureOpen && <MeasureTool onClose={() => setMeasureOpen(false)} />}
      {namedToast && (
        <div
          className="named-toast"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(24px * var(--scale))',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: 'calc(10px * var(--scale)) calc(18px * var(--scale))',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
            border: '1px solid rgba(0, 255, 0, 0.35)',
            borderRadius: 'var(--dashboard-input-border-radius)',
            color: 'var(--accent)',
            fontSize: 'calc(14px * var(--scale))',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(0, 255, 0, 0.15)',
            zIndex: 10000,
          }}
        >
          Named: {namedToast.name}
        </div>
      )}
    </div>
  );
}
