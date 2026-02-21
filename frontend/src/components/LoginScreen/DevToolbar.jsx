import { useState, useCallback } from 'react';
import { api } from '../../utils/api';

const BTN = {
  padding: '5px 10px',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: "'VT323', monospace",
  letterSpacing: '0.5px',
  borderRadius: 4,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'opacity 0.15s',
};
const greenBtn = {
  ...BTN,
  color: 'var(--accent)',
  background: 'rgba(0,255,65,0.12)',
  border: '1px solid rgba(0,255,65,0.4)',
};
const amberBtn = {
  ...BTN,
  color: '#ffb400',
  background: 'rgba(255,180,0,0.12)',
  border: '1px solid rgba(255,180,0,0.4)',
};
const redBtn = {
  ...BTN,
  color: '#ff6b6b',
  background: 'rgba(255,100,100,0.12)',
  border: '1px solid rgba(255,100,100,0.4)',
};

export default function DevToolbar() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(null);

  const flash = useCallback((msg, isError) => {
    setResult({ msg, isError });
    setTimeout(() => setResult(null), 4000);
  }, []);

  const run = useCallback(async (label, fn) => {
    setLoading(label);
    try {
      const res = await fn();
      flash(res, false);
    } catch (err) {
      flash(`${label}: ${err.message}`, true);
    } finally {
      setLoading(null);
    }
  }, [flash]);

  const healthCheck = () => run('Health', async () => {
    const r = await api.get('/api/health');
    const data = await r.json();
    return `Health: ${data.status || 'ok'} | uptime: ${Math.floor(data.uptimeSeconds || 0)}s`;
  });

  const grokStatus = () => run('Grok', async () => {
    const r = await api.get('/api/spectator/grok-status');
    const data = await r.json();
    return `Grok: ${data.enabled ? 'ENABLED' : 'DISABLED'} | queue: ${data.queueLength ?? '?'}`;
  });

  const kolReload = () => run('KOL', async () => {
    const r = await api.post('/api/kol/reload');
    const data = await r.json();
    return `KOL: reloaded ${data.count ?? '?'} accounts`;
  });

  const trainStats = () => run('Train', async () => {
    const r = await api.get('/api/training/stats');
    const data = await r.json();
    return `Train: ${data.totalExamples ?? '?'} examples | mode: ${data.mode ?? '?'}`;
  });

  const clearStorage = () => run('Storage', async () => {
    const count = localStorage.length;
    localStorage.clear();
    return `Cleared ${count} localStorage entries`;
  });

  const restartReq = () => run('Restart', async () => {
    const r = await api.get('/api/restart/request');
    const data = await r.json();
    return data.message || 'Restart requested';
  });

  const tools = [
    { label: 'HEALTH', style: greenBtn, action: healthCheck },
    { label: 'GROK', style: greenBtn, action: grokStatus },
    { label: 'KOL RELOAD', style: greenBtn, action: kolReload },
    { label: 'TRAIN STATS', style: greenBtn, action: trainStats },
    { label: 'CLEAR STORAGE', style: amberBtn, action: clearStorage },
    { label: 'RESTART', style: redBtn, action: restartReq },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'flex-start',
      }}
    >
      {result && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: 11,
            fontFamily: "'VT323', monospace",
            background: result.isError ? 'rgba(255,60,60,0.9)' : 'rgba(0,0,0,0.85)',
            color: result.isError ? '#fff' : 'var(--accent)',
            border: `1px solid ${result.isError ? 'rgba(255,100,100,0.6)' : 'rgba(0,255,65,0.4)'}`,
            borderRadius: 6,
            maxWidth: 420,
            wordBreak: 'break-word',
          }}
        >
          {result.msg}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={t.action}
            disabled={loading != null}
            style={{
              ...t.style,
              opacity: loading != null && loading !== t.label ? 0.4 : 1,
            }}
          >
            {loading === t.label ? '...' : t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
