import React, { useState, useEffect } from 'react';

const TrainingPanel = ({ 
  trainingMode, 
  onConfigChange,
  systemPrompt,
  onSystemPromptChange,
  onResetPrompt,
  onTrain,
  trainCount,
}) => {
  const [config, setConfig] = useState({
    learningRate: 5e-6,
    entropyBonus: 0.05,
    klWeight: 0.15,
    temperature: 1.0,
    repPenalty: 1.2,
  });

  const [metrics, setMetrics] = useState({
    loss: 2.34,
    perplexity: 8.1,
    entropy: 4.12,
    steps: 1247,
  });

  // Fake live metrics (remove later when real backend feeds it)
  useEffect(() => {
    if (!trainingMode) return;
    const interval = setInterval(() => {
      setMetrics(prev => ({
        loss: (parseFloat(prev.loss) - 0.01).toFixed(2),
        perplexity: (parseFloat(prev.perplexity) - 0.03).toFixed(1),
        entropy: (parseFloat(prev.entropy) + 0.02).toFixed(2),
        steps: prev.steps + 3,
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, [trainingMode]);

  const handleSliderChange = (key, value) => {
    const newConfig = { ...config, [key]: parseFloat(value) };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className={`training-panel wankr-panel ${!trainingMode ? 'closed' : ''}`} style={{ padding: trainingMode ? 'var(--dashboard-panel-padding)' : 0 }}>
      {trainingMode && (
        <>
          <div style={{ height: 'var(--dashboard-header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--accent)', marginBottom: '20px' }}>
            <div style={{ fontSize: 'var(--dashboard-title-font-size)', color: 'var(--accent)', fontWeight: 'bold' }}>
              TRAINING MODE
            </div>
            <div style={{ color: '#00ff41', fontSize: '14px' }}>● LIVE</div>
          </div>

          {/* System Prompt Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>SYSTEM PROMPT</div>
            <div
              style={{
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid rgba(100, 100, 100, 0.5)',
                borderRadius: '8px',
              }}
            >
              <textarea
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                className="input-field scroll-area"
                placeholder="Optional override. Chat always uses Wankr identity."
                style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'none',
                  background: '#111',
                  border: '1px solid #333',
                  color: '#ccc',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onResetPrompt}
                  className="btn text-sm"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    background: '#111',
                    border: '1px solid #444',
                    color: '#aaa',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onTrain}
                  className="btn-primary text-sm"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Add to training
                </button>
              </div>
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                Training examples: <span style={{ color: 'var(--accent)' }}>{trainCount}</span>
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>LIVE METRICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Metric label="Loss" value={metrics.loss} color="#ff4444" />
              <Metric label="Perplexity" value={metrics.perplexity} color="#ffaa00" />
              <Metric label="Entropy" value={metrics.entropy} color="#00ff41" />
              <Metric label="Steps" value={metrics.steps} color="#8888ff" />
            </div>
          </div>

          {/* Sliders */}
          <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>VARIABLES</div>
          
          <Slider label="Learning Rate" value={config.learningRate} min={1e-7} max={1e-4} step={1e-7} onChange={v => handleSliderChange('learningRate', v)} />
          <Slider label="Entropy Bonus" value={config.entropyBonus} min={0} max={0.25} step={0.001} onChange={v => handleSliderChange('entropyBonus', v)} />
          <Slider label="KL Weight" value={config.klWeight} min={0} max={0.5} step={0.01} onChange={v => handleSliderChange('klWeight', v)} />
          <Slider label="Temperature" value={config.temperature} min={0.6} max={1.6} step={0.05} onChange={v => handleSliderChange('temperature', v)} />
          <Slider label="Rep Penalty" value={config.repPenalty} min={0.5} max={2.0} step={0.05} onChange={v => handleSliderChange('repPenalty', v)} />

          {/* Checkpoints */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #222' }}>
            <button style={{ width: '100%', padding: '12px', background: 'rgba(0,255,65,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              Save Snapshot
            </button>
            <button style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #444', color: '#aaa', borderRadius: '8px', cursor: 'pointer' }}>
              Restore Last Good
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value, color }) => (
  <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px' }}>
    <div style={{ fontSize: '11px', color: '#666' }}>{label}</div>
    <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
  </div>
);

const Slider = ({ label, value, min, max, step, onChange }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--accent)' }}>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', accentColor: '#00ff41' }}
    />
  </div>
);

export default TrainingPanel;
