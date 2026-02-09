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
          background: 'linear-gradient(180deg, #141414 0%, #0e0e0e 100%)',
          boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.6)',
        }}
      >
        <button
          type="button"
          onClick={onClearChat}
          className="btn w-full text-sm"
          style={{
            borderRadius: 'var(--dashboard-panel-radius)',
            padding: 'calc(17px * var(--scale))',
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
            padding: 'calc(17px * var(--scale))',
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
              maxHeight: 'calc(130px * var(--scale))',
              overflowY: 'auto',
              fontSize: 'calc(14px * var(--scale))',
            }}
          >
            <div
              style={{
                padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
                borderRadius: 'calc(6px * var(--scale))',
                color: 'var(--text-content)',
                background: 'linear-gradient(180deg, rgba(0, 255, 0, 0.16) 0%, rgba(0, 255, 0, 0.1) 100%)',
                border: '1px solid rgba(100, 100, 100, 0.5)',
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
                  padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
                  borderRadius: 'calc(6px * var(--scale))',
                  color: 'var(--text-content)',
                  background: 'linear-gradient(180deg, #1a1a1a 0%, #101010 100%)',
                  border: '1px solid rgba(100, 100, 100, 0.5)',
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
                  e.target.style.borderColor = 'rgba(100, 100, 100, 0.6)';
                  e.target.style.boxShadow = '0 2px 10px rgba(0, 255, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, #1c1c1c 0%, #161616 100%)';
                  e.target.style.borderColor = 'rgba(100, 100, 100, 0.6)';
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
              background: 'linear-gradient(180deg, #141414 0%, #161616 100%)',
              border: '1px solid rgba(100, 100, 100, 0.5)',
              borderRadius: 'var(--dashboard-panel-radius)',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(0, 255, 0, 0.08)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: 'calc(12px * var(--scale))',
                marginBottom: '6px',
                color: 'var(--text-content)',
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
                height: 'calc(100px * var(--scale))',
                borderRadius: 'var(--dashboard-input-border-radius)',
                padding: '8px',
                fontSize: 'calc(12px * var(--scale))',
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
              padding: 'calc(15px * var(--scale))',
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
              padding: 'calc(17px * var(--scale))',
            }}
          >
            Add to training data
          </button>
          <p
            style={{
              fontSize: 'calc(12px * var(--scale))',
              marginTop: '6px',
              color: 'var(--text-content)',
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
              background: 'linear-gradient(180deg, #141414 0%, #161616 100%)',
              border: '1px solid rgba(100, 100, 100, 0.5)',
              borderRadius: 'var(--dashboard-panel-radius)',
              color: 'var(--text-content)',
              minHeight: 'calc(86px * var(--scale))',
              maxHeight: 'calc(162px * var(--scale))',
              overflowY: 'auto',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(0, 255, 0, 0.08)',
              fontSize: 'calc(13px * var(--scale))',
            }}
          >
            {thoughts.length === 0 && (
              <div style={{ color: 'var(--text-muted-content)', fontStyle: 'italic', opacity: 0.7 }}>
                No thoughts yet...
              </div>
            )}
            {thoughts.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: 'calc(8px * var(--scale)) calc(10px * var(--scale))',
                  background: 'linear-gradient(180deg, #1c1c1c 0%, #161616 100%)',
                  borderLeft: 'calc(3px * var(--scale)) solid rgba(100, 100, 100, 0.5)',
                  borderRadius: 'calc(4px * var(--scale))',
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
          color: 'var(--text-muted-content)',
          background: 'linear-gradient(180deg, #161616 0%, #1e1e1e 100%)',
          borderTop: '2px solid rgba(100, 100, 100, 0.5)',
          boxShadow: `
            0 -4px 12px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          fontSize: 'calc(11px * var(--scale))',
        }}
      >
        Wankr v0.1 • built for Payton
      </div>
    </div>
  );
}

export default Sidebar;
