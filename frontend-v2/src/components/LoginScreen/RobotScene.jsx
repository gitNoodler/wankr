import React, { useRef } from 'react';
import loginScreenImg from '@mascot/dashLayers/loginScreen.png';
import Boombox from './Boombox';
import MusicNotes from './MusicNotes';
import FloorGlowRipples from './FloorGlowRipples';
import RobotEyeBlink from './RobotEyeBlink';

/**
 * RobotScene — Full-viewport immersive login scene.
 *
 * Layered compositing:
 *   z1  loginScreen.png (base — robot holding blank sign on neon grid)
 *   z2  Floor glow ripples
 *   z10 Login panel (form, positioned over the blank sign)
 *   z18 loginScreen.png again (screen blend — both arms overlay ON TOP of panel)
 *   z25 Boombox (interactive)
 *   z26 Music notes
 *   z60 Vignette
 *   z61 Scanlines
 */
export default function RobotScene({
  sceneRef,
  sceneUnitRef,
  sceneOffsetX,
  sceneOffsetY,
  sceneScaleX: _sceneScaleX,  // eslint-disable-line no-unused-vars
  sceneScaleY: _sceneScaleY,  // eslint-disable-line no-unused-vars
  backOffsetX: _backOffsetX,  // eslint-disable-line no-unused-vars
  backOffsetY: _backOffsetY,  // eslint-disable-line no-unused-vars
  backScaleX: _backScaleX,    // eslint-disable-line no-unused-vars
  backScaleY: _backScaleY,    // eslint-disable-line no-unused-vars
  showLayerBackground: _showLayerBackground = true, // eslint-disable-line no-unused-vars
  showLayerWankrBody = true, // eslint-disable-line no-unused-vars
  showLayerLogin: _showLayerLogin = true, // eslint-disable-line no-unused-vars
  characterSharpness = 100,
  leftCushion: _leftCushion,      // eslint-disable-line no-unused-vars
  topCushion: _topCushion,        // eslint-disable-line no-unused-vars
  loginBoxWidth: _loginBoxWidth,  // eslint-disable-line no-unused-vars
  loginBoxHeight: _loginBoxHeight,// eslint-disable-line no-unused-vars
  scaleX: _scaleX,               // eslint-disable-line no-unused-vars
  scaleY: _scaleY,               // eslint-disable-line no-unused-vars
  panelBg: _panelBg,             // eslint-disable-line no-unused-vars
  panelBorderBrightness: _panelBorderBrightness, // eslint-disable-line no-unused-vars
  panelContent,
  panelContentOffsetX: _panelContentOffsetX = 0, // eslint-disable-line no-unused-vars
  panelRightMargin: _panelRightMargin = 100,     // eslint-disable-line no-unused-vars
  buttonsBottomGap: _buttonsBottomGap = 100,      // eslint-disable-line no-unused-vars
  ductTapeStrips = [],
  respectDuctTape: _respectDuctTape = true, // eslint-disable-line no-unused-vars
  onRemoveDuctTape,
  musicPlaying = false,
  onToggleMusic,
  groovePlaying = false,
  grooveGetAudio,
}) {
  const boomboxRef = useRef(null);


  const imgFilter = `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 8px rgba(0,255,65,0.18)) drop-shadow(0 0 24px rgba(0,255,65,0.08))`;

  /* Shared image style for both base and overlay copies of loginScreen.png */
  const imgStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center center',
    display: 'block',
    pointerEvents: 'none',
  };

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
        {/* ═══ z1: Base robot scene ═══ */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 50% 55%, rgba(0,255,65,0.12) 0%, rgba(0,255,65,0.04) 30%, transparent 60%)',
              animation: 'glowPulse 5s ease-in-out infinite',
              pointerEvents: 'none', zIndex: 0,
            }}
          />
          <img
            src={loginScreenImg}
            alt="WankrBot"
            draggable={false}
            style={{ ...imgStyle, position: 'relative', zIndex: 1, filter: imgFilter }}
          />
        </div>

        {/* ═══ z3-z4: Face expression layers (disabled) ═══ */}
        {/* <RobotEyeBlink /> */}

        {/* ═══ z2: Floor glow ripples ═══ */}
        <FloorGlowRipples />

        {/* ═══ z10: Login panel — canvas-aligned inside the green box ═══ *
          * The panel sits inside a flex-centered wrapper that emulates      *
          * object-fit:contain, so canvas-% coordinates line up with the     *
          * green box borders in loginScreen.png.                            *
          * Green box inner area: x≈555 y≈425 w≈490 h≈225 on 1536×1024     */}
        {panelContent != null && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%', height: '100%',
                maxWidth: 'calc(100vh * 1.5)',
                maxHeight: 'calc(100vw / 1.5)',
                pointerEvents: 'none',
              }}
            >
              <div
                className="login-panel-wrapper"
                style={{
                  position: 'absolute',
                  left: '35.5%',
                  top: '43.2%',
                  width: '33%',
                  height: '23.5%',
                  pointerEvents: 'auto',
                  animation: 'panelFadeIn 0.8s ease-out both',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  className="login-panel"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 2,
                    position: 'relative',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    containerType: 'inline-size',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '1.5% 11%',
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {panelContent}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ z18: Hand overlays — grip ON TOP of panel ═══ *
          * Separate 1536×1024 transparent layers for each hand.            */}
        <img
          src="/images/hands/left_hand.png"
          alt=""
          draggable={false}
          style={{ ...imgStyle, zIndex: 18 }}
        />
        <img
          src="/images/hands/right_hand.png"
          alt=""
          draggable={false}
          style={{ ...imgStyle, zIndex: 18 }}
        />

        {/* ═══ z15: Boombox (behind arm overlays at z18) ═══ */}
        <Boombox
          ref={boomboxRef}
          playing={groovePlaying || musicPlaying}
          onToggle={onToggleMusic}
          getAudio={grooveGetAudio}
        />

        {/* ═══ z26: Music notes ═══ */}
        <MusicNotes playing={musicPlaying} boomboxRef={boomboxRef} />

        {/* ═══ z50: Duct tape strips ═══ */}
        {ductTapeStrips.length > 0 && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}
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
                  x1={s.x1 * 100} y1={s.y1 * 100}
                  x2={s.x2 * 100} y2={s.y2 * 100}
                  stroke="rgba(180,180,180,0.95)" strokeWidth="1.2" strokeLinecap="round"
                  filter="drop-shadow(0 0 1px rgba(0,0,0,0.5))"
                />
              ))}
            </svg>
            {ductTapeStrips.map((s) => {
              const midX = (s.x1 + s.x2) / 2;
              const midY = (s.y1 + s.y2) / 2;
              return (
                <button
                  key={s.id} type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveDuctTape?.(s.id); }}
                  style={{
                    position: 'absolute', left: `${midX * 100}%`, top: `${midY * 100}%`,
                    transform: 'translate(-50%, -50%)', width: 32, height: 32,
                    padding: 0, border: 'none', background: 'transparent',
                    cursor: 'pointer', pointerEvents: 'auto',
                  }}
                  title="Remove duct tape"
                />
              );
            })}
          </div>
        )}

        {/* ═══ Atmosphere ═══ */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60,
            background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.6) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 61,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
          }}
        />
      </div>

      {/* Panel tuner removed — panel is now canvas-aligned */}
    </div>
  );
}
