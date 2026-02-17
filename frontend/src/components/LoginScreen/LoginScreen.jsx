import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import ElectricitySparks from './ElectricitySparks';
import SparkZonesTool from './SparkZonesTool';
import DuctTapeTool from './DuctTapeTool';
import LoginForm from './LoginForm';
import LoginDevPanel from './LoginDevPanel';
import RobotScene from './RobotScene';
import { loadDevDefaults, saveDevDefaults, LAYERS_LOCKED_KEY, isIOS, isPortrait, loadDuctTapeStrips, saveDuctTapeStrips, loadRespectDuctTape, saveRespectDuctTape } from './loginScreenConfig';
import { computePanelBackground, buildDevPanelProps } from './helpers';
import { useLoginScreenState } from './useLoginScreenState';
import { useLoginScreenUndo } from './useLoginScreenUndo';
import { useLoginScreenAuth } from './useLoginScreenAuth';
import './LoginScreen.css';

export default function LoginScreen({
  onLogin,
  onSpectate,
  collapsing,
  appBackgroundBrightness = 50,
  onAppBackgroundBrightnessChange,
  appBackgroundSharpness = 100,
  onAppBackgroundSharpnessChange,
  onOpenGlowPoint,
  onSparkActive,
  glowPointVersion = 0,
}) {
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [sparkZonesOpen, setSparkZonesOpen] = useState(false);
  const [ductTapePlacementMode, setDuctTapePlacementMode] = useState(false);
  const [ductTapeStrips, setDuctTapeStrips] = useState(() => loadDuctTapeStrips());
  const [respectDuctTape, setRespectDuctTape] = useState(() => loadRespectDuctTape());
  const [, setZonesVersion] = useState(0);
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

  const handleAddDuctTapeStrip = useCallback((strip) => {
    setDuctTapeStrips((prev) => {
      const next = [...prev, strip];
      saveDuctTapeStrips(next);
      return next;
    });
  }, []);
  const handleRemoveDuctTape = useCallback((id) => {
    setDuctTapeStrips((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveDuctTapeStrips(next);
      return next;
    });
  }, []);
  const handleClearAllDuctTape = useCallback(() => {
    setDuctTapeStrips([]);
    saveDuctTapeStrips([]);
  }, []);
  const handleRespectDuctTapeChange = useCallback((value) => {
    setRespectDuctTape(value);
    saveRespectDuctTape(value);
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
    const shouldOpenDev = auth.handleUsernameChange(value);
    if (shouldOpenDev) setDevPanelOpen(true);
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
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDevPanelOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        handleRestoreSavedLayout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
              isRegistering={auth.isRegistering}
              usernameStatus={auth.usernameStatus}
              loading={auth.loading}
              error={auth.error}
              onUsernameChange={handleUsernameChange}
              onPasswordChange={auth.setPassword}
              onConfirmPasswordChange={auth.setConfirmPassword}
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
          electricitySparks={
            <ElectricitySparks
              boundsTop={state.sparkBoundsTop}
              boundsBottom={state.sparkBoundsBottom}
              boltThickness={state.sparkBoltThickness}
              onSparkActive={handleSparkActive}
            />
          }
          ductTapeStrips={ductTapeStrips}
          respectDuctTape={respectDuctTape}
          onRemoveDuctTape={handleRemoveDuctTape}
          glowPointVersion={glowPointVersion}
        />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />
        )}
      </div>

      {sparkZonesOpen && (
        <SparkZonesTool
          sceneRef={sceneUnitRef}
          onClose={() => setSparkZonesOpen(false)}
          onZonesSaved={() => setZonesVersion((v) => v + 1)}
        />
      )}

      {ductTapePlacementMode && (
        <DuctTapeTool
          sceneRef={sceneRef}
          sceneOffsetX={state.sceneOffsetX}
          sceneOffsetY={state.sceneOffsetY}
          sceneScaleX={state.sceneScaleX}
          sceneScaleY={state.sceneScaleY}
          onAddStrip={handleAddDuctTapeStrip}
          onClose={() => setDuctTapePlacementMode(false)}
        />
      )}

      {devPanelOpen && (
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
            onClose: () => setDevPanelOpen(false),
            onOpenSparkZones: () => setSparkZonesOpen(true),
            onOpenGlowPoint,
            ductTapeStrips,
            onAddDuctTape: () => setDuctTapePlacementMode(true),
            onRemoveDuctTape: handleRemoveDuctTape,
            onClearAllDuctTape: handleClearAllDuctTape,
            respectDuctTape,
            onRespectDuctTapeChange: handleRespectDuctTapeChange,
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
