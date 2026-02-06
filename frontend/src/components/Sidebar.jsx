function Sidebar({
  currentLabel,
  archived,
  onLoadArchived,
  onClearChat,
  onArchive,
  onResetPrompt,
  systemPrompt,
  onSystemPromptChange,
  onTrain,
  trainCount,
  thoughts,
}) {
  return (
    <div
      className="wankr-panel sidebar-panel"
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sidebar Header with depth */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 var(--dashboard-panel-padding)',
          height: 'var(--dashboard-header-height)',
          minHeight: 'var(--dashboard-header-height)',
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(60, 60, 60, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
          flexShrink: 0,
        }}
      >
        <h2
          className="font-wankr"
          style={{
            margin: 0,
            fontSize: 'var(--dashboard-title-font-size)',
            fontWeight: 900,
            color: 'var(--accent)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow:
              '0 0 22px rgba(0, 255, 0, 0.95), 0 0 40px rgba(0, 255, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7)',
          }}
        >
          Tools
        </h2>
      </div>

      {/* Scrollable Content */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--dashboard-panel-padding)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dashboard-panel-padding)',
          minHeight: 0,
          background: 'linear-gradient(180deg, #080808 0%, #050505 100%)',
          boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.6)',
        }}
      >
        <button
          type="button"
          onClick={onClearChat}
          className="btn w-full text-sm"
          style={{
            borderRadius: 'var(--dashboard-panel-radius)',
            padding: 'clamp(11px, 1.4vw, 17px)',
          }}
        >
          Clear Chat
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="btn w-full text-sm"
          style={{
            borderRadius: 'var(--dashboard-panel-radius)',
            padding: 'clamp(11px, 1.4vw, 17px)',
          }}
        >
          Archive
        </button>

        {/* Conversations */}
        <div>
          <div className="sidebar-title">Conversations</div>
          <div
            className="scroll-area"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: 'clamp(80px, 12vh, 140px)',
              overflowY: 'auto',
              fontSize: 'clamp(11px, 1vw, 14px)',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                background: 'linear-gradient(180deg, rgba(0, 255, 0, 0.28) 0%, rgba(0, 255, 0, 0.16) 100%)',
                border: '1px solid rgba(0, 255, 0, 0.6)',
                boxShadow: '0 2px 10px rgba(0, 255, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentLabel}
            </div>
            {[...archived].reverse().map((c) => (
              <div
                key={c.id}
                className="convo-item"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  background: 'linear-gradient(180deg, #1a1a1a 0%, #101010 100%)',
                  border: '1px solid rgba(0, 255, 0, 0.25)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`${c.name || 'Unnamed'}${c.createdAt ? ` · ${new Date(c.createdAt).toLocaleDateString()}` : ''}`}
                onClick={() => onLoadArchived(c.id)}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, rgba(0, 255, 0, 0.15) 0%, rgba(0, 255, 0, 0.08) 100%)';
                  e.target.style.borderColor = 'rgba(0, 255, 0, 0.6)';
                  e.target.style.boxShadow = '0 2px 10px rgba(0, 255, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)';
                  e.target.style.borderColor = 'rgba(0, 255, 0, 0.25)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
                }}
              >
                {c.name?.trim() || 'Unnamed'}
              </div>
            ))}
          </div>
        </div>

        {/* Training */}
        <div>
          <div className="sidebar-title">Training</div>
          <div
            style={{
              padding: 'var(--dashboard-input-padding)',
              background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
              border: '1px solid rgba(0, 255, 0, 0.5)',
              borderRadius: 'var(--dashboard-panel-radius)',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(0, 255, 0, 0.08)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: 'clamp(10px, 0.9vw, 12px)',
                marginBottom: '6px',
                color: 'rgba(220, 220, 220, 0.85)',
              }}
            >
              System prompt (training data only)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              className="input-field scroll-area"
              placeholder="Optional override. Chat always uses Wankr identity."
              style={{
                width: '100%',
                height: 'clamp(60px, 10vh, 100px)',
                borderRadius: 'var(--dashboard-input-border-radius)',
                padding: '8px',
                fontSize: 'clamp(10px, 0.9vw, 12px)',
                fontFamily: 'monospace',
                resize: 'none',
              }}
            />
          </div>
          <button
            type="button"
            onClick={onResetPrompt}
            className="btn w-full text-sm"
            style={{
              borderRadius: 'var(--dashboard-panel-radius)',
              marginTop: '8px',
              padding: 'clamp(10px, 1.3vw, 15px)',
            }}
          >
            Reset system prompt
          </button>
          <button
            type="button"
            onClick={onTrain}
            className="btn-primary w-full text-sm font-medium"
            style={{
              borderRadius: 'var(--dashboard-panel-radius)',
              marginTop: '8px',
              padding: 'clamp(11px, 1.4vw, 17px)',
            }}
          >
            Add to training data
          </button>
          <p
            style={{
              fontSize: 'clamp(10px, 0.9vw, 12px)',
              marginTop: '6px',
              color: 'rgba(220, 220, 220, 0.8)',
            }}
          >
            Training examples: <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{trainCount}</span>
          </p>
        </div>

        {/* Thought Process */}
        <div>
          <div className="sidebar-title">Thought Process</div>
          <div
            className="scroll-area"
            style={{
              padding: 'var(--dashboard-input-padding)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
              border: '1px solid rgba(0, 255, 0, 0.5)',
              borderRadius: 'var(--dashboard-panel-radius)',
              color: 'rgba(220, 220, 220, 0.8)',
              minHeight: 'clamp(60px, 8vh, 100px)',
              maxHeight: 'clamp(100px, 15vh, 180px)',
              overflowY: 'auto',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(0, 255, 0, 0.08)',
              fontSize: 'clamp(11px, 1vw, 13px)',
            }}
          >
            {thoughts.length === 0 && (
              <div style={{ color: 'rgba(220, 220, 220, 0.7)', fontStyle: 'italic', opacity: 0.7 }}>
                No thoughts yet...
              </div>
            )}
            {thoughts.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
                  borderLeft: '3px solid var(--accent)',
                  borderRadius: '4px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>→</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with depth */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          padding: 'var(--dashboard-input-padding) var(--dashboard-panel-padding)',
          color: 'rgba(220, 220, 220, 0.75)',
          background: 'linear-gradient(180deg, #121212 0%, #1b1b1b 100%)',
          borderTop: '2px solid rgba(100, 100, 100, 0.4)',
          boxShadow: `
            0 -4px 12px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          fontSize: 'clamp(9px, 0.8vw, 11px)',
        }}
      >
        Wankr v0.1 • built for Payton
      </div>
    </div>
  );
}

export default Sidebar;
