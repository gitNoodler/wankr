import React from 'react';

export default function SliderRow({ label, min, max, value, onChange, step = 1, disabled = false }) {
  const clamp = (n) => Math.min(max, Math.max(min, Number.isNaN(n) ? min : n));
  const parseVal = (v) => (step < 1 ? parseFloat(v) : parseInt(v, 10));
  const roundToStep = (n) => (step < 1 ? Math.round(n / step) * step : Math.round(n));
  return (
    <div style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--accent)', flex: 1 }}>{label}</span>
        <input
          type="number"
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') return;
            const n = parseVal(v);
            if (!Number.isNaN(n)) onChange(roundToStep(clamp(n)));
          }}
          onBlur={(e) => {
            const v = e.target.value;
            if (v === '' || Number.isNaN(parseVal(v))) onChange(min);
          }}
          style={{
            width: 52,
            padding: '4px 6px',
            fontSize: 12,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(0,255,65,0.5)',
            borderRadius: 6,
            color: 'var(--accent)',
            textAlign: 'right',
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  );
}
