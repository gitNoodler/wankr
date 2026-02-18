/**
 * Renders custom elements (panels, buttons) and boundaries on the Wanking Live panel.
 * Positioned absolute within the content container. Boundaries are semi-transparent; elements use % positioning.
 */
export default function WankingLiveCustomLayer({
  elements = [],
  boundaries = [],
  hideBoundariesVisual = false,
  selectedElementId,
  onSelectElement,
  indentionSelectedElement = false,
}) {
  if (elements.length === 0 && boundaries.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* Boundaries - click-through, visual only; hidden when hideBoundariesVisual */}
      {!hideBoundariesVisual &&
        boundaries.map((b) => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: `${b.left * 100}%`,
              top: `${b.top * 100}%`,
              width: `${Math.max(0.5, (b.right - b.left) * 100)}%`,
              height: `${Math.max(0.5, (b.bottom - b.top) * 100)}%`,
              border: '2px dashed rgba(255, 180, 0, 0.6)',
              background: 'rgba(255, 180, 0, 0.08)',
              boxSizing: 'border-box',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
          >
            {b.layer && (
              <span
                style={{
                  fontSize: '9px',
                  lineHeight: 1.2,
                  color: 'rgba(255, 180, 0, 0.95)',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '1px 4px',
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: '100%',
                  textOverflow: 'ellipsis',
                }}
              >
                {b.layer}
              </span>
            )}
          </div>
        ))}

      {/* Custom elements - need pointerEvents for selection */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
        {elements.map((el) => {
          const isSelected = el.id === selectedElementId;
          const showIndention = isSelected && indentionSelectedElement;
          return (
            <div
              key={el.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement?.(el.id);
              }}
              role={el.type === 'button' ? 'button' : 'generic'}
              style={{
                position: 'absolute',
                left: `${el.left ?? 0}%`,
                top: `${el.top ?? 0}%`,
                width: `${el.width ?? 20}%`,
                height: `${el.height ?? 10}%`,
                padding: `${el.padding ?? 8}px`,
                margin: `${el.margin ?? 4}px`,
                borderRadius: `${el.borderRadius ?? 8}px`,
                zIndex: el.zIndex ?? 10,
                boxSizing: 'border-box',
                background: el.type === 'button'
                  ? 'linear-gradient(180deg, rgba(0, 255, 65, 0.2) 0%, rgba(0, 255, 65, 0.1) 100%)'
                  : 'linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'rgba(100, 100, 100, 0.5)'}`,
                boxShadow: showIndention
                  ? 'inset 0 2px 12px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.3)'
                  : isSelected
                    ? '0 0 12px rgba(0, 255, 65, 0.4)'
                    : '0 2px 6px rgba(0, 0, 0, 0.3)',
                color: 'var(--text-content)',
                fontSize: 'calc(12px * var(--scale))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
