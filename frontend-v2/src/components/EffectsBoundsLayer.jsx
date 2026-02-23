import React from 'react';

/** Wraps effect layers; always renders full viewport (no mask) for seamless display across the entire width. */
export default function EffectsBoundsLayer({ children, version = 0, zIndex = 0 }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
      }}
      data-effects-version={version}
    >
      {children}
    </div>
  );
}
