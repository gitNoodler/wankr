import React, { useRef } from 'react';
import backgroundImg from '@mascot/dashLayers/background.png';
import wankrHomeImg from '@mascot/dashLayers/wankrHome.png';
import Boombox from './Boombox';
import MusicNotes from './MusicNotes';
import FloorGlowRipples from './FloorGlowRipples';

/**
 * RobotScene — Full-viewport immersive login scene.
 *
 * Layout (viewport-relative, matching wankrbot-login.html prototype):
 *   z1  Grid floor (background.png, 130% wide, bottom 55%)
 *   z2  Floor glow ripples (ambient expanding rings)
 *   z5  Robot mascot (wankrHome.png, centered, screen blend removes black bg)
 *   z20 Login panel (centered, backdrop blur, neon border)
 *   z25 Boombox (bottom-left, perspective, interactive)
 *   z26 Music notes (floating from boombox)
 *   z50 Duct tape strips (legacy)
 *   z60 Vignette overlay
 *   z61 Scanlines overlay
 */
export default function RobotScene({
  sceneRef,
  sceneUnitRef,
  sceneOffsetX,
  sceneOffsetY,
  /* sceneScaleX/Y accepted for prop compat but not applied — viewport-relative layout */
  sceneScaleX: _sceneScaleX,  // eslint-disable-line no-unused-vars
  sceneScaleY: _sceneScaleY,  // eslint-disable-line no-unused-vars
  /* backOffset/Scale accepted for prop compat but not applied — single robot image now */
  backOffsetX: _backOffsetX,  // eslint-disable-line no-unused-vars
  backOffsetY: _backOffsetY,  // eslint-disable-line no-unused-vars
  backScaleX: _backScaleX,    // eslint-disable-line no-unused-vars
  backScaleY: _backScaleY,    // eslint-disable-line no-unused-vars
  showLayerBackground: _showLayerBackground = true, // eslint-disable-line no-unused-vars
  showLayerWankrBody = true,
  showLayerLogin: _showLayerLogin = true, // eslint-disable-line no-unused-vars
  characterSharpness = 100,
  leftCushion: _leftCushion,      // eslint-disable-line no-unused-vars
  topCushion: _topCushion,        // eslint-disable-line no-unused-vars
  loginBoxWidth: _loginBoxWidth,  // eslint-disable-line no-unused-vars
  loginBoxHeight: _loginBoxHeight,// eslint-disable-line no-unused-vars
  scaleX: _scaleX,               // eslint-disable-line no-unused-vars
  scaleY: _scaleY,               // eslint-disable-line no-unused-vars
  panelBg,
  panelBorderBrightness,
  panelContent,
  panelContentOffsetX: _panelContentOffsetX = 0, // eslint-disable-line no-unused-vars
  panelRightMargin: _panelRightMargin = 100,     // eslint-disable-line no-unused-vars
  buttonsBottomGap: _buttonsBottomGap = 100,      // eslint-disable-line no-unused-vars
  ductTapeStrips = [],
  respectDuctTape: _respectDuctTape = true, // eslint-disable-line no-unused-vars
  onRemoveDuctTape,
  musicPlaying = false,
  onToggleMusic,
}) {
  const boomboxRef = useRef(null);
  const borderAlpha = Math.max(0.1, (panelBorderBrightness ?? 22) / 100 * 0.48);

  /* Convert opaque panelBg (rgb) to semi-transparent for glassmorphic effect.
     Without alpha, backdrop-filter blur is invisible and robot hides behind solid gray. */
  const panelBackground = (() => {
    if (!panelBg) return 'rgba(6, 14, 6, 0.82)';
    const m = panelBg.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, 0.82)`;
    return panelBg;
  })();

  return (
    <div
      ref={sceneRef}
      className="login-scene"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        isolation: 'isolate',
        background: '#000',
      }}
    >
      {/* Scene-unit: offset only (no scale — viewport-relative layout) */}
      <div
        ref={sceneUnitRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate(${sceneOffsetX}%, ${sceneOffsetY}%)`,
          transformOrigin: 'center center',
        }}
      >
        {/* ═══ z1: Grid floor — background.png (the setting, no blend mode) ═══ */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '130%',
            height: '55%',
            zIndex: 1,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Pulsing underglow beneath the grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
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

        {/* ═══ z2: Floor glow ripples (ambient expanding rings) ═══ */}
        <FloorGlowRipples />

        {/* ═══ z5: Robot mascot (wankrHome.png — screen blend removes black bg) ═══ */}
        {showLayerWankrBody && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'clamp(540px, 108%, 1500px)',
              zIndex: 5,
              pointerEvents: 'none',
              mixBlendMode: 'screen',
            }}
          >
            <img
              src={wankrHomeImg}
              alt="WankrBot"
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                filter: `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 6px rgba(0,255,65,0.15)) drop-shadow(0 0 20px rgba(0,255,65,0.06))`,
                animation: 'robotBob 5s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* ═══ z20: Login panel (viewport-centered, backdrop blur, neon border) ═══ */}
        {panelContent != null && (
          <div
            className="login-panel-wrapper"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -38%)',
              zIndex: 20,
              width: 'clamp(270px, 24%, 330px)',
              pointerEvents: 'auto',
              animation: 'panelFadeIn 0.8s ease-out both',
            }}
          >
            <div
              className="login-panel"
              style={{
                padding: '28px 24px 20px',
                background: panelBackground,
                border: `1.5px solid rgba(0, 255, 65, ${borderAlpha})`,
                borderRadius: 14,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow:
                  '0 0 30px rgba(0,255,65,0.08), ' +
                  '0 0 80px rgba(0,255,65,0.04), ' +
                  'inset 0 1px 0 rgba(0,255,65,0.1), ' +
                  'inset 0 -1px 0 rgba(0,0,0,0.4), ' +
                  '0 6px 20px rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'hidden',
                containerType: 'inline-size',
                transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
              }}
            >
              {/* Top glow accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '12%',
                  width: '76%',
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.5), transparent)',
                  pointerEvents: 'none',
                }}
              />
              {panelContent}
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

        {/* ═══ z50: Duct tape strips ═══ */}
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
                  title="Remove duct tape (click to remove)"
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
