import { useState, useEffect } from 'react';
import {
  getQuarantineList, releaseFromQuarantine, quarantineFile,
  fetchQuarantineFromBackend, quarantineFileBackend, releaseQuarantineBackend,
} from './devMasterService';

export default function QuarantineTab() {
  const [items, setItems] = useState(getQuarantineList);
  const [input, setInput] = useState('');
  // Sync from backend on mount (was useState — fixed to useEffect)
  useEffect(() => { fetchQuarantineFromBackend().then(backendItems => { if (backendItems.length) setItems(backendItems); }); }, []);
  const handleAdd = () => {
    if (!input.trim()) return;
    quarantineFile(input.trim(), 'Manual quarantine', 'User');
    quarantineFileBackend(input.trim(), 'Manual quarantine', 'User');
    setItems(getQuarantineList());
    setInput('');
  };
  const handleRelease = (id) => {
    releaseFromQuarantine(id);
    releaseQuarantineBackend(id);
    setItems(getQuarantineList());
  };
  return (
    <div className="devmaster-quarantine">
      <div className="devmaster-quarantine-header">
        <div className="devmaster-quarantine-title">File Quarantine Zone</div>
        <div className="devmaster-quarantine-count">{items.length} file{items.length !== 1 ? 's' : ''} isolated</div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="File path to quarantine..." style={{ flex: 1, background: '#111', border: '1px solid rgba(255,0,68,0.2)', borderRadius: 4, padding: '6px 10px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none' }} />
        <button className="devmaster-add-btn" onClick={handleAdd} style={{ color: '#ff0044', borderColor: 'rgba(255,0,68,0.3)' }}>Isolate</button>
      </div>
      {items.length === 0 ? (
        <div className="devmaster-quarantine-empty"><span style={{ fontSize: 32, opacity: 0.3 }}>{'\u{1F512}'}</span><span>No files quarantined</span></div>
      ) : items.map(item => (
        <div key={item.id} className="devmaster-quarantine-item">
          <span className="devmaster-quarantine-item-icon">{'\u{26D4}'}</span>
          <span className="devmaster-quarantine-item-path">{item.filePath}</span>
          <span className="devmaster-quarantine-item-date">{new Date(item.timestamp).toLocaleDateString()}</span>
          <button className="devmaster-add-btn" onClick={() => handleRelease(item.id)} style={{ fontSize: 10, padding: '2px 8px' }}>Release</button>
        </div>
      ))}
    </div>
  );
}
