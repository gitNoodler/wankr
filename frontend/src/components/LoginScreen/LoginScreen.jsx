import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import RobotScene from './RobotScene';
import LoginForm from './LoginForm';
import LoginDevPanel from './LoginDevPanel';
import { loadDevDefaults, saveDevDefaults, LAYERS_LOCKED_KEY, isIOS, isPortrait } from './loginScreenConfig';
import { computePanelBackground, buildDevPanelProps } from './helpers';
import { useLoginScreenState } from './useLoginScreenState';
import { useLoginScreenUndo } from './useLoginScreenUndo';
import { useLoginScreenAuth } from './useLoginScreenAuth';
import DevPasswordGate, { isDevPanelUnlocked, lockDevPanel } from './DevPasswordGate';
import WankingLiveDevPanel from '../WankingLive/WankingLiveDevPanel';
import { useWankingLiveDevState } from '../WankingLive/useWankingLiveDevState';
import './LoginScreen.css';

const DEV_PANEL_BOX_STYLE = {
  position: 'fixed',
  top: 20,
  right: 20,
  zIndex: 200,
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
  appBackgroundBrightness = 50,
  onAppBackgroundBrightnessChange,
  appBackgroundSharpness = 100,
  onAppBackgroundSharpnessChange,
  onOpenMeasure,
  onOpenGlowPoint,
  onSparkActive,
  glowPointVersion = 0,
  devPanelOpen = false,
  onDevPanelClose,
  onRequestDevPanel,
}) {
  const [devPanelUnlockedThisSession, setDevPanelUnlockedThisSession] = useState(false);
  const [dev2Open, setDev2Open] = useState(false);
  const dev1 = useWankingLiveDevState();
  const [sparkActive, setSparkActive] = useState(false);
  const [layersLocked, setLayersLocked] = useState(() => {
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

  const handleSparkActive = useCallback((active) => {
    setSparkActive(active);
    onSparkActive?.(active);
  }, [onSparkActive]);

  const state = useLoginScreenState({
    appBackgroundBrightness,
    appBackgroundSharpness,
    onAppBackgroundBrightnessChange,
    onAppBackgroundSharpnessChange,
  });
  const undo = useLoginScreenUndo({
    buildSnapshot: state.buildSnapshot,
    applySnapshotRef: state.applySnapshotRef,
  });
  const auth = useLoginScreenAuth({ onLogin });

  const handleUnlockLayers = useCallback(() => {
    if (!layersLocked) return;
    if (window.confirm('Modify layer positions and scaling? Changes will apply immediately. You can re-lock after saving.')) {
      setLayersLocked(false);
      try { localStorage.setItem(LAYERS_LOCKED_KEY, 'false'); } catch { /* ignore */ }
    }
  }, [layersLocked]);

  const handleLockLayers = useCallback(() => {
    setLayersLocked(true);
    try { localStorage.setItem(LAYERS_LOCKED_KEY, 'true'); } catch { /* ignore */ }
  }, []);

  const setScaleXLocked = useCallback((v) => {
    state.setScaleX(v);
    if (state.aspectLock) state.setScaleY(v);
  }, [state]);

  const setScaleYLocked = useCallback((v) => {
    state.setScaleY(v);
    if (state.aspectLock) state.setScaleX(v);
  }, [state]);

  const handleUsernameChange = useCallback((value) => {
    auth.handleUsernameChange(value);
  }, [auth]);

  const handleSaveDevDefaults = useCallback(() => {
    const valuesToSave = state.buildSnapshot();
    if (!valuesToSave) return;
    saveDevDefaults(valuesToSave);
    api.post('/api/settings/dev-defaults', valuesToSave).catch(() => {});
    handleLockLayers();
  }, [state, handleLockLayers]);

  const panelBg = computePanelBackground(state.loginBrightness, state.loginShadeOfGray, state.loginLightToBlack);

  const handleRestoreSavedLayout = useCallback(() => {
    const saved = loadDevDefaults();
    state.applySnapshotRef.current?.(saved);
  }, [state]);

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

  const handleSubmit = (e) => { e?.preventDefault(); auth.doAuth(auth.isRegistering); };
  const handleSpectate = (e) => { e?.preventDefault(); onSpectate?.(); };

  return (
    <div
      className="login-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        background: 'transparent',
        pointerEvents: collapsing ? 'none' : 'auto',
        /* iOS: keep scene/content clear of notch, Dynamic Island, home indicator */
        padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
        boxSizing: 'border-box',
      }}
    >
      {isIOS() && !portrait && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(5, 5, 5, 0.97)',
            display: 'flex',
            flexDirection: 'column',
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
      <div style={{ position: 'absolute', inset: 0, overflow: 'visible', boxSizing: 'border-box', containerType: 'size', containerName: 'login-viewport' }}>
        {state.defaultsReady ? (
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
            robotOffsetX={state.robotOffsetX}
            robotOffsetY={state.robotOffsetY}
            robotScaleX={state.robotScaleX}
            robotScaleY={state.robotScaleY}
            shoulderOffsetX={state.shoulderOffsetX}
            shoulderOffsetY={state.shoulderOffsetY}
            shoulderScaleX={state.shoulderScaleX}
            shoulderScaleY={state.shoulderScaleY}
            handLeftOffsetX={state.handLeftOffsetX}
            handLeftOffsetY={state.handLeftOffsetY}
            handLeftScaleX={state.handLeftScaleX}
            handLeftScaleY={state.handLeftScaleY}
            handRightOffsetX={state.handRightOffsetX}
            handRightOffsetY={state.handRightOffsetY}
            handRightScaleX={state.handRightScaleX}
            handRightScaleY={state.handRightScaleY}
            showLayerBackground={state.showLayerBackground}
            showLayerWankrBody={state.showLayerWankrBody}
            showLayerLogin={state.showLayerLogin}
            showLayerHands={state.showLayerHands}
            characterSharpness={state.characterSharpness}
            leftCushion={state.leftCushion}
            topCushion={state.topCushion}
            loginBoxWidth={state.loginBoxWidth}
            loginBoxHeight={state.loginBoxHeight}
            scaleX={state.scaleX}
            scaleY={state.scaleY}
            panelBg={panelBg}
            panelBorderBrightness={state.panelBorderBrightness}
            sparkActive={sparkActive}
            panelContentOffsetX={state.panelContentOffsetX}
            panelRightMargin={state.panelRightMargin}
            buttonsBottomGap={state.buttonsBottomGap}
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
                onUsernameChange={handleUsernameChange}
                onPasswordChange={auth.setPassword}
                onConfirmPasswordChange={auth.setConfirmPassword}
                onEmailChange={auth.setEmail}
                onSubmit={handleSubmit}
                onNewUser={auth.handleNewUser}
                onSpectate={handleSpectate}
                onBackToLogin={auth.handleBackToLogin}
                titleOffsetX={state.titleOffsetX}
                titleOffsetY={state.titleOffsetY}
                titleScale={state.titleScale}
                subtitleOffsetX={state.subtitleOffsetX}
                subtitleOffsetY={state.subtitleOffsetY}
                subtitleScale={state.subtitleScale}
                inputWidthScale={state.inputWidthScale}
                titleTopGap={state.titleTopGap}
                titleToSubtitleGap={state.titleToSubtitleGap}
                subtitleToUsernameGap={state.subtitleToUsernameGap}
                usernamePasswordGap={state.usernamePasswordGap}
                passwordToSubmitGap={state.passwordToSubmitGap}
                submitToButtonsGap={state.submitToButtonsGap}
                controlHeightScale={state.controlHeightScale}
              />
            }
            electricitySparks={null}
            ductTapeStrips={[]}
            respectDuctTape={true}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />
        )}
      </div>

      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 60, display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => onRequestDevPanel?.()}
          title="Dev1 – Wanking Live dev (Ctrl+Alt+D or Ctrl+Shift+D)"
          style={{
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,65,0.5)',
            borderRadius: 6,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          Dev1
        </button>
        <button
          type="button"
          onClick={() => setDev2Open((o) => !o)}
          title="Dev2 – Login/layout dev panel"
          style={{
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 6,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
        >
          Dev2
        </button>
      </div>

      {devPanelOpen && !isDevPanelUnlocked() && !devPanelUnlockedThisSession && (
        <div style={DEV_PANEL_BOX_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px' }}>DEV</span>
            <button type="button" onClick={onDevPanelClose} style={{ background: 'transparent', border: '1px solid rgba(255,100,100,0.5)', borderRadius: 4, color: '#ff6b6b', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>CLOSE</button>
          </div>
          <DevPasswordGate onUnlock={() => setDevPanelUnlockedThisSession(true)} onClose={onDevPanelClose} />
        </div>
      )}
      {devPanelOpen && (isDevPanelUnlocked() || devPanelUnlockedThisSession) && (
        <WankingLiveDevPanel
          elements={dev1.elements}
          boundaries={dev1.boundaries}
          hideBoundariesVisual={dev1.hideBoundariesVisual}
          onHideBoundariesVisualChange={dev1.setHideBoundariesVisual}
          isIndentionPanel={dev1.isIndentionPanel}
          onIndentionPanelChange={dev1.setIsIndentionPanel}
          selectedElementId={dev1.selectedElementId}
          onSelectElement={dev1.setSelectedElementId}
          onAddElement={dev1.handleAddElement}
          onUpdateElement={dev1.handleUpdateElement}
          onDeleteElement={dev1.handleDeleteElement}
          onAddBoundary={dev1.handleAddBoundary}
          onUpdateBoundary={dev1.handleUpdateBoundary}
          onDeleteBoundary={dev1.handleDeleteBoundary}
          selectedBoundaryLayer={dev1.selectedBoundaryLayer}
          onSelectedBoundaryLayerChange={dev1.setSelectedBoundaryLayer}
          placementMode={dev1.placementMode}
          onPlacementModeChange={dev1.setPlacementMode}
          onOpenMeasure={onOpenMeasure}
          onClose={onDevPanelClose}
          onLock={() => {
            lockDevPanel();
            setDevPanelUnlockedThisSession(false);
            onDevPanelClose();
          }}
        />
      )}
      {dev2Open && (
        <LoginDevPanel
          {...buildDevPanelProps(state, {
            layersLocked,
            onUnlockLayers: handleUnlockLayers,
            onLockLayers: handleLockLayers,
            onSave: handleSaveDevDefaults,
            onResetToSaved: undo.handleResetToSaved,
            onResetToPrimaryDefaults: undo.handleResetToPrimaryDefaults,
            onUndo: undo.handleUndo,
            canUndo: undo.undoStackLength > 0,
            onBeforeSliderChange: undo.pushUndoHistory,
            onClose: () => setDev2Open(false),
            onOpenMeasure,
            onOpenGlowPoint,
            appBackgroundBrightness,
            onAppBackgroundBrightnessChange,
            appBackgroundSharpness,
            onAppBackgroundSharpnessChange,
            setScaleXLocked,
            setScaleYLocked,
          })}
        />
      )}
    </div>
  );
}
