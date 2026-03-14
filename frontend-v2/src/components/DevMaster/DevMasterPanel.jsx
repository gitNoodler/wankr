import { useDevMaster } from '../../hooks/useDevMaster';
import CircuitMap from './CircuitMap';
import ActivityLog from './ActivityLog';
import AgentMonitor from './AgentMonitor';
import StatsTab from './StatsTab';
import DiagnosticsTab from './DiagnosticsTab';
import QuarantineTab from './QuarantineTab';
import RulesTab from './RulesTab';
import './DevMasterPanel.css';

const TABS = [
  { key: 'map', label: 'Map', icon: '\u25C9' },
  { key: 'log', label: 'Log', icon: '\u25A3' },
  { key: 'agents', label: 'Agents', icon: '\u25C6' },
  { key: 'diag', label: 'Diag', icon: '\u2318' },
  { key: 'quarantine', label: 'Quarantine', icon: '\u26A0' },
  { key: 'rules', label: 'Rules', icon: '\u2263' },
  { key: 'stats', label: 'Stats', icon: '\u2261' },
];

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
      case 'stats': return <StatsTab />;
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
