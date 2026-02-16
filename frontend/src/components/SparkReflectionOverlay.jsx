import React from 'react';

/** When sparkActive, shows glow reflection propagating across left and right panes and full screen. */
export default function SparkReflectionOverlay({ sparkActive = false }) {
  if (!sparkActive) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3.5,
        mixBlendMode: 'screen',
      }}
    >
      {/* Full-screen subtle propagation – light spreads across entire viewport */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 120% 80% at 50% 50%, rgba(200,255,150,0.06) 0%, rgba(180,255,120,0.02) 50%, transparent 75%)',
        }}
      />
      {/* Full-width propagation – seamless across entire viewport */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(200,255,140,0.2) 0%, rgba(180,255,120,0.08) 25%, rgba(180,255,120,0.06) 50%, rgba(180,255,120,0.08) 75%, rgba(200,255,140,0.2) 100%)',
          transition: 'opacity 0.1s ease-out',
        }}
      />
    </div>
  );
}
