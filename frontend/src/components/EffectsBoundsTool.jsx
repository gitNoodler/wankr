import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { loadSaved, saveBounds } from './effectsBoundsStorage';

/** Tool to define a box that clips all background effects (stars, glow traverse, glow point) to the selected region. */
export default function EffectsBoundsTool({ onClose, onSave }) {
  const saved = loadSaved();
  const [corner1, setCorner1] = useState(saved ? { x: saved.left, y: saved.top } : null);
  const [corner2, setCorner2] = useState(saved ? { x: saved.right, y: saved.bottom } : null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleClick = useCallback((e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    const xClamped = Math.max(0, Math.min(1, x));
    const yClamped = Math.max(0, Math.min(1, y));
    const point = { x: xClamped, y: yClamped };
    if (!corner1) {
      setCorner1(point);
      setCorner2(null);
    } else if (!corner2) {
      setCorner2(point);
    } else {
      setCorner1(point);
      setCorner2(null);
    }
  }, [corner1, corner2]);

  const bounds = useMemo(() => (corner1 && corner2
    ? {
        left: Math.min(corner1.x, corner2.x),
        top: Math.min(corner1.y, corner2.y),
        right: Math.max(corner1.x, corner2.x),
        bottom: Math.max(corner1.y, corner2.y),
      }
    : null), [corner1, corner2]);

  const memorize = useCallback(() => {
    if (bounds) {
      saveBounds(bounds);
      onSave?.();
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 1500);
    }
  }, [bounds, onSave]);

  const clear = useCallback(() => {
    saveBounds(null);
    setCorner1(null);
    setCorner2(null);
    onSave?.();
  }, [onSave]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
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
        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16 }}>Effects bounds</div>
        <div style={{ marginBottom: 16, opacity: 0.9 }}>
          Click two corners to define a box. All effects (stars, glow, sparks) will be clipped to this region.
        </div>
        {corner1 && !corner2 && <div style={{ marginBottom: 12 }}>First corner set. Click for second corner.</div>}
        {bounds && (
          <div style={{ marginBottom: 16, fontSize: 12 }}>
            Box: {Math.round(bounds.left * 100)}–{Math.round(bounds.right * 100)}% × {Math.round(bounds.top * 100)}–{Math.round(bounds.bottom * 100)}%
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); memorize(); }}
            disabled={!bounds}
            className="btn-primary"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            {savedFeedback ? 'Saved!' : 'Memorize'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="btn"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Clear bounds
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

      {/* Box outline preview */}
      {bounds && (
        <div
          style={{
            position: 'fixed',
            left: `${bounds.left * 100}%`,
            top: `${bounds.top * 100}%`,
            width: `${(bounds.right - bounds.left) * 100}%`,
            height: `${(bounds.bottom - bounds.top) * 100}%`,
            border: '2px dashed var(--accent)',
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.4)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Corner markers */}
      {corner1 && (
        <div
          style={{
            position: 'fixed',
            left: `${corner1.x * 100}%`,
            top: `${corner1.y * 100}%`,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
      {corner2 && (
        <div
          style={{
            position: 'fixed',
            left: `${corner2.x * 100}%`,
            top: `${corner2.y * 100}%`,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}
