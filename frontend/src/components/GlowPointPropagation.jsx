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

/** Full-screen propagation of glow point light – orb light spreads across the entire viewport. */
export default function GlowPointPropagation({ version = 0, sparkActive = false }) {
  const [gp, setGp] = useState(() => loadGlowPoint());

  useEffect(() => {
    setGp(loadGlowPoint());
  }, [version]);

  useEffect(() => {
    const onStorage = () => setGp(loadGlowPoint());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!gp) return null;

  const x = gp.x ?? 50;
  const y = gp.y ?? 75;
  const intensity = gp.intensity ?? 0.15;
  const opacity = (sparkActive ? 0.045 : 0.03) * (1 + intensity);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2.15,
        mixBlendMode: 'screen',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 100% 100% at ${x}% ${y}%, rgba(220,255,180,${opacity}) 0%, rgba(200,255,160,${opacity * 0.5}) 40%, rgba(180,255,120,${opacity * 0.2}) 65%, transparent 90%)`,
        }}
      />
    </div>
  );
}
