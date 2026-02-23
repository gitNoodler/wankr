import React, { useEffect, useRef } from 'react';

/**
 * FloorGlowRipples — Expanding elliptical glow rings on the grid floor.
 * Always active (ambient effect, not tied to music state).
 * Two offset interval spawners avoid visual gaps between ripples.
 */
export default function FloorGlowRipples() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const spawnRipple = () => {
      const rip = document.createElement('div');
      const ox = (Math.random() - 0.5) * 12; // ±6% offset
      const oy = (Math.random() - 0.5) * 8;  // ±4% offset

      Object.assign(rip.style, {
        position: 'absolute',
        left: `calc(50% + ${ox}%)`,
        bottom: `calc(35% + ${oy}%)`,
        transform: 'translate(-50%, 50%)',
        width: '40px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid rgba(0, 255, 65, 0.4)',
        boxShadow: '0 0 14px rgba(0, 255, 65, 0.12)',
        animation: 'rippleExpand 4.5s ease-out forwards',
        pointerEvents: 'none',
      });

      container.appendChild(rip);
      setTimeout(() => {
        if (rip.parentNode) rip.remove();
      }, 4600);
    };

    // Spawn immediately
    spawnRipple();

    // First spawner: every 3.4s
    const iv1 = setInterval(spawnRipple, 3400);

    // Second spawner: offset by half-cycle (1.7s) for overlapping ripples
    const offsetTimeout = setTimeout(() => {
      spawnRipple();
    }, 1700);
    let iv2 = null;
    const iv2Timeout = setTimeout(() => {
      iv2 = setInterval(spawnRipple, 3400);
    }, 1700);

    return () => {
      clearInterval(iv1);
      clearTimeout(offsetTimeout);
      clearTimeout(iv2Timeout);
      if (iv2) clearInterval(iv2);
      // Remove all ripple elements
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 6,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
