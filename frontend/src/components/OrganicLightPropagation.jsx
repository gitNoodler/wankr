import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'wankr_glow_point';

function loadGlowPoint() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.x != null && p?.y != null) return p;
    }
  } catch {}
  return null;
}

/** Organic light propagation within Effects Bounds: bounce light, edge glow, volumetric fill. */
export default function OrganicLightPropagation({ glowPointVersion = 0, sparkActive = false }) {
  const [gp, setGp] = useState(() => loadGlowPoint());

  useEffect(() => {
    setGp(loadGlowPoint());
  }, [glowPointVersion]);

  useEffect(() => {
    const onStorage = () => setGp(loadGlowPoint());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const x = gp?.x ?? 50;
  const y = gp?.y ?? 75;
  const intensity = gp?.intensity ?? 0.15;
  const bounceOpacity = (sparkActive ? 0.04 : 0.025) * (1 + intensity);
  const edgeOpacity = sparkActive ? 0.035 : 0.02;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2.08,
        mixBlendMode: 'screen',
      }}
    >
      {/* Bounce light: large soft radial gradient from glow point */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at ${x}% ${y}%, rgba(200,255,180,${bounceOpacity}) 0%, rgba(180,255,140,${bounceOpacity * 0.6}) 40%, transparent 75%)`,
        }}
      />
      {/* Symmetric horizontal fill: left and right receive identical effects */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(to right, rgba(180,255,120,${edgeOpacity}) 0%, rgba(180,255,120,${edgeOpacity * 0.6}) 20%, rgba(180,255,120,${edgeOpacity * 0.4}) 50%, rgba(180,255,120,${edgeOpacity * 0.6}) 80%, rgba(180,255,120,${edgeOpacity}) 100%),
            linear-gradient(to bottom, rgba(180,255,130,${edgeOpacity * 0.8}) 0%, rgba(180,255,130,${edgeOpacity * 0.35}) 20%, rgba(180,255,130,${edgeOpacity * 0.3}) 50%, rgba(180,255,130,${edgeOpacity * 0.35}) 80%, rgba(180,255,130,${edgeOpacity * 0.8}) 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%',
          backgroundPosition: '0 0, 0 0',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Volumetric fill: subtle diagonal/vertical soft gradients */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(115deg, transparent 0%, rgba(180,255,130,0.015) 30%, transparent 70%),
            linear-gradient(245deg, transparent 0%, rgba(180,255,130,0.012) 35%, transparent 75%)
          `,
          backgroundSize: '100% 100%',
          backgroundPosition: '0 0, 0 0',
        }}
      />
    </div>
  );
}
