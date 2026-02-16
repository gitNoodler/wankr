import React, { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wankr_glow_point';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {}
  return null;
}

function saveGlowPoint(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function GlowPointTool({ onClose, onSave, initialPoint = null }) {
  const saved = loadSaved();
  const defaultPoint = { x: 50, y: 50 };
  const [point, setPoint] = useState(initialPoint ?? saved ?? defaultPoint);
  const [size, setSize] = useState(saved?.size ?? 200);
  const [intensity, setIntensity] = useState(saved?.intensity ?? 0.2);
  const [pulseSpeed, setPulseSpeed] = useState(saved?.pulseSpeed ?? 2);
  const [armLength, setArmLength] = useState(saved?.armLength ?? 1);
  const [haloBlur, setHaloBlur] = useState(saved?.haloBlur ?? 8);
  const [containerRect, setContainerRect] = useState(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setContainerRect(r);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rect = containerRect ?? (typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : null);

  const handleClick = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPoint({ x, y });
  }, []);

  const memorize = useCallback(() => {
    const p = point ?? defaultPoint;
    const data = { x: p.x, y: p.y, size, intensity, pulseSpeed, armLength, haloBlur };
    saveGlowPoint(data);
    onSave?.();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  }, [point, size, intensity, pulseSpeed, armLength, haloBlur, onSave]);

  const reset = useCallback(() => {
    setPoint(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      onSave?.();
    } catch {}
  }, [onSave]);

  const pointPx = point && rect
    ? {
        x: (point.x / 100) * rect.width,
        y: (point.y / 100) * rect.height,
      }
    : null;

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        cursor: 'crosshair',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 60,
      }}
    >
      {/* Control panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 0 24px rgba(0, 255, 65, 0.2)',
          color: 'var(--accent)',
          fontSize: 14,
          minWidth: 300,
        }}
      >
        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16 }}>Bright Star Glow Point</div>
        <div style={{ marginBottom: 16, opacity: 0.9 }}>Click anywhere to place. Shape matches a bright star (cross arms + halo).</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>Size (px)</div>
          <input
            type="range"
            min={20}
            max={500}
            step={5}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>{size} px</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Intensity (opacity)</div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(intensity * 100)}
            onChange={(e) => setIntensity(Number(e.target.value) / 100)}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>{Math.round(intensity * 100)}%</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Pulse speed (sec)</div>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={pulseSpeed}
            onChange={(e) => setPulseSpeed(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>{pulseSpeed.toFixed(1)} s</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Arm length (star spread)</div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={armLength}
            onChange={(e) => setArmLength(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>{armLength.toFixed(1)}×</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4 }}>Halo blur</div>
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={haloBlur}
            onChange={(e) => setHaloBlur(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>{haloBlur} px</div>
        </div>

        {point && (
          <div style={{ marginBottom: 16, fontSize: 12, opacity: 0.9 }}>
            Point: {point.x.toFixed(1)}% × {point.y.toFixed(1)}%
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              memorize();
            }}
            className="btn-primary"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            {savedFeedback ? 'Saved!' : 'Memorize'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="btn"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Reset Point
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="btn"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Bright star preview at selected point */}
      {pointPx && (
        <svg
          width={size}
          height={size}
          viewBox="-40 -40 80 80"
          style={{
            position: 'fixed',
            left: pointPx.x - size / 2,
            top: pointPx.y - size / 2,
            pointerEvents: 'none',
            zIndex: 1,
            overflow: 'visible',
            animation: `glowPulse ${pulseSpeed}s ease-in-out infinite`,
          }}
        >
          <defs>
            <linearGradient id="pulseArmHoriz" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="25%" stopColor={`rgba(255,255,220,${intensity * 0.2})`} />
              <stop offset="50%" stopColor={`rgba(255,255,240,${intensity * 0.9})`} />
              <stop offset="75%" stopColor={`rgba(200,255,180,${intensity * 0.2})`} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="pulseArmVert" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="25%" stopColor={`rgba(255,255,220,${intensity * 0.2})`} />
              <stop offset="50%" stopColor={`rgba(255,255,240,${intensity * 0.9})`} />
              <stop offset="75%" stopColor={`rgba(200,255,180,${intensity * 0.2})`} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <radialGradient id="pulseCenter">
              <stop offset="0%" stopColor={`rgba(255,255,255,${intensity})`} />
              <stop offset="40%" stopColor={`rgba(255,255,220,${intensity * 0.8})`} />
              <stop offset="70%" stopColor={`rgba(200,255,160,${intensity * 0.3})`} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="pulseBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={haloBlur} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#pulseBlur)">
            <rect x={-32 * armLength} y={-4 * armLength} width={64 * armLength} height={8 * armLength} rx="2" fill="url(#pulseArmHoriz)" />
            <rect x={-4 * armLength} y={-32 * armLength} width={8 * armLength} height={64 * armLength} rx="2" fill="url(#pulseArmVert)" />
            <circle cx="0" cy="0" r="8" fill="url(#pulseCenter)" />
          </g>
        </svg>
      )}

      <style>{`
        @keyframes glowPulse {
          0%, 100% { transform: scale(0.8); opacity: 0.7; }
          50%      { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
