import React, { useCallback, useEffect, useState } from 'react';

/**
 * Convert click position (in scene viewport 0-1) to scene-unit local coords (0-1)
 * by inverting: translate(tx%, ty%) scale(sx,sy) with origin center.
 */
function viewportToSceneUnitLocal(viewportX, viewportY, sceneOffsetX, sceneOffsetY, sceneScaleX, sceneScaleY) {
  const sx = sceneScaleX / 100;
  const sy = sceneScaleY / 100;
  const tx = sceneOffsetX / 100;
  const ty = sceneOffsetY / 100;
  const localX = 0.5 + (viewportX - 0.5 - tx) / sx;
  const localY = 0.5 + (viewportY - 0.5 - ty) / sy;
  return { x: localX, y: localY };
}

/**
 * Duct tape tool: place a line on the scene. Every visible layer the line touches
 * is positionally and proportionally bound (they pivot/scale around the tape).
 * Two clicks define the strip: start point, then end point.
 */
export default function DuctTapeTool({
  sceneRef,
  sceneOffsetX = 0,
  sceneOffsetY = 0,
  sceneScaleX = 100,
  sceneScaleY = 100,
  onAddStrip,
  onClose,
}) {
  const [rect, setRect] = useState(null);
  const [start, setStart] = useState(null);

  useEffect(() => {
    const el = sceneRef?.current;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sceneRef]);

  const handleClick = useCallback(
    (e) => {
      const el = sceneRef?.current;
      const r = el?.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return;
      const viewportX = (e.clientX - r.left) / r.width;
      const viewportY = (e.clientY - r.top) / r.height;
      const { x: localX, y: localY } = viewportToSceneUnitLocal(
        viewportX,
        viewportY,
        sceneOffsetX,
        sceneOffsetY,
        sceneScaleX,
        sceneScaleY
      );
      const xClamped = Math.max(0, Math.min(1, localX));
      const yClamped = Math.max(0, Math.min(1, localY));
      const point = { x: xClamped, y: yClamped };

      if (!start) {
        setStart(point);
        return;
      }
      onAddStrip?.({
        id: `tape-${Date.now()}`,
        x1: start.x,
        y1: start.y,
        x2: xClamped,
        y2: yClamped,
      });
      setStart(null);
    },
    [sceneRef, sceneOffsetX, sceneOffsetY, sceneScaleX, sceneScaleY, start, onAddStrip]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setStart(null);
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label="Place duct tape on scene"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 180,
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
        onKeyDown={(e) => e.key === 'Escape' && (setStart(null), onClose?.())}
        style={{
          position: 'fixed',
          left: rect?.left ?? 0,
          top: rect?.top ?? 0,
          width: rect?.width ?? 0,
          height: rect?.height ?? 0,
          cursor: 'crosshair',
          border: '3px dashed rgba(255,180,0,0.8)',
          boxSizing: 'border-box',
        }}
      />
      {start && rect && (
        <div
          style={{
            position: 'fixed',
            left: rect.left + (0.5 + (start.x - 0.5) * (sceneScaleX / 100) + sceneOffsetX / 100) * rect.width,
            top: rect.top + (0.5 + (start.y - 0.5) * (sceneScaleY / 100) + sceneOffsetY / 100) * rect.height,
            width: 8,
            height: 8,
            marginLeft: -4,
            marginTop: -4,
            borderRadius: '50%',
            background: 'rgba(255,180,0,0.9)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 16px',
          background: 'rgba(0,0,0,0.9)',
          border: '2px solid rgba(255,180,0,0.8)',
          borderRadius: 8,
          color: '#ffb400',
          fontSize: 13,
          pointerEvents: 'none',
        }}
      >
        {start ? 'Click end point for duct tape line. Esc to cancel.' : 'Click start point, then end point. Layers the line touches are bound.'}
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 14px',
          background: 'rgba(255,100,100,0.2)',
          border: '1px solid rgba(255,100,100,0.6)',
          borderRadius: 6,
          color: '#ff6b6b',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Done placing
      </button>
    </div>
  );
}
