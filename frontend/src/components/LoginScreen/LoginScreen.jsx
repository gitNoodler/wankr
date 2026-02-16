import React, { useState, useEffect, useCallback } from 'react';
import ElectricitySparks from './ElectricitySparks';
import SparkZonesTool from './SparkZonesTool';
import SurfacePlaneTool from './SurfacePlaneTool';
import LoginForm from './LoginForm';
import LoginDevPanel from './LoginDevPanel';
import RobotScene from './RobotScene';
import { loadDevDefaults, saveDevDefaults, LAYERS_LOCKED_KEY } from './loginScreenConfig';
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
  const [surfacePlaneOpen, setSurfacePlaneOpen] = useState(false);
  const [zonesVersion, setZonesVersion] = useState(0);
  const [sparkActive, setSparkActive] = useState(false);
  const [layersLocked, setLayersLocked] = useState(() => {
    try {
      return localStorage.getItem(LAYERS_LOCKED_KEY) !== 'false';
    } catch { return true; }
  });
  const sceneRef = React.useRef(null);
  const sceneUnitRef = React.useRef(null);

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
    applySnapshot: state.applySnapshot,
  });
  const auth = useLoginScreenAuth({ onLogin });

  const handleUnlockLayers = useCallback(() => {
    if (!layersLocked) return;
    if (window.confirm('Modify layer positions and scaling? Changes will apply immediately. You can re-lock after saving.')) {
      setLayersLocked(false);
      try { localStorage.setItem(LAYERS_LOCKED_KEY, 'false'); } catch {}
    }
  }, [layersLocked]);

  const handleLockLayers = useCallback(() => {
    setLayersLocked(true);
    try { localStorage.setItem(LAYERS_LOCKED_KEY, 'true'); } catch {}
  }, []);

  const setScaleXLocked = useCallback((v) => {
    state.setScaleX(v);
    if (state.aspectLock) state.setScaleY(v);
  }, [state.aspectLock]);

  const setScaleYLocked = useCallback((v) => {
    state.setScaleY(v);
    if (state.aspectLock) state.setScaleX(v);
  }, [state.aspectLock]);

  const handleUsernameChange = useCallback((value) => {
    const shouldOpenDev = auth.handleUsernameChange(value);
    if (shouldOpenDev) setDevPanelOpen(true);
  }, [auth.handleUsernameChange]);

  const handleSaveDevDefaults = useCallback(() => {
    const valuesToSave = {
      meanBrightness: state.meanBrightness,
      appBackgroundBrightness,
      panelBorderBrightness: state.panelBorderBrightness,
      loginBrightness: state.loginBrightness,
      loginShadeOfGray: state.loginShadeOfGray,
      loginLightToBlack: state.loginLightToBlack,
      leftCushion: state.leftCushion,
      topCushion: state.topCushion,
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      aspectLock: state.aspectLock,
      backScaleX: state.backScaleX,
      backScaleY: state.backScaleY,
      backOffsetX: state.backOffsetX,
      backOffsetY: state.backOffsetY,
      backlayerSharpness: appBackgroundSharpness,
      sceneScaleX: state.sceneScaleX,
      sceneScaleY: state.sceneScaleY,
      sceneOffsetX: state.sceneOffsetX,
      sceneOffsetY: state.sceneOffsetY,
      robotScaleX: state.robotScaleX,
      robotScaleY: state.robotScaleY,
      robotOffsetX: state.robotOffsetX,
      robotOffsetY: state.robotOffsetY,
      shoulderScaleX: state.shoulderScaleX,
      shoulderScaleY: state.shoulderScaleY,
      shoulderOffsetX: state.shoulderOffsetX,
      shoulderOffsetY: state.shoulderOffsetY,
      handLeftScaleX: state.handLeftScaleX,
      handLeftScaleY: state.handLeftScaleY,
      handLeftOffsetX: state.handLeftOffsetX,
      handLeftOffsetY: state.handLeftOffsetY,
      handRightScaleX: state.handRightScaleX,
      handRightScaleY: state.handRightScaleY,
      handRightOffsetX: state.handRightOffsetX,
      handRightOffsetY: state.handRightOffsetY,
      loginBoxWidth: state.loginBoxWidth,
      loginBoxHeight: state.loginBoxHeight,
      titleOffsetX: state.titleOffsetX,
      titleOffsetY: state.titleOffsetY,
      titleScale: state.titleScale,
      subtitleOffsetX: state.subtitleOffsetX,
      subtitleOffsetY: state.subtitleOffsetY,
      subtitleScale: state.subtitleScale,
      formMarginTop: state.formMarginTop,
      inputHeightScale: state.inputHeightScale,
      inputWidthScale: state.inputWidthScale,
      formGap: state.formGap,
      submitMinHeightScale: state.submitMinHeightScale,
      bottomButtonsHeightScale: state.bottomButtonsHeightScale,
      buttonsVerticalGap: state.buttonsVerticalGap,
      buttonsBottomGap: state.buttonsBottomGap,
      panelContentOffsetX: state.panelContentOffsetX,
      panelRightMargin: state.panelRightMargin,
      sparkBoundsTop: state.sparkBoundsTop,
      sparkBoundsBottom: state.sparkBoundsBottom,
      sparkBoltThickness: state.sparkBoltThickness,
      showLayerBackground: state.showLayerBackground,
      showLayerWankrBody: state.showLayerWankrBody,
      showLayerLogin: state.showLayerLogin,
      showLayerHands: state.showLayerHands,
      characterSharpness: state.characterSharpness,
    };
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.jsx:handleSaveDevDefaults',message:'Saving dev defaults',data:valuesToSave,timestamp:Date.now(),hypothesisId:'SAVE'})}).catch(()=>{});
    // #endregion
    saveDevDefaults(valuesToSave);
    handleLockLayers();
  }, [
    state.meanBrightness, state.panelBorderBrightness, state.loginBrightness, state.loginShadeOfGray, state.loginLightToBlack,
    state.leftCushion, state.topCushion, state.scaleX, state.scaleY, state.aspectLock,
    state.backScaleX, state.backScaleY, state.backOffsetX, state.backOffsetY,
    state.sceneScaleX, state.sceneScaleY, state.sceneOffsetX, state.sceneOffsetY,
    state.robotScaleX, state.robotScaleY, state.robotOffsetX, state.robotOffsetY,
    state.shoulderScaleX, state.shoulderScaleY, state.shoulderOffsetX, state.shoulderOffsetY,
    state.handLeftScaleX, state.handLeftScaleY, state.handLeftOffsetX, state.handLeftOffsetY,
    state.handRightScaleX, state.handRightScaleY, state.handRightOffsetX, state.handRightOffsetY,
    state.loginBoxWidth, state.loginBoxHeight, state.titleOffsetX, state.titleOffsetY, state.titleScale,
    state.subtitleOffsetX, state.subtitleOffsetY, state.subtitleScale, state.formMarginTop,
    state.inputHeightScale, state.inputWidthScale, state.formGap, state.submitMinHeightScale,
    state.bottomButtonsHeightScale, state.buttonsVerticalGap, state.buttonsBottomGap,
    state.panelContentOffsetX, state.panelRightMargin,
    state.sparkBoundsTop, state.sparkBoundsBottom, state.sparkBoltThickness,
    state.showLayerBackground, state.showLayerWankrBody, state.showLayerLogin, state.showLayerHands,
    state.characterSharpness,
    appBackgroundBrightness, appBackgroundSharpness, handleLockLayers,
  ]);

  const panelBg = (() => {
    const lightToBlack = state.loginLightToBlack / 100;
    let base = 220 - lightToBlack * 200;
    base *= 0.5 + (state.loginBrightness / 100) * 0.5;
    base = Math.round(base);
    const t = state.loginShadeOfGray / 100;
    const r = Math.max(0, Math.min(255, Math.round(base - t * 8)));
    const g = Math.max(0, Math.min(255, Math.round(base + t * 8)));
    const b = Math.max(0, Math.min(255, Math.round(base - t * 4)));
    return `rgb(${r}, ${g}, ${b})`;
  })();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDevPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
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
              formMarginTop={state.formMarginTop}
              inputHeightScale={state.inputHeightScale}
              inputWidthScale={state.inputWidthScale}
              formGap={state.formGap}
              submitMinHeightScale={state.submitMinHeightScale}
              bottomButtonsHeightScale={state.bottomButtonsHeightScale}
              buttonsVerticalGap={state.buttonsVerticalGap}
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
          glowPointVersion={glowPointVersion}
        />
      </div>

      {sparkZonesOpen && (
        <SparkZonesTool
          sceneRef={sceneUnitRef}
          onClose={() => setSparkZonesOpen(false)}
          onZonesSaved={() => setZonesVersion((v) => v + 1)}
        />
      )}

      {surfacePlaneOpen && (
        <SurfacePlaneTool
          sceneRef={sceneUnitRef}
          onClose={() => setSurfacePlaneOpen(false)}
          onSave={() => console.log('Surface plane saved')}
        />
      )}

      {devPanelOpen && (
        <LoginDevPanel
          layersLocked={layersLocked}
          onUnlockLayers={handleUnlockLayers}
          onLockLayers={handleLockLayers}
          onSave={handleSaveDevDefaults}
          onResetToSaved={undo.handleResetToSaved}
          onUndo={undo.handleUndo}
          canUndo={undo.undoStackLength > 0}
          onBeforeSliderChange={undo.pushUndoHistory}
          onClose={() => setDevPanelOpen(false)}
          onOpenSparkZones={() => setSparkZonesOpen(true)}
          onOpenGlowPoint={onOpenGlowPoint}
          onOpenSurfacePlane={() => setSurfacePlaneOpen(true)}
          appBackgroundBrightness={appBackgroundBrightness}
          onAppBackgroundBrightnessChange={onAppBackgroundBrightnessChange}
          appBackgroundSharpness={appBackgroundSharpness}
          onAppBackgroundSharpnessChange={onAppBackgroundSharpnessChange}
          sceneScaleX={state.sceneScaleX}
          sceneScaleY={state.sceneScaleY}
          setSceneScaleX={state.setSceneScaleX}
          setSceneScaleY={state.setSceneScaleY}
          sceneOffsetX={state.sceneOffsetX}
          sceneOffsetY={state.sceneOffsetY}
          setSceneOffsetX={state.setSceneOffsetX}
          setSceneOffsetY={state.setSceneOffsetY}
          robotScaleX={state.robotScaleX}
          robotScaleY={state.robotScaleY}
          setRobotScaleX={state.setRobotScaleX}
          setRobotScaleY={state.setRobotScaleY}
          robotOffsetX={state.robotOffsetX}
          robotOffsetY={state.robotOffsetY}
          setRobotOffsetX={state.setRobotOffsetX}
          setRobotOffsetY={state.setRobotOffsetY}
          loginBoxWidth={state.loginBoxWidth}
          loginBoxHeight={state.loginBoxHeight}
          setLoginBoxWidth={state.setLoginBoxWidth}
          setLoginBoxHeight={state.setLoginBoxHeight}
          leftCushion={state.leftCushion}
          topCushion={state.topCushion}
          setLeftCushion={state.setLeftCushion}
          setTopCushion={state.setTopCushion}
          aspectLock={state.aspectLock}
          setAspectLock={state.setAspectLock}
          scaleX={state.scaleX}
          scaleY={state.scaleY}
          setScaleXLocked={setScaleXLocked}
          setScaleYLocked={setScaleYLocked}
          titleOffsetX={state.titleOffsetX}
          titleOffsetY={state.titleOffsetY}
          titleScale={state.titleScale}
          setTitleOffsetX={state.setTitleOffsetX}
          setTitleOffsetY={state.setTitleOffsetY}
          setTitleScale={state.setTitleScale}
          subtitleOffsetX={state.subtitleOffsetX}
          subtitleOffsetY={state.subtitleOffsetY}
          subtitleScale={state.subtitleScale}
          setSubtitleOffsetX={state.setSubtitleOffsetX}
          setSubtitleOffsetY={state.setSubtitleOffsetY}
          setSubtitleScale={state.setSubtitleScale}
          formMarginTop={state.formMarginTop}
          inputHeightScale={state.inputHeightScale}
          formGap={state.formGap}
          submitMinHeightScale={state.submitMinHeightScale}
          bottomButtonsHeightScale={state.bottomButtonsHeightScale}
          setFormMarginTop={state.setFormMarginTop}
          setInputHeightScale={state.setInputHeightScale}
          inputWidthScale={state.inputWidthScale}
          setInputWidthScale={state.setInputWidthScale}
          setFormGap={state.setFormGap}
          setSubmitMinHeightScale={state.setSubmitMinHeightScale}
          setBottomButtonsHeightScale={state.setBottomButtonsHeightScale}
          buttonsVerticalGap={state.buttonsVerticalGap}
          setButtonsVerticalGap={state.setButtonsVerticalGap}
          buttonsBottomGap={state.buttonsBottomGap}
          setButtonsBottomGap={state.setButtonsBottomGap}
          panelContentOffsetX={state.panelContentOffsetX}
          setPanelContentOffsetX={state.setPanelContentOffsetX}
          panelRightMargin={state.panelRightMargin}
          setPanelRightMargin={state.setPanelRightMargin}
          handLeftScaleX={state.handLeftScaleX}
          handLeftScaleY={state.handLeftScaleY}
          handLeftOffsetX={state.handLeftOffsetX}
          handLeftOffsetY={state.handLeftOffsetY}
          handRightScaleX={state.handRightScaleX}
          handRightScaleY={state.handRightScaleY}
          handRightOffsetX={state.handRightOffsetX}
          handRightOffsetY={state.handRightOffsetY}
          setHandLeftScaleX={state.setHandLeftScaleX}
          setHandLeftScaleY={state.setHandLeftScaleY}
          setHandLeftOffsetX={state.setHandLeftOffsetX}
          setHandLeftOffsetY={state.setHandLeftOffsetY}
          setHandRightScaleX={state.setHandRightScaleX}
          setHandRightScaleY={state.setHandRightScaleY}
          setHandRightOffsetX={state.setHandRightOffsetX}
          setHandRightOffsetY={state.setHandRightOffsetY}
          shoulderScaleX={state.shoulderScaleX}
          shoulderScaleY={state.shoulderScaleY}
          shoulderOffsetX={state.shoulderOffsetX}
          shoulderOffsetY={state.shoulderOffsetY}
          setShoulderScaleX={state.setShoulderScaleX}
          setShoulderScaleY={state.setShoulderScaleY}
          setShoulderOffsetX={state.setShoulderOffsetX}
          setShoulderOffsetY={state.setShoulderOffsetY}
          backScaleX={state.backScaleX}
          backScaleY={state.backScaleY}
          setBackScaleX={state.setBackScaleX}
          setBackScaleY={state.setBackScaleY}
          backOffsetX={state.backOffsetX}
          backOffsetY={state.backOffsetY}
          setBackOffsetX={state.setBackOffsetX}
          setBackOffsetY={state.setBackOffsetY}
          panelBorderBrightness={state.panelBorderBrightness}
          setPanelBorderBrightness={state.setPanelBorderBrightness}
          loginBrightness={state.loginBrightness}
          setLoginBrightness={state.setLoginBrightness}
          loginShadeOfGray={state.loginShadeOfGray}
          setLoginShadeOfGray={state.setLoginShadeOfGray}
          loginLightToBlack={state.loginLightToBlack}
          setLoginLightToBlack={state.setLoginLightToBlack}
          sparkBoundsTop={state.sparkBoundsTop}
          sparkBoundsBottom={state.sparkBoundsBottom}
          setSparkBoundsTop={state.setSparkBoundsTop}
          setSparkBoundsBottom={state.setSparkBoundsBottom}
          sparkBoltThickness={state.sparkBoltThickness}
          setSparkBoltThickness={state.setSparkBoltThickness}
          showLayerBackground={state.showLayerBackground}
          showLayerWankrBody={state.showLayerWankrBody}
          showLayerLogin={state.showLayerLogin}
          showLayerHands={state.showLayerHands}
          setShowLayerBackground={state.setShowLayerBackground}
          setShowLayerWankrBody={state.setShowLayerWankrBody}
          setShowLayerLogin={state.setShowLayerLogin}
          setShowLayerHands={state.setShowLayerHands}
          characterSharpness={state.characterSharpness}
          setCharacterSharpness={state.setCharacterSharpness}
        />
      )}
    </div>
  );
}
