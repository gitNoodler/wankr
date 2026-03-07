import { useState, useEffect, useRef } from 'react';

const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'restore', label: 'Restore' }, { key: 'merge', label: 'Merge' },
  { key: 'delete', label: 'Delete' }, { key: 'override', label: 'Override' }, { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' }, { key: 'system', label: 'System' },
];

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ActivityLog({ entries = [] }) {
  const [filter, setFilter] = useState('all');
  const scrollRef = useRef(null);
  const prevLen = useRef(0);

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  useEffect(() => {
    if (entries.length > prevLen.current && scrollRef.current) {
      requestAnimationFrame(() => { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
    }
    prevLen.current = entries.length;
  }, [entries.length]);

  return (
    <div className="devmaster-log">
      <div className="devmaster-log-filters">
        {FILTERS.map(opt => (
          <button key={opt.key} className={`devmaster-log-filter ${filter === opt.key ? 'active' : ''}`} onClick={() => setFilter(opt.key)}>
            {opt.label}
            {opt.key !== 'all' && <span className="devmaster-tab-badge" style={{ marginLeft: 4, fontSize: 9 }}>{entries.filter(e => e.type === opt.key).length}</span>}
          </button>
        ))}
      </div>
      <div className="devmaster-log-entries" ref={scrollRef}>
        {filtered.length === 0 ? (
          <div className="devmaster-log-empty">{filter === 'all' ? 'No activity recorded yet.' : `No ${filter} events.`}</div>
        ) : filtered.map(entry => (
          <div key={entry.id} className="devmaster-log-entry">
            <span className="devmaster-log-time">{formatTime(entry.timestamp)}</span>
            <span className={`devmaster-log-type ${entry.type}`}>{entry.type}</span>
            <div className="devmaster-log-details">
              <div className="devmaster-log-path">{entry.filePath || '\u2014'}</div>
              <div className="devmaster-log-meta">
                {entry.source && <span>src: {entry.source}</span>}
                {entry.agent && <span> &middot; agent: {entry.agent}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
