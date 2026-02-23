import React, { forwardRef } from 'react';
import boomboxImg from '@mascot/dashLayers/boombox.png';

/**
 * Boombox — neon boombox sitting on the grid floor.
 * Black background removed via mix-blend-mode: screen.
 *
 * Perspective matches the floor grid's vanishing point:
 *   - rotateX tilts backward to sit on the floor plane
 *   - rotateY turns toward the viewer from the left side
 *   - perspective depth matches the room's spatial feel
 */
const Boombox = forwardRef(function Boombox({ playing, onToggle }, ref) {
  /* Base perspective transform — must match the floor grid convergence */
  const basePerspective = 'perspective(500px) rotateX(8deg) rotateY(12deg)';

  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      style={{
        position: 'absolute',
        bottom: '4%',
        left: '4%',
        zIndex: 25,
        /* Much larger: 150px mobile → 260px desktop. Fills corner properly. */
        width: 'clamp(140px, 18vw, 260px)',
        mixBlendMode: 'screen',
        cursor: 'pointer',
        pointerEvents: 'auto',
        animation: playing
          ? 'boomboxFadeIn 1s ease-out 0.4s both, boomboxVibe 0.6s ease-in-out infinite 1.5s'
          : 'boomboxFadeIn 1s ease-out 0.4s both',
        transform: playing ? undefined : basePerspective,
        transition: 'filter 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.15) drop-shadow(0 0 18px rgba(0,255,65,0.35))';
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
          filter: 'drop-shadow(0 0 12px rgba(0,255,65,0.15))',
        }}
      />
      {/* Floor glow beneath boombox — elliptical to match floor perspective */}
      <div
        style={{
          position: 'absolute',
          bottom: -14,
          left: '5%',
          width: '90%',
          height: 22,
          background: 'radial-gradient(ellipse, rgba(0,255,65,0.25) 0%, transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

export default Boombox;
