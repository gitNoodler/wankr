import React, { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wankr_spark_zones';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.origin && parsed.receiving) return parsed;
    }
  } catch {}
  return null;
}

function saveZones(origin, receiving, fillArea) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ origin, receiving, fillArea: fillArea || undefined }));
  } catch {}
}

export default function SparkZonesTool({ onClose, onZonesSaved, sceneRef }) {
  const saved = loadSaved();
  const initFillArea = saved?.fillArea;
  const [origin, setOrigin] = useState(saved?.origin ?? null);
  const [receiving, setReceiving] = useState(saved?.receiving ?? null);
  const [fillAreaCorner1, setFillAreaCorner1] = useState(
    initFillArea ? { x: initFillArea.left, y: initFillArea.top } : null
  );
  const [fillAreaCorner2, setFillAreaCorner2] = useState(
    initFillArea ? { x: initFillArea.right, y: initFillArea.bottom } : null
  );
  const [rect, setRect] = useState(null);

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
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const xClamped = Math.max(0, Math.min(1, x));
      const yClamped = Math.max(0, Math.min(1, y));
      const point = { x: xClamped, y: yClamped };
      if (!origin) {
        setOrigin(point);
        setReceiving(null);
        setFillAreaCorner1(null);
        setFillAreaCorner2(null);
      } else if (!receiving) {
        setReceiving(point);
        setFillAreaCorner1(null);
        setFillAreaCorner2(null);
      } else if (!fillAreaCorner1) {
        setFillAreaCorner1(point);
        setFillAreaCorner2(null);
      } else if (!fillAreaCorner2) {
        setFillAreaCorner2(point);
      } else {
        setOrigin(point);
        setReceiving(null);
        setFillAreaCorner1(null);
        setFillAreaCorner2(null);
      }
    },
    [rect, origin, receiving, fillAreaCorner1, fillAreaCorner2]
  );

  const fillArea = fillAreaCorner1 && fillAreaCorner2
    ? {
        left: Math.min(fillAreaCorner1.x, fillAreaCorner2.x),
        top: Math.min(fillAreaCorner1.y, fillAreaCorner2.y),
        right: Math.max(fillAreaCorner1.x, fillAreaCorner2.x),
        bottom: Math.max(fillAreaCorner1.y, fillAreaCorner2.y),
      }
    : null;

  const memorize = useCallback(() => {
    if (origin && receiving) {
      saveZones(origin, receiving, fillArea);
      onZonesSaved?.();
    }
  }, [origin, receiving, fillArea, onZonesSaved]);

  const reset = useCallback(() => {
    setOrigin(null);
    setReceiving(null);
    setFillAreaCorner1(null);
    setFillAreaCorner2(null);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
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
          boxShadow: '0 0 24px rgba(0,255,65,0.2)',
          color: 'var(--accent)',
          fontSize: 14,
          minWidth: 300,
        }}
      >
        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16 }}>Spark Zones</div>
        <div style={{ marginBottom: 16, opacity: 0.9 }}>
          1) Click <strong>origin</strong>, 2) <strong>receiving</strong>, 3) two corners for <strong>fill area</strong> (optional). Sparks stay within the rectangle.
        </div>
        {origin && (
          <div style={{ marginBottom: 8, fontSize: 12 }}>
            Origin: {((origin.x || 0) * 100).toFixed(1)}% × {((origin.y || 0) * 100).toFixed(1)}%
          </div>
        )}
        {receiving && (
          <div style={{ marginBottom: 8, fontSize: 12 }}>
            Receiving: {((receiving.x || 0) * 100).toFixed(1)}% × {((receiving.y || 0) * 100).toFixed(1)}%
          </div>
        )}
        {fillArea && (
          <div style={{ marginBottom: 16, fontSize: 12 }}>
            Fill area: {((fillArea.left || 0) * 100).toFixed(0)}–{((fillArea.right || 0) * 100).toFixed(0)}% × {((fillArea.top || 0) * 100).toFixed(0)}–{((fillArea.bottom || 0) * 100).toFixed(0)}%
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              memorize();
            }}
            disabled={!origin || !receiving}
            title={fillArea ? 'Save zones and fill area' : 'Save (fill area optional)'}
            className="btn-primary"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Memorize
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="btn"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="btn"
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Close
          </button>
        </div>
      </div>
      {rect && origin && (
        <div
          style={{
            position: 'fixed',
            left: rect.left + origin.x * rect.width - 8,
            top: rect.top + origin.y * rect.height - 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid rgba(0,255,65,0.9)',
            background: 'rgba(0,255,65,0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          title="Origin"
        />
      )}
      {rect && receiving && (
        <div
          style={{
            position: 'fixed',
            left: rect.left + receiving.x * rect.width - 8,
            top: rect.top + receiving.y * rect.height - 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid rgba(255,180,80,0.9)',
            background: 'rgba(255,180,80,0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          title="Receiving"
        />
      )}
      {rect && fillArea && (
        <div
          style={{
            position: 'fixed',
            left: rect.left + fillArea.left * rect.width,
            top: rect.top + fillArea.top * rect.height,
            width: (fillArea.right - fillArea.left) * rect.width,
            height: (fillArea.bottom - fillArea.top) * rect.height,
            border: '2px dashed rgba(100,200,255,0.8)',
            background: 'rgba(100,200,255,0.08)',
            pointerEvents: 'none',
            zIndex: 9997,
          }}
          title="Fill area"
        />
      )}
    </div>
  );
}
