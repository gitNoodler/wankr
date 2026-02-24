import React, { useRef } from 'react';
import loginScreenImg from '@mascot/dashLayers/loginScreen.png';
import Boombox from './Boombox';
import MusicNotes from './MusicNotes';
import FloorGlowRipples from './FloorGlowRipples';

/**
 * RobotScene — Full-viewport immersive login scene.
 *
 * Layered compositing:
 *   z1  loginScreen.png (base — robot holding blank sign on neon grid)
 *   z2  Floor glow ripples
 *   z10 Login panel (form, positioned over the blank sign)
 *   z18 Hand overlays (ON TOP of panel)
 *   z25 Boombox (interactive)
 *   z26 Music notes
 *   z60 Vignette
 *   z61 Scanlines
 */
export default function RobotScene({
  panelContent,
  musicPlaying = false,
  onToggleMusic,
  groovePlaying = false,
  grooveGetAudio,
}) {
  const boomboxRef = useRef(null);

  const imgFilter = 'drop-shadow(0 0 8px rgba(0,255,65,0.18)) drop-shadow(0 0 24px rgba(0,255,65,0.08))';

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
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {/* z1: Base robot scene */}
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

        {/* z2: Floor glow ripples */}
        <FloorGlowRipples />

        {/* z10: Login panel — canvas-aligned inside the green box
          * Green box inner area: x~555 y~425 w~490 h~225 on 1536x1024 */}
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

        {/* z18: Hand overlays — grip ON TOP of panel */}
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

        {/* z25: Boombox */}
        <Boombox
          ref={boomboxRef}
          playing={groovePlaying || musicPlaying}
          onToggle={onToggleMusic}
          getAudio={grooveGetAudio}
        />

        {/* z26: Music notes */}
        <MusicNotes playing={musicPlaying} boomboxRef={boomboxRef} />

        {/* z60: Vignette */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60,
            background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.6) 100%)',
          }}
        />
        {/* z61: Scanlines */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 61,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
          }}
        />
      </div>
    </div>
  );
}
