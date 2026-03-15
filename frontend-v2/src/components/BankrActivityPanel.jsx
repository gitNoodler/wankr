import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function BankrActivityPanel({ onClose }) {
  const [activity, setActivity] = useState([]);
  const [stream, setStream] = useState({});
  const [loading, setLoading] = useState(true);
  const prevHashRef = useRef('');

  const loadActivity = useCallback(async () => {
    try {
      const res = await api.get('/api/pipeline/bankr-activity');
      const data = await res.json();
      const items = data.activity || [];
      const hash = items.map(a => a.id).join('|');
      if (hash !== prevHashRef.current) {
        prevHashRef.current = hash;
        setActivity(items);
      }
      setStream(data.stream || {});
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 3000);
    return () => clearInterval(interval);
  }, [loadActivity]);

  // Live clock for relative timestamps
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height: '100%', minHeight: 0, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', background: 'transparent',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 calc(12px * var(--scale))',
        height: 'calc(48px * var(--scale))', minHeight: 'calc(48px * var(--scale))',
        borderBottom: '1px solid rgba(100, 100, 100, 0.4)', flexShrink: 0,
      }}>
        <h3 className="font-wankr" style={{
          margin: 0, fontSize: 'calc(13px * var(--scale))',
          color: '#00ff41', letterSpacing: '2px',
        }}>
          BANKR ACTIVITY
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--scale))' }}>
          <span style={{
            fontSize: 'calc(10px * var(--scale))',
            color: stream.connected ? '#00ff41' : '#ff3333',
          }}>
            {stream.connected ? '● LIVE' : '○ OFFLINE'}
          </span>
          <span style={{ fontSize: 'calc(10px * var(--scale))', color: '#555' }}>
            {stream.totalTweetsReceived || 0} received
          </span>
        </div>
      </div>

      {/* Activity list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: 'calc(4px * var(--scale))',
      }}>
        {loading && activity.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', padding: 'calc(20px * var(--scale))', fontSize: 'calc(11px * var(--scale))' }}>
            Loading...
          </div>
        )}
        {!loading && activity.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', padding: 'calc(20px * var(--scale))', fontSize: 'calc(11px * var(--scale))' }}>
            {stream.connected ? 'Listening... no tweets yet' : 'Stream offline — no activity'}
          </div>
        )}
        {activity.map((item) => (
          <div key={item.id} style={{
            padding: 'calc(8px * var(--scale)) calc(10px * var(--scale))',
            borderBottom: '1px solid rgba(60, 60, 60, 0.3)',
            fontSize: 'calc(11px * var(--scale))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'calc(3px * var(--scale))' }}>
              <span style={{ color: '#00bfff', fontWeight: 600 }}>{item.author || 'unknown'}</span>
              <span style={{ color: '#555', fontSize: 'calc(9px * var(--scale))' }}>{formatTime(item.timestamp)}</span>
            </div>
            <div style={{ color: '#ccc', lineHeight: 1.4, wordBreak: 'break-word' }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(BankrActivityPanel);
