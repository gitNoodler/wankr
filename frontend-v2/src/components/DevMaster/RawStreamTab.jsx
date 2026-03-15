import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../utils/api';

const POLL_INTERVAL = 5000;

export default function RawStreamTab() {
  const [activity, setActivity] = useState([]);
  const [stream, setStream] = useState({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const containerRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/pipeline/bankr-activity');
      const data = await res.json();
      setActivity(data.activity || []);
      setStream(data.stream || {});
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activity, autoScroll]);

  const filtered = filter
    ? activity.filter(t => t.text?.toLowerCase().includes(filter.toLowerCase()) || t.author?.toLowerCase().includes(filter.toLowerCase()))
    : activity;

  const modeLabel = stream.connected ? 'STREAM' : stream.pollActive ? 'POLL' : 'OFFLINE';
  const modeColor = stream.connected ? '#00ff41' : stream.pollActive ? '#ffaa00' : '#ff3333';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'monospace', fontSize: 11 }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px', borderBottom: '1px solid rgba(100,100,100,0.3)',
        background: 'rgba(0,0,0,0.3)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: modeColor, fontWeight: 'bold' }}>{'\u25CF'} {modeLabel}</span>
          <span style={{ color: '#888' }}>
            {stream.totalTweetsReceived || 0} tweets
            {stream.totalPollHits ? ` (${stream.totalPollHits} polled)` : ''}
            {stream.reconnectAttempts ? ` | ${stream.reconnectAttempts} reconn` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            placeholder="filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(100,100,100,0.4)',
              borderRadius: 3, padding: '2px 6px', color: '#ccc', fontSize: 10, width: 100,
              outline: 'none',
            }}
          />
          <label style={{ color: '#888', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} style={{ accentColor: '#ff6633' }} />
            auto
          </label>
        </div>
      </div>

      {/* Tweet list */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        {filtered.length === 0 && (
          <div style={{ color: '#555', padding: 16, textAlign: 'center' }}>
            {activity.length === 0 ? 'No stream data yet — waiting for tweets...' : 'No matches'}
          </div>
        )}
        {filtered.map((tweet, i) => {
          const age = tweet.timestamp ? timeSince(tweet.timestamp) : '';
          const isBankr = tweet.author?.toLowerCase() === '@bankrbot';
          return (
            <div key={tweet.id || i} style={{
              padding: '4px 8px',
              borderBottom: '1px solid rgba(60,60,60,0.3)',
              background: i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: isBankr ? '#ff6633' : '#4a9eff', fontWeight: 'bold' }}>
                  {tweet.author || '?'}
                </span>
                <span style={{ color: '#555', fontSize: 9 }}>{age} | id:{tweet.id?.slice(-6) || '?'}</span>
              </div>
              <div style={{ color: '#bbb', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.3 }}>
                {tweet.text || '(empty)'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '4px 8px', borderTop: '1px solid rgba(100,100,100,0.3)',
        background: 'rgba(0,0,0,0.3)', color: '#555', fontSize: 9, flexShrink: 0,
      }}>
        {filtered.length} / {activity.length} raw tweets | refreshes every {POLL_INTERVAL / 1000}s
      </div>
    </div>
  );
}

function timeSince(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}
