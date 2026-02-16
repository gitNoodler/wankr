import React, { useState, useEffect, useRef } from 'react';

const TAB_TRAINING = 'training';
const TAB_DEVTOOLS = 'devtools';

const TrainingPanel = ({
  trainingMode,
  onConfigChange,
  systemPrompt,
  onSystemPromptChange,
  onResetPrompt,
  onTrain,
  trainCount,
}) => {
  const [activeTab, setActiveTab] = useState(TAB_TRAINING);
  const [config, setConfig] = useState({
    learningRate: 5.2e-6,
    entropyBonus: 0.08,
    klWeight: 0.12,
    temperature: 1.15,
    repPenalty: 1.25,
  });

  const [metrics, setMetrics] = useState({
    loss: 2.41,
    perplexity: 9.2,
    entropy: 3.85,
    gradientNorm: 1.24,
    steps: 1247,
    tokensThisSession: 18340,
  });

  const [checkpoints, setCheckpoints] = useState([]);

  // Live metrics simulation while training is active
  useEffect(() => {
    if (!trainingMode) return;
    const interval = setInterval(() => {
      setMetrics(prev => ({
        loss: Math.max(0.8, parseFloat(prev.loss) - 0.009).toFixed(2),
        perplexity: Math.max(3.0, parseFloat(prev.perplexity) - 0.06).toFixed(1),
        entropy: (parseFloat(prev.entropy) + 0.028).toFixed(2),
        gradientNorm: (0.9 + Math.random() * 0.8).toFixed(2),
        steps: prev.steps + 5,
        tokensThisSession: prev.tokensThisSession + 38,
      }));
    }, 900);
    return () => clearInterval(interval);
  }, [trainingMode]);

  const handleSliderChange = (key, value) => {
    const newConfig = { ...config, [key]: parseFloat(value) };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const saveCheckpoint = () => {
    const cp = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      config: { ...config },
      metrics: { ...metrics },
    };
    setCheckpoints(prev => [cp, ...prev].slice(0, 5));
  };

  const restoreLastCheckpoint = () => {
    if (checkpoints.length === 0) return;
    const last = checkpoints[0];
    setConfig(last.config);
    onConfigChange?.(last.config);
  };

  if (!trainingMode) return null;

  return (
    <div
      className="training-panel wankr-panel sidebar-panel open"
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 var(--dashboard-panel-padding)',
          height: 'var(--dashboard-header-height)',
          minHeight: 'var(--dashboard-header-height)',
          background: 'linear-gradient(180deg, #161616 0%, #0f0f0f 100%)',
          borderBottom: '1px solid rgba(100, 100, 100, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
          flexShrink: 0,
        }}
      >
        <h2
          className="font-wankr"
          style={{
            margin: 0,
            fontSize: 'var(--dashboard-title-font-size)',
            fontWeight: 900,
            color: 'var(--accent)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow:
              '0 0 22px rgba(0, 255, 0, 0.95), 0 0 40px rgba(0, 255, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7)',
          }}
        >
          {activeTab === TAB_DEVTOOLS ? 'UI Dev Tools' : 'Training Mode'}
        </h2>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(100, 100, 100, 0.5)',
          background: 'rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab(TAB_TRAINING)}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === TAB_TRAINING ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
            color: activeTab === TAB_TRAINING ? 'var(--accent)' : '#888',
            fontWeight: activeTab === TAB_TRAINING ? 700 : 400,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === TAB_TRAINING ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          Training
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(TAB_DEVTOOLS)}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === TAB_DEVTOOLS ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
            color: activeTab === TAB_DEVTOOLS ? 'var(--accent)' : '#888',
            fontWeight: activeTab === TAB_DEVTOOLS ? 700 : 400,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === TAB_DEVTOOLS ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          Dev tools
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--dashboard-panel-padding)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dashboard-panel-padding)',
          minHeight: 0,
          background: 'linear-gradient(180deg, #141414 0%, #0e0e0e 100%)',
          boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.6)',
        }}
      >
        {activeTab === TAB_DEVTOOLS ? (
          <DevToolsView />
        ) : (
          <>
        {/* System Prompt */}
        <div>
          <div className="sidebar-title" style={{ marginBottom: '8px' }}>System prompt override</div>
          <textarea
            value={systemPrompt}
            onChange={e => onSystemPromptChange?.(e.target.value)}
            className="input-field scroll-area"
            placeholder="Optional override. Chat always uses Wankr identity."
            style={{
              width: '100%',
              height: '80px',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'none',
              background: '#111',
              border: '1px solid rgba(100, 100, 100, 0.5)',
              borderRadius: 'var(--dashboard-panel-radius)',
              padding: 'var(--dashboard-input-padding)',
              color: '#ccc',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onResetPrompt}
              className="btn w-full text-sm"
              style={{ flex: 1, borderRadius: 'var(--dashboard-panel-radius)', padding: '10px' }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onTrain}
              className="btn-primary w-full text-sm"
              style={{ flex: 1, borderRadius: 'var(--dashboard-panel-radius)', padding: '10px', fontWeight: 'bold' }}
            >
              Add to training ({trainCount})
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div>
          <div className="sidebar-title" style={{ marginBottom: '14px' }}>Controls</div>
          <LearningRateSlider value={config.learningRate} min={LEARNING_RATE_MIN} max={LEARNING_RATE_MAX} onChange={v => handleSliderChange('learningRate', v)} />
          <Slider label="Entropy Bonus"     value={config.entropyBonus} min={0}    max={0.25} step={0.005} onChange={v => handleSliderChange('entropyBonus', v)} />
          <Slider label="KL Weight"         value={config.klWeight}     min={0}    max={0.6}  step={0.01}  onChange={v => handleSliderChange('klWeight', v)} />
          <Slider label="Temperature"       value={config.temperature}  min={0.6}  max={1.6}  step={0.05}  onChange={v => handleSliderChange('temperature', v)} />
          <Slider label="Rep Penalty"       value={config.repPenalty}   min={0.8}  max={2.0}  step={0.05}  onChange={v => handleSliderChange('repPenalty', v)} />
        </div>

        {/* Live Metrics */}
        <div>
          <div className="sidebar-title" style={{ marginBottom: '14px' }}>Live metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Metric label="Loss"          value={metrics.loss}          color="#ff5555" />
            <Metric label="Perplexity"    value={metrics.perplexity}    color="#ffaa00" />
            <Metric label="Entropy"       value={metrics.entropy + " bits"} color="#00ff41" />
            <Metric label="Gradient Norm" value={metrics.gradientNorm}  color="#8888ff" />
            <Metric label="Steps"         value={metrics.steps}         color="#ccc" />
            <Metric label="Tokens"        value={metrics.tokensThisSession} color="#ccc" />
          </div>
        </div>

        {/* Checkpoints */}
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={saveCheckpoint}
            className="btn-primary w-full text-sm"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--dashboard-panel-radius)',
              marginBottom: '10px',
              fontWeight: 'bold',
            }}
          >
            Save checkpoint
          </button>
          <button
            type="button"
            onClick={restoreLastCheckpoint}
            className="btn w-full text-sm"
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--dashboard-panel-radius)' }}
          >
            Restore last good
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const Slider = ({ label, value, min, max, step, onChange, displayValue }) => {
  const [inputStr, setInputStr] = useState('');
  const isControlled = inputStr === '';
  const display = displayValue != null ? displayValue : value;
  useEffect(() => {
    setInputStr('');
  }, [value]);
  const handleInputChange = (e) => {
    const raw = e.target.value;
    setInputStr(raw);
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      const clamped = clamp(num, min, max);
      onChange(String(clamped));
    }
  };
  const handleInputBlur = () => {
    const num = parseFloat(inputStr);
    if (Number.isNaN(num)) {
      setInputStr('');
      return;
    }
    const clamped = clamp(num, min, max);
    onChange(String(clamped));
    setInputStr('');
  };
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px', color: '#ddd', gap: '8px' }}>
        <span>{label}</span>
        <input
          type="text"
          inputMode="decimal"
          value={isControlled ? display : inputStr}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setInputStr(String(value))}
          style={{
            width: '88px',
            padding: '4px 8px',
            fontSize: '13px',
            fontFamily: 'inherit',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(100,100,100,0.5)',
            borderRadius: '6px',
            color: 'var(--accent)',
            textAlign: 'right',
          }}
        />
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', accentColor: '#00ff41' }} />
    </div>
  );
};

const LEARNING_RATE_MIN = 1e-7;
const LEARNING_RATE_MAX = 5e-5;
const EXP_MIN = 5; // 5e-5
const EXP_MAX = 7; // 1e-7

const toLRParts = (v) => {
  const n = Number(v);
  if (n <= 0 || !Number.isFinite(n)) return { coeff: 1, exp: 6 };
  const s = n.toExponential(2);
  const [cStr, eStr] = s.split('e');
  let coeff = parseFloat(cStr);
  let exp = Math.abs(parseInt(eStr, 10));
  exp = Math.min(EXP_MAX, Math.max(EXP_MIN, exp));
  coeff = Math.round((n / Math.pow(10, -exp)) * 100) / 100;
  return { coeff, exp };
};
const fromLRParts = (coeff, exp) => coeff * Math.pow(10, -exp);

const LearningRateSlider = ({ value, min, max, onChange }) => {
  const v = Number(value);
  const { coeff: initialCoeff, exp: initialExp } = toLRParts(v);
  const [coeff, setCoeff] = useState(initialCoeff);
  const [exp, setExp] = useState(initialExp);
  const prevValue = useRef(v);

  useEffect(() => {
    const num = Number(value);
    if (num !== prevValue.current) {
      prevValue.current = num;
      const p = toLRParts(num);
      setCoeff(p.coeff);
      setExp(p.exp);
    }
  }, [value]);

  const applyCoeff = (newCoeff) => {
    const n = parseFloat(newCoeff);
    if (Number.isNaN(n) || n <= 0) return;
    const val = clamp(fromLRParts(n, exp), min, max);
    onChange(String(val));
    const p = toLRParts(val);
    setCoeff(p.coeff);
    setExp(p.exp);
  };
  const applyExp = (newExp) => {
    const n = parseInt(String(newExp).replace(/\D/g, ''), 10);
    if (Number.isNaN(n) || n < EXP_MIN) return;
    const e = Math.min(EXP_MAX, Math.max(EXP_MIN, n));
    const val = clamp(fromLRParts(coeff, e), min, max);
    onChange(String(val));
    const p = toLRParts(val);
    setCoeff(p.coeff);
    setExp(p.exp);
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px', color: '#ddd', gap: '6px', flexWrap: 'wrap' }}>
        <span>Learning Rate</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="text"
            inputMode="decimal"
            value={coeff}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === '-') return;
              const n = parseFloat(val);
              if (!Number.isNaN(n) && n > 0) setCoeff(Math.round(n * 100) / 100);
            }}
            onBlur={(e) => applyCoeff(e.target.value)}
            style={{
              width: '52px',
              padding: '4px 6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(100,100,100,0.5)',
              borderRadius: '6px',
              color: 'var(--accent)',
              textAlign: 'right',
            }}
          />
          <span style={{ color: 'var(--accent)', fontSize: '13px' }}>e-</span>
          <input
            type="text"
            inputMode="numeric"
            value={exp}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val === '') return;
              const n = parseInt(val, 10);
              if (!Number.isNaN(n) && n >= 1) setExp(Math.min(EXP_MAX, Math.max(EXP_MIN, n)));
            }}
            onBlur={(e) => applyExp(e.target.value)}
            style={{
              width: '36px',
              padding: '4px 6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(100,100,100,0.5)',
              borderRadius: '6px',
              color: 'var(--accent)',
              textAlign: 'right',
            }}
          />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={min}
        value={v}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', accentColor: '#00ff41' }}
      />
    </div>
  );
};

const Metric = ({ label, value, color }) => (
  <div
    style={{
      background: 'linear-gradient(180deg, #1a1a1a 0%, #101010 100%)',
      padding: '12px',
      borderRadius: 'var(--dashboard-panel-radius)',
      border: '1px solid rgba(100, 100, 100, 0.5)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    }}
  >
    <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const defaultDevState = {
  opacity: 100,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  width: 200,
  widthUnit: 'px',
  height: 120,
  heightUnit: 'px',
  padding: 16,
  margin: 0,
  minWidth: 0,
  maxWidth: 9999,
  top: 0,
  left: 0,
  translateX: 0,
  translateY: 0,
  scale: 100,
  rotate: 0,
  zIndex: 0,
};

function DevToolsView() {
  const [state, setState] = useState(defaultDevState);

  const update = (key, value) => setState((s) => ({ ...s, [key]: value }));

  const filterParts = [];
  if (state.brightness !== 100) filterParts.push(`brightness(${state.brightness}%)`);
  if (state.contrast !== 100) filterParts.push(`contrast(${state.contrast}%)`);
  if (state.saturate !== 100) filterParts.push(`saturate(${state.saturate}%)`);
  if (state.blur > 0) filterParts.push(`blur(${state.blur}px)`);
  if (state.grayscale > 0) filterParts.push(`grayscale(${state.grayscale}%)`);
  const filter = filterParts.length ? filterParts.join(' ') : 'none';

  const previewStyle = {
    opacity: state.opacity / 100,
    filter,
    width: state.widthUnit === '%' ? `${state.width}%` : `${state.width}px`,
    height: state.heightUnit === 'px' ? `${state.height}px` : `${state.height}%`,
    padding: `${state.padding}px`,
    margin: `${state.margin}px`,
    minWidth: state.minWidth > 0 ? `${state.minWidth}px` : undefined,
    maxWidth: state.maxWidth < 9999 ? `${state.maxWidth}px` : undefined,
    position: 'relative',
    top: state.top,
    left: state.left,
    transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale / 100}) rotate(${state.rotate}deg)`,
    zIndex: state.zIndex,
    background: 'linear-gradient(135deg, #1e3a2f 0%, #0d1f18 100%)',
    border: '2px solid var(--accent)',
    borderRadius: '12px',
    boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
    fontSize: '12px',
  };

  const cssLines = [
    `opacity: ${state.opacity / 100};`,
    filter !== 'none' ? `filter: ${filter};` : null,
    `width: ${state.widthUnit === '%' ? state.width + '%' : state.width + 'px'};`,
    `height: ${state.heightUnit === 'px' ? state.height + 'px' : state.height + '%'};`,
    `padding: ${state.padding}px;`,
    `margin: ${state.margin}px;`,
    state.minWidth > 0 ? `min-width: ${state.minWidth}px;` : null,
    state.maxWidth < 9999 ? `max-width: ${state.maxWidth}px;` : null,
    `transform: translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale / 100}) rotate(${state.rotate}deg);`,
    `z-index: ${state.zIndex};`,
  ].filter(Boolean);

  const copyCss = () => {
    const text = cssLines.join('\n');
    navigator.clipboard?.writeText(text).then(() => {}, () => {});
  };

  return (
    <>
      <div className="sidebar-title" style={{ marginBottom: '8px' }}>Preview</div>
      <div style={{ background: '#0a0a0a', borderRadius: 'var(--dashboard-panel-radius)', padding: '20px', marginBottom: '16px', minHeight: 180 }}>
        <div style={previewStyle}>Preview</div>
      </div>
      <button type="button" onClick={copyCss} className="btn w-full text-sm" style={{ marginBottom: '16px', padding: '10px', borderRadius: 'var(--dashboard-panel-radius)' }}>
        Copy CSS
      </button>

      <div className="sidebar-title" style={{ marginBottom: '10px' }}>Effects</div>
      <Slider label="Opacity %" value={state.opacity} min={0} max={100} step={1} onChange={(v) => update('opacity', v)} />
      <Slider label="Brightness %" value={state.brightness} min={0} max={200} step={1} onChange={(v) => update('brightness', v)} />
      <Slider label="Contrast %" value={state.contrast} min={0} max={200} step={1} onChange={(v) => update('contrast', v)} />
      <Slider label="Saturate %" value={state.saturate} min={0} max={200} step={1} onChange={(v) => update('saturate', v)} />
      <Slider label="Blur px" value={state.blur} min={0} max={20} step={0.5} onChange={(v) => update('blur', v)} />
      <Slider label="Grayscale %" value={state.grayscale} min={0} max={100} step={1} onChange={(v) => update('grayscale', v)} />

      <div className="sidebar-title" style={{ marginTop: '8px', marginBottom: '10px' }}>Sizing</div>
      <Slider label="Width" value={state.width} min={0} max={800} step={1} onChange={(v) => update('width', v)} />
      <div style={{ marginBottom: '10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#ddd' }}>Width unit</span>
        <select
          value={state.widthUnit}
          onChange={(e) => update('widthUnit', e.target.value)}
          style={{ padding: '4px 8px', background: '#111', border: '1px solid rgba(100,100,100,0.5)', borderRadius: 6, color: 'var(--accent)' }}
        >
          <option value="px">px</option>
          <option value="%">%</option>
        </select>
      </div>
      <Slider label="Height" value={state.height} min={0} max={600} step={1} onChange={(v) => update('height', v)} />
      <div style={{ marginBottom: '10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#ddd' }}>Height unit</span>
        <select
          value={state.heightUnit}
          onChange={(e) => update('heightUnit', e.target.value)}
          style={{ padding: '4px 8px', background: '#111', border: '1px solid rgba(100,100,100,0.5)', borderRadius: 6, color: 'var(--accent)' }}
        >
          <option value="px">px</option>
          <option value="%">%</option>
        </select>
      </div>
      <Slider label="Padding px" value={state.padding} min={0} max={80} step={1} onChange={(v) => update('padding', v)} />
      <Slider label="Margin px" value={state.margin} min={0} max={80} step={1} onChange={(v) => update('margin', v)} />
      <Slider label="Min width px" value={state.minWidth} min={0} max={800} step={1} onChange={(v) => update('minWidth', v)} />
      <Slider label="Max width px" value={state.maxWidth} min={0} max={9999} step={10} onChange={(v) => update('maxWidth', v)} displayValue={state.maxWidth >= 9999 ? 'none' : state.maxWidth} />

      <div className="sidebar-title" style={{ marginTop: '8px', marginBottom: '10px' }}>Position & transform</div>
      <Slider label="Top px" value={state.top} min={-200} max={200} step={1} onChange={(v) => update('top', v)} />
      <Slider label="Left px" value={state.left} min={-200} max={200} step={1} onChange={(v) => update('left', v)} />
      <Slider label="Translate X px" value={state.translateX} min={-200} max={200} step={1} onChange={(v) => update('translateX', v)} />
      <Slider label="Translate Y px" value={state.translateY} min={-200} max={200} step={1} onChange={(v) => update('translateY', v)} />
      <Slider label="Scale %" value={state.scale} min={10} max={200} step={1} onChange={(v) => update('scale', v)} />
      <Slider label="Rotate deg" value={state.rotate} min={-180} max={180} step={1} onChange={(v) => update('rotate', v)} />
      <Slider label="z-index" value={state.zIndex} min={-10} max={100} step={1} onChange={(v) => update('zIndex', v)} />
    </>
  );
}

export default TrainingPanel;
