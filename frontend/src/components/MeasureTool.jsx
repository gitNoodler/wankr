import React, { useState, useCallback } from 'react';

export default function MeasureTool({ onClose }) {
  const [pointA, setPointA] = useState(null);
  const [pointB, setPointB] = useState(null);

  const handleClick = useCallback((e) => {
    const x = e.clientX;
    const y = e.clientY;
    if (!pointA) {
      setPointA({ x, y });
      setPointB(null);
    } else if (!pointB) {
      setPointB({ x, y });
    } else {
      setPointA({ x, y });
      setPointB(null);
    }
  }, [pointA, pointB]);

  const reset = useCallback(() => {
    setPointA(null);
    setPointB(null);
  }, []);

  const dx = pointA && pointB ? pointB.x - pointA.x : 0;
  const dy = pointA && pointB ? pointB.y - pointA.y : 0;
  const distance = pointA && pointB
    ? Math.round(Math.sqrt(dx * dx + dy * dy))
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.4)',
        cursor: 'crosshair',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 80,
      }}
    >
      {/* Instructions + results */}
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 24,
          boxShadow: '0 0 24px rgba(0, 255, 65, 0.2)',
          color: 'var(--accent)',
          fontSize: 14,
          minWidth: 280,
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 700 }}>Measure distance (px)</div>
        <div style={{ marginBottom: 4 }}>Click to set first point, then second point.</div>
        {pointA && !pointB && <div style={{ marginTop: 8, opacity: 0.9 }}>First point set. Click for second point.</div>}
        {pointA && pointB && (
          <div style={{ marginTop: 12, fontSize: 18 }}>
            <div><strong>Distance:</strong> {distance} px</div>
            <div style={{ marginTop: 4 }}>Δx: {dx} px · Δy: {dy} px</div>
          </div>
        )}
      </div>

      {/* Line between points */}
      {pointA && pointB && (
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
          width="100%"
          height="100%"
        >
          <line
            x1={pointA.x}
            y1={pointA.y}
            x2={pointB.x}
            y2={pointB.y}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <circle cx={pointA.x} cy={pointA.y} r={6} fill="var(--accent)" opacity={0.9} />
          <circle cx={pointB.x} cy={pointB.y} r={6} fill="var(--accent)" opacity={0.9} />
        </svg>
      )}

      {/* Point A marker only */}
      {pointA && !pointB && (
        <div
          style={{
            position: 'fixed',
            left: pointA.x - 6,
            top: pointA.y - 6,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); reset(); }}
          className="btn"
          style={{ padding: '10px 20px', borderRadius: 8 }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          className="btn-primary"
          style={{ padding: '10px 20px', borderRadius: 8 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
