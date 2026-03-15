import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

const REACTION_COLORS = {
  positive: '#00ff41',
  negative: '#ff3333',
  mixed: '#ffcc00',
  neutral: '#666',
};

const ACTION_COLORS = {
  launch: '#00ff41',
  fee_claim: '#5ad8ff',
  airdrop: '#cc66ff',
  other: '#888',
};

const ACTION_LABELS = {
  launch: 'Launch',
  fee_claim: 'Fee Claim',
  airdrop: 'Airdrop',
  other: 'Activity',
};

const CHAIN_LOGOS = {
  base: '🔵',
  solana: '🟣',
  ethereum: '⟠',
};

const BOT_BADGE = {
  likely: { label: 'BOT', bg: '#ff3333', color: '#fff' },
  suspicious: { label: 'SUS', bg: '#ffcc00', color: '#111' },
};

function SentimentIndicator({ status, reaction }) {
  if (status === 'pending' || status === 'processing') {
    return (
      <span style={{
        display: 'inline-block',
        width: 'calc(8px * var(--scale))',
        height: 'calc(8px * var(--scale))',
        border: '2px solid #555',
        borderTop: `2px solid ${status === 'processing' ? '#ff9900' : '#ff6633'}`,
        borderRadius: '50%',
        animation: 'sentimentSpin 0.8s linear infinite',
        flexShrink: 0,
      }} />
    );
  }
  if (reaction === 'positive') {
    return (
      <span style={{ fontSize: 'calc(10px * var(--scale))', lineHeight: 1, flexShrink: 0 }}>
        👍
      </span>
    );
  }
  const color = REACTION_COLORS[reaction] || '#666';
  return (
    <span style={{
      display: 'inline-block',
      width: 'calc(6px * var(--scale))',
      height: 'calc(6px * var(--scale))',
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
    }} />
  );
}

function ChainBadge({ chain }) {
  const logo = CHAIN_LOGOS[chain] || CHAIN_LOGOS.base;
  return (
    <span style={{
      fontSize: 'calc(10px * var(--scale))',
      lineHeight: 1,
      flexShrink: 0,
    }} title={chain || 'base'}>
      {logo}
    </span>
  );
}

function BotBadge({ flag }) {
  const badge = BOT_BADGE[flag];
  if (!badge) return null;
  return (
    <span style={{
      fontSize: 'calc(7px * var(--scale))',
      fontWeight: 800,
      color: badge.color,
      background: badge.bg,
      borderRadius: 'calc(3px * var(--scale))',
      padding: '0 calc(4px * var(--scale))',
      lineHeight: 'calc(13px * var(--scale))',
      letterSpacing: '0.5px',
      marginLeft: 'calc(3px * var(--scale))',
      flexShrink: 0,
    }}>
      {badge.label}
    </span>
  );
}

function formatTimestamp(ts) {
  if (!ts) return '';
  // Try parsing as a date first
  const d = new Date(ts);
  if (!isNaN(d.getTime())) {
    const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  // Parse relative strings like "2 days ago", "2.5 hours ago"
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

let _groupId = 0;
function groupLaunches(launches) {
  const map = new Map();
  for (const l of launches) {
    const name = (l.tokenName || '').toLowerCase().trim();
    // Group by token name — stack same-name launches even from different handles
    const key = (name && name !== 'unknown') ? name : `_ungrouped_${_groupId++}`;
    if (map.has(key)) {
      const g = map.get(key);
      g.count++;
      g.entries.push(l);
      if (!g.contractAddress && l.contractAddress) g.contractAddress = l.contractAddress;
    } else {
      map.set(key, { ...l, count: 1, entries: [l] });
    }
  }
  // Build per-group handle summaries with counts and worst bot flag
  for (const g of map.values()) {
    const handleMap = {};
    for (const e of g.entries) {
      const h = e.requestedBy || e.postAuthor || null;
      if (!h) continue;
      if (!handleMap[h]) handleMap[h] = { handle: h, count: 0, botFlag: null };
      handleMap[h].count++;
      // Keep the worst flag per handle
      const flag = e.botFlag;
      if (flag === 'likely' || (flag === 'suspicious' && handleMap[h].botFlag !== 'likely')) {
        handleMap[h].botFlag = flag;
      }
    }
    g.handles = Object.values(handleMap).sort((a, b) => b.count - a.count);
    // Group-level worst flag
    g.worstFlag = g.handles.some(h => h.botFlag === 'likely') ? 'likely'
      : g.handles.some(h => h.botFlag === 'suspicious') ? 'suspicious' : null;
  }
  // Newest first by firstSeen, then by timestamp
  return [...map.values()].sort((a, b) => {
    const ta = a.firstSeen || a.timestamp || '';
    const tb = b.firstSeen || b.timestamp || '';
    return tb.localeCompare(ta);
  });
}

// Group launches by requesting handle for handle-view mode
function groupByHandle(launches) {
  const map = {};
  for (const l of launches) {
    const handle = (l.requestedBy || l.postAuthor || 'unknown').trim();
    if (!map[handle]) map[handle] = { handle, launches: [], botFlag: null };
    map[handle].launches.push(l);
    const flag = l.botFlag;
    if (flag === 'likely' || (flag === 'suspicious' && map[handle].botFlag !== 'likely')) {
      map[handle].botFlag = flag;
    }
  }
  // Sort each handle's launches newest-first
  for (const g of Object.values(map)) {
    g.launches.sort((a, b) => {
      const ta = a.firstSeen || a.timestamp || '';
      const tb = b.firstSeen || b.timestamp || '';
      return tb.localeCompare(ta);
    });
  }
  // Sort handle groups by most recent launch (newest first)
  return Object.values(map).sort((a, b) => {
    const ta = a.launches[0]?.firstSeen || a.launches[0]?.timestamp || '';
    const tb = b.launches[0]?.firstSeen || b.launches[0]?.timestamp || '';
    return tb.localeCompare(ta);
  });
}

const HANDLE_3PLUS_COLOR = '#ff6633'; // orange highlight for 3+ launch handles
const HANDLE_NORMAL_COLOR = '#ff9944';

// Inject spinner keyframe once
if (typeof document !== 'undefined' && !document.getElementById('sentiment-spin-style')) {
  const style = document.createElement('style');
  style.id = 'sentiment-spin-style';
  style.textContent = '@keyframes sentimentSpin { to { transform: rotate(360deg); } } @keyframes feedSlideIn { from { opacity: 0; transform: translateY(-8px); max-height: 0; } to { opacity: 1; transform: translateY(0); max-height: 200px; } } @keyframes batchPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }';
  document.head.appendChild(style);
}

function BatchQueueCard({ entries, countdown }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  return (
    <div style={{
      background: 'rgba(255, 153, 0, 0.08)',
      border: '1px solid rgba(255, 153, 0, 0.35)',
      borderLeft: '3px solid #ff9900',
      borderRadius: 'calc(4px * var(--scale))',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header bar */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'calc(8px * var(--scale)) calc(10px * var(--scale))',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--scale))' }}>
          {/* Batch icon — spinning hourglass */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 'calc(18px * var(--scale))', height: 'calc(18px * var(--scale))',
            borderRadius: 'calc(3px * var(--scale))',
            background: 'rgba(255, 153, 0, 0.2)',
            fontSize: 'calc(11px * var(--scale))',
            animation: 'batchPulse 2s ease-in-out infinite',
            flexShrink: 0,
          }}>
            ⏳
          </span>
          <span style={{
            fontSize: 'calc(10px * var(--scale))',
            fontWeight: 700, color: '#ff9900',
            letterSpacing: '0.5px',
          }}>
            Batching: Entries Queued for Sentiment Check
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--scale))' }}>
          {countdown && (
            <span style={{
              fontSize: 'calc(8px * var(--scale))',
              color: '#888', fontFamily: 'monospace',
            }}>
              {countdown}
            </span>
          )}
          <span style={{
            fontSize: 'calc(10px * var(--scale))',
            fontWeight: 800, color: '#111',
            background: '#ff9900',
            borderRadius: 'calc(3px * var(--scale))',
            padding: '0 calc(6px * var(--scale))',
            lineHeight: 'calc(16px * var(--scale))',
            minWidth: 'calc(18px * var(--scale))',
            textAlign: 'center',
          }}>
            {entries.length}
          </span>
          <span style={{
            fontSize: 'calc(10px * var(--scale))',
            color: '#666',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}>
            ▼
          </span>
        </div>
      </div>
      {/* Expanded list */}
      {open && (
        <div style={{
          borderTop: '1px solid rgba(255, 153, 0, 0.2)',
          padding: 'calc(4px * var(--scale)) calc(8px * var(--scale))',
          display: 'flex', flexDirection: 'column', gap: 'calc(3px * var(--scale))',
          maxHeight: 'calc(200px * var(--scale))',
          overflowY: 'auto',
        }}>
          {entries.map((entry, i) => (
            <div key={entry.contractAddress || entry.tokenName || i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'calc(4px * var(--scale)) calc(4px * var(--scale))',
              borderBottom: i < entries.length - 1 ? '1px solid rgba(100,100,100,0.15)' : 'none',
              fontSize: 'calc(9px * var(--scale))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', minWidth: 0, flex: 1 }}>
                <ChainBadge chain={entry.chain} />
                <span style={{
                  display: 'inline-block',
                  width: 'calc(8px * var(--scale))', height: 'calc(8px * var(--scale))',
                  border: '2px solid #555', borderTop: '2px solid #ff9900',
                  borderRadius: '50%',
                  animation: 'sentimentSpin 0.8s linear infinite',
                  flexShrink: 0,
                }} />
                <span style={{ color: '#00ff41', fontWeight: 700, fontSize: 'calc(10px * var(--scale))' }}>
                  {entry.tokenName || 'Unknown'}
                </span>
                {entry.tokenSymbol && (
                  <span style={{ color: '#888', fontSize: 'calc(8px * var(--scale))' }}>
                    ${entry.tokenSymbol}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', flexShrink: 0 }}>
                {(entry.requestedBy || entry.postAuthor) && (
                  <span style={{ color: '#ff9944', fontSize: 'calc(8px * var(--scale))' }}>
                    {entry.requestedBy || entry.postAuthor}
                  </span>
                )}
                <span style={{ color: '#555', fontSize: 'calc(7px * var(--scale))' }}>
                  {formatTimestamp(entry.firstSeen || entry.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const FILTER_DEFS = [
  { key: 'activity', label: 'Activity', color: ACTION_COLORS.other },
  { key: 'fee_claim', label: 'Claim Fee', color: ACTION_COLORS.fee_claim },
  { key: 'xlaunch', label: 'BankrXLaunch', color: ACTION_COLORS.launch },
  { key: 'applaunch', label: 'BankrAppLaunch', color: ACTION_COLORS.airdrop },
  { key: 'unknown', label: 'Unknown', color: '#555' },
];

function FilterMenu({ filters, setFilters }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = FILTER_DEFS.filter(f => filters[f.key]).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(255,102,51,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(255,102,51,0.5)' : 'rgba(100,100,100,0.4)'}`,
          borderRadius: 'calc(4px * var(--scale))',
          color: open ? '#ff6633' : '#888',
          fontSize: 'calc(8px * var(--scale))',
          fontWeight: 700,
          padding: 'calc(2px * var(--scale)) calc(6px * var(--scale))',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 'calc(3px * var(--scale))',
        }}
      >
        Filter
        {activeCount < FILTER_DEFS.length && (
          <span style={{
            fontSize: 'calc(7px * var(--scale))',
            background: '#ff6633', color: '#111',
            borderRadius: 'calc(3px * var(--scale))',
            padding: '0 calc(3px * var(--scale))',
            lineHeight: 'calc(12px * var(--scale))',
            fontWeight: 800,
          }}>
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 'calc(4px * var(--scale))',
          background: '#1a1a1a', border: '1px solid rgba(100,100,100,0.5)',
          borderRadius: 'calc(6px * var(--scale))',
          padding: 'calc(6px * var(--scale))',
          zIndex: 100, minWidth: 'calc(160px * var(--scale))',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: 'calc(2px * var(--scale))',
        }}>
          {FILTER_DEFS.map(f => (
            <label
              key={f.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--scale))',
                padding: 'calc(4px * var(--scale)) calc(6px * var(--scale))',
                borderRadius: 'calc(3px * var(--scale))',
                cursor: 'pointer',
                background: filters[f.key] ? `${f.color}12` : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <input
                type="checkbox"
                checked={filters[f.key]}
                onChange={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                style={{ accentColor: f.color, cursor: 'pointer', margin: 0 }}
              />
              <span style={{
                fontSize: 'calc(10px * var(--scale))',
                color: filters[f.key] ? f.color : '#888',
                fontWeight: 600,
              }}>
                {f.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LaunchFeedPanel({ onClose }) {
  const [launches, setLaunches] = useState([]);
  const [activity, setActivity] = useState([]);
  const [streamStatus, setStreamStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [viewMode, setViewMode] = useState('token'); // 'token' | 'handle'
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ activity: true, fee_claim: true, xlaunch: true, applaunch: true, unknown: true });
  const prevHashRef = useRef('');
  const prevActivityHashRef = useRef('');
  const nextPollAtRef = useRef(null);

  const loadFeed = useCallback(async () => {
    try {
      const [launchRes, activityRes] = await Promise.all([
        api.get('/api/pipeline/launch-feed'),
        api.get('/api/pipeline/bankr-activity'),
      ]);
      const launchData = await launchRes.json();
      const activityData = await activityRes.json();

      const incoming = launchData.launches || [];
      if (typeof launchData.nextBatchIn === 'number') {
        nextPollAtRef.current = Date.now() + launchData.nextBatchIn;
      }
      const hash = incoming.map(l => `${l.contractAddress || l.tokenName}:${l.sentimentStatus || ''}:${l.botFlag || ''}`).join('|');
      if (hash !== prevHashRef.current) {
        prevHashRef.current = hash;
        setLaunches(incoming);
      }

      const actItems = activityData.activity || [];
      const actHash = actItems.map(a => a.id).join('|');
      if (actHash !== prevActivityHashRef.current) {
        prevActivityHashRef.current = actHash;
        setActivity(actItems);
      }
      setStreamStatus(activityData.stream || {});
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 5000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      if (!nextPollAtRef.current) return setCountdown(null);
      const secs = Math.max(0, Math.round((nextPollAtRef.current - Date.now()) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setCountdown(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Live clock for relative timestamps
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Classify launch entries into filter categories
  function getFeedType(item) {
    if (item._isActivity) return 'activity';
    if (item.actionType === 'fee_claim') return 'fee_claim';
    if (item.actionType === 'launch') {
      const name = (item.tokenName || '').toLowerCase().trim();
      if (!name || name === 'unknown') return 'unknown';
      return 'xlaunch';
    }
    // airdrop / other → activity
    return 'activity';
  }

  // Build unified feed: launches + activity stream
  const { pendingLaunches, completedLaunches } = (() => {
    // Pipeline launches — include all (unknowns handled by filter)
    const named = launches.filter(l => !l.failedAttempt);

    // Activity stream items — tag them and only include if not already in launches
    const launchIds = new Set(named.map(l => l.tweetId).filter(Boolean));
    const activityItems = activity
      .filter(a => !launchIds.has(a.id))
      .map(a => ({
        _isActivity: true,
        id: a.id,
        tokenName: null,
        text: a.text,
        postAuthor: a.author,
        timestamp: a.timestamp || a.receivedAt,
        firstSeen: a.timestamp || a.receivedAt,
        actionType: 'other',
        sentimentStatus: 'done',
      }));

    const all = [...named, ...(filters.activity ? activityItems : [])];

    // Apply filter categories
    const byFilter = all.filter(item => {
      const ft = getFeedType(item);
      return filters[ft];
    });

    // Apply search
    const q = searchQuery.toLowerCase().trim();
    const searched = !q ? byFilter : byFilter.filter(l => {
      if (l._isActivity) {
        return (l.text || '').toLowerCase().includes(q)
          || (l.postAuthor || '').toLowerCase().includes(q);
      }
      if (viewMode === 'handle') {
        return (l.requestedBy || '').toLowerCase().includes(q)
          || (l.postAuthor || '').toLowerCase().includes(q);
      }
      return (l.tokenName || '').toLowerCase().includes(q)
        || (l.tokenSymbol || '').toLowerCase().includes(q)
        || (l.contractAddress || '').toLowerCase().includes(q);
    });

    const pending = [];
    const completed = [];
    for (const l of searched) {
      if (l.sentimentStatus === 'pending') pending.push(l);
      else completed.push(l);
    }
    return { pendingLaunches: pending, completedLaunches: completed };
  })();
  // Separate activity items from groupable launch/fee items
  const activityItems = completedLaunches.filter(l => l._isActivity);
  const filteredLaunches = completedLaunches.filter(l => !l._isActivity);

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
        justifyContent: 'space-between',
        padding: '0 calc(12px * var(--scale))',
        height: 'calc(48px * var(--scale))',
        minHeight: 'calc(48px * var(--scale))',
        borderBottom: '1px solid rgba(100, 100, 100, 0.4)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--scale))' }}>
          <h3 className="font-wankr" style={{
            margin: 0,
            fontSize: 'calc(13px * var(--scale))',
            fontWeight: 700,
            color: '#ff6633',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(255, 100, 50, 0.5)',
          }}>
            Bankr Feed
          </h3>
          <span title={streamStatus.connected ? 'Stream connected' : streamStatus.pollActive ? 'Search polling (stream unavailable)' : 'Disconnected'} style={{
            fontSize: 'calc(10px * var(--scale))',
            color: streamStatus.connected ? '#00ff41' : streamStatus.pollActive ? '#ffaa00' : '#ff3333',
          }}>
            {streamStatus.connected ? '●' : streamStatus.pollActive ? '◉' : '○'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--scale))' }}>
          <button
            type="button"
            onClick={() => { setViewMode(v => v === 'token' ? 'handle' : 'token'); setExpanded(null); }}
            style={{
              background: viewMode === 'handle' ? 'rgba(255, 102, 51, 0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${viewMode === 'handle' ? 'rgba(255,102,51,0.5)' : 'rgba(100,100,100,0.4)'}`,
              borderRadius: 'calc(4px * var(--scale))',
              color: viewMode === 'handle' ? '#ff6633' : '#888',
              fontSize: 'calc(8px * var(--scale))',
              fontWeight: 700,
              padding: 'calc(2px * var(--scale)) calc(6px * var(--scale))',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.15s',
            }}
          >
            {viewMode === 'handle' ? 'Handles' : 'Tokens'}
          </button>
          <FilterMenu filters={filters} setFilters={setFilters} />
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
      </div>

      {/* Search bar */}
      <div style={{
        padding: 'calc(4px * var(--scale)) calc(8px * var(--scale))',
        borderBottom: '1px solid rgba(100, 100, 100, 0.2)',
        flexShrink: 0,
      }}>
        <input
          type="text"
          id="launch-feed-search"
          name="launch-feed-search"
          autoComplete="off"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setExpanded(null); }}
          placeholder={viewMode === 'handle' ? 'Search handles...' : 'Search tokens...'}
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
          onFocus={e => { e.target.style.borderColor = 'rgba(255,102,51,0.5)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(100,100,100,0.3)'; }}
        />
      </div>

      {/* Feed list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: 'calc(6px * var(--scale))',
        display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--scale))',
      }}>
        {/* Batch queue card — always at top */}
        <BatchQueueCard entries={pendingLaunches} countdown={countdown} />

        {loading && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted-content)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            Detecting Bankr activity...
          </div>
        )}

        {!loading && launches.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted-content)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            No recent Bankr activity found on X.
          </div>
        )}

        {viewMode === 'handle' ? (
          /* ── Handle View ── */
          groupByHandle(filteredLaunches).map((group, i) => {
            const isExpanded = expanded === i;
            const is3Plus = group.launches.length >= 3;
            const handleColor = is3Plus ? HANDLE_3PLUS_COLOR : HANDLE_NORMAL_COLOR;

            return (
              <div
                key={i}
                onClick={() => setExpanded(isExpanded ? null : i)}
                style={{
                  padding: 'calc(8px * var(--scale))',
                  background: is3Plus ? 'rgba(255, 102, 51, 0.06)' : 'rgba(0, 255, 65, 0.03)',
                  border: `1px solid ${is3Plus ? 'rgba(255, 102, 51, 0.3)' : 'rgba(100, 100, 100, 0.2)'}`,
                  borderRadius: 'calc(4px * var(--scale))',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  animation: 'feedSlideIn 0.3s ease-out',
                }}
              >
                {/* Handle summary */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 'calc(6px * var(--scale))',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', minWidth: 0 }}>
                    <span style={{
                      color: handleColor, fontWeight: 700, fontSize: 'calc(11px * var(--scale))',
                      textShadow: is3Plus ? '0 0 6px rgba(255, 102, 51, 0.4)' : 'none',
                    }}>
                      {group.handle}
                    </span>
                    <span style={{
                      fontSize: 'calc(8px * var(--scale))',
                      fontWeight: 700,
                      color: is3Plus ? '#fff' : '#111',
                      background: is3Plus ? '#ff3333' : '#666',
                      borderRadius: 'calc(3px * var(--scale))',
                      padding: '0 calc(4px * var(--scale))',
                      lineHeight: 'calc(14px * var(--scale))',
                      flexShrink: 0,
                    }}>
                      {group.launches.length} launch{group.launches.length !== 1 ? 'es' : ''}
                    </span>
                    <BotBadge flag={group.botFlag} />
                  </div>
                  <span style={{
                    fontSize: 'calc(10px * var(--scale))',
                    color: '#666',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                  }}>
                    ▼
                  </span>
                </div>

                {/* Expanded: all launches for this handle */}
                {isExpanded && (
                  <div style={{
                    marginTop: 'calc(6px * var(--scale))',
                    paddingTop: 'calc(6px * var(--scale))',
                    borderTop: `1px solid ${is3Plus ? 'rgba(255, 102, 51, 0.2)' : 'rgba(100, 100, 100, 0.3)'}`,
                    fontSize: 'calc(9px * var(--scale))',
                    color: 'var(--text-content)',
                    display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--scale))',
                  }}>
                    {group.launches.map((entry, j) => {
                      const rc = REACTION_COLORS[entry.communityReaction] || '#666';
                      const ac = ACTION_COLORS[entry.actionType] || '#888';
                      const al = ACTION_LABELS[entry.actionType] || 'Activity';
                      const isLaunch = entry.actionType === 'launch' || !entry.actionType;
                      const isFee = entry.actionType === 'fee_claim';
                      const isOtherType = entry.actionType === 'other' || entry.actionType === 'airdrop';
                      return (
                        <div key={j} style={{
                          paddingBottom: j < group.launches.length - 1 ? 'calc(4px * var(--scale))' : 0,
                          borderBottom: j < group.launches.length - 1 ? '1px solid rgba(100,100,100,0.15)' : 'none',
                          borderLeft: `2px solid ${isLaunch ? `${ac}50` : `${ac}70`}`,
                          paddingLeft: 'calc(4px * var(--scale))',
                        }}>
                          {/* Summary row — token name only for fee claims */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))' }}>
                            <ChainBadge chain={entry.chain} />
                            <span style={{
                              fontSize: 'calc(6px * var(--scale))', fontWeight: 800, color: (isLaunch || isFee) ? '#111' : '#fff', background: ac,
                              borderRadius: 'calc(2px * var(--scale))', padding: '0 calc(3px * var(--scale))',
                              lineHeight: 'calc(11px * var(--scale))', textTransform: 'uppercase', flexShrink: 0,
                            }}>
                              {al}
                            </span>
                            <span style={{ color: isLaunch ? 'var(--accent)' : ac, fontWeight: 700, fontSize: 'calc(10px * var(--scale))' }}>
                              {entry.tokenName || al}
                            </span>
                            {isLaunch && entry.tokenSymbol && (
                            <span style={{ color: 'var(--text-muted-content)', fontSize: 'calc(8px * var(--scale))' }}>
                              ${entry.tokenSymbol}
                            </span>
                            )}
                            <SentimentIndicator status={entry.sentimentStatus} reaction={entry.communityReaction} />
                            {entry.sentimentStatus !== 'pending' && isLaunch && (
                            <span style={{ color: rc, fontWeight: 600, textTransform: 'uppercase', fontSize: 'calc(7px * var(--scale))' }}>
                              {entry.communityReaction}
                            </span>
                            )}
                          </div>
                          {/* Fee claim / non-launch: structured details */}
                          {(isFee || isOtherType) ? (
                            <>
                              {entry.contractAddress && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', fontSize: 'calc(8px * var(--scale))', marginTop: 'calc(2px * var(--scale))' }}>
                                  <span style={{ color: '#888' }}>Token:</span>
                                  <span style={{ fontFamily: 'monospace', color: '#aaa' }}>{shortenAddress(entry.contractAddress)}</span>
                                </div>
                              )}
                              {entry.announcement && (
                                <div style={{
                                  marginTop: 'calc(3px * var(--scale))',
                                  padding: 'calc(3px * var(--scale)) calc(5px * var(--scale))',
                                  borderLeft: `2px solid ${ac}40`,
                                  background: 'rgba(255,255,255,0.02)',
                                  color: 'rgba(255,255,255,0.72)',
                                  fontStyle: 'italic',
                                  fontSize: 'calc(8px * var(--scale))',
                                  lineHeight: 1.4,
                                }}>
                                  {entry.announcement}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Launch: show announcement + reaction */}
                              {entry.announcement && (
                                <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginTop: 'calc(2px * var(--scale))' }}>
                                  {entry.announcement}
                                </div>
                              )}
                              {entry.reactionNote && (
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                                  {entry.reactionNote}
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--scale))', marginTop: 'calc(2px * var(--scale))' }}>
                                {(entry.firstSeen || entry.timestamp) && (
                                  <span style={{ fontSize: 'calc(7px * var(--scale))', color: '#555' }}>
                                    {formatTimestamp(entry.firstSeen || entry.timestamp)}
                                  </span>
                                )}
                                {entry.contractAddress && (
                                  <span style={{ fontFamily: 'monospace', fontSize: 'calc(8px * var(--scale))', color: '#888' }}>
                                    {shortenAddress(entry.contractAddress)}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* ── Token View (existing) ── */
          groupLaunches(filteredLaunches).map((launch, i) => {
          const isExpanded = expanded === i;
          const reactionColor = REACTION_COLORS[launch.communityReaction] || '#666';
          const actionType = launch.actionType || 'launch';
          const actionColor = ACTION_COLORS[actionType] || '#888';
          const actionLabel = ACTION_LABELS[actionType] || 'Activity';
          const isLaunch = actionType === 'launch';

          return (
            <div
              key={i}
              onClick={() => setExpanded(isExpanded ? null : i)}
              style={{
                padding: 'calc(8px * var(--scale))',
                background: isLaunch ? `${actionColor}08` : `${actionColor}14`,
                border: `1px solid ${isLaunch ? `${actionColor}30` : `${actionColor}40`}`,
                borderLeft: `3px solid ${isLaunch ? `${actionColor}60` : `${actionColor}80`}`,
                borderRadius: 'calc(4px * var(--scale))',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                animation: 'feedSlideIn 0.3s ease-out',
              }}
            >
              {/* Summary row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 'calc(6px * var(--scale))',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))' }}>
                    <ChainBadge chain={launch.chain} />
                    {/* Action type badge */}
                    <span style={{
                      fontSize: 'calc(7px * var(--scale))',
                      fontWeight: 800,
                      color: (actionType === 'launch' || actionType === 'fee_claim') ? '#111' : '#fff',
                      background: actionColor,
                      borderRadius: 'calc(3px * var(--scale))',
                      padding: '0 calc(4px * var(--scale))',
                      lineHeight: 'calc(13px * var(--scale))',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}>
                      {actionLabel}
                    </span>
                    <span style={{
                      color: isLaunch ? 'var(--accent)' : actionColor, fontWeight: 700, fontSize: 'calc(11px * var(--scale))',
                    }}>
                      {launch.tokenName || actionLabel}
                    </span>
                    {isLaunch && launch.tokenSymbol && (
                    <span style={{
                      color: 'var(--text-muted-content)', fontSize: 'calc(9px * var(--scale))',
                    }}>
                      ${launch.tokenSymbol}
                    </span>
                    )}
                    {launch.count > 1 && (
                      <span style={{
                        fontSize: 'calc(8px * var(--scale))',
                        fontWeight: 700,
                        color: '#111',
                        background: reactionColor,
                        borderRadius: 'calc(3px * var(--scale))',
                        padding: '0 calc(4px * var(--scale))',
                        lineHeight: 'calc(14px * var(--scale))',
                        flexShrink: 0,
                      }}>
                        x{launch.count}
                      </span>
                    )}
                    <SentimentIndicator status={launch.sentimentStatus} reaction={launch.communityReaction} />
                  </div>
                  {isLaunch && launch.contractAddress && (
                    <div style={{
                      fontFamily: 'monospace', fontSize: 'calc(9px * var(--scale))',
                      color: 'var(--text-muted-content)',
                    }}>
                      {shortenAddress(launch.contractAddress)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 0 }}>
                  {launch.handles?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      {launch.handles.map((h, hi) => (
                        <div key={hi} style={{ fontSize: 'calc(8px * var(--scale))', color: '#ff9944', display: 'flex', alignItems: 'center', gap: 'calc(2px * var(--scale))' }}>
                          <span>{h.handle}</span>
                          {h.count > 1 && (
                            <span style={{
                              fontSize: 'calc(7px * var(--scale))', color: '#888',
                            }}>
                              x{h.count}
                            </span>
                          )}
                          <BotBadge flag={h.botFlag} />
                        </div>
                      ))}
                    </div>
                  )}
                  {(launch.firstSeen || launch.timestamp) && (
                    <div style={{ fontSize: 'calc(8px * var(--scale))', color: 'var(--text-muted-content)' }}>
                      {formatTimestamp(launch.firstSeen || launch.timestamp)}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{
                  marginTop: 'calc(6px * var(--scale))',
                  paddingTop: 'calc(6px * var(--scale))',
                  borderTop: '1px solid rgba(100, 100, 100, 0.3)',
                  fontSize: 'calc(9px * var(--scale))',
                  color: 'var(--text-content)',
                  display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--scale))',
                }}>
                  {launch.entries.map((entry, j) => {
                    const isFee = entry.actionType === 'fee_claim';
                    const isOther = entry.actionType === 'other' || entry.actionType === 'airdrop';
                    return (
                    <div key={j} style={{
                      paddingBottom: j < launch.entries.length - 1 ? 'calc(4px * var(--scale))' : 0,
                      borderBottom: j < launch.entries.length - 1 ? '1px solid rgba(100,100,100,0.15)' : 'none',
                    }}>
                      {(isFee || isOther) ? (
                        <>
                          {/* Fee claim / non-launch expanded: address, recipient, then quoted post */}
                          {entry.contractAddress && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', fontSize: 'calc(8px * var(--scale))' }}>
                              <span style={{ color: '#888' }}>Token:</span>
                              <span style={{ fontFamily: 'monospace', color: '#aaa', wordBreak: 'break-all' }}>{entry.contractAddress}</span>
                            </div>
                          )}
                          {(entry.requestedBy || entry.postAuthor) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', fontSize: 'calc(8px * var(--scale))', marginTop: 'calc(2px * var(--scale))' }}>
                              <span style={{ color: '#888' }}>{isFee ? 'Recipient:' : 'By:'}</span>
                              <span style={{ color: '#ff9944', display: 'inline-flex', alignItems: 'center' }}>
                                {entry.requestedBy || entry.postAuthor}
                                <BotBadge flag={entry.botFlag} />
                              </span>
                            </div>
                          )}
                          {entry.announcement && (
                            <div style={{
                              marginTop: 'calc(4px * var(--scale))',
                              padding: 'calc(4px * var(--scale)) calc(6px * var(--scale))',
                              borderLeft: `2px solid ${ACTION_COLORS[entry.actionType] || '#888'}40`,
                              background: 'rgba(255,255,255,0.02)',
                              color: 'rgba(255,255,255,0.6)',
                              fontStyle: 'italic',
                              fontSize: 'calc(8px * var(--scale))',
                              lineHeight: 1.4,
                            }}>
                              {entry.announcement}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Launch expanded: same as before */}
                          {entry.announcement && (
                            <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                              {entry.announcement}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', marginTop: 'calc(2px * var(--scale))' }}>
                            <span style={{ color: ACTION_COLORS[entry.actionType] || '#888', fontWeight: 700, textTransform: 'uppercase', fontSize: 'calc(7px * var(--scale))' }}>
                              {ACTION_LABELS[entry.actionType] || 'Activity'}
                            </span>
                            <SentimentIndicator status={entry.sentimentStatus} reaction={entry.communityReaction} />
                            {entry.sentimentStatus !== 'pending' && (
                            <span style={{ color: REACTION_COLORS[entry.communityReaction] || '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: 'calc(8px * var(--scale))' }}>
                              {entry.communityReaction}
                            </span>
                            )}
                            {(entry.requestedBy || entry.postAuthor) && (
                              <span style={{ color: entry.requestedBy ? '#ff9944' : '#888', fontSize: 'calc(8px * var(--scale))', display: 'inline-flex', alignItems: 'center' }}>
                                — {entry.requestedBy || entry.postAuthor}
                                <BotBadge flag={entry.botFlag} />
                              </span>
                            )}
                          </div>
                          {entry.reactionNote && (
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                              {entry.reactionNote}
                            </div>
                          )}
                          {entry.contractAddress && (
                            <div style={{ fontFamily: 'monospace', fontSize: 'calc(8px * var(--scale))', color: '#888', wordBreak: 'break-all' }}>
                              {entry.contractAddress}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
        )}

        {/* Activity stream items */}
        {activityItems.map((item) => (
          <div key={`act-${item.id}`} style={{
            padding: 'calc(6px * var(--scale)) calc(8px * var(--scale))',
            background: 'rgba(0, 255, 65, 0.04)',
            border: '1px solid rgba(0, 255, 65, 0.15)',
            borderLeft: '3px solid rgba(0, 255, 65, 0.3)',
            borderRadius: 'calc(4px * var(--scale))',
            animation: 'feedSlideIn 0.3s ease-out',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 'calc(4px * var(--scale))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', minWidth: 0, flex: 1 }}>
                <span style={{
                  fontSize: 'calc(7px * var(--scale))', fontWeight: 800, color: '#111', background: '#00ff41',
                  borderRadius: 'calc(3px * var(--scale))', padding: '0 calc(4px * var(--scale))',
                  lineHeight: 'calc(13px * var(--scale))', letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0,
                }}>
                  Activity
                </span>
                <span style={{ color: '#00bfff', fontWeight: 600, fontSize: 'calc(10px * var(--scale))' }}>
                  {item.postAuthor || 'unknown'}
                </span>
              </div>
              <span style={{ color: '#555', fontSize: 'calc(7px * var(--scale))', flexShrink: 0 }}>
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
            <div style={{
              color: '#ccc', fontSize: 'calc(9px * var(--scale))',
              lineHeight: 1.4, wordBreak: 'break-word',
              marginTop: 'calc(3px * var(--scale))',
            }}>
              {item.text}
            </div>
          </div>
        ))}
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
        {filteredLaunches.length + activityItems.length} items
        {pendingLaunches.length > 0 ? ` | ${pendingLaunches.length} batching` : ''}
        {streamStatus.connected ? ' | Stream live' : streamStatus.pollActive ? ' | Poll mode' : ' | Stream offline'}
        {streamStatus.totalTweetsReceived ? ` | ${streamStatus.totalTweetsReceived} received` : ''}
        {streamStatus.totalPollHits ? ` | ${streamStatus.totalPollHits} polled` : ''}
      </div>
    </div>
  );
}

export default memo(LaunchFeedPanel);
