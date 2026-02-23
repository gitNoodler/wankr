import { useCallback, useEffect, useState } from 'react';

/**
 * Two-click overlay for placing panels, buttons, or boundaries on the Wanking Live content area.
 * Clicks are normalized to 0-1 relative to contentRef bounds.
 */
export default function WankingLivePlacementOverlay({
  contentRef,
  mode, // 'panel' | 'button' | 'boundary'
  onAddElement,
  onAddBoundary,
  onCancel,
}) {
  const [rect, setRect] = useState(null);
  const [corner1, setCorner1] = useState(null);
  const [cursorNorm, setCursorNorm] = useState(null);

  useEffect(() => {
    const el = contentRef?.current;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contentRef]);

  const handleMouseMove = useCallback(
    (e) => {
      const el = contentRef?.current;
      const r = el?.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      setCursorNorm({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    },
    [contentRef]
  );

  const handleClick = useCallback(
    (e) => {
      const el = contentRef?.current;
      const r = el?.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return;

      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const xClamped = Math.max(0, Math.min(1, x));
      const yClamped = Math.max(0, Math.min(1, y));
      const point = { x: xClamped, y: yClamped };

      if (!corner1) {
        setCorner1(point);
        return;
      }

      const left = Math.min(corner1.x, xClamped);
      const top = Math.min(corner1.y, yClamped);
      const right = Math.max(corner1.x, xClamped);
      const bottom = Math.max(corner1.y, yClamped);
      const width = Math.max(0.01, right - left);
      const height = Math.max(0.01, bottom - top);

      if (mode === 'boundary') {
        onAddBoundary?.({
          id: `boundary-${Date.now()}`,
          left,
          top,
          right,
          bottom,
        });
      } else {
        onAddElement?.({
          id: `el-${Date.now()}`,
          type: mode,
          name: '',
          left: left * 100,
          top: top * 100,
          width: width * 100,
          height: height * 100,
          padding: 8,
          margin: 4,
          borderRadius: mode === 'button' ? 6 : 8,
          zIndex: 10,
        });
      }

      setCorner1(null);
      onCancel?.();
    },
    [contentRef, corner1, mode, onAddElement, onAddBoundary, onCancel]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setCorner1(null);
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  if (!mode || !rect) return null;

  const modeLabel = mode === 'panel' ? 'Panel' : mode === 'button' ? 'Button' : 'Boundary';

  return (
    <div
      role="dialog"
      aria-label={`Place ${modeLabel}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 190,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursorNorm(null)}
        onKeyDown={(e) => e.key === 'Escape' && (setCorner1(null), onCancel?.())}
        style={{
          position: 'fixed',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          cursor: 'crosshair',
          border: '3px dashed rgba(0,255,65,0.8)',
          boxSizing: 'border-box',
        }}
      />
      {corner1 && rect && (
        <>
          <div
            style={{
              position: 'fixed',
              left: rect.left + corner1.x * rect.width,
              top: rect.top + corner1.y * rect.height,
              width: 8,
              height: 8,
              marginLeft: -4,
              marginTop: -4,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 12px var(--accent)',
              pointerEvents: 'none',
            }}
          />
          {cursorNorm && (
            <>
              <svg
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                style={{
                  position: 'fixed',
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <defs>
                  <marker
                    id="placement-marker"
                    markerWidth={0.02}
                    markerHeight={0.02}
                    refX={0.01}
                    refY={0.01}
                    orient="auto"
                  >
                    <circle cx={0.01} cy={0.01} r={0.005} fill="var(--accent)" />
                  </marker>
                </defs>
                <line
                  x1={corner1.x}
                  y1={corner1.y}
                  x2={cursorNorm.x}
                  y2={cursorNorm.y}
                  stroke="var(--accent)"
                  strokeWidth={0.004}
                  strokeDasharray="0.02 0.02"
                  markerEnd="url(#placement-marker)"
                  opacity={0.9}
                />
                <line
                  x1={corner1.x}
                  y1={corner1.y}
                  x2={cursorNorm.x}
                  y2={corner1.y}
                  stroke="rgba(0,255,65,0.4)"
                  strokeWidth={0.002}
                  strokeDasharray="0.01 0.01"
                />
                <line
                  x1={cursorNorm.x}
                  y1={corner1.y}
                  x2={cursorNorm.x}
                  y2={cursorNorm.y}
                  stroke="rgba(0,255,65,0.4)"
                  strokeWidth={0.002}
                  strokeDasharray="0.01 0.01"
                />
              </svg>
              <div
                style={{
                  position: 'fixed',
                  left: rect.left + (corner1.x + cursorNorm.x) * 0.5 * rect.width - 40,
                  top: rect.top + (corner1.y + cursorNorm.y) * 0.5 * rect.height - 10,
                  width: 80,
                  textAlign: 'center',
                  padding: '4px 6px',
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid var(--accent)',
                  borderRadius: 4,
                  color: 'var(--accent)',
                  fontSize: 11,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                {Math.abs((cursorNorm.x - corner1.x) * 100).toFixed(1)}% × {Math.abs((cursorNorm.y - corner1.y) * 100).toFixed(1)}%
              </div>
            </>
          )}
        </>
      )}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 16px',
          background: 'rgba(0,0,0,0.9)',
          border: '2px solid var(--accent)',
          borderRadius: 8,
          color: 'var(--accent)',
          fontSize: 13,
          pointerEvents: 'none',
        }}
      >
        {corner1
          ? `Click second corner for ${modeLabel.toLowerCase()}. Esc to cancel.`
          : `Click first corner, then second. Esc to cancel.`}
      </div>
    </div>
  );
}
