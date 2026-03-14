import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

const REACTION_COLORS = {
  positive: '#00ff41',
  negative: '#ff3333',
  mixed: '#ffcc00',
  neutral: '#666',
};

const BOT_BADGE = {
  likely: { label: 'BOT', bg: '#ff3333', color: '#fff' },
  suspicious: { label: 'SUS', bg: '#ffcc00', color: '#111' },
};

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

function LaunchFeedPanel({ onClose }) {
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const prevHashRef = useRef('');
  const nextPollAtRef = useRef(null);

  const loadFeed = useCallback(async () => {
    try {
      const res = await api.get('/api/pipeline/launch-feed');
      const data = await res.json();
      const incoming = data.launches || [];
      if (typeof data.nextPollIn === 'number') {
        nextPollAtRef.current = Date.now() + data.nextPollIn;
      }
      // Skip state update if data hasn't changed (prevents re-render flicker)
      const hash = incoming.map(l => `${l.contractAddress || l.tokenName}:${l.botFlag || ''}`).join('|');
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
    const interval = setInterval(loadFeed, 60000);
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

  return (
    <div
      className="wankr-panel sidebar-panel"
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
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
            Bankr Launches
          </h3>
          {countdown && (
            <span style={{
              fontSize: 'calc(9px * var(--scale))',
              color: '#888',
              fontFamily: 'monospace',
              letterSpacing: '1px',
            }}>
              {countdown}
            </span>
          )}
        </div>
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

      {/* Feed list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: 'calc(6px * var(--scale))',
        display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--scale))',
      }}>
        {loading && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted-content)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            Searching X for Bankr launches...
          </div>
        )}

        {!loading && launches.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted-content)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            No recent Bankr launches found on X.
          </div>
        )}

        {groupLaunches(launches).map((launch, i) => {
          const isExpanded = expanded === i;
          const reactionColor = REACTION_COLORS[launch.communityReaction] || '#666';

          return (
            <div
              key={i}
              onClick={() => setExpanded(isExpanded ? null : i)}
              style={{
                padding: 'calc(8px * var(--scale))',
                background: 'rgba(0, 255, 65, 0.03)',
                border: `1px solid ${reactionColor}30`,
                borderRadius: 'calc(4px * var(--scale))',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Summary row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 'calc(6px * var(--scale))',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))' }}>
                    <span style={{
                      color: 'var(--accent)', fontWeight: 700, fontSize: 'calc(11px * var(--scale))',
                    }}>
                      {launch.tokenName}
                    </span>
                    <span style={{
                      color: 'var(--text-muted-content)', fontSize: 'calc(9px * var(--scale))',
                    }}>
                      ${launch.tokenSymbol}
                    </span>
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
                    {/* Sentiment dot */}
                    <span style={{
                      display: 'inline-block', width: 'calc(6px * var(--scale))', height: 'calc(6px * var(--scale))',
                      borderRadius: '50%', background: reactionColor, flexShrink: 0,
                    }} />
                  </div>
                  {launch.contractAddress && (
                    <div style={{
                      fontFamily: 'monospace', fontSize: 'calc(9px * var(--scale))',
                      color: 'var(--text-muted-content)',
                    }}>
                      {shortenAddress(launch.contractAddress)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 0 }}>
                  {launch.timestamp && (
                    <div style={{ fontSize: 'calc(8px * var(--scale))', color: 'var(--text-muted-content)' }}>
                      {launch.timestamp}
                    </div>
                  )}
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
                  {launch.entries.map((entry, j) => (
                    <div key={j} style={{
                      paddingBottom: j < launch.entries.length - 1 ? 'calc(4px * var(--scale))' : 0,
                      borderBottom: j < launch.entries.length - 1 ? '1px solid rgba(100,100,100,0.15)' : 'none',
                    }}>
                      {entry.announcement && (
                        <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                          {entry.announcement}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--scale))', marginTop: 'calc(2px * var(--scale))' }}>
                        <span style={{ color: REACTION_COLORS[entry.communityReaction] || '#666', fontWeight: 600, textTransform: 'uppercase', fontSize: 'calc(8px * var(--scale))' }}>
                          Community: {entry.communityReaction}
                        </span>
                        {(entry.requestedBy || entry.postAuthor) && (
                          <span style={{ color: entry.requestedBy ? '#ff9944' : '#888', fontSize: 'calc(8px * var(--scale))', display: 'inline-flex', alignItems: 'center' }}>
                            — {entry.requestedBy ? `requested by ${entry.requestedBy}` : entry.postAuthor}
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
                    </div>
                  ))}
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
        {groupLaunches(launches).length} tokens ({launches.length} launches) | Powered by Grok x_search
      </div>
    </div>
  );
}

export default memo(LaunchFeedPanel);
