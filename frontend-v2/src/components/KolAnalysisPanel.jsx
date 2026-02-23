import { useState, useEffect, useCallback, useRef } from 'react';
import { getKolAccounts, getKolStats } from '../services/kolService';

const SORT_OPTIONS = [
  { value: 'roastPriority', label: 'Roast Priority' },
  { value: 'score', label: 'Authenticity Score' },
  { value: 'followerCount', label: 'Followers' },
  { value: 'botLevel', label: 'Bot Level' },
  { value: 'handle', label: 'Handle' },
];

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      padding: 'calc(8px * var(--scale))',
      background: 'rgba(20, 20, 20, 0.9)',
      border: `1px solid ${color || 'rgba(100, 100, 100, 0.4)'}`,
      borderRadius: 'calc(6px * var(--scale))',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 'calc(18px * var(--scale))',
        fontWeight: 700,
        color: color || 'var(--accent)',
        lineHeight: 1.2,
      }}>{value}</div>
      <div style={{
        fontSize: 'calc(9px * var(--scale))',
        color: 'var(--text-muted-content)',
        marginTop: 'calc(2px * var(--scale))',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>{label}</div>
    </div>
  );
}

function AccountRow({ account, isSelected, onClick }) {
  const priorityColor = account.roastPriority >= 8
    ? '#ff3333'
    : account.roastPriority >= 6
      ? '#ff9933'
      : account.roastPriority >= 4
        ? '#ffcc00'
        : '#66cc66';

  const scoreColor = account.score <= 2.0
    ? '#ff3333'
    : account.score <= 4.0
      ? '#ff6633'
      : account.score <= 6.0
        ? '#ffcc00'
        : account.score <= 8.0
          ? '#66cc66'
          : '#00ff00';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: 'calc(28px * var(--scale)) 1fr calc(50px * var(--scale)) calc(36px * var(--scale)) calc(30px * var(--scale))',
        gap: 'calc(6px * var(--scale))',
        alignItems: 'center',
        padding: 'calc(6px * var(--scale)) calc(8px * var(--scale))',
        background: isSelected
          ? 'rgba(0, 255, 0, 0.08)'
          : 'rgba(20, 20, 20, 0.6)',
        border: isSelected
          ? '1px solid rgba(0, 255, 0, 0.3)'
          : '1px solid rgba(60, 60, 60, 0.3)',
        borderRadius: 'calc(4px * var(--scale))',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        fontSize: 'calc(11px * var(--scale))',
      }}
    >
      <span style={{ fontSize: 'calc(14px * var(--scale))' }}>{account.rating}</span>
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          color: 'var(--accent)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 'calc(11px * var(--scale))',
        }}>
          {account.handle}
        </div>
        <div style={{
          color: 'var(--text-muted-content)',
          fontSize: 'calc(9px * var(--scale))',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {account.followers}
        </div>
      </div>
      <div style={{
        textAlign: 'center',
        color: scoreColor,
        fontWeight: 700,
        fontFamily: 'monospace',
        fontSize: 'calc(11px * var(--scale))',
      }}>
        {account.score.toFixed(1)}
      </div>
      <div style={{
        textAlign: 'center',
        fontSize: 'calc(10px * var(--scale))',
      }}>
        {account.botIcon}
      </div>
      <div style={{
        textAlign: 'center',
        color: priorityColor,
        fontWeight: 700,
        fontFamily: 'monospace',
        fontSize: 'calc(11px * var(--scale))',
      }}>
        {account.roastPriority}
      </div>
    </div>
  );
}

function AccountDetail({ account }) {
  if (!account) return null;

  const priorityColor = account.roastPriority >= 8
    ? '#ff3333'
    : account.roastPriority >= 6
      ? '#ff9933'
      : '#ffcc00';

  return (
    <div style={{
      padding: 'calc(10px * var(--scale))',
      background: 'rgba(15, 15, 15, 0.95)',
      border: '1px solid rgba(0, 255, 0, 0.2)',
      borderRadius: 'calc(6px * var(--scale))',
      display: 'flex',
      flexDirection: 'column',
      gap: 'calc(8px * var(--scale))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--scale))' }}>
        <span style={{ fontSize: 'calc(20px * var(--scale))' }}>{account.verdictIcon}</span>
        <div>
          <div style={{
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: 'calc(13px * var(--scale))',
          }}>{account.handle}</div>
          <div style={{
            color: 'var(--text-muted-content)',
            fontSize: 'calc(10px * var(--scale))',
          }}>{account.followers} followers</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'calc(6px * var(--scale))',
      }}>
        <div style={{
          padding: 'calc(6px * var(--scale))',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 'calc(4px * var(--scale))',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 'calc(9px * var(--scale))', color: 'var(--text-muted-content)', textTransform: 'uppercase' }}>Score</div>
          <div style={{ fontSize: 'calc(16px * var(--scale))', fontWeight: 700, color: account.score <= 4 ? '#ff3333' : account.score <= 6 ? '#ffcc00' : '#00ff00' }}>
            {account.score.toFixed(1)}/10
          </div>
        </div>
        <div style={{
          padding: 'calc(6px * var(--scale))',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 'calc(4px * var(--scale))',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 'calc(9px * var(--scale))', color: 'var(--text-muted-content)', textTransform: 'uppercase' }}>Roast Priority</div>
          <div style={{ fontSize: 'calc(16px * var(--scale))', fontWeight: 700, color: priorityColor }}>
            {account.roastPriority}/10
          </div>
        </div>
      </div>

      <div style={{
        padding: 'calc(6px * var(--scale))',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 'calc(4px * var(--scale))',
        textAlign: 'center',
        color: account.verdict.includes('Maximum') || account.verdict.includes('High')
          ? '#ff3333'
          : account.verdict.includes('Medium')
            ? '#ffcc00'
            : '#66cc66',
        fontWeight: 600,
        fontSize: 'calc(11px * var(--scale))',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        {account.verdictIcon} {account.verdict}
      </div>

      {account.sentimentReason && (
        <div style={{
          fontSize: 'calc(10px * var(--scale))',
          color: '#ff9933',
          fontStyle: 'italic',
          lineHeight: 1.3,
          borderTop: '1px solid rgba(100, 100, 100, 0.3)',
          paddingTop: 'calc(6px * var(--scale))',
        }}>
          {account.sentimentReason}
        </div>
      )}

      <div style={{
        fontSize: 'calc(10px * var(--scale))',
        color: 'var(--text-content)',
        lineHeight: 1.4,
        borderTop: account.sentimentReason ? 'none' : '1px solid rgba(100, 100, 100, 0.3)',
        paddingTop: account.sentimentReason ? 0 : 'calc(6px * var(--scale))',
      }}>
        <span style={{ color: 'var(--text-muted-content)' }}>Notes: </span>
        {account.notes || 'No intel available.'}
      </div>

      <div style={{
        display: 'flex',
        gap: 'calc(6px * var(--scale))',
        fontSize: 'calc(9px * var(--scale))',
        color: 'var(--text-muted-content)',
        flexWrap: 'wrap',
      }}>
        <span>Sentiment: {account.sentiment}/10</span>
        <span>|</span>
        <span>Bot Lvl: {account.botLevel}/5</span>
        <span>|</span>
        <span>Organic: {account.organicEngagement ?? '-'}/10</span>
        <span>|</span>
        <span>Eng Drop: {account.engagementDrop ?? '-'}%</span>
      </div>
    </div>
  );
}

export default function KolAnalysisPanel() {
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('roastPriority');
  const [selectedHandle, setSelectedHandle] = useState(null);
  const [filter, setFilter] = useState('');
  const listRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accts, st] = await Promise.all([
        getKolAccounts(sortBy, 'desc'),
        getKolStats(),
      ]);
      setAccounts(accts);
      setStats(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter
    ? accounts.filter(
      (a) =>
        a.handle.toLowerCase().includes(filter.toLowerCase()) ||
        a.category.toLowerCase().includes(filter.toLowerCase()) ||
        a.notes.toLowerCase().includes(filter.toLowerCase())
    )
    : accounts;

  const selected = selectedHandle
    ? accounts.find((a) => a.handle === selectedHandle) || null
    : null;

  return (
    <div
      className="kol-analysis-panel training-panel wankr-panel sidebar-panel"
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
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: '0 0 12px rgba(0, 255, 0, 0.7), 0 0 24px rgba(0, 255, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.6)',
          }}
        >
          KOL Intel
        </h2>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{
          display: 'flex',
          gap: 'calc(4px * var(--scale))',
          padding: 'calc(6px * var(--scale)) calc(8px * var(--scale))',
          flexShrink: 0,
        }}>
          <StatBox label="Tracked" value={stats.total} color="var(--accent)" />
          <StatBox label="Avg Score" value={stats.avgScore.toFixed(1)} color={stats.avgScore <= 4 ? '#ff3333' : '#ffcc00'} />
          <StatBox label="Avg Roast" value={stats.avgRoastPriority.toFixed(1)} color="#ff6633" />
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: 'calc(4px * var(--scale))',
        padding: '0 calc(8px * var(--scale)) calc(6px * var(--scale))',
        flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: 'calc(4px * var(--scale)) calc(6px * var(--scale))',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(100, 100, 100, 0.4)',
            borderRadius: 'calc(4px * var(--scale))',
            color: 'var(--text-content)',
            fontSize: 'calc(10px * var(--scale))',
            outline: 'none',
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: 'calc(4px * var(--scale)) calc(6px * var(--scale))',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(100, 100, 100, 0.4)',
            borderRadius: 'calc(4px * var(--scale))',
            color: 'var(--accent)',
            fontSize: 'calc(9px * var(--scale))',
            outline: 'none',
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'calc(28px * var(--scale)) 1fr calc(50px * var(--scale)) calc(36px * var(--scale)) calc(30px * var(--scale))',
        gap: 'calc(6px * var(--scale))',
        padding: '0 calc(8px * var(--scale)) calc(3px * var(--scale))',
        fontSize: 'calc(8px * var(--scale))',
        color: 'var(--text-muted-content)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}>
        <span></span>
        <span>Account</span>
        <span style={{ textAlign: 'center' }}>Score</span>
        <span style={{ textAlign: 'center' }}>Bot</span>
        <span style={{ textAlign: 'center' }}>Roast</span>
      </div>

      {/* Account list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 calc(8px * var(--scale))',
          display: 'flex',
          flexDirection: 'column',
          gap: 'calc(3px * var(--scale))',
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted-content)', padding: 'calc(20px * var(--scale))' }}>
            Loading KOL database...
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', color: '#ff3333', padding: 'calc(20px * var(--scale))', fontSize: 'calc(11px * var(--scale))' }}>
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted-content)', padding: 'calc(20px * var(--scale))' }}>
            {filter ? 'No matches.' : 'No KOL data loaded.'}
          </div>
        )}
        {filtered.map((account) => (
          <AccountRow
            key={account.handle}
            account={account}
            isSelected={selectedHandle === account.handle}
            onClick={() => setSelectedHandle(
              selectedHandle === account.handle ? null : account.handle
            )}
          />
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          flexShrink: 0,
          padding: 'calc(6px * var(--scale)) calc(8px * var(--scale))',
          borderTop: '1px solid rgba(100, 100, 100, 0.4)',
          maxHeight: '40%',
          overflowY: 'auto',
        }}>
          <AccountDetail account={selected} />
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          padding: 'var(--dashboard-input-padding) var(--dashboard-panel-padding)',
          color: 'var(--text-muted-content)',
          background: 'linear-gradient(180deg, #161616 0%, #1e1e1e 100%)',
          borderTop: '2px solid rgba(100, 100, 100, 0.5)',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          fontSize: 'calc(9px * var(--scale))',
        }}
      >
        {filtered.length} accounts tracked
      </div>
    </div>
  );
}
