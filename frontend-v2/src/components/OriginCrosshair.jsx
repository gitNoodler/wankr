import React from 'react';

/** Red crosshair at viewport center (scene/origin reference). Toggle from Dev1. */
export default function OriginCrosshair({ visible }) {
  if (!visible) return null;
  const size = 24;
  const half = size / 2;
  const stroke = 2;
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -half,
        marginTop: -half,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <line x1={half} y1={0} x2={half} y2={size} stroke="#f00" strokeWidth={stroke} />
        <line x1={0} y1={half} x2={size} y2={half} stroke="#f00" strokeWidth={stroke} />
        <circle cx={half} cy={half} r={2} fill="#f00" />
      </svg>
    </div>
  );
}
