import React, { useState } from 'react';
import SliderRow from './SliderRow';
import { PANE_LAYOUT_LOCKED_KEY, SHOULDERS_HANDS_LOCKED_KEY, BODY_PANEL_LOCKED_KEY } from './loginScreenConfig';

const COLLAPSE_ARROW_STYLE = { fontSize: 14, color: 'var(--accent)', opacity: 0.8 };
function CollapseArrow({ collapsed }) {
  return <span style={COLLAPSE_ARROW_STYLE}>{collapsed ? '\u25B6' : '\u25BC'}</span>;
}

export default function LoginDevPanel({
  layersLocked,
  onUnlockLayers,
  onLockLayers,
  onSave,
  onResetToSaved,
  onResetToPrimaryDefaults,
  onUndo,
  canUndo,
  onBeforeSliderChange,
  onClose,
  onOpenSparkZones,
  onOpenGlowPoint,
  ductTapeStrips = [],
  onAddDuctTape,
  onRemoveDuctTape,
  onClearAllDuctTape,
  respectDuctTape = true,
  onRespectDuctTapeChange,
  appBackgroundBrightness,
  onAppBackgroundBrightnessChange,
  sceneScaleX,
  sceneScaleY,
  setSceneScaleX,
  setSceneScaleY,
  sceneOffsetX,
  sceneOffsetY,
  setSceneOffsetX,
  setSceneOffsetY,
  robotScaleX,
  robotScaleY,
  setRobotScaleX,
  setRobotScaleY,
  robotOffsetX,
  robotOffsetY,
  setRobotOffsetX,
  setRobotOffsetY,
  loginBoxWidth,
  loginBoxHeight,
  setLoginBoxWidth,
  setLoginBoxHeight,
  leftCushion,
  topCushion,
  setLeftCushion,
  setTopCushion,
  aspectLock,
  setAspectLock,
  scaleX,
  scaleY,
  setScaleXLocked,
  setScaleYLocked,
  backScaleX,
  backScaleY,
  setBackScaleX,
  setBackScaleY,
  backOffsetX,
  backOffsetY,
  setBackOffsetX,
  setBackOffsetY,
  appBackgroundSharpness,
  onAppBackgroundSharpnessChange,
  panelBorderBrightness,
  setPanelBorderBrightness,
  loginBrightness,
  setLoginBrightness,
  loginShadeOfGray,
  setLoginShadeOfGray,
  loginLightToBlack,
  setLoginLightToBlack,
  sparkBoundsTop,
  sparkBoundsBottom,
  setSparkBoundsTop,
  setSparkBoundsBottom,
  sparkBoltThickness,
  setSparkBoltThickness,
  titleOffsetX,
  titleOffsetY,
  titleScale,
  setTitleOffsetX,
  setTitleOffsetY,
  setTitleScale,
  subtitleOffsetX,
  subtitleOffsetY,
  subtitleScale,
  setSubtitleOffsetX,
  setSubtitleOffsetY,
  setSubtitleScale,
  inputWidthScale,
  setInputWidthScale,
  titleTopGap,
  setTitleTopGap,
  titleToSubtitleGap,
  setTitleToSubtitleGap,
  subtitleToUsernameGap,
  setSubtitleToUsernameGap,
  usernamePasswordGap,
  setUsernamePasswordGap,
  passwordToSubmitGap,
  setPasswordToSubmitGap,
  submitToButtonsGap,
  setSubmitToButtonsGap,
  controlHeightScale,
  setControlHeightScale,
  buttonsBottomGap,
  setButtonsBottomGap,
  panelContentOffsetX,
  setPanelContentOffsetX,
  panelRightMargin,
  setPanelRightMargin,
  handLeftScaleX,
  handLeftScaleY,
  handLeftOffsetX,
  handLeftOffsetY,
  handRightScaleX,
  handRightScaleY,
  handRightOffsetX,
  handRightOffsetY,
  setHandLeftScaleX,
  setHandLeftScaleY,
  setHandLeftOffsetX,
  setHandLeftOffsetY,
  setHandRightScaleX,
  setHandRightScaleY,
  setHandRightOffsetX,
  setHandRightOffsetY,
  shoulderScaleX,
  shoulderScaleY,
  shoulderOffsetX,
  shoulderOffsetY,
  setShoulderScaleX,
  setShoulderScaleY,
  setShoulderOffsetX,
  setShoulderOffsetY,
  showLayerBackground,
  showLayerWankrBody,
  showLayerLogin,
  showLayerHands,
  setShowLayerBackground,
  setShowLayerWankrBody,
  setShowLayerLogin,
  setShowLayerHands,
  characterSharpness,
  setCharacterSharpness,
}) {
  const w = (setter) => (v) => { onBeforeSliderChange?.(); setter(v); };
  const [paneLayoutCollapsed, setPaneLayoutCollapsed] = useState(false);
  const [paneLayoutLocked, setPaneLayoutLocked] = useState(() => {
    try { return localStorage.getItem(PANE_LAYOUT_LOCKED_KEY) === 'true'; } catch { return false; }
  });
  const [bodyPanelCollapsed, setBodyPanelCollapsed] = useState(false);
  const [bodyPanelLocked, setBodyPanelLocked] = useState(() => {
    try { return localStorage.getItem(BODY_PANEL_LOCKED_KEY) === 'true'; } catch { return false; }
  });
  const paneDisabled = layersLocked || paneLayoutLocked || bodyPanelLocked;
  const [shouldersHandsCollapsed, setShouldersHandsCollapsed] = useState(false);
  const [shouldersHandsLocked, setShouldersHandsLocked] = useState(() => {
    try { return localStorage.getItem(SHOULDERS_HANDS_LOCKED_KEY) === 'true'; } catch { return false; }
  });
  const shouldersHandsDisabled = layersLocked || shouldersHandsLocked || bodyPanelLocked;

  const setPaneLayoutLockedPersist = (valueOrUpdater) => {
    setPaneLayoutLocked((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      try { localStorage.setItem(PANE_LAYOUT_LOCKED_KEY, next ? 'true' : 'false'); } catch { /* ignore */ }
      return next;
    });
  };
  const setShouldersHandsLockedPersist = (valueOrUpdater) => {
    setShouldersHandsLocked((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      try { localStorage.setItem(SHOULDERS_HANDS_LOCKED_KEY, next ? 'true' : 'false'); } catch { /* ignore */ }
      return next;
    });
  };
  const setBodyPanelLockedPersist = (valueOrUpdater) => {
    setBodyPanelLocked((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      try { localStorage.setItem(BODY_PANEL_LOCKED_KEY, next ? 'true' : 'false'); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div
      style={{
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', flex: 1, letterSpacing: '1px' }}>DEV PANEL</span>
        <button
          type="button"
          onClick={layersLocked ? onUnlockLayers : onLockLayers}
          title={layersLocked ? 'Unlock to modify layers (requires confirmation)' : 'Lock layers'}
          style={{
            background: layersLocked ? 'rgba(255,180,0,0.2)' : 'rgba(0,255,65,0.2)',
            border: `1px solid ${layersLocked ? 'rgba(255,180,0,0.6)' : 'var(--accent)'}`,
            borderRadius: 4,
            color: layersLocked ? '#ffb400' : 'var(--accent)',
            padding: '4px 8px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          {layersLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
        </button>
        <button
          type="button"
          onClick={onSave}
          style={{
            background: 'rgba(0,255,65,0.2)',
            border: '1px solid var(--accent)',
            borderRadius: 4,
            color: 'var(--accent)',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          SAVE AS DEFAULT
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last slider change"
          style={{
            background: canUndo ? 'rgba(0,255,65,0.2)' : 'rgba(100,100,100,0.2)',
            border: `1px solid ${canUndo ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 4,
            color: canUndo ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
            padding: '4px 8px',
            fontSize: 11,
            cursor: canUndo ? 'pointer' : 'default',
          }}
        >
          UNDO
        </button>
        <button
          type="button"
          onClick={onResetToSaved}
          title="Restore values from last save (Ctrl+Shift+R works from login screen)"
          style={{
            background: 'rgba(100,100,100,0.3)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.9)',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          RESET TO SAVED
        </button>
        <button
          type="button"
          onClick={onResetToPrimaryDefaults}
          title="Revert to code primary defaults and save"
          style={{
            background: 'rgba(255,180,0,0.2)',
            border: '1px solid rgba(255,180,0,0.6)',
            borderRadius: 4,
            color: '#ffb400',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          RESET TO PRIMARY DEFAULTS
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,100,100,0.5)',
            borderRadius: 4,
            color: '#ff6b6b',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
      </div>

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Layer visibility</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {[
          { key: 'bg', label: 'background', show: showLayerBackground, set: setShowLayerBackground },
          { key: 'body', label: 'wankr_body', show: showLayerWankrBody, set: setShowLayerWankrBody },
          { key: 'login', label: 'login', show: showLayerLogin, set: setShowLayerLogin },
          { key: 'hands', label: 'hands', show: showLayerHands, set: setShowLayerHands },
        ].map(({ key, label, show, set }) => (
          <button
            key={key}
            type="button"
            onClick={() => { onBeforeSliderChange?.(); set(!show); }}
            style={{
              padding: '4px 8px',
              fontSize: 10,
              background: show ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
              border: `1px solid ${show ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 4,
              color: show ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
            }}
          >
            {show ? '✓' : '○'} {label}
          </button>
        ))}
      </div>

      {/* ========== SIZING & POSITIONING ========== */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Sizing & Positioning</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Scene (all)</span>
      </div>
      <SliderRow label="Scene scale X (%)" min={1} max={600} value={sceneScaleX} onChange={w(setSceneScaleX)} disabled={layersLocked} />
      <SliderRow label="Scene scale Y (%)" min={1} max={600} value={sceneScaleY} onChange={w(setSceneScaleY)} disabled={layersLocked} />
      <SliderRow label="Scene offset X (%)" min={-150} max={150} step={0.5} value={sceneOffsetX} onChange={w(setSceneOffsetX)} disabled={layersLocked} />
      <SliderRow label="Scene offset Y (%)" min={-100} max={100} step={0.5} value={sceneOffsetY} onChange={w(setSceneOffsetY)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Robot (arms + hands)</span>
      </div>
      <SliderRow label="Robot scale X (%)" min={1} max={600} value={robotScaleX} onChange={w(setRobotScaleX)} disabled={layersLocked} />
      <SliderRow label="Robot scale Y (%)" min={1} max={600} value={robotScaleY} onChange={w(setRobotScaleY)} disabled={layersLocked} />
      <SliderRow label="Robot offset X (%)" min={-150} max={150} step={0.5} value={robotOffsetX} onChange={w(setRobotOffsetX)} disabled={layersLocked} />
      <SliderRow label="Robot offset Y (%)" min={-100} max={100} step={0.5} value={robotOffsetY} onChange={w(setRobotOffsetY)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Body (2ndFromBack)</span>
      </div>
      <SliderRow label="Body scale X (%)" min={1} max={600} value={backScaleX} onChange={w(setBackScaleX)} disabled={layersLocked} />
      <SliderRow label="Body scale Y (%)" min={1} max={600} value={backScaleY} onChange={w(setBackScaleY)} disabled={layersLocked} />
      <SliderRow label="Body offset X (%)" min={-150} max={150} step={0.5} value={backOffsetX} onChange={w(setBackOffsetX)} disabled={layersLocked} />
      <SliderRow label="Body offset Y (%)" min={-100} max={100} step={0.5} value={backOffsetY} onChange={w(setBackOffsetY)} disabled={layersLocked} />

      {/* ========== BODY & PANEL (master collapsible: shoulders, hands, login pane) ========== */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '4px 0',
            marginBottom: bodyPanelCollapsed ? 0 : 4,
          }}
          onClick={() => setBodyPanelCollapsed((c) => !c)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBodyPanelCollapsed((c) => !c); } }}
          aria-expanded={!bodyPanelCollapsed}
        >
          <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', flex: 1 }}>Body & panel</span>
          <button
            type="button"
            title={bodyPanelLocked ? 'Unlock: allow editing body and panel sliders' : 'Lock: disable all body components and login panel'}
            onClick={(e) => { e.stopPropagation(); onBeforeSliderChange?.(); setBodyPanelLockedPersist((l) => !l); }}
            style={{
              padding: '2px 6px',
              fontSize: 10,
              background: bodyPanelLocked ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
              border: `1px solid ${bodyPanelLocked ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 4,
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            {bodyPanelLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
          <CollapseArrow collapsed={bodyPanelCollapsed} />
        </div>
        {bodyPanelLocked && !bodyPanelCollapsed && (
          <div style={{ fontSize: 10, color: 'rgba(0,255,65,0.85)', marginBottom: 6 }}>
            All body components and login panel sliders are locked.
          </div>
        )}
        {!bodyPanelCollapsed && (
          <>
      {/* ========== SHOULDERS & HANDS (collapsible + lock) ========== */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '4px 0',
            marginBottom: shouldersHandsCollapsed ? 0 : 4,
          }}
          onClick={() => setShouldersHandsCollapsed((c) => !c)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShouldersHandsCollapsed((c) => !c); } }}
          aria-expanded={!shouldersHandsCollapsed}
        >
          <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', flex: 1 }}>Shoulders & hands</span>
          <button
            type="button"
            title={shouldersHandsLocked ? 'Unlock: allow editing shoulder and hand sliders' : 'Lock: disable editing'}
            onClick={(e) => { e.stopPropagation(); onBeforeSliderChange?.(); setShouldersHandsLockedPersist((l) => !l); }}
            style={{
              padding: '2px 6px',
              fontSize: 10,
              background: shouldersHandsLocked ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
              border: `1px solid ${shouldersHandsLocked ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 4,
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            {shouldersHandsLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
          <CollapseArrow collapsed={shouldersHandsCollapsed} />
        </div>
        {!shouldersHandsCollapsed && (
          <>
            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Arm / Shoulder (1BehindLoginPanel)</span>
            </div>
            <SliderRow label="Shoulder scale X (%)" min={1} max={600} value={shoulderScaleX} onChange={w(setShoulderScaleX)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Shoulder scale Y (%)" min={1} max={600} value={shoulderScaleY} onChange={w(setShoulderScaleY)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Shoulder offset X (%)" min={-150} max={150} step={0.5} value={shoulderOffsetX} onChange={w(setShoulderOffsetX)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Shoulder offset Y (%)" min={-100} max={100} step={0.5} value={shoulderOffsetY} onChange={w(setShoulderOffsetY)} disabled={shouldersHandsDisabled} />

            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Hand left (toplayer_hand_layer_Left)</span>
            </div>
            <SliderRow label="Hand left scale X (%)" min={1} max={500} value={handLeftScaleX} onChange={w(setHandLeftScaleX)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Hand left scale Y (%)" min={1} max={500} value={handLeftScaleY} onChange={w(setHandLeftScaleY)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Hand left offset X (%)" min={-150} max={150} step={0.5} value={handLeftOffsetX} onChange={w(setHandLeftOffsetX)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Hand left offset Y (%)" min={-100} max={100} step={0.5} value={handLeftOffsetY} onChange={w(setHandLeftOffsetY)} disabled={shouldersHandsDisabled} />

            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Hand right (topelayer)</span>
            </div>
            <SliderRow label="Hand right scale X (%)" min={1} max={500} value={handRightScaleX} onChange={w(setHandRightScaleX)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Hand right scale Y (%)" min={1} max={500} value={handRightScaleY} onChange={w(setHandRightScaleY)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Hand right offset X (%)" min={-150} max={150} step={0.5} value={handRightOffsetX} onChange={w(setHandRightOffsetX)} disabled={shouldersHandsDisabled} />
            <SliderRow label="Hand right offset Y (%)" min={-100} max={100} step={0.5} value={handRightOffsetY} onChange={w(setHandRightOffsetY)} disabled={shouldersHandsDisabled} />
          </>
        )}
      </div>

      {/* ========== LOGIN PANE (collapsible, lock = proportional scale with panel) ========== */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '4px 0',
            marginBottom: paneLayoutCollapsed ? 0 : 4,
          }}
          onClick={() => setPaneLayoutCollapsed((c) => !c)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPaneLayoutCollapsed((c) => !c); } }}
          aria-expanded={!paneLayoutCollapsed}
        >
          <span style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', flex: 1 }}>Login pane</span>
          <button
            type="button"
            title={paneLayoutLocked ? 'Unlock: allow editing layout sliders' : 'Lock: contents scale with panel size only'}
            onClick={(e) => { e.stopPropagation(); onBeforeSliderChange?.(); setPaneLayoutLockedPersist((l) => !l); }}
            style={{
              padding: '2px 6px',
              fontSize: 10,
              background: paneLayoutLocked ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
              border: `1px solid ${paneLayoutLocked ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 4,
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            {paneLayoutLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
          <CollapseArrow collapsed={paneLayoutCollapsed} />
        </div>
        {paneLayoutLocked && (
          <div style={{ fontSize: 10, color: 'rgba(0,255,65,0.85)', marginBottom: 6 }}>
            Contents scale with panel size. Resize panel to scale.
          </div>
        )}
        {!paneLayoutCollapsed && (
          <>
            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Login Box</span>
            </div>
            <SliderRow label="Login box width (%)" min={20} max={400} step={0.25} value={loginBoxWidth} onChange={w(setLoginBoxWidth)} disabled={paneDisabled} />
            <SliderRow label="Login box height (%)" min={20} max={400} step={0.25} value={loginBoxHeight} onChange={w(setLoginBoxHeight)} disabled={paneDisabled} />
            <SliderRow label="Login box left offset (%)" min={-80} max={150} step={0.25} value={leftCushion} onChange={w(setLeftCushion)} disabled={paneDisabled} />
            <SliderRow label="Login box top offset (%)" min={-80} max={150} step={0.25} value={topCushion} onChange={w(setTopCushion)} disabled={paneDisabled} />
            <SliderRow label="Panel content offset X (%)" min={-40} max={40} step={0.25} value={panelContentOffsetX} onChange={w(setPanelContentOffsetX)} disabled={paneDisabled} />
            <SliderRow label="Panel right margin (%)" min={0} max={300} step={0.25} value={panelRightMargin} onChange={w(setPanelRightMargin)} disabled={paneDisabled} />

            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>WANKR BOT (title)</span>
            </div>
            <SliderRow label="Title offset X (%)" min={-80} max={80} step={0.5} value={titleOffsetX} onChange={w(setTitleOffsetX)} disabled={paneDisabled} />
            <SliderRow label="Title offset Y (%)" min={-80} max={80} step={0.5} value={titleOffsetY} onChange={w(setTitleOffsetY)} disabled={paneDisabled} />
            <SliderRow label="Title size (%)" min={5} max={500} value={titleScale} onChange={w(setTitleScale)} disabled={paneDisabled} />

            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>DEGEN LOGIN (subtitle)</span>
            </div>
            <SliderRow label="Subtitle offset X (%)" min={-150} max={150} step={0.5} value={subtitleOffsetX} onChange={w(setSubtitleOffsetX)} disabled={paneDisabled} />
            <SliderRow label="Subtitle offset Y (%)" min={-150} max={150} step={0.5} value={subtitleOffsetY} onChange={w(setSubtitleOffsetY)} disabled={paneDisabled} />
            <SliderRow label="Subtitle size (%)" min={5} max={1000} value={subtitleScale} onChange={w(setSubtitleScale)} disabled={paneDisabled} />

            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Panel layout (gaps in cqi)</span>
            </div>
            <SliderRow label="Title from panel top (cqi)" min={-10} max={15} step={0.1} value={titleTopGap} onChange={w(setTitleTopGap)} disabled={paneDisabled} />
            <SliderRow label="Title → subtitle gap (cqi)" min={0} max={15} step={0.1} value={titleToSubtitleGap} onChange={w(setTitleToSubtitleGap)} disabled={paneDisabled} />
            <SliderRow label="Subtitle → username gap (cqi)" min={0} max={5} step={0.1} value={subtitleToUsernameGap} onChange={w(setSubtitleToUsernameGap)} disabled={paneDisabled} />
            <SliderRow label="Username ↔ password gap (cqi)" min={0} max={5} step={0.1} value={usernamePasswordGap} onChange={w(setUsernamePasswordGap)} disabled={paneDisabled} />
            <SliderRow label="Password → submit gap (cqi)" min={0} max={5} step={0.1} value={passwordToSubmitGap} onChange={w(setPasswordToSubmitGap)} disabled={paneDisabled} />
            <SliderRow label="Submit → buttons gap (cqi)" min={0} max={5} step={0.1} value={submitToButtonsGap} onChange={w(setSubmitToButtonsGap)} disabled={paneDisabled} />
            <SliderRow label="Control height (%)" min={20} max={500} value={controlHeightScale} onChange={w(setControlHeightScale)} disabled={paneDisabled} />
            <SliderRow label="Input width (%)" min={25} max={100} value={inputWidthScale} onChange={w(setInputWidthScale)} disabled={paneDisabled} />
            <SliderRow label="Buttons ↔ panel bottom (min 20px)" min={0} max={300} value={buttonsBottomGap} onChange={w(setButtonsBottomGap)} disabled={paneDisabled} />

            <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7, flex: 1 }}>Login panel scale</span>
                <button
                  type="button"
                  disabled={paneDisabled}
                  onClick={() => {
                    if (paneDisabled) return;
                    setAspectLock((prev) => {
                      if (!prev) setScaleYLocked(scaleX);
                      return !prev;
                    });
                  }}
                  title={aspectLock ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  style={{
                    padding: '2px 6px',
                    fontSize: 10,
                    background: aspectLock ? 'rgba(0,255,65,0.2)' : 'rgba(100,100,100,0.3)',
                    border: `1px solid ${aspectLock ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
                    borderRadius: 4,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  {aspectLock ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
            <SliderRow label="Panel scale X (%)" min={1} max={600} value={scaleX} onChange={w(setScaleXLocked)} disabled={paneDisabled} />
            <SliderRow label="Panel scale Y (%)" min={1} max={600} value={scaleY} onChange={w(setScaleYLocked)} disabled={paneDisabled} />
          </>
        )}
      </div>

          </>
        )}
      </div>

      {/* ========== EFFECTS ========== */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Effects</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Appearance</span>
      </div>
      <SliderRow label="App background sharpness (%)" min={50} max={200} value={appBackgroundSharpness} onChange={(v) => { onBeforeSliderChange?.(); onAppBackgroundSharpnessChange?.(v); }} />
      <SliderRow label="Character sharpness (%)" min={50} max={200} value={characterSharpness} onChange={w(setCharacterSharpness)} />
      <SliderRow label="Panel border glow (%)" min={0} max={100} value={panelBorderBrightness} onChange={w(setPanelBorderBrightness)} />
      <SliderRow label="Panel darkness (%)" min={0} max={100} value={loginLightToBlack} onChange={w(setLoginLightToBlack)} />
      <SliderRow label="Panel tint (%)" min={0} max={100} value={loginShadeOfGray} onChange={w(setLoginShadeOfGray)} />
      <SliderRow label="Panel brightness (%)" min={0} max={100} value={loginBrightness} onChange={w(setLoginBrightness)} />
      <SliderRow label="App background brightness (%)" min={0} max={100} value={appBackgroundBrightness} onChange={(v) => { onBeforeSliderChange?.(); onAppBackgroundBrightnessChange?.(v); }} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Sparks</span>
      </div>
      <SliderRow
        label="Sparks bounds top (%)"
        min={0}
        max={sparkBoundsBottom}
        value={sparkBoundsTop}
        onChange={(v) => { onBeforeSliderChange?.(); setSparkBoundsTop(Math.min(v, sparkBoundsBottom)); }}
        step={1}
      />
      <SliderRow
        label="Sparks bounds bottom (%)"
        min={sparkBoundsTop}
        max={100}
        value={sparkBoundsBottom}
        onChange={(v) => { onBeforeSliderChange?.(); setSparkBoundsBottom(Math.max(v, sparkBoundsTop)); }}
        step={1}
      />
      <SliderRow label="Spark bolt thickness (%)" min={20} max={200} value={sparkBoltThickness} onChange={w(setSparkBoltThickness)} step={5} />
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Duct tape</span>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
        Draw a line; every visible layer it touches is positionally and proportionally bound. With &quot;Respect&quot; on, scene and layers pivot around the tape.
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer', fontSize: 11 }}>
        <input
          type="checkbox"
          checked={respectDuctTape}
          onChange={(e) => onRespectDuctTapeChange?.(e.target.checked)}
        />
        <span style={{ color: 'var(--accent)' }}>Respect duct tape</span>
      </label>
      <button
        type="button"
        onClick={() => onAddDuctTape?.()}
        style={{
          marginTop: 0,
          padding: '8px 12px',
          fontSize: 11,
          background: 'rgba(255,180,0,0.15)',
          border: '1px solid rgba(255,180,0,0.7)',
          borderRadius: 6,
          color: '#ffb400',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Place duct tape
      </button>
      {ductTapeStrips.length > 0 && (
        <>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 10, color: 'rgba(255,255,255,0.8)', maxHeight: 80, overflowY: 'auto' }}>
            {ductTapeStrips.map((s) => (
              <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span>Line → ({(s.x2 * 100).toFixed(0)}%, {(s.y2 * 100).toFixed(0)}%)</span>
                <button
                  type="button"
                  onClick={() => onRemoveDuctTape?.(s.id)}
                  style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(255,80,80,0.3)', border: '1px solid rgba(255,80,80,0.6)', borderRadius: 4, color: '#ff6666', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onClearAllDuctTape?.()}
            style={{ marginTop: 6, padding: '4px 8px', fontSize: 10, background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.5)', borderRadius: 4, color: '#ff8888', cursor: 'pointer', width: '100%' }}
          >
            Clear all duct tape
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onOpenSparkZones}
        style={{
          marginTop: 4,
          padding: '8px 12px',
          fontSize: 11,
          background: 'rgba(0,255,65,0.15)',
          border: '1px solid var(--accent)',
          borderRadius: 6,
          color: 'var(--accent)',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Spark Zones
      </button>
      <button
        type="button"
        onClick={onOpenGlowPoint}
        style={{
          marginTop: 8,
          padding: '8px 12px',
          fontSize: 11,
          background: 'rgba(0,255,65,0.15)',
          border: '1px solid var(--accent)',
          borderRadius: 6,
          color: 'var(--accent)',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Glow Point
      </button>
      <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
}
