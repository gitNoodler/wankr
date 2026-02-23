import { useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { FixedSizeList } from 'react-window';

const ARCHIVED_VIRTUAL_THRESHOLD = 100;

function Sidebar({
  currentId,
  hasMessages,
  archived,
  onLoadArchived,
  onStartNewChat,
  onClearChat,
  onArchive,
  onDeleteArchived,
}) {
  const archivedListRef = useRef(null);
  const [archivedListHeight, setArchivedListHeight] = useState(0);

  const archivedReversed = useMemo(() => [...archived].reverse(), [archived]);
  const useVirtualArchived = archived.length > ARCHIVED_VIRTUAL_THRESHOLD;

  useLayoutEffect(() => {
    if (!archivedListRef.current || !useVirtualArchived) return;
    const el = archivedListRef.current;
    const update = () => setArchivedListHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [useVirtualArchived]);

  const ArchivedRow = useCallback(({ index, style, data }) => {
    const c = data[index];
    if (!c) return null;
    const isActive = c.id === currentId;
    return (
      <div
        style={{
          ...style,
          padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
          borderRadius: 'calc(6px * var(--scale))',
          color: 'var(--text-content)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          boxSizing: 'border-box',
        }}
        className={`convo-item ${isActive ? 'convo-active' : ''}`}
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
            flexShrink: 0,
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
  }, [currentId, onLoadArchived, onDeleteArchived]);

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
          Social Dumpster
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
              height: useVirtualArchived ? 'calc(280px * var(--scale))' : undefined,
              overflowY: useVirtualArchived ? 'hidden' : 'auto',
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
                flexShrink: 0,
              }}
            >
              {topLabel}
            </div>
            {useVirtualArchived ? (
              <div ref={archivedListRef} style={{ flex: 1, minHeight: 0 }}>
                {archivedListHeight > 0 && (
                  <FixedSizeList
                    height={archivedListHeight}
                    width="100%"
                    itemCount={archivedReversed.length}
                    itemSize={44}
                    itemData={archivedReversed}
                    style={{ overflowX: 'hidden' }}
                  >
                    {ArchivedRow}
                  </FixedSizeList>
                )}
              </div>
            ) : (
              archivedReversed.map((c) => {
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
              })
            )}
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
          fontSize: 'calc(9px * var(--scale))',
        }}
      >
        Wankr v0.1 • built by gitNoodler
      </div>
    </div>
  );
}

export default Sidebar;
