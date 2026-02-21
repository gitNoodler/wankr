import React, { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Dev2: Position (offset %) and scale (%) for each robot part. Drives useLoginScreenState so sliders affect the scene.
 * Offset/scale are in % (scene units). Save as global defaults + Undo last.
 */
const PARTS = [
  { id: 'back', label: 'Back / Body' },
  { id: 'robot', label: 'Robot' },
  { id: 'shoulder', label: 'Shoulders' },
  { id: 'handLeft', label: 'Hand Left' },
  { id: 'handRight', label: 'Hand Right' },
];

function partSnapshot(state) {
  return {
    back: { offsetX: state.backOffsetX, offsetY: state.backOffsetY, scaleX: state.backScaleX, scaleY: state.backScaleY },
    robot: { offsetX: state.robotOffsetX, offsetY: state.robotOffsetY, scaleX: state.robotScaleX, scaleY: state.robotScaleY },
    shoulder: { offsetX: state.shoulderOffsetX, offsetY: state.shoulderOffsetY, scaleX: state.shoulderScaleX, scaleY: state.shoulderScaleY },
    handLeft: { offsetX: state.handLeftOffsetX, offsetY: state.handLeftOffsetY, scaleX: state.handLeftScaleX, scaleY: state.handLeftScaleY },
    handRight: { offsetX: state.handRightOffsetX, offsetY: state.handRightOffsetY, scaleX: state.handRightScaleX, scaleY: state.handRightScaleY },
  };
}

const PART_DEFAULT = { offsetX: 0, offsetY: 0, scaleX: 100, scaleY: 100 };

function PartRow({ part, snapshot, onChange, onBeforeChange }) {
  const raw = snapshot[part.id];
  const v = useMemo(() => raw || PART_DEFAULT, [raw]);
  const set = useCallback(
    (key, value) => {
      const n = Number(value);
      if (Number.isNaN(n)) return;
      onBeforeChange?.();
      onChange(part.id, { ...v, [key]: n });
    },
    [part.id, v, onChange, onBeforeChange]
  );
  return (
    <div
      style={{
        border: '1px solid rgba(0,255,65,0.25)',
        borderRadius: 6,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--accent)' }}>{part.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <label style={{ fontSize: 10, color: 'var(--text-muted-content)' }}>
          Offset X (%)
          <input
            type="number"
            value={v.offsetX}
            onChange={(e) => set('offsetX', e.target.value)}
            step={0.5}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 2,
              padding: '4px 6px',
              fontSize: 11,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 4,
              color: 'var(--accent)',
            }}
          />
        </label>
        <label style={{ fontSize: 10, color: 'var(--text-muted-content)' }}>
          Offset Y (%)
          <input
            type="number"
            value={v.offsetY}
            onChange={(e) => set('offsetY', e.target.value)}
            step={0.5}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 2,
              padding: '4px 6px',
              fontSize: 11,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 4,
              color: 'var(--accent)',
            }}
          />
        </label>
        <label style={{ fontSize: 10, color: 'var(--text-muted-content)' }}>
          Scale X (%)
          <input
            type="number"
            value={v.scaleX}
            onChange={(e) => set('scaleX', e.target.value)}
            step={1}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 2,
              padding: '4px 6px',
              fontSize: 11,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 4,
              color: 'var(--accent)',
            }}
          />
        </label>
        <label style={{ fontSize: 10, color: 'var(--text-muted-content)' }}>
          Scale Y (%)
          <input
            type="number"
            value={v.scaleY}
            onChange={(e) => set('scaleY', e.target.value)}
            step={1}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 2,
              padding: '4px 6px',
              fontSize: 11,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 4,
              color: 'var(--accent)',
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function RobotDevPanel({
  onClose,
  robotSnapshot,
  applyPartChange,
  onSaveGlobalDefaults,
}) {
  const undoStackRef = useRef([]);
  const [undoLen, setUndoLen] = useState(0);

  const pushUndo = useCallback(() => {
    if (!robotSnapshot) return;
    const snap = partSnapshot(robotSnapshot);
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    setUndoLen(undoStackRef.current.length);
  }, [robotSnapshot]);

  const handlePartChange = useCallback(
    (id, next) => {
      if (!applyPartChange) return;
      applyPartChange(id, next);
    },
    [applyPartChange]
  );

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0 || !applyPartChange) return;
    const prev = stack.pop();
    setUndoLen(stack.length);
    PARTS.forEach((p) => {
      const v = prev[p.id];
      if (v) applyPartChange(p.id, v);
    });
  }, [applyPartChange]);

  const handleSaveGlobal = useCallback(() => {
    if (!onSaveGlobalDefaults) return;
    const ok = window.confirm(
      'Save as global defaults? This replaces the saved layout for everyone (all users and ports). Continue?'
    );
    if (ok) onSaveGlobalDefaults();
  }, [onSaveGlobalDefaults]);

  const snapshot = robotSnapshot ? partSnapshot(robotSnapshot) : null;
  const canUndo = undoLen > 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 110,
        right: 20,
        zIndex: 200,
        background: 'rgba(0,0,0,0.95)',
        padding: '16px',
        borderRadius: '12px',
        border: '2px solid rgba(0,255,65,0.6)',
        boxShadow: '0 0 30px rgba(0,255,65,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minWidth: 260,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px' }}>
          DEV2 – Robot position & scale
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,100,100,0.5)',
            borderRadius: 4,
            color: '#ff6b6b',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted-content)' }}>
        Offset and scale in % (scene units). Scale is relative to each part&apos;s image origin.
      </p>
      {snapshot &&
        PARTS.map((part) => (
          <PartRow
            key={part.id}
            part={part}
            snapshot={snapshot}
            onChange={handlePartChange}
            onBeforeChange={pushUndo}
          />
        ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          style={{
            padding: '8px 12px',
            fontSize: 11,
            background: canUndo ? 'rgba(0,255,65,0.15)' : 'rgba(80,80,80,0.3)',
            border: `1px solid ${canUndo ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 6,
            color: canUndo ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
            cursor: canUndo ? 'pointer' : 'default',
          }}
        >
          Undo last
        </button>
        {onSaveGlobalDefaults && (
          <button
            type="button"
            onClick={handleSaveGlobal}
            style={{
              padding: '8px 12px',
              fontSize: 11,
              background: 'rgba(255,180,0,0.2)',
              border: '1px solid rgba(255,180,0,0.6)',
              borderRadius: 6,
              color: '#ffb84d',
              cursor: 'pointer',
            }}
          >
            Save as global defaults
          </button>
        )}
      </div>
    </div>
  );
}
