import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'wankr_glow_point';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.x != null && parsed?.y != null) return parsed;
    }
  } catch {}
  return null;
}

/** Persistent glow point rendered on the background - bright star shape (cross arms + halo).
 *  Spikes in intensity when sparkActive (mimics spark flash), then returns to original pulse. */
export default function GlowPointDisplay({ version = 0, sparkActive = false }) {
  const [data, setData] = useState(() => loadSaved());

  useEffect(() => {
    setData(loadSaved());
  }, [version]);

  const handleStorage = () => setData(loadSaved());
  useEffect(() => {
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!data) return null;

  const {
    x = 50,
    y = 50,
    size = 150,
    intensity = 0.15,
    pulseSpeed = 2,
    armLength = 1,
    haloBlur = 8,
  } = data;

  const armScale = Math.max(0.5, Math.min(2, armLength));
  const armW = 8 * armScale;
  const armH = 32 * armScale;
  const blur = Math.max(2, Math.min(20, haloBlur));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          animation: sparkActive ? 'none' : `glowPointPulse ${pulseSpeed}s ease-in-out infinite`,
          transform: sparkActive ? 'scale(1.25)' : undefined,
          filter: sparkActive ? 'brightness(2.5)' : undefined,
          opacity: sparkActive ? 1 : undefined,
          transition: 'transform 0.1s ease-out, filter 0.1s ease-out, opacity 0.15s ease-out',
        }}
      >
        <svg width={size} height={size} viewBox="-40 -40 80 80" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="gp-arm-h" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="25%" stopColor={`rgba(255,255,220,${intensity * 0.2})`} />
              <stop offset="50%" stopColor={`rgba(255,255,240,${intensity * 0.9})`} />
              <stop offset="75%" stopColor={`rgba(200,255,180,${intensity * 0.2})`} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="gp-arm-v" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="25%" stopColor={`rgba(255,255,220,${intensity * 0.2})`} />
              <stop offset="50%" stopColor={`rgba(255,255,240,${intensity * 0.9})`} />
              <stop offset="75%" stopColor={`rgba(200,255,180,${intensity * 0.2})`} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <radialGradient id="gp-center">
              <stop offset="0%" stopColor={`rgba(255,255,255,${intensity})`} />
              <stop offset="40%" stopColor={`rgba(255,255,220,${intensity * 0.8})`} />
              <stop offset="70%" stopColor={`rgba(200,255,160,${intensity * 0.3})`} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="gp-halo" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#gp-halo)">
            <rect x={-armH} y={-armW / 2} width={armH * 2} height={armW} rx="2" fill="url(#gp-arm-h)" />
            <rect x={-armW / 2} y={-armH} width={armW} height={armH * 2} rx="2" fill="url(#gp-arm-v)" />
            <circle cx="0" cy="0" r="8" fill="url(#gp-center)" />
          </g>
        </svg>
      </div>
      <style>{`
        @keyframes glowPointPulse {
          0%, 100% { transform: scale(0.85); opacity: 0.8; }
          50%      { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
