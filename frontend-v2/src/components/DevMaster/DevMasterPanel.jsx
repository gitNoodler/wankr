import { useState, useCallback } from 'react';
import { useDevMaster } from '../../hooks/useDevMaster';
import CircuitMap from './CircuitMap';
import ActivityLog from './ActivityLog';
import AgentMonitor from './AgentMonitor';
import {
  getQuarantineList, releaseFromQuarantine, quarantineFile,
  getMethodRules, addMethodRule, removeMethodRule,
  clearActivityLog, logSystem,
  fetchStackStatus, fetchPortCheck, fetchEnvInfo,
  fetchQuarantineFromBackend, quarantineFileBackend, releaseQuarantineBackend,
  fetchRulesFromBackend, addRuleBackend, removeRuleBackend,
} from './devMasterService';
import './DevMasterPanel.css';

const TABS = [
  { key: 'map', label: 'Map', icon: '\u25C9' },
  { key: 'log', label: 'Log', icon: '\u25A3' },
  { key: 'agents', label: 'Agents', icon: '\u25C6' },
  { key: 'diag', label: 'Diag', icon: '\u2318' },
  { key: 'quarantine', label: 'Quarantine', icon: '\u26A0' },
  { key: 'rules', label: 'Rules', icon: '\u2263' },
];

const DIAG_COMMANDS = [
  { id: 'stack-status', label: 'Full Stack Status', icon: '\u25C9', category: 'Health', action: 'stack_status' },
  { id: 'check-api', label: 'Check API Status', icon: '\u2713', category: 'Health', action: 'check_api' },
  { id: 'check-ports', label: 'Check Ports', icon: '\u2B21', category: 'Health', action: 'check_ports' },
  { id: 'env-check', label: 'Environment Info', icon: '\u2699', category: 'Health', action: 'env_check' },
  { id: 'check-railway', label: 'Railway Status', icon: '\u2601', category: 'Infrastructure', action: 'check_railway' },
  { id: 'check-cloudflare', label: 'Cloudflare / wankrbot.com', icon: '\u26A1', category: 'Infrastructure', action: 'check_cloudflare' },
  { id: 'check-github', label: 'GitHub Repo', icon: '\u2318', category: 'Infrastructure', action: 'check_github' },
  { id: 'restart-backend', label: 'Restart Backend', icon: '\u21BB', category: 'Services', action: 'restart_backend' },
  { id: 'train-count', label: 'Training Count', icon: '\u2211', category: 'Data', action: 'train_count' },
  { id: 'clear-log', label: 'Clear Activity Log', icon: '\u2612', category: 'Maintenance', action: 'clear_log' },
];

function DiagnosticsTab() {
  const [output, setOutput] = useState(null);
  const handleCmd = useCallback(async (cmd) => {
    setOutput({ cmd: cmd.label, status: 'running', text: 'Executing...' });
    logSystem(`Diagnostic: ${cmd.label}`);
    try {
      if (cmd.action === 'stack_status') {
        const ss = await fetchStackStatus();
        if (ss.error) { setOutput({ cmd: cmd.label, status: 'error', text: ss.error }); return; }
        const lines = [
          `Backend: ${ss.backend?.ok ? 'OK' : 'DOWN'} (port ${ss.backend?.port}, uptime ${ss.backend?.uptime}s, ${ss.backend?.nodeVersion})`,
          `Frontend dist: ${ss.frontend?.ok ? 'OK' : 'MISSING'}`,
          `xAI/Grok: ${ss.xai?.ok ? 'CONFIGURED' : 'NOT SET'}`,
          `Infisical: ${ss.infisical?.ok ? 'CONFIGURED' : 'NOT SET'}`,
          `Railway: ${ss.railway?.detected ? `DETECTED (${ss.railway.env?.environment || 'env'})` : 'NOT DETECTED (local)'}`,
          `Cloudflare: ${ss.cloudflare?.ok ? `REACHABLE (${ss.cloudflare.statusCode})` : `DOWN (${ss.cloudflare?.error || 'unreachable'})`}`,
          `GitHub: ${ss.github?.ok ? `REPO FOUND${ss.github.remoteUrl ? ' → ' + ss.github.remoteUrl : ''}` : 'NO REPO'}`,
          `GrokBot: ${ss.grokBot?.active ? `ACTIVE (${ss.grokBot.activeUsers} users)` : ss.grokBot?.ok ? 'READY' : 'DISABLED'}`,
        ];
        setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
      } else if (cmd.action === 'check_api') {
        const res = await fetch('/api/train/count');
        const data = await res.json();
        setOutput({ cmd: cmd.label, status: 'ok', text: `API responding. Training count: ${data.count}` });
      } else if (cmd.action === 'check_ports') {
        const data = await fetchPortCheck();
        if (data.error) { setOutput({ cmd: cmd.label, status: 'error', text: data.error }); return; }
        const lines = data.checks.map(c => `Port ${c.port} (${c.service}): ${c.status}${c.statusCode ? ' [' + c.statusCode + ']' : ''}`);
        setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
      } else if (cmd.action === 'env_check') {
        const data = await fetchEnvInfo();
        if (data.error) { setOutput({ cmd: cmd.label, status: 'error', text: data.error }); return; }
        const lines = [
          `Node: ${data.nodeVersion} (${data.platform}/${data.arch})`,
          `Port: ${data.port} | Uptime: ${data.uptime}s | Memory: ${data.memoryMB}MB`,
          `xAI: ${data.xaiConfigured ? 'configured' : 'not set'} | Infisical: ${data.infisicalConfigured ? 'configured' : 'not set'}`,
          `Railway: ${data.isRailway ? data.railwayEnv : 'local'} | Dist: ${data.frontendDist ? 'built' : 'not built'}`,
        ];
        setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
      } else if (cmd.action === 'check_railway') {
        const ss = await fetchStackStatus();
        if (ss.railway?.detected) {
          const env = ss.railway.env;
          const lines = [
            `Environment: ${env.environment || 'unknown'}`,
            `Project ID: ${env.projectId || 'n/a'}`,
            `Service ID: ${env.serviceId || 'n/a'}`,
            `Deployment: ${env.deploymentId || 'n/a'}`,
            `Public Domain: ${env.publicDomain || 'not set'}`,
            `Static URL: ${env.staticUrl || 'not set'}`,
          ];
          setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
        } else {
          setOutput({ cmd: cmd.label, status: 'info', text: 'Not running on Railway (local dev mode). Railway env vars not detected.' });
        }
      } else if (cmd.action === 'check_cloudflare') {
        const ss = await fetchStackStatus();
        if (ss.cloudflare?.ok) {
          setOutput({ cmd: cmd.label, status: 'ok', text: `wankrbot.com is REACHABLE (HTTP ${ss.cloudflare.statusCode}). Cloudflare tunnel is active.` });
        } else {
          setOutput({ cmd: cmd.label, status: 'error', text: `wankrbot.com is UNREACHABLE: ${ss.cloudflare?.error || 'no response'}. Check Cloudflare tunnel.` });
        }
      } else if (cmd.action === 'check_github') {
        const ss = await fetchStackStatus();
        if (ss.github?.ok) {
          setOutput({ cmd: cmd.label, status: 'ok', text: `Git repo detected.${ss.github.remoteUrl ? '\nRemote: ' + ss.github.remoteUrl : ''}` });
        } else {
          setOutput({ cmd: cmd.label, status: 'error', text: 'No git repository detected at backend root.' });
        }
      } else if (cmd.action === 'train_count') {
        const res = await fetch('/api/train/count');
        const data = await res.json();
        setOutput({ cmd: cmd.label, status: 'ok', text: `Training examples: ${data.count}` });
      } else if (cmd.action === 'restart_backend') {
        await fetch('/api/restart/request');
        setOutput({ cmd: cmd.label, status: 'ok', text: 'Restart requested.' });
      } else if (cmd.action === 'clear_log') {
        clearActivityLog();
        setOutput({ cmd: cmd.label, status: 'ok', text: 'Activity log cleared.' });
      } else {
        setOutput({ cmd: cmd.label, status: 'info', text: `"${cmd.label}" queued.` });
      }
    } catch (err) { setOutput({ cmd: cmd.label, status: 'error', text: String(err.message) }); }
  }, []);

  const cats = [...new Set(DIAG_COMMANDS.map(c => c.category))];
  return (
    <div className="devmaster-diag">
      {cats.map(cat => (
        <div key={cat} className="devmaster-diag-section">
          <div className="devmaster-diag-section-title">{cat}</div>
          <div className="devmaster-diag-grid">
            {DIAG_COMMANDS.filter(c => c.category === cat).map(cmd => (
              <button key={cmd.id} className={`devmaster-diag-btn ${cmd.danger ? 'danger' : ''}`} onClick={() => handleCmd(cmd)}>
                <span className="devmaster-diag-btn-icon">{cmd.icon}</span>{cmd.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {output && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: output.status === 'error' ? 'rgba(255,0,68,0.08)' : 'rgba(0,255,65,0.05)', border: `1px solid ${output.status === 'error' ? 'rgba(255,0,68,0.25)' : 'rgba(0,255,65,0.15)'}`, borderRadius: 6, fontSize: 12 }}>
          <div style={{ color: output.status === 'error' ? '#ff0044' : '#00ff41', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{output.cmd} — {output.status}</div>
          <div style={{ color: '#ccc', whiteSpace: 'pre-wrap', fontFamily: 'VT323, monospace' }}>{output.text}</div>
        </div>
      )}
    </div>
  );
}

function QuarantineTab() {
  const [items, setItems] = useState(getQuarantineList);
  const [input, setInput] = useState('');
  // Sync from backend on mount
  useState(() => { fetchQuarantineFromBackend().then(backendItems => { if (backendItems.length) setItems(backendItems); }); });
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

function RulesTab() {
  const [rules, setRulesState] = useState(getMethodRules);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general' });
  // Sync from backend on mount
  useState(() => { fetchRulesFromBackend().then(backendRules => { if (backendRules.length) setRulesState(backendRules); }); });
  const handleAdd = () => {
    if (!form.title.trim()) return;
    addMethodRule(form);
    addRuleBackend(form);
    setRulesState(getMethodRules());
    setForm({ title: '', description: '', category: 'general' });
    setAdding(false);
  };
  const handleRemove = (id) => {
    removeMethodRule(id);
    removeRuleBackend(id);
    setRulesState(getMethodRules());
  };
  const categories = ['general', 'security', 'architecture', 'performance', 'style', 'testing'];
  return (
    <div className="devmaster-rules">
      <div className="devmaster-rules-header">
        <div className="devmaster-rules-title">Method Rule Book</div>
        <button className="devmaster-add-btn" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add Rule'}</button>
      </div>
      {adding && (
        <div style={{ padding: 12, background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 6, marginBottom: 12 }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Rule title..." style={{ width: '100%', background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 4, padding: '6px 10px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none', marginBottom: 6 }} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={3} style={{ width: '100%', background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 4, padding: '6px 10px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none', resize: 'vertical', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 4, padding: '4px 8px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="devmaster-add-btn" onClick={handleAdd}>Save Rule</button>
          </div>
        </div>
      )}
      {rules.length === 0 ? (
        <div className="devmaster-quarantine-empty"><span style={{ fontSize: 32, opacity: 0.3 }}>{'\u{1F4D6}'}</span><span>No rules defined yet</span></div>
      ) : rules.map(rule => (
        <div key={rule.id} className="devmaster-rule-item">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="devmaster-rule-item-title">{rule.title}</div>
            <button onClick={() => handleRemove(rule.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>{'\u2717'}</button>
          </div>
          <div className="devmaster-rule-item-desc">{rule.description}</div>
          <div className="devmaster-rule-item-meta"><span>{rule.category}</span><span>{new Date(rule.createdAt).toLocaleDateString()}</span></div>
        </div>
      ))}
    </div>
  );
}

function CircuitIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="2" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="18" cy="6" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="18" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="8" x2="6" y2="16" stroke="currentColor" strokeWidth="1" />
      <line x1="18" y1="8" x2="18" y2="16" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="8" x2="10" y2="10" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="14" y1="14" x2="16" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

export default function DevMasterPanel() {
  const {
    visible, activeTab, setActiveTab, activityLog, agents,
    unreadCount, position, size, stackStatus,
    togglePanel, closePanel, startDrag, startResize,
  } = useDevMaster();

  const renderContent = () => {
    switch (activeTab) {
      case 'map': return <CircuitMap agents={agents} activityLog={activityLog} stackStatus={stackStatus} />;
      case 'log': return <ActivityLog entries={activityLog} />;
      case 'agents': return <AgentMonitor agents={agents} />;
      case 'diag': return <DiagnosticsTab />;
      case 'quarantine': return <QuarantineTab />;
      case 'rules': return <RulesTab />;
      default: return null;
    }
  };

  const activeCount = agents.filter(a => a.status !== 'dormant').length;

  return (
    <>
      {!visible && (
        <button className={`devmaster-trigger ${unreadCount > 0 ? 'has-activity' : ''}`} onClick={togglePanel} title="DevMaster (Ctrl+Shift+D)">
          <div className="devmaster-trigger-icon"><CircuitIcon /></div>
          {unreadCount > 0 && <span className="devmaster-trigger-badge">{unreadCount > 99 ? '99' : unreadCount}</span>}
        </button>
      )}

      {visible && (
        <div className="devmaster-overlay">
          <div className="devmaster-panel" style={{ left: position.x, top: position.y, width: size.w, height: size.h }}>
            <div className="devmaster-titlebar" onMouseDown={startDrag}>
              <div className="devmaster-titlebar-left">
                <div className="devmaster-status-dot" />
                <span className="devmaster-title">DevMaster</span>
                <span className="devmaster-title-sub">Control Panel</span>
              </div>
              <div className="devmaster-titlebar-right">
                <span className="devmaster-kb-hint">Ctrl+Shift+D</span>
                <button className="devmaster-titlebar-btn close" onClick={closePanel} title="Close">{'\u2715'}</button>
              </div>
            </div>
            <div className="devmaster-tabbar">
              {TABS.map(tab => (
                <button key={tab.key} className={`devmaster-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                  <span style={{ marginRight: 4 }}>{tab.icon}</span>{tab.label}
                  {tab.key === 'log' && activityLog.length > 0 && <span className="devmaster-tab-badge">{activityLog.length}</span>}
                  {tab.key === 'agents' && activeCount > 0 && <span className="devmaster-tab-badge">{activeCount}</span>}
                </button>
              ))}
            </div>
            <div className="devmaster-content">{renderContent()}</div>
            <div className="devmaster-statusbar">
              <div className="devmaster-statusbar-left">
                <div className="devmaster-statusbar-item"><div className="devmaster-statusbar-dot" style={{ background: '#00ff41' }} /><span>{activeCount} agent{activeCount !== 1 ? 's' : ''} active</span></div>
                <div className="devmaster-statusbar-item"><span>{activityLog.length} events</span></div>
              </div>
              <div className="devmaster-statusbar-right"><span>Wankr DevMaster v1.0</span></div>
            </div>
            <div className="devmaster-resize-handle right" onMouseDown={e => startResize(e, 'right')} />
            <div className="devmaster-resize-handle bottom" onMouseDown={e => startResize(e, 'bottom')} />
            <div className="devmaster-resize-handle corner" onMouseDown={e => startResize(e, 'corner')} />
          </div>
        </div>
      )}
    </>
  );
}
