export default function AgentMonitor({ agents = [] }) {
  return (
    <div className="devmaster-agents">
      <div className="devmaster-agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className={`devmaster-agent-card ${agent.status}`} title={agent.desc}>
            <div className={`devmaster-agent-icon ${agent.status}`}>
              <span role="img" aria-label={agent.name}>{agent.icon}</span>
            </div>
            <div className="devmaster-agent-name">{agent.name}</div>
            <div className="devmaster-agent-status-text">
              {agent.status === 'active' ? 'ACTIVE' : agent.status === 'watching' ? 'WATCHING' : 'STANDBY'}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: 'rgba(0, 255, 65, 0.03)', border: '1px solid rgba(0, 255, 65, 0.1)',
        borderRadius: 8, fontSize: 11, color: '#666', lineHeight: 1.6,
      }}>
        <div style={{ color: '#00ff41', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>Agent Status Key</div>
        <div><span style={{ color: '#00ff41' }}>ACTIVE</span> — Currently processing or executing</div>
        <div><span style={{ color: '#00ffff' }}>WATCHING</span> — Monitoring in background</div>
        <div><span style={{ color: '#555' }}>STANDBY</span> — Dormant, ready to activate</div>
      </div>
    </div>
  );
}
