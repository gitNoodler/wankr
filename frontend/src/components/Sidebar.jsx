function Sidebar({
  currentId,
  hasMessages,
  archived,
  onLoadArchived,
  onStartNewChat,
  onClearChat,
  onArchive,
  onDeleteArchived,
  thoughts,
}) {
  // Check if viewing a recalled archived chat
  const isViewingArchived = archived.some(c => c.id === currentId);
  
  // Top label: "New Chat" if viewing archived or no messages, "Current chat" if has messages
  const topLabel = isViewingArchived ? 'New Chat' : (hasMessages ? 'Current chat' : 'New Chat');
  const topIsActive = !isViewingArchived && hasMessages;
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
              maxHeight: 'calc(280px * var(--scale))',
              overflowY: 'auto',
              fontSize: 'calc(14px * var(--scale))',
            }}
          >
            <div
              onClick={isViewingArchived ? onStartNewChat : undefined}
              style={{
                padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
                borderRadius: 'calc(6px * var(--scale))',
                color: 'var(--text-content)',
                background: topIsActive
                  ? 'linear-gradient(180deg, rgba(0, 255, 0, 0.16) 0%, rgba(0, 255, 0, 0.1) 100%)'
                  : 'linear-gradient(180deg, #1a1a1a 0%, #101010 100%)',
                border: '1px solid rgba(100, 100, 100, 0.5)',
                boxShadow: topIsActive
                  ? '0 2px 10px rgba(0, 255, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.16)'
                  : '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: isViewingArchived ? 'pointer' : 'default',
              }}
            >
              {topLabel}
            </div>
            {[...archived].reverse().map((c) => {
              const isActive = c.id === currentId;
              return (
              <div
                key={c.id}
                className={`convo-item ${isActive ? 'convo-active' : ''}`}
                style={{
                  padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
                  borderRadius: 'calc(6px * var(--scale))',
                  color: 'var(--text-content)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                }}
                title={`${c.name || 'Unnamed'}${c.createdAt ? ` · ${new Date(c.createdAt).toLocaleDateString()}` : ''}`}
              >
                <span
                  onClick={() => onLoadArchived(c.id)}
                  style={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.name?.trim() || 'Unnamed'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteArchived(c);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 100, 100, 0.6)',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: 'calc(14px * var(--scale))',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#ff4444';
                    e.target.style.background = 'rgba(255, 68, 68, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 100, 100, 0.6)';
                    e.target.style.background = 'transparent';
                  }}
                  title="Delete this chat"
                >
                  ×
                </button>
              </div>
              );
            })}
          </div>
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
