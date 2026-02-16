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

/** Localized glow centered on the glow point – light confined near the point, not full-screen. */
export default function GlowTraverse({ sparkActive = false, version = 0 }) {
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
  const y = gp.y ?? 50;
  const pulseSpeed = gp?.pulseSpeed ?? 2;
  const intensity = gp?.intensity ?? 0.15;
  const size = gp?.size ?? 150;
  const spreadPct = Math.min(14, Math.max(6, (size / 20)));
  const inner = 0.06 + intensity * 0.12;
  const outer = 0.02 + intensity * 0.04;

  const bg = sparkActive
    ? `radial-gradient(ellipse ${spreadPct}% ${spreadPct * 0.7}% at ${x}% ${y}%, rgba(255,255,220,${inner * 1.8}) 0%, rgba(220,255,180,${outer * 2}) 25%, rgba(200,255,160,${outer * 1.2}) 60%, transparent 100%)`
    : `radial-gradient(ellipse ${spreadPct}% ${spreadPct * 0.7}% at ${x}% ${y}%, rgba(255,255,220,${inner}) 0%, rgba(220,255,180,${outer * 1.5}) 25%, rgba(200,255,160,${outer}) 60%, transparent 100%)`;

  const bounceSpread = spreadPct * 2.5;
  const bounceOpacity = sparkActive ? 0.08 : 0.05;
  const bounceBg = `radial-gradient(ellipse ${bounceSpread}% ${bounceSpread * 0.7}% at ${x}% ${y}%, rgba(200,255,160,${bounceOpacity}) 0%, rgba(180,255,120,${bounceOpacity * 0.5}) 45%, transparent 75%)`;

  const centerOpacity = sparkActive ? 0.04 : 0.025;
  const centerBg = `radial-gradient(ellipse ${spreadPct * 1.5}% ${spreadPct * 1.2}% at ${x}% ${y}%, rgba(200,255,180,${centerOpacity}) 0%, rgba(180,255,140,${centerOpacity * 0.6}) 50%, transparent 80%)`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2.1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bounceBg,
          animation: sparkActive ? 'none' : `glowTraversePulse ${pulseSpeed}s ease-in-out infinite`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bg,
          animation: sparkActive ? 'none' : `glowTraversePulse ${pulseSpeed}s ease-in-out infinite`,
          transition: 'background 0.12s ease-out, filter 0.12s ease-out',
          filter: sparkActive ? 'brightness(1.4)' : undefined,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: centerBg,
          animation: sparkActive ? 'none' : `glowTraversePulse ${pulseSpeed}s ease-in-out infinite`,
        }}
      />
      <style>{`
        @keyframes glowTraversePulse {
          0%, 100% { opacity: 0.75; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
