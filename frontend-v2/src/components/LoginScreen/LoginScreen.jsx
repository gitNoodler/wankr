import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import RobotScene from './RobotScene';
import LoginForm from './LoginForm';
import RobotDevPanel from './RobotDevPanel';
import { saveDevDefaults, fetchDevDefaultsFromBackend, getPrimaryDevDefaults, LAYERS_LOCKED_KEY, isIOS, isPortrait } from './loginScreenConfig';
import { isDevToolsAllowed } from '../../utils/devToolsAllowed';
import { computePanelBackground } from './helpers';
import { useLoginScreenState } from './useLoginScreenState';
import { useLoginScreenUndo } from './useLoginScreenUndo';
import { useLoginScreenAuth } from './useLoginScreenAuth';
import useLofiMusic from './useLofiMusic';
import useWankrGroove from './useWankrGroove';
import GrooveGearMenu from './GrooveGearMenu';
import DevPasswordGate from './DevPasswordGate';
import DevToolbar from './DevToolbar';
import { isDevPanelUnlocked, lockDevPanel } from './devPanelLock';
import WankingLiveDevPanel from '../WankingLive/WankingLiveDevPanel';
import { useWankingLiveDevState } from '../WankingLive/useWankingLiveDevState';
import './LoginScreen.css';

const DEV_PANEL_BOX_STYLE = {
  position: 'fixed',
  top: 20,
  right: 20,
  zIndex: 210,
  background: 'rgba(0,0,0,0.95)',
  padding: '16px',
  borderRadius: '12px',
  border: '2px solid var(--accent)',
  boxShadow: '0 0 30px rgba(0,255,65,0.3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 260,
  maxHeight: '90vh',
  overflowY: 'auto',
};

export default function LoginScreen({
  onLogin,
  onSpectate,
  collapsing,
  onOpenMeasure,
  devPanelOpen = false,
  onDevPanelClose,
  onRequestDevPanel,
  showOriginCrosshair = false,
  onToggleOriginCrosshair,
}) {
  const [devPanelUnlockedThisSession, setDevPanelUnlockedThisSession] = useState(false);
  const [dev2Open, setDev2Open] = useState(false);
  const dev1 = useWankingLiveDevState();
  const [, setLayersLocked] = useState(() => {
    try {
      return localStorage.getItem(LAYERS_LOCKED_KEY) !== 'false';
    } catch { return true; }
  });
  const sceneRef = React.useRef(null);
  const sceneUnitRef = React.useRef(null);
  const [portrait, setPortrait] = useState(() => (typeof window !== 'undefined' ? isPortrait() : true));
  useEffect(() => {
    const sync = () => setPortrait(isPortrait());
    window.addEventListener('orientationchange', sync);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const state = useLoginScreenState({});
  useLoginScreenUndo({
    buildSnapshot: state.buildSnapshot,
    applySnapshotRef: state.applySnapshotRef,
    getSavedDefaults: () => fetchDevDefaultsFromBackend(api),
    onResetToPrimaryApplied: (primary) => api.post('/api/settings/dev-defaults', primary).catch(() => {}),
  });
  const auth = useLoginScreenAuth({ onLogin });
  const lofi = useLofiMusic();
  const groove = useWankrGroove();

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    auth.doAuth(false);
  }, [auth]);

  const handleLockLayers = useCallback(() => {
    setLayersLocked(true);
    try { localStorage.setItem(LAYERS_LOCKED_KEY, 'true'); } catch { /* ignore */ }
  }, []);

  const panelBg = computePanelBackground(state.loginBrightness, state.loginShadeOfGray, state.loginLightToBlack);

  const handleRestoreSavedLayout = useCallback(() => {
    fetchDevDefaultsFromBackend(api).then((data) => {
      state.applySnapshotRef.current?.(data || getPrimaryDevDefaults());
    });
  }, [state]);

  const applyPartChange = useCallback((id, { offsetX, offsetY, scaleX, scaleY }) => {
    if (id === 'back') {
      state.setBackOffsetX(offsetX);
      state.setBackOffsetY(offsetY);
      state.setBackScaleX(scaleX);
      state.setBackScaleY(scaleY);
    } else if (id === 'robot') {
      state.setRobotOffsetX(offsetX);
      state.setRobotOffsetY(offsetY);
      state.setRobotScaleX(scaleX);
      state.setRobotScaleY(scaleY);
    } else if (id === 'shoulder') {
      state.setShoulderOffsetX(offsetX);
      state.setShoulderOffsetY(offsetY);
      state.setShoulderScaleX(scaleX);
      state.setShoulderScaleY(scaleY);
    } else if (id === 'handLeft') {
      state.setHandLeftOffsetX(offsetX);
      state.setHandLeftOffsetY(offsetY);
      state.setHandLeftScaleX(scaleX);
      state.setHandLeftScaleY(scaleY);
    } else if (id === 'handRight') {
      state.setHandRightOffsetX(offsetX);
      state.setHandRightOffsetY(offsetY);
      state.setHandRightScaleX(scaleX);
      state.setHandRightScaleY(scaleY);
    }
  }, [state]);

  const handleSaveGlobalDefaults = useCallback(() => {
    const valuesToSave = state.buildSnapshot();
    if (!valuesToSave) return;
    saveDevDefaults();
    api
      .post('/api/settings/dev-defaults', valuesToSave)
      .then((res) => {
        if (res.ok) {
          handleLockLayers();
        } else if (res.status === 403) {
          window.alert('Could not save defaults. Use the dev server (port 5173) to save.');
        } else {
          window.alert('Save failed.');
        }
      })
      .catch(() => window.alert('Save failed.'));
  }, [state, handleLockLayers]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        handleRestoreSavedLayout();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleRestoreSavedLayout]);

  // Single source of truth: load saved layout from backend on mount (so 5000 and 5173 match)
  useEffect(() => {
    fetchDevDefaultsFromBackend(api).then((data) => {
      if (data) state.applySnapshotRef.current?.(data);
    });
  }, [state.applySnapshotRef]);

  return (
    <div
      className="login-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        background: '#000',
        pointerEvents: collapsing ? 'none' : 'auto',
        boxSizing: 'border-box',
        padding: 'env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0)',
      }}
    >
      {isIOS() && !portrait && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            color: 'var(--accent)',
            fontFamily: "'VT323', monospace",
            fontSize: 'clamp(24px, 6vw, 32px)',
            textAlign: 'center',
            pointerEvents: 'auto',
          }}
          aria-live="polite"
        >
          <p style={{ margin: 0, textShadow: '0 0 12px var(--accent)' }}>Please rotate your device to portrait</p>
        </div>
      )}
      {state.defaultsReady ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <RobotScene
          sceneRef={sceneRef}
          sceneUnitRef={sceneUnitRef}
          sceneOffsetX={state.sceneOffsetX}
          sceneOffsetY={state.sceneOffsetY}
          sceneScaleX={state.sceneScaleX}
          sceneScaleY={state.sceneScaleY}
          backOffsetX={state.backOffsetX}
          backOffsetY={state.backOffsetY}
          backScaleX={state.backScaleX}
          backScaleY={state.backScaleY}
          showLayerBackground={state.showLayerBackground}
          showLayerWankrBody={state.showLayerWankrBody}
          showLayerLogin={state.showLayerLogin}
          characterSharpness={state.characterSharpness}
          leftCushion={state.leftCushion}
          topCushion={state.topCushion}
          loginBoxWidth={state.loginBoxWidth}
          loginBoxHeight={state.loginBoxHeight}
          scaleX={state.scaleX}
          scaleY={state.scaleY}
          panelBg={panelBg}
          panelBorderBrightness={state.panelBorderBrightness}
          panelContentOffsetX={state.panelContentOffsetX}
          panelRightMargin={state.panelRightMargin}
          buttonsBottomGap={state.buttonsBottomGap}
          musicPlaying={lofi.playing}
          onToggleMusic={lofi.toggle}
          groovePlaying={groove.playing}
          grooveGetAudio={groove.getAudio}
          panelContent={
            <LoginForm
              username={auth.username}
              password={auth.password}
              confirmPassword={auth.confirmPassword}
              email={auth.email}
              isRegistering={auth.isRegistering}
              usernameStatus={auth.usernameStatus}
              loading={auth.loading}
              error={auth.error}
              onUsernameChange={auth.handleUsernameChange}
              onPasswordChange={auth.setPassword}
              onConfirmPasswordChange={auth.setConfirmPassword}
              onEmailChange={auth.setEmail}
              onSubmit={handleSubmit}
              onNewUser={auth.handleNewUser}
              onSpectate={onSpectate}
              onBackToLogin={auth.handleBackToLogin}
            />
          }
          ductTapeStrips={[]}
          respectDuctTape={true}
        />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#000' }} aria-hidden="true" />
      )}

      {/* Gear menu — audio controls (always visible) */}
      <GrooveGearMenu
        volume={groove.volume}
        muted={groove.muted}
        onVolumeChange={groove.setVolume}
        onToggleMute={groove.toggleMute}
      />

      {/* Dev panels removed */}
    </div>
  );
}
