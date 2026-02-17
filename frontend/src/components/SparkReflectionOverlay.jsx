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
      {/* Edge propagation – light only along left and right bounds */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '8%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(180,255,120,0.04) 0%, transparent 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '8%',
          height: '100%',
          background: 'linear-gradient(to left, rgba(180,255,120,0.04) 0%, transparent 100%)',
        }}
      />
      {/* Top and bottom bounds */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '6%',
          background: 'linear-gradient(to bottom, rgba(180,255,120,0.035) 0%, transparent 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '8%',
          background: 'linear-gradient(to top, rgba(180,255,120,0.035) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
