import React from 'react';
import SliderRow from './SliderRow';

export default function LoginDevPanel({
  layersLocked,
  onUnlockLayers,
  onLockLayers,
  onSave,
  onResetToSaved,
  onUndo,
  canUndo,
  onBeforeSliderChange,
  onClose,
  onOpenSparkZones,
  onOpenGlowPoint,
  onOpenSurfacePlane,
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
  formMarginTop,
  inputHeightScale,
  inputWidthScale,
  setInputWidthScale,
  formGap,
  submitMinHeightScale,
  bottomButtonsHeightScale,
  setFormMarginTop,
  setInputHeightScale,
  setFormGap,
  setSubmitMinHeightScale,
  setBottomButtonsHeightScale,
  buttonsVerticalGap,
  setButtonsVerticalGap,
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
          title="Restore values from saved defaults"
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

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Arm / Shoulder (1BehindLoginPanel)</span>
      </div>
      <SliderRow label="Shoulder scale X (%)" min={1} max={600} value={shoulderScaleX} onChange={w(setShoulderScaleX)} disabled={layersLocked} />
      <SliderRow label="Shoulder scale Y (%)" min={1} max={600} value={shoulderScaleY} onChange={w(setShoulderScaleY)} disabled={layersLocked} />
      <SliderRow label="Shoulder offset X (%)" min={-150} max={150} step={0.5} value={shoulderOffsetX} onChange={w(setShoulderOffsetX)} disabled={layersLocked} />
      <SliderRow label="Shoulder offset Y (%)" min={-100} max={100} step={0.5} value={shoulderOffsetY} onChange={w(setShoulderOffsetY)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Login Box</span>
      </div>
      <SliderRow label="Login box width (%)" min={20} max={400} step={0.25} value={loginBoxWidth} onChange={w(setLoginBoxWidth)} disabled={layersLocked} />
      <SliderRow label="Login box height (%)" min={20} max={400} step={0.25} value={loginBoxHeight} onChange={w(setLoginBoxHeight)} disabled={layersLocked} />
      <SliderRow label="Login box left offset (%)" min={-80} max={150} step={0.25} value={leftCushion} onChange={w(setLeftCushion)} disabled={layersLocked} />
      <SliderRow label="Login box top offset (%)" min={-80} max={150} step={0.25} value={topCushion} onChange={w(setTopCushion)} disabled={layersLocked} />
      <SliderRow label="Panel content offset X (%)" min={-40} max={40} step={0.25} value={panelContentOffsetX} onChange={w(setPanelContentOffsetX)} disabled={layersLocked} />
      <SliderRow label="Panel right margin (%)" min={0} max={300} step={0.25} value={panelRightMargin} onChange={w(setPanelRightMargin)} disabled={layersLocked} />

      {/* ========== FINETUNING ========== */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Finetuning</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>WANKR BOT (title)</span>
      </div>
      <SliderRow label="Title offset X (%)" min={-80} max={80} step={0.5} value={titleOffsetX} onChange={w(setTitleOffsetX)} disabled={layersLocked} />
      <SliderRow label="Title offset Y (%)" min={-80} max={80} step={0.5} value={titleOffsetY} onChange={w(setTitleOffsetY)} disabled={layersLocked} />
      <SliderRow label="Title size (%)" min={5} max={500} value={titleScale} onChange={w(setTitleScale)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>DEGEN LOGIN (subtitle)</span>
      </div>
      <SliderRow label="Subtitle offset X (%)" min={-80} max={80} step={0.5} value={subtitleOffsetX} onChange={w(setSubtitleOffsetX)} disabled={layersLocked} />
      <SliderRow label="Subtitle offset Y (%)" min={-80} max={80} step={0.5} value={subtitleOffsetY} onChange={w(setSubtitleOffsetY)} disabled={layersLocked} />
      <SliderRow label="Subtitle size (%)" min={5} max={500} value={subtitleScale} onChange={w(setSubtitleScale)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Input fields & buttons</span>
      </div>
      <SliderRow label="Form margin top (px)" min={-150} max={200} step={1} value={formMarginTop} onChange={w(setFormMarginTop)} disabled={layersLocked} />
      <SliderRow label="Input height (%)" min={20} max={500} value={inputHeightScale} onChange={w(setInputHeightScale)} disabled={layersLocked} />
      <SliderRow label="Input width (%)" min={25} max={100} value={inputWidthScale} onChange={w(setInputWidthScale)} disabled={layersLocked} />
      <SliderRow label="Form gap (%)" min={5} max={500} value={formGap} onChange={w(setFormGap)} disabled={layersLocked} />
      <SliderRow label="Submit button height (%)" min={20} max={500} value={submitMinHeightScale} onChange={w(setSubmitMinHeightScale)} disabled={layersLocked} />
      <SliderRow label="New User/Spectate height (%)" min={20} max={500} value={bottomButtonsHeightScale} onChange={w(setBottomButtonsHeightScale)} disabled={layersLocked} />
      <SliderRow label="Submit ↔ buttons gap (%)" min={0} max={300} value={buttonsVerticalGap} onChange={w(setButtonsVerticalGap)} disabled={layersLocked} />
      <SliderRow label="Buttons ↔ panel bottom (%)" min={0} max={300} value={buttonsBottomGap} onChange={w(setButtonsBottomGap)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Hand left (toplayer_hand_layer_Left)</span>
      </div>
      <SliderRow label="Hand left scale X (%)" min={1} max={500} value={handLeftScaleX} onChange={w(setHandLeftScaleX)} disabled={layersLocked} />
      <SliderRow label="Hand left scale Y (%)" min={1} max={500} value={handLeftScaleY} onChange={w(setHandLeftScaleY)} disabled={layersLocked} />
      <SliderRow label="Hand left offset X (%)" min={-150} max={150} step={0.5} value={handLeftOffsetX} onChange={w(setHandLeftOffsetX)} disabled={layersLocked} />
      <SliderRow label="Hand left offset Y (%)" min={-100} max={100} step={0.5} value={handLeftOffsetY} onChange={w(setHandLeftOffsetY)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>Hand right (topelayer)</span>
      </div>
      <SliderRow label="Hand right scale X (%)" min={1} max={500} value={handRightScaleX} onChange={w(setHandRightScaleX)} disabled={layersLocked} />
      <SliderRow label="Hand right scale Y (%)" min={1} max={500} value={handRightScaleY} onChange={w(setHandRightScaleY)} disabled={layersLocked} />
      <SliderRow label="Hand right offset X (%)" min={-150} max={150} step={0.5} value={handRightOffsetX} onChange={w(setHandRightOffsetX)} disabled={layersLocked} />
      <SliderRow label="Hand right offset Y (%)" min={-100} max={100} step={0.5} value={handRightOffsetY} onChange={w(setHandRightOffsetY)} disabled={layersLocked} />

      <div style={{ borderTop: '1px solid rgba(0,255,65,0.2)', paddingTop: 6, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7, flex: 1 }}>Login panel scale</span>
          <button
            type="button"
            disabled={layersLocked}
            onClick={() => {
              if (layersLocked) return;
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
      <SliderRow label="Panel scale X (%)" min={1} max={600} value={scaleX} onChange={w(setScaleXLocked)} disabled={layersLocked} />
      <SliderRow label="Panel scale Y (%)" min={1} max={600} value={scaleY} onChange={w(setScaleYLocked)} disabled={layersLocked} />

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
      <button
        type="button"
        onClick={onOpenSurfacePlane}
        style={{
          marginTop: 8,
          padding: '8px 12px',
          fontSize: 11,
          background: 'rgba(0,200,255,0.15)',
          border: '1px solid rgba(0,200,255,0.6)',
          borderRadius: 6,
          color: '#00ccff',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Surface Plane (10 pts)
      </button>
      <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
}
