import React, { forwardRef } from 'react';
import boomboxImg from '@mascot/dashLayers/boombox.png';

/**
 * Boombox — neon boombox with perspective transform, click-to-toggle music, vibe animation.
 * Black background removed via mix-blend-mode: screen.
 */
const Boombox = forwardRef(function Boombox({ playing, onToggle }, ref) {
  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      style={{
        position: 'absolute',
        bottom: '6%',
        left: '5%',
        zIndex: 25,
        width: '22%',
        minWidth: 95,
        maxWidth: 200,
        mixBlendMode: 'screen',
        cursor: 'pointer',
        pointerEvents: 'auto',
        animation: playing
          ? 'boomboxFadeIn 1s ease-out 0.4s both, boomboxVibe 0.6s ease-in-out infinite 1.5s'
          : 'boomboxFadeIn 1s ease-out 0.4s both',
        transform: playing ? undefined : 'perspective(600px) rotateX(5deg) rotateY(8deg)',
        transition: 'filter 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.15) drop-shadow(0 0 15px rgba(0,255,65,0.3))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = '';
      }}
      title={playing ? 'Click to stop music' : 'Click to play music'}
    >
      <img
        src={boomboxImg}
        alt="Boombox"
        draggable={false}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 0 10px rgba(0,255,65,0.12))',
        }}
      />
      {/* Floor glow beneath boombox */}
      <div
        style={{
          position: 'absolute',
          bottom: -10,
          left: '8%',
          width: '84%',
          height: 16,
          background: 'radial-gradient(ellipse, rgba(0,255,65,0.2), transparent)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

export default Boombox;
