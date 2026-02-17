import React, { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wankr_spark_zones';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.channelPoints && Array.isArray(parsed.channelPoints) && parsed.channelPoints.length >= 2) {
        return parsed;
      }
      if (parsed.origin && parsed.receiving) {
        return {
          channelPoints: [parsed.origin, parsed.receiving],
          shiftZone: parsed.fillArea || undefined,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

function saveZones(channelPoints, shiftZone) {
  try {
    const payload = { channelPoints, shiftZone: shiftZone || undefined };
    if (channelPoints.length >= 2) {
      payload.origin = channelPoints[0];
      payload.receiving = channelPoints[channelPoints.length - 1];
      if (shiftZone) payload.fillArea = shiftZone;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

const CHANNEL_POINTS_COUNT = 4;
const CHANNEL_COLORS = ['rgba(0,255,65,0.9)', 'rgba(100,255,100,0.8)', 'rgba(150,255,120,0.8)', 'rgba(255,180,80,0.9)'];

export default function SparkZonesTool({ onClose, onZonesSaved, sceneRef }) {
  const saved = loadSaved();
  const initChannel = saved?.channelPoints ?? null;
  const initShift = saved?.shiftZone ?? null;

  const [channelPoints, setChannelPoints] = useState(() => {
    if (initChannel && initChannel.length === CHANNEL_POINTS_COUNT) return initChannel;
    if (initChannel && initChannel.length >= 2) return [...initChannel];
    return [];
  });
  const [shiftCorner1, setShiftCorner1] = useState(initShift ? { x: initShift.left, y: initShift.top } : null);
  const [shiftCorner2, setShiftCorner2] = useState(initShift ? { x: initShift.right, y: initShift.bottom } : null);
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

      if (channelPoints.length < CHANNEL_POINTS_COUNT) {
        setChannelPoints((prev) => [...prev, point]);
        setShiftCorner1(null);
        setShiftCorner2(null);
      } else if (!shiftCorner1) {
        setShiftCorner1(point);
        setShiftCorner2(null);
      } else if (!shiftCorner2) {
        setShiftCorner2(point);
      } else {
        setChannelPoints([point]);
        setShiftCorner1(null);
        setShiftCorner2(null);
      }
    },
    [rect, channelPoints.length, shiftCorner1, shiftCorner2]
  );

  const shiftZone = shiftCorner1 && shiftCorner2
    ? {
        left: Math.min(shiftCorner1.x, shiftCorner2.x),
        top: Math.min(shiftCorner1.y, shiftCorner2.y),
        right: Math.max(shiftCorner1.x, shiftCorner2.x),
        bottom: Math.max(shiftCorner1.y, shiftCorner2.y),
      }
    : null;

  const memorize = useCallback(() => {
    if (channelPoints.length >= 2) {
      saveZones(channelPoints, shiftZone);
      onZonesSaved?.();
    }
  }, [channelPoints, shiftZone, onZonesSaved]);

  const reset = useCallback(() => {
    setChannelPoints([]);
    setShiftCorner1(null);
    setShiftCorner2(null);
  }, []);

  const channelComplete = channelPoints.length === CHANNEL_POINTS_COUNT;

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
          minWidth: 320,
        }}
      >
        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 16 }}>Spark channel & shift zone</div>
        <div style={{ marginBottom: 12, opacity: 0.9 }}>
          1) Click <strong>4 points</strong> in order for the channel (preferred path the spark follows on each strike).
        </div>
        <div style={{ marginBottom: 16, opacity: 0.9 }}>
          2) Then click <strong>2 corners</strong> for the shift zone (where the channel can move on other strikes).
        </div>
        {channelPoints.length > 0 && (
          <div style={{ marginBottom: 8, fontSize: 12 }}>
            Channel: {channelPoints.length}/4 points
            {channelPoints.map((p, i) => (
              <span key={i} style={{ marginLeft: 8 }}>
                P{i + 1} ({(p.x * 100).toFixed(0)},{(p.y * 100).toFixed(0)})
              </span>
            ))}
          </div>
        )}
        {shiftZone && (
          <div style={{ marginBottom: 16, fontSize: 12 }}>
            Shift zone: ({(shiftZone.left * 100).toFixed(0)}–{(shiftZone.right * 100).toFixed(0)}%) × ({(shiftZone.top * 100).toFixed(0)}–{(shiftZone.bottom * 100).toFixed(0)}%)
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              memorize();
            }}
            disabled={channelPoints.length < 2}
            title={channelComplete ? 'Save channel and shift zone' : 'Need at least 2 channel points'}
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
      {rect && channelPoints.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: rect.left + p.x * rect.width - 8,
            top: rect.top + p.y * rect.height - 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: `2px solid ${CHANNEL_COLORS[i]}`,
            background: CHANNEL_COLORS[i].replace('0.9', '0.35').replace('0.8', '0.3'),
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          title={`Channel point ${i + 1}`}
        />
      ))}
      {rect && channelPoints.length >= 2 && (
        <svg
          style={{
            position: 'fixed',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            pointerEvents: 'none',
            zIndex: 9998,
          }}
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          <polyline
            points={channelPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(0,255,65,0.4)"
            strokeWidth={0.008}
            strokeDasharray="0.02 0.02"
          />
        </svg>
      )}
      {rect && shiftZone && (
        <div
          style={{
            position: 'fixed',
            left: rect.left + shiftZone.left * rect.width,
            top: rect.top + shiftZone.top * rect.height,
            width: (shiftZone.right - shiftZone.left) * rect.width,
            height: (shiftZone.bottom - shiftZone.top) * rect.height,
            border: '2px dashed rgba(255,180,80,0.9)',
            background: 'rgba(255,180,80,0.08)',
            pointerEvents: 'none',
            zIndex: 9997,
          }}
          title="Shift zone (channel can move here on other strikes)"
        />
      )}
    </div>
  );
}
