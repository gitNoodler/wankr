import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

const LAUNCH_COLOR = '#00ff41';

const CHAIN_LOGOS = {
  base: '\u{1F535}',
  solana: '\u{1F7E3}',
  ethereum: '\u27E0',
};

function ChainBadge({ chain }) {
  const logo = CHAIN_LOGOS[chain] || CHAIN_LOGOS.base;
  return (
    <span style={{ fontSize: 'calc(10px * var(--scale))', lineHeight: 1, flexShrink: 0 }} title={chain || 'base'}>
      {logo}
    </span>
  );
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (!isNaN(d.getTime())) {
    const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  const m = String(ts).match(/([\d.]+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
  if (m) {
    const n = Math.round(parseFloat(m[1]));
    const u = m[2].toLowerCase();
    if (u.startsWith('second')) return `${n}s ago`;
    if (u.startsWith('minute')) return `${n}m ago`;
    if (u.startsWith('hour')) return `${n}h ago`;
    if (u.startsWith('day')) return `${n}d ago`;
    if (u.startsWith('week')) return `${n * 7}d ago`;
    if (u.startsWith('month')) return `${n * 30}d ago`;
    return `${n * 365}d ago`;
  }
  return ts;
}

function shortenAddress(addr) {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// Inject slide-in keyframe once
if (typeof document !== 'undefined' && !document.getElementById('livefeed-slide-style')) {
  const style = document.createElement('style');
  style.id = 'livefeed-slide-style';
  style.textContent = '@keyframes feedSlideIn { from { opacity: 0; transform: translateY(-8px); max-height: 0; } to { opacity: 1; transform: translateY(0); max-height: 200px; } }';
  document.head.appendChild(style);
}

function BankrLiveFeedPanel({ onClose }) {
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(null);
  const prevHashRef = useRef('');

  const loadFeed = useCallback(async () => {
    try {
      // Uses same endpoint for now — will switch to bankr bot API
      const res = await api.get('/api/pipeline/launch-feed');
      const data = await res.json();
      const incoming = data.launches || [];
      const hash = incoming.map(l => l.contractAddress || l.tokenName).join('|');
      if (hash !== prevHashRef.current) {
        prevHashRef.current = hash;
        setLaunches(incoming);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 3000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  // Only show actual launches (no fee claims, airdrops, misc) — sorted newest first
  const filtered = (() => {
    let launchesOnly = launches.filter(l => !l.actionType || l.actionType === 'launch');
    // Ensure newest-first sort
    launchesOnly.sort((a, b) => {
      const ta = a.firstSeen || a.timestamp || '';
      const tb = b.firstSeen || b.timestamp || '';
      return tb.localeCompare(ta);
    });
    const q = searchQuery.toLowerCase().trim();
    if (!q) return launchesOnly;
    return launchesOnly.filter(l =>
      (l.tokenName || '').toLowerCase().includes(q)
      || (l.tokenSymbol || '').toLowerCase().includes(q)
      || (l.contractAddress || '').toLowerCase().includes(q)
      || (l.requestedBy || '').toLowerCase().includes(q)
    );
  })();

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: onClose ? 'space-between' : 'center',
        padding: '0 calc(12px * var(--scale))',
        height: 'calc(48px * var(--scale))',
        minHeight: 'calc(48px * var(--scale))',
        borderBottom: '1px solid rgba(100, 100, 100, 0.4)',
        flexShrink: 0,
      }}>
        <h3 className="font-wankr" style={{
          margin: 0,
          fontSize: 'calc(13px * var(--scale))',
          fontWeight: 700,
          color: '#00bfff',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: '0 0 8px rgba(0, 191, 255, 0.5)',
        }}>
          Live Feed
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: '1px solid rgba(255,100,100,0.4)',
            borderRadius: 6, color: '#ff6b6b', cursor: 'pointer', fontSize: 14,
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ✕
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{
        padding: 'calc(4px * var(--scale)) calc(8px * var(--scale))',
        borderBottom: '1px solid rgba(100, 100, 100, 0.2)',
        flexShrink: 0,
      }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setExpanded(null); }}
          placeholder="Search launches..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(100,100,100,0.3)',
            borderRadius: 'calc(4px * var(--scale))',
            padding: 'calc(4px * var(--scale)) calc(8px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
            color: '#ddd',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(0,191,255,0.5)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(100,100,100,0.3)'; }}
        />
      </div>

      {/* Feed list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: 'calc(6px * var(--scale))',
        display: 'flex', flexDirection: 'column', gap: 'calc(3px * var(--scale))',
      }}>
        {loading && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted-content)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            Loading live feed...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted-content)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            No launches found.
          </div>
        )}

        {filtered.map((launch, i) => {
          const isExpanded = expanded === i;
          const isFailed = launch.failedAttempt;
          const borderColor = isFailed ? '#ff3333' : LAUNCH_COLOR;

          return (
            <div
              key={i}
              onClick={() => setExpanded(isExpanded ? null : i)}
              style={{
                padding: 'calc(6px * var(--scale))',
                background: isFailed ? 'rgba(255,50,50,0.04)' : `${LAUNCH_COLOR}06`,
                border: `1px solid ${borderColor}20`,
                borderLeft: `3px solid ${borderColor}50`,
                borderRadius: 'calc(4px * var(--scale))',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                animation: 'feedSlideIn 0.3s ease-out',
                opacity: isFailed ? 0.6 : 1,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 'calc(4px * var(--scale))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', minWidth: 0, flex: 1 }}>
                  <ChainBadge chain={launch.chain} />
                  {isFailed && (
                    <span style={{
                      fontSize: 'calc(6px * var(--scale))', fontWeight: 800, color: '#fff', background: '#ff3333',
                      borderRadius: 'calc(2px * var(--scale))', padding: '0 calc(3px * var(--scale))',
                      lineHeight: 'calc(11px * var(--scale))', textTransform: 'uppercase', flexShrink: 0,
                    }}>
                      FAILED
                    </span>
                  )}
                  <span style={{
                    color: isFailed ? '#888' : 'var(--accent)',
                    fontWeight: 700,
                    fontSize: 'calc(10px * var(--scale))',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textDecoration: isFailed ? 'line-through' : 'none',
                  }}>
                    {launch.tokenName || 'Unknown'}
                  </span>
                  {launch.tokenSymbol && launch.tokenSymbol !== '???' && (
                    <span style={{ color: 'var(--text-muted-content)', fontSize: 'calc(8px * var(--scale))', flexShrink: 0 }}>
                      ${launch.tokenSymbol}
                    </span>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {(launch.requestedBy || launch.postAuthor) && (
                    <span style={{ fontSize: 'calc(8px * var(--scale))', color: '#ff9944' }}>
                      {launch.requestedBy || launch.postAuthor}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact second row: timestamp + address */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--scale))',
                marginTop: 'calc(2px * var(--scale))',
                fontSize: 'calc(8px * var(--scale))',
              }}>
                {(launch.firstSeen || launch.timestamp) && (
                  <span style={{ color: '#555', fontSize: 'calc(7px * var(--scale))' }}>
                    {formatTimestamp(launch.firstSeen || launch.timestamp)}
                  </span>
                )}
                {launch.contractAddress && (
                  <span style={{ fontFamily: 'monospace', color: '#666' }}>
                    {shortenAddress(launch.contractAddress)}
                  </span>
                )}
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{
                  marginTop: 'calc(4px * var(--scale))',
                  paddingTop: 'calc(4px * var(--scale))',
                  borderTop: '1px solid rgba(100,100,100,0.2)',
                  fontSize: 'calc(9px * var(--scale))',
                  color: 'var(--text-content)',
                }}>
                  {launch.contractAddress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', fontSize: 'calc(8px * var(--scale))' }}>
                      <span style={{ color: '#888' }}>Contract:</span>
                      <span style={{ fontFamily: 'monospace', color: '#aaa', wordBreak: 'break-all' }}>{launch.contractAddress}</span>
                    </div>
                  )}
                  {(launch.requestedBy || launch.postAuthor) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', fontSize: 'calc(8px * var(--scale))', marginTop: 'calc(2px * var(--scale))' }}>
                      <span style={{ color: '#888' }}>Deployed by:</span>
                      <span style={{ color: '#ff9944' }}>{launch.requestedBy || launch.postAuthor}</span>
                    </div>
                  )}
                  {launch.announcement && (
                    <div style={{
                      marginTop: 'calc(3px * var(--scale))',
                      padding: 'calc(3px * var(--scale)) calc(5px * var(--scale))',
                      borderLeft: `2px solid ${LAUNCH_COLOR}40`,
                      background: 'rgba(255,255,255,0.02)',
                      color: 'rgba(255,255,255,0.6)',
                      fontStyle: 'italic',
                      fontSize: 'calc(8px * var(--scale))',
                      lineHeight: 1.4,
                    }}>
                      {launch.announcement}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        textAlign: 'center',
        padding: 'calc(6px * var(--scale))',
        color: 'var(--text-muted-content)',
        borderTop: '1px solid rgba(100, 100, 100, 0.3)',
        fontSize: 'calc(8px * var(--scale))',
      }}>
        {filtered.length} launches | Bankr Bot API (coming soon)
      </div>
    </div>
  );
}

export default memo(BankrLiveFeedPanel);
