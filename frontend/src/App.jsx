import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversationStorage } from './hooks/useConversationStorage';
import { useChat } from './hooks/useChat';
import { useArchive } from './hooks/useArchive';
import { useRestartBackup } from './hooks/useRestartBackup';
import { useViewportScale } from './hooks/useViewportScale';
import { getTrainCount } from './services/trainingService';
import { validateSession, logout as authLogout, getStoredToken } from './services/authService';
import { api } from './utils/api';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import Particles from './components/Particles';
import StarfieldReflections from './components/StarfieldReflections';
import TrainingPanel from './components/TrainingPanel';
import PlaceholderPanel from './components/PlaceholderPanel';
import LoginScreen from './components/LoginScreen';
import SpectatorView from './components/SpectatorView';
import MeasureTool from './components/MeasureTool';
import GlowPointTool from './components/GlowPointTool';
import EffectsBoundsTool from './components/EffectsBoundsTool';
import EffectsBoundsLayer from './components/EffectsBoundsLayer';
import AmbientLightPropagation from './components/AmbientLightPropagation';
import FloorPropagation from './components/FloorPropagation';
import SparkReflectionOverlay from './components/SparkReflectionOverlay';
import appBackgroundImg from '@mascot/bckground&Banner/uncroppedBackground.png';
import { loadDevDefaults } from './components/LoginScreen/loginScreenConfig';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [sessionValidating, setSessionValidating] = useState(true);
  const [loginCollapsing, setLoginCollapsing] = useState(false);
  const [dashboardSweepIn, setDashboardSweepIn] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [glowPointOpen, setGlowPointOpen] = useState(false);
  const [effectsBoundsOpen, setEffectsBoundsOpen] = useState(false);
  const [sparkActive, setSparkActive] = useState(false);
  const [effectsBoundsVersion, setEffectsBoundsVersion] = useState(0);
  const [glowPointVersion, setGlowPointVersion] = useState(0);
  const [, setOrientationKey] = useState(0);
  const [namedToast, setNamedToast] = useState(null);
  const namedToastTimeoutRef = useRef(null);
  const transitionRef = useRef(null);
  const storage = useConversationStorage();

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
  const [appBackgroundBrightness, setAppBackgroundBrightness] = useState(() => loadDevDefaults().appBackgroundBrightness ?? loadDevDefaults().meanBrightness ?? 50);
  const [appBackgroundSharpness, setAppBackgroundSharpness] = useState(() => loadDevDefaults().backlayerSharpness ?? 100);
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
    if (!token) {
      queueMicrotask(() => setSessionValidating(false));
      return;
    }
    validateSession()
      .then((result) => {
        if (result.valid) {
          setLoggedIn(true);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setSessionValidating(false));
  }, []);

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
      console.log(`🔄 Syncing training mode: ${trainingMode} for client: ${currentId}`);
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
        .then((data) => { if (data != null) console.log('Sync response:', data); })
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

  const showLogin = !loggedIn && !spectatorMode && !sessionValidating;

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
      {/* Background layer: uncropped background for entire app (same layer as Background brightness) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${appBackgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          filter: appBackgroundSharpness !== 100 ? `contrast(${appBackgroundSharpness / 100})` : undefined,
        }}
      />
      <EffectsBoundsLayer version={effectsBoundsVersion} zIndex={2}>
        <StarfieldReflections />
      </EffectsBoundsLayer>
      <AmbientLightPropagation />
      <FloorPropagation sparkActive={sparkActive} glowPointVersion={glowPointVersion} />
      <SparkReflectionOverlay sparkActive={sparkActive} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(0, 0, 0, ${Math.min(0.94, 1 - appBackgroundBrightness / 100)})`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Particles />
        {showLogin ? (
          <LoginScreen
            onLogin={handleLoginSuccess}
            onSpectate={handleSpectate}
            collapsing={loginCollapsing}
            appBackgroundBrightness={appBackgroundBrightness}
            onAppBackgroundBrightnessChange={setAppBackgroundBrightness}
            appBackgroundSharpness={appBackgroundSharpness}
            onAppBackgroundSharpnessChange={setAppBackgroundSharpness}
            onOpenGlowPoint={() => setGlowPointOpen(true)}
            onSparkActive={setSparkActive}
            glowPointVersion={glowPointVersion}
          />
        ) : (
          <>
            <Header onLogout={handleLogout} onOpenMeasure={() => setMeasureOpen(true)} onOpenGlowPoint={() => setGlowPointOpen(true)} onOpenEffectsBounds={() => setEffectsBoundsOpen(true)} />
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
                  <PlaceholderPanel />
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {measureOpen && <MeasureTool onClose={() => setMeasureOpen(false)} />}
      {glowPointOpen && (
        <GlowPointTool
          onClose={() => setGlowPointOpen(false)}
          onSave={() => setGlowPointVersion((v) => v + 1)}
        />
      )}
      {effectsBoundsOpen && (
        <EffectsBoundsTool
          onClose={() => setEffectsBoundsOpen(false)}
          onSave={() => setEffectsBoundsVersion((v) => v + 1)}
        />
      )}
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
