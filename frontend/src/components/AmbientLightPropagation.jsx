import React from 'react';

/** Organic ambient light propagation across full viewport – multi-directional gradients.
 *  Renders outside EffectsBounds so it always spans the entire screen. */
export default function AmbientLightPropagation() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2.05,
        background: `
          linear-gradient(to right, rgba(180,255,120,0.035) 0%, rgba(180,255,120,0.03) 25%, rgba(180,255,120,0.03) 50%, rgba(180,255,120,0.03) 75%, rgba(180,255,120,0.035) 100%),
          linear-gradient(to bottom, rgba(180,255,130,0.04) 0%, rgba(180,255,130,0.03) 20%, rgba(180,255,130,0.03) 50%, rgba(180,255,130,0.03) 80%, rgba(180,255,130,0.04) 100%),
          linear-gradient(135deg, transparent 0%, rgba(180,255,120,0.02) 40%, transparent 80%),
          linear-gradient(225deg, transparent 0%, rgba(180,255,120,0.02) 40%, transparent 80%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, 0 0, 0 0, 0 0',
      }}
    />
  );
}
