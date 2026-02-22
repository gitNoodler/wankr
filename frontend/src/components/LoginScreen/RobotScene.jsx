import React, { useRef, useState, useEffect } from 'react';
import { CANVAS, PANEL_BBOX_PCT } from './loginScreenConfig';
import backgroundImg from '@mascot/dashLayers/background.png';
import wankrHomeImg from '@mascot/dashLayers/wankrHome.png';
import Boombox from './Boombox';
import MusicNotes from './MusicNotes';
import FloorGlowRipples from './FloorGlowRipples';

export default function RobotScene({
  sceneRef,
  sceneUnitRef,
  sceneOffsetX,
  sceneOffsetY,
  sceneScaleX,
  sceneScaleY,
  backOffsetX,
  backOffsetY,
  backScaleX,
  backScaleY,
  showLayerBackground: _showLayerBackground = true, // eslint-disable-line no-unused-vars
  showLayerWankrBody = true,
  showLayerLogin: _showLayerLogin = true, // eslint-disable-line no-unused-vars
  characterSharpness = 100,
  leftCushion,
  topCushion,
  loginBoxWidth,
  loginBoxHeight,
  scaleX,
  scaleY,
  panelBg,
  panelBorderBrightness,
  panelContent,
  panelContentOffsetX = 0,
  panelRightMargin = 100,
  buttonsBottomGap = 100,
  ductTapeStrips = [],
  respectDuctTape = true,
  onRemoveDuctTape,
  musicPlaying = false,
  onToggleMusic,
}) {
  const tapeOrigin = respectDuctTape && ductTapeStrips.length > 0
    ? (() => {
        const s = ductTapeStrips[0];
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        return `${midX * 100}% ${midY * 100}%`;
      })()
    : 'center center';

  /* Panel center (scene %): character body anchors here so he stays centered behind the panel. */
  const panelW = PANEL_BBOX_PCT.width * (loginBoxWidth / 100);
  const panelH = PANEL_BBOX_PCT.height * (loginBoxHeight / 100);
  const panelCenterX = PANEL_BBOX_PCT.left + leftCushion + panelW / 2;
  const panelCenterY = PANEL_BBOX_PCT.top + topCushion + panelH / 2;
  const panelAnchor = `${panelCenterX}% ${panelCenterY}%`;

  const panelFloatRef = useRef(null);
  const boomboxRef = useRef(null);
  const [panelSize, setPanelSize] = useState(null);

  useEffect(() => {
    const el = panelFloatRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setPanelSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loginBoxWidth, loginBoxHeight, scaleX, scaleY, leftCushion, topCushion]);

  /* Aspect-fit: size so scene fits in viewport and preserves 1365:2048 (no stretch at 5173px or any width) */
  const aspectW = CANVAS.width / CANVAS.height;
  const aspectH = CANVAS.height / CANVAS.width;

  return (
    <div
      ref={sceneRef}
      className="login-scene"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        /* Fit inside container while preserving aspect (e.g. 5173px wide: limit width by height so no squash) */
        width: `min(100%, 100cqh * ${aspectW})`,
        height: `min(100cqh, 100% * ${aspectH})`,
        maxWidth: '100%',
        maxHeight: '100%',
        isolation: 'isolate',
        overflow: 'hidden',
      }}
    >
      <div
        ref={sceneUnitRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate(${sceneOffsetX}%, ${sceneOffsetY}%) scaleX(${sceneScaleX / 100}) scaleY(${sceneScaleY / 100})`,
          transformOrigin: tapeOrigin,
        }}
      >
        {/* ═══ z5: Background — grid floor setting (background.png, kept as-is) ═══ */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '130%',
            height: '55%',
            zIndex: 5,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Pulsing underglow beneath the grid */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at 50% 55%, rgba(0,255,65,0.16) 0%, rgba(0,255,65,0.05) 30%, transparent 60%)',
              animation: 'glowPulse 5s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <img
            src={backgroundImg}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>

        {/* ═══ z6: Floor glow ripples (ambient expanding rings) ═══ */}
        <FloorGlowRipples />

        {/* ═══ z10: Robot body (wankrHome.png — single full mascot, screen blend removes black bg) ═══ */}
        {showLayerWankrBody && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              pointerEvents: 'none',
              transform: `translate(${backOffsetX}%, ${backOffsetY}%) scaleX(${backScaleX / 100}) scaleY(${backScaleY / 100})`,
              transformOrigin: 'center center',
              mixBlendMode: 'screen',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${wankrHomeImg})`,
                backgroundSize: '100% auto',
                backgroundPosition: 'center 15%',
                backgroundRepeat: 'no-repeat',
                filter: `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 6px rgba(0,255,65,0.15)) drop-shadow(0 0 20px rgba(0,255,65,0.06))`,
                animation: 'robotBob 5s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* ═══ z21: Login panel (form) ═══ */}
        {panelContent != null && (
          <div
            ref={panelFloatRef}
            className="login-scene-panel-float"
            style={{
              position: 'absolute',
              zIndex: 21,
              pointerEvents: 'auto',
              left: `${PANEL_BBOX_PCT.left + leftCushion}%`,
              top: `${PANEL_BBOX_PCT.top + topCushion}%`,
              width: `${PANEL_BBOX_PCT.width * (loginBoxWidth / 100)}%`,
              height: `${PANEL_BBOX_PCT.height * (loginBoxHeight / 100)}%`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              transform: `scale(${scaleX / 100}, ${scaleY / 100})`,
              transformOrigin: 'center center',
              filter: 'drop-shadow(0 0 8px rgba(0,255,65,0.15)) drop-shadow(0 0 24px rgba(0,255,65,0.08))',
            }}
          >
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div
                style={{
                  width: panelSize ? `${panelSize.width}px` : '100%',
                  height: panelSize ? `${panelSize.height}px` : '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  containerType: 'size',
                  padding: `${2 * (buttonsBottomGap / 100)}cqi ${1.25 * (panelRightMargin / 100)}cqi max(12px, ${2 * (buttonsBottomGap / 100)}cqi)`,
                  marginLeft: panelContentOffsetX !== 0 ? `${panelContentOffsetX}%` : undefined,
                  background: panelBg,
                  borderRadius: '2.5cqi',
                  border: `2px solid rgba(0, 255, 65, ${panelBorderBrightness / 100})`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 4px 14px rgba(0,0,0,0.22), inset 0 -2px 8px rgba(0,0,0,0.4), inset 2px 0 8px rgba(0,0,0,0.2), inset -2px 0 8px rgba(0,0,0,0.2), 0 0 20px rgba(0,255,65,${panelBorderBrightness / 100 * 0.4}), 0 0 40px rgba(0,255,65,${panelBorderBrightness / 100 * 0.2}), 0 0 80px rgba(0,255,65,0.1), 0 4px 0 rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.5)`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {panelContent}
              </div>
            </div>
          </div>
        )}

        {/* ═══ z25: Boombox (interactive, perspective-transformed) ═══ */}
        <Boombox
          ref={boomboxRef}
          playing={musicPlaying}
          onToggle={onToggleMusic}
        />

        {/* ═══ z26: Music notes (floating from boombox when playing) ═══ */}
        <MusicNotes playing={musicPlaying} boomboxRef={boomboxRef} />

        {/* ═══ z50: Duct tape (existing) ═══ */}
        {ductTapeStrips.length > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {ductTapeStrips.map((s) => (
                <line
                  key={s.id}
                  x1={s.x1 * 100}
                  y1={s.y1 * 100}
                  x2={s.x2 * 100}
                  y2={s.y2 * 100}
                  stroke="rgba(180,180,180,0.95)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 1px rgba(0,0,0,0.5))"
                />
              ))}
            </svg>
            {ductTapeStrips.map((s) => {
              const midX = (s.x1 + s.x2) / 2;
              const midY = (s.y1 + s.y2) / 2;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveDuctTape?.(s.id); }}
                  style={{
                    position: 'absolute',
                    left: `${midX * 100}%`,
                    top: `${midY * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  title={`Remove duct tape (click to remove)`}
                />
              );
            })}
          </div>
        )}

        {/* ═══ Atmosphere overlays ═══ */}
        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.65) 100%)',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        />
        {/* Scanlines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
            pointerEvents: 'none',
            zIndex: 61,
          }}
        />
      </div>
    </div>
  );
}
