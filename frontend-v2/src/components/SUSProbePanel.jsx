import { useState } from 'react';
import { api } from '../utils/api';

const SENTIMENT_COLORS = {
  positive: '#00ff41',
  negative: '#ff3333',
  mixed: '#ffcc00',
  neutral: '#666',
};

export default function SUSProbePanel({ onClose, onProbeComplete }) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function runProbe() {
    const h = handle.trim().replace(/^@/, '');
    if (!h) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/api/sus', { handle: h });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (onProbeComplete) {
        const parts = [`SUS Probe scanned @${h}.`];
        const intel = data.intel;
        if (intel?.profile) {
          if (intel.profile.bio) parts.push(`Bio: "${intel.profile.bio}".`);
          if (intel.profile.verified) parts.push('Verified account.');
          if (intel.profile.accountAge !== 'unknown') parts.push(`Account age: ${intel.profile.accountAge}.`);
        }
        if (intel?.posts?.length) {
          parts.push(`${intel.posts.length} posts found, overall sentiment: ${intel.overallSentiment}.`);
          intel.posts.slice(0, 5).forEach((p, i) => {
            parts.push(`Post ${i + 1}: "${p.text}" [${p.likes} likes, ${p.retweets} rt — replies: ${p.replySentiment}${p.sentimentNote ? ', ' + p.sentimentNote : ''}]`);
          });
        }
        if (intel?.assessment) parts.push(`Grok assessment: ${intel.assessment}`);
        const kol = data.kolData;
        if (kol) parts.push(`KOL DB: Score=${kol.score}, Bot=${kol.botLevel}/5, Sentiment=${kol.sentiment}/10.`);
        if (data.report) {
          const snippet = data.report.length > 400 ? data.report.slice(0, 400) + '...' : data.report;
          parts.push(`Report: ${snippet}`);
        }
        parts.push('Give me your take — reference the probe data above.');
        onProbeComplete(parts.join(' '));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const intel = result?.intel;
  const profile = intel?.profile;
  const posts = intel?.posts;
  const kol = result?.kolData;

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
        <h3 className="font-wankr" style={{
          margin: 0,
          fontSize: 'calc(13px * var(--scale))',
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: '0 0 8px rgba(0, 255, 0, 0.5)',
        }}>
          SUS Probe
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

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: 'calc(6px * var(--scale))',
        padding: 'calc(8px * var(--scale))',
        flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="@handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runProbe()}
          style={{
            flex: 1, minWidth: 0,
            padding: 'calc(6px * var(--scale)) calc(8px * var(--scale))',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: 'calc(4px * var(--scale))',
            color: 'var(--accent)',
            fontSize: 'calc(11px * var(--scale))',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={runProbe}
          disabled={loading || !handle.trim()}
          style={{
            padding: 'calc(6px * var(--scale)) calc(12px * var(--scale))',
            background: loading ? 'rgba(100,100,100,0.3)' : 'rgba(0, 255, 65, 0.15)',
            border: '1px solid rgba(0, 255, 65, 0.4)',
            borderRadius: 'calc(4px * var(--scale))',
            color: 'var(--accent)',
            fontSize: 'calc(10px * var(--scale))',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '...' : 'SUS'}
        </button>
      </div>

      {/* Results */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 calc(8px * var(--scale)) calc(8px * var(--scale))',
        display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--scale))',
      }}>
        {loading && (
          <div style={{
            textAlign: 'center', color: 'var(--accent)',
            padding: 'calc(20px * var(--scale))',
            fontSize: 'calc(10px * var(--scale))',
            opacity: 0.7,
          }}>
            Scanning {handle}...
          </div>
        )}

        {error && (
          <div style={{
            padding: 'calc(8px * var(--scale))',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 50, 50, 0.3)',
            borderRadius: 'calc(4px * var(--scale))',
            color: '#ff6666',
            fontSize: 'calc(10px * var(--scale))',
          }}>
            {error}
          </div>
        )}

        {result && (
          <>
            {/* Handle header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--scale))',
              padding: 'calc(6px * var(--scale)) 0',
            }}>
              <span style={{
                color: 'var(--accent)',
                fontSize: 'calc(12px * var(--scale))',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}>
                {result.handle}
              </span>
              {intel?.source === 'live' && (
                <SourceBadge source="live" />
              )}
              {intel?.overallSentiment && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'calc(3px * var(--scale))',
                  padding: 'calc(2px * var(--scale)) calc(6px * var(--scale))',
                  background: `${SENTIMENT_COLORS[intel.overallSentiment]}15`,
                  border: `1px solid ${SENTIMENT_COLORS[intel.overallSentiment]}40`,
                  borderRadius: 'calc(3px * var(--scale))',
                  fontSize: 'calc(8px * var(--scale))',
                  fontWeight: 700,
                  color: SENTIMENT_COLORS[intel.overallSentiment],
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <SentimentDot sentiment={intel.overallSentiment} />
                  {intel.overallSentiment}
                </span>
              )}
            </div>

            {/* Profile card */}
            {profile && (
              <div style={{
                background: 'rgba(0, 20, 10, 0.6)',
                border: '1px solid rgba(0, 255, 65, 0.15)',
                borderRadius: 'calc(6px * var(--scale))',
                padding: 'calc(10px * var(--scale))',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  marginBottom: 'calc(6px * var(--scale))',
                }}>
                  <div>
                    {profile.displayName && (
                      <div style={{ fontSize: 'calc(13px * var(--scale))', fontWeight: 700, color: '#fff' }}>
                        {profile.displayName}
                        {profile.verified && (
                          <span style={{ color: '#1d9bf0', marginLeft: 4, fontSize: 'calc(11px * var(--scale))' }}>✓</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {profile.bio && (
                  <div style={{
                    fontSize: 'calc(10px * var(--scale))', color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.4, marginBottom: 'calc(8px * var(--scale))', fontStyle: 'italic',
                  }}>
                    "{profile.bio}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 'calc(12px * var(--scale))', flexWrap: 'wrap' }}>
                  {profile.accountAge && profile.accountAge !== 'unknown' && (
                    <StatPill label="Account Age" value={profile.accountAge} />
                  )}
                  {profile.location && (
                    <StatPill label="Location" value={profile.location} />
                  )}
                </div>
              </div>
            )}

            {/* Grok Assessment */}
            {intel?.assessment && (
              <div style={{
                padding: 'calc(8px * var(--scale))',
                background: 'rgba(0, 200, 255, 0.05)',
                border: '1px solid rgba(0, 200, 255, 0.15)',
                borderRadius: 'calc(4px * var(--scale))',
                fontSize: 'calc(9px * var(--scale))',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.5,
              }}>
                <SectionLabel color="#00ccff">Grok Assessment</SectionLabel>
                <div style={{ marginTop: 'calc(4px * var(--scale))' }}>{intel.assessment}</div>
              </div>
            )}

            {/* KOL card */}
            {kol && (
              <div style={{
                background: 'rgba(0, 20, 10, 0.6)',
                border: `1px solid ${kol.roastPriority >= 7 ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,65,0.15)'}`,
                borderRadius: 'calc(6px * var(--scale))',
                padding: 'calc(10px * var(--scale))',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 'calc(6px * var(--scale))',
                }}>
                  <SectionLabel color="var(--accent)">KOL Database</SectionLabel>
                  <SourceBadge source="database" />
                </div>
                <div style={{ display: 'flex', gap: 'calc(12px * var(--scale))', flexWrap: 'wrap' }}>
                  <StatPill label="Score" value={kol.score} />
                  <StatPill label="Bot Level" value={`${kol.botLevel}/5`} color={kol.botLevel >= 3 ? '#ff5555' : null} />
                  <StatPill label="Sentiment" value={`${kol.sentiment}/10`} color={kol.sentiment <= 4 ? '#ff5555' : null} />
                  <StatPill label="Roast" value={`${kol.roastPriority}/10`} color={kol.roastPriority >= 7 ? '#ff5555' : null} />
                </div>
              </div>
            )}

            {/* Posts + Reply Sentiment */}
            {posts?.length > 0 && (
              <div style={{
                background: 'rgba(0, 20, 10, 0.6)',
                border: '1px solid rgba(0, 200, 255, 0.15)',
                borderRadius: 'calc(6px * var(--scale))',
                padding: 'calc(10px * var(--scale))',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 'calc(8px * var(--scale))',
                }}>
                  <SectionLabel color="#00ccff">Recent Posts ({posts.length})</SectionLabel>
                </div>

                {/* Sentiment bar */}
                {intel?.sentimentBreakdown && (
                  <div style={{
                    display: 'flex', gap: 'calc(4px * var(--scale))',
                    marginBottom: 'calc(8px * var(--scale))',
                    height: 'calc(4px * var(--scale))',
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    {intel.sentimentBreakdown.positive > 0 && <div style={{ flex: intel.sentimentBreakdown.positive, background: '#00ff41', borderRadius: 2 }} />}
                    {intel.sentimentBreakdown.mixed > 0 && <div style={{ flex: intel.sentimentBreakdown.mixed, background: '#ffcc00', borderRadius: 2 }} />}
                    {intel.sentimentBreakdown.neutral > 0 && <div style={{ flex: intel.sentimentBreakdown.neutral, background: '#666', borderRadius: 2 }} />}
                    {intel.sentimentBreakdown.negative > 0 && <div style={{ flex: intel.sentimentBreakdown.negative, background: '#ff3333', borderRadius: 2 }} />}
                  </div>
                )}

                {/* Post list */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 'calc(6px * var(--scale))',
                  maxHeight: 'calc(240px * var(--scale))', overflowY: 'auto',
                }}>
                  {posts.map((post, i) => (
                    <div key={i} style={{
                      padding: 'calc(6px * var(--scale)) calc(8px * var(--scale))',
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: 'calc(4px * var(--scale))',
                      borderLeft: `2px solid ${SENTIMENT_COLORS[post.replySentiment] || '#666'}`,
                    }}>
                      <div style={{
                        fontSize: 'calc(9px * var(--scale))', color: 'rgba(255,255,255,0.8)',
                        lineHeight: 1.4, marginBottom: 'calc(4px * var(--scale))',
                      }}>
                        {post.text}
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--scale))',
                        fontSize: 'calc(8px * var(--scale))', color: 'rgba(255,255,255,0.35)',
                      }}>
                        <span>{post.likes} likes</span>
                        <span>{post.retweets} rt</span>
                        <span>{post.replies} replies</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'calc(3px * var(--scale))' }}>
                          <SentimentDot sentiment={post.replySentiment} />
                          <span style={{ color: SENTIMENT_COLORS[post.replySentiment] || '#666' }}>
                            {post.replySentiment}
                          </span>
                        </span>
                      </div>
                      {post.sentimentNote && (
                        <div style={{
                          fontSize: 'calc(8px * var(--scale))', color: 'rgba(255,255,255,0.3)',
                          marginTop: 'calc(2px * var(--scale))', fontStyle: 'italic',
                        }}>
                          {post.sentimentNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wankr Report */}
            {result.report && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 255, 65, 0.15)',
                borderRadius: 'calc(6px * var(--scale))',
                padding: 'calc(10px * var(--scale))',
              }}>
                <SectionLabel color="var(--accent)">Wankr Analysis</SectionLabel>
                <div style={{ marginTop: 'calc(8px * var(--scale))' }}>
                  <ReportBody text={result.report} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReportBody({ text }) {
  if (!text) return null;
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (
    <ul style={{
      margin: 0, padding: '0 0 0 calc(14px * var(--scale))',
      listStyle: 'none',
      display: 'flex', flexDirection: 'column', gap: 'calc(5px * var(--scale))',
    }}>
      {sentences.map((s, i) => (
        <li key={i} style={{
          fontSize: 'calc(10px * var(--scale))', color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.5, position: 'relative', paddingLeft: 'calc(10px * var(--scale))',
        }}>
          <span style={{ position: 'absolute', left: 0, color: 'rgba(255,255,255,0.25)' }}>›</span>
          {s}
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({ color, children }) {
  return (
    <div style={{
      fontSize: 'calc(9px * var(--scale))', color,
      textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700,
    }}>
      {children}
    </div>
  );
}

function SourceBadge({ source }) {
  const isLive = source === 'live';
  return (
    <span style={{
      fontSize: 'calc(8px * var(--scale))',
      padding: 'calc(2px * var(--scale)) calc(6px * var(--scale))',
      borderRadius: 'calc(3px * var(--scale))',
      background: isLive ? 'rgba(0, 200, 255, 0.1)' : source === 'database' ? 'rgba(0, 255, 65, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      color: isLive ? '#00ccff' : source === 'database' ? '#00ff41' : '#666',
      fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
    }}>
      {isLive ? '● LIVE' : source === 'database' ? '● DB' : '● GROK'}
    </span>
  );
}

function SentimentDot({ sentiment }) {
  return (
    <span style={{
      display: 'inline-block', width: 'calc(6px * var(--scale))', height: 'calc(6px * var(--scale))',
      borderRadius: '50%', background: SENTIMENT_COLORS[sentiment] || '#666', flexShrink: 0,
    }} />
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(1px * var(--scale))' }}>
      <span style={{
        fontSize: 'calc(8px * var(--scale))', color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>{label}</span>
      <span style={{
        fontSize: 'calc(11px * var(--scale))', color: color || '#fff',
        fontWeight: 600, fontFamily: 'monospace',
      }}>{value}</span>
    </div>
  );
}
