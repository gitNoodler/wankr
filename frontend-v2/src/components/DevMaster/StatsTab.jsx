import { useState, useEffect, useRef } from 'react';

const REFRESH_INTERVAL = 5000;

function fmt$(n) { return `$${(n || 0).toFixed(4)}`; }
function fmtNum(n) { return (n || 0).toLocaleString(); }
function fmtUptime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Color gradient from green (cheap) to red (expensive) based on proportion
function costColor(ratio) {
  if (ratio > 0.5) return '#ff4444';
  if (ratio > 0.3) return '#ff8c00';
  if (ratio > 0.15) return '#ffdf00';
  return '#00ff41';
}

export default function StatsTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch('/api/devmaster/stats')
        .then(r => r.json())
        .then(data => { if (active) { setStats(data); setError(null); } })
        .catch(err => { if (active) setError(err.message); });
    };
    load();
    timerRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => { active = false; clearInterval(timerRef.current); };
  }, []);

  if (error) return <div style={styles.error}>Stats error: {error}</div>;
  if (!stats) return <div style={styles.loading}>Loading stats...</div>;

  const { xai, launches, handles, users, pipeline, system, xStream } = stats;
  const totalCost = xai?.estimatedCost || 0;
  const perType = xai?.perType || [];
  const burnPerHour = xai?.burnPerHour || 0;
  const projectedDaily = xai?.projectedDaily || 0;

  return (
    <div style={styles.container}>
      {/* xAI Cost — the main event */}
      <Section title="xAI Cost Breakdown" accent="#ff6b00">
        <div style={styles.costHeader}>
          <div style={styles.costTotal}>
            <div style={styles.costTotalLabel}>Spent today</div>
            <div style={styles.costTotalValue}>{fmt$(totalCost)}</div>
          </div>
          <div style={styles.costBurn}>
            <div style={styles.burnRow}>
              <span style={styles.burnLabel}>Burn rate</span>
              <span style={{ ...styles.burnValue, color: burnPerHour > 0.05 ? '#ff4444' : '#ffdf00' }}>{fmt$(burnPerHour)}/hr</span>
            </div>
            <div style={styles.burnRow}>
              <span style={styles.burnLabel}>Projected 24h</span>
              <span style={{ ...styles.burnValue, color: projectedDaily > 1 ? '#ff4444' : projectedDaily > 0.5 ? '#ff8c00' : '#e5e5e5' }}>{fmt$(projectedDaily)}</span>
            </div>
            <div style={styles.burnRow}>
              <span style={styles.burnLabel}>Tracking window</span>
              <span style={styles.burnValue}>{(xai?.hoursTracked || 0).toFixed(1)}h</span>
            </div>
          </div>
        </div>

        {/* Per-type cost bars, sorted by cost desc */}
        <div style={styles.costBars}>
          {perType.map(t => {
            const pct = totalCost > 0 ? t.totalCost / totalCost : 0;
            return (
              <div key={t.type} style={styles.costBarRow}>
                <div style={styles.costBarLabel}>
                  <span style={styles.costBarType}>{t.type}</span>
                  <span style={styles.costBarCalls}>{t.count} calls</span>
                </div>
                <div style={styles.costBarTrack}>
                  <div style={{
                    ...styles.costBarFill,
                    width: `${Math.max(pct * 100, t.count > 0 ? 2 : 0)}%`,
                    background: costColor(pct),
                  }} />
                </div>
                <div style={styles.costBarAmount}>
                  <span style={{ color: costColor(pct), fontWeight: pct > 0.3 ? 700 : 400 }}>{fmt$(t.totalCost)}</span>
                  {pct > 0 && <span style={styles.costBarPct}>{Math.round(pct * 100)}%</span>}
                </div>
              </div>
            );
          })}
        </div>
        <Row label="Total calls" value={fmtNum(xai?.totalCalls)} />
      </Section>

      {/* Launch Detection */}
      <Section title="Launch Detection" accent="#00ff41">
        <Row label="Cache size" value={fmtNum(launches?.cacheSize)} />
        {launches?.pendingTokens?.length > 0 && (
          <PendingDropdown tokens={launches.pendingTokens} />
        )}
        <Row label="Queue depth" value={fmtNum(launches?.queueDepth)} />
        <Row label="Active batches" value={fmtNum(launches?.activeBatches)} warn={launches?.activeBatches > 2} />
        <Row label="Batches" value={`${launches?.batchesFired || 0} fired / ${launches?.batchesSuccess || 0} ok / ${launches?.batchesFail || 0} fail`} />
        <Row label="Failed attempts" value={fmtNum(launches?.failedAttempts)} />
      </Section>

      {/* Handle Tracker */}
      <Section title="Handle Tracker" accent="#00ffff">
        <Row label="Tracked" value={fmtNum(handles?.tracked)} />
        <Row label="Flagged bots" value={fmtNum(handles?.flaggedBots)} warn={handles?.flaggedBots > 0} />
        {handles?.topDeployers?.length > 0 && (
          <div style={styles.topList}>
            <div style={styles.topLabel}>Top deployers</div>
            {handles.topDeployers.map((d, i) => (
              <div key={i} style={styles.topItem}>
                <span style={styles.topHandle}>{d.handle}</span>
                <span style={styles.topCount}>{d.launches}</span>
                {d.botFlag && <span style={styles.botBadge}>{d.botFlag}</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Active Users */}
      <Section title="Active Users" accent="#ffdf00">
        <Row label="Active" value={fmtNum(users?.active)} />
        <Row label="Spectators" value={fmtNum(users?.spectators)} />
      </Section>

      {/* Pipeline Quality */}
      <Section title="Pipeline Quality" accent="#cc66ff">
        {pipeline && pipeline.count > 0 ? (
          <>
            <Row label="Validations" value={fmtNum(pipeline.count)} />
            <Row label="Flagged" value={`${pipeline.flagged} (${pipeline.count ? Math.round(pipeline.flagged / pipeline.count * 100) : 0}%)`} warn={pipeline.flagged > 0} />
            {pipeline.averages && (
              <div style={styles.breakdown}>
                <MiniStat label="Bounds" value={pipeline.averages.bounds?.toFixed(1)} />
                <MiniStat label="Framing" value={pipeline.averages.framing?.toFixed(1)} />
                <MiniStat label="Persona" value={pipeline.averages.persona?.toFixed(1)} />
              </div>
            )}
          </>
        ) : (
          <Row label="Status" value="No validations yet" />
        )}
      </Section>

      {/* X Stream */}
      <Section title="X Stream" accent="#1d9bf0">
        <Row label="Status" value={xStream?.connected ? '🔴 Connected' : '⚫ Disconnected'} warn={!xStream?.connected} />
        <Row label="Tweets received" value={fmtNum(xStream?.totalTweetsReceived)} />
        {xStream?.reconnectAttempts > 0 && (
          <Row label="Reconnect attempts" value={fmtNum(xStream?.reconnectAttempts)} warn />
        )}
      </Section>

      {/* System */}
      <Section title="System" accent="#888">
        <Row label="Uptime" value={fmtUptime(system?.uptime)} />
        <Row label="Memory (RSS)" value={`${system?.memoryMB || 0} MB`} />
        <Row label="Heap used" value={`${system?.heapUsedMB || 0} MB`} />
        <Row label="Cache entries" value={fmtNum(system?.cacheEntries)} />
      </Section>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div style={styles.section}>
      <div style={{ ...styles.sectionTitle, color: accent }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, warn }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: warn ? '#ff4444' : '#e5e5e5' }}>{value}</span>
    </div>
  );
}

function PendingDropdown({ tokens }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.pendingWrap}>
      <div style={styles.pendingHeader} onClick={() => setOpen(!open)}>
        <span style={styles.pendingLabel}>Batching for sentiment</span>
        <span style={styles.pendingCount}>{tokens.length}</span>
        <span style={styles.pendingArrow}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div style={styles.pendingList}>
          {tokens.map((t, i) => (
            <div key={i} style={styles.pendingItem}>
              <span style={styles.pendingName}>{t.symbol ? `$${t.symbol}` : t.name}</span>
              {t.requestedBy && <span style={styles.pendingBy}>{t.requestedBy}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div style={styles.miniStat}>
      <div style={styles.miniLabel}>{label}</div>
      <div style={styles.miniValue}>{value}</div>
      {sub && <div style={styles.miniSub}>{sub}</div>}
    </div>
  );
}

const styles = {
  container: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
    height: '100%',
    fontFamily: "'VT323', monospace",
  },
  loading: { color: '#888', padding: 20, textAlign: 'center' },
  error: { color: '#ff4444', padding: 20, textAlign: 'center' },
  section: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '10px 14px',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
    fontSize: 14,
  },
  label: { color: '#888' },
  value: { fontFamily: "'VT323', monospace", fontWeight: 400 },
  breakdown: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 8,
  },
  miniStat: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    padding: '6px 8px',
    textAlign: 'center',
  },
  miniLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  miniValue: { fontSize: 16, color: '#e5e5e5', fontFamily: "'VT323', monospace" },
  miniSub: { fontSize: 10, color: '#ff6b00' },
  // Cost header
  costHeader: {
    display: 'flex',
    gap: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  costTotal: {
    background: 'rgba(255,107,0,0.08)',
    border: '1px solid rgba(255,107,0,0.25)',
    borderRadius: 6,
    padding: '8px 14px',
    textAlign: 'center',
    minWidth: 90,
  },
  costTotalLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  costTotalValue: { fontSize: 22, color: '#ff6b00', fontFamily: "'VT323', monospace", fontWeight: 700 },
  costBurn: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  burnRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
  burnLabel: { color: '#666' },
  burnValue: { fontFamily: "'VT323', monospace" },
  // Cost bars
  costBars: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 },
  costBarRow: { display: 'flex', alignItems: 'center', gap: 8 },
  costBarLabel: { width: 110, display: 'flex', flexDirection: 'column' },
  costBarType: { fontSize: 12, color: '#ccc', textTransform: 'capitalize' },
  costBarCalls: { fontSize: 10, color: '#555' },
  costBarTrack: {
    flex: 1,
    height: 10,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  costBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  costBarAmount: {
    width: 80,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: "'VT323', monospace",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  costBarPct: { fontSize: 10, color: '#666' },
  // Top deployers
  topList: { marginTop: 8 },
  topLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  topItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '2px 0',
    fontSize: 13,
  },
  topHandle: { color: '#00ffff', flex: 1 },
  topCount: { color: '#e5e5e5', fontFamily: "'VT323', monospace" },
  botBadge: {
    fontSize: 10,
    background: 'rgba(255,68,68,0.2)',
    color: '#ff4444',
    padding: '1px 6px',
    borderRadius: 3,
  },
  // Pending sentiment dropdown
  pendingWrap: { margin: '4px 0' },
  pendingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    cursor: 'pointer',
    userSelect: 'none',
  },
  pendingLabel: { color: '#ffdf00', fontSize: 13 },
  pendingCount: {
    background: 'rgba(255,223,0,0.15)',
    color: '#ffdf00',
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 3,
    fontFamily: "'VT323', monospace",
  },
  pendingArrow: { color: '#666', fontSize: 11 },
  pendingList: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    padding: '4px 8px',
    marginTop: 4,
    maxHeight: 150,
    overflowY: 'auto',
  },
  pendingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    fontSize: 12,
  },
  pendingName: { color: '#e5e5e5', fontFamily: "'VT323', monospace" },
  pendingBy: { color: '#00ffff', fontSize: 11 },
};
