import { useState, useCallback, useRef } from 'react';
import SliderRow from '../LoginScreen/SliderRow';
import { BOUNDARY_LAYERS } from './wankingLiveLayoutStorage';

const ELEMENT_DEFAULTS = {
  panel: { left: 10, top: 10, width: 30, height: 20, padding: 8, margin: 4, borderRadius: 8, zIndex: 10 },
  button: { left: 10, top: 10, width: 20, height: 8, padding: 6, margin: 4, borderRadius: 6, zIndex: 10 },
};

export default function WankingLiveDevPanel({
  elements = [],
  boundaries = [],
  hideBoundariesVisual = false,
  onHideBoundariesVisualChange,
  isIndentionPanel = false,
  onIndentionPanelChange,
  selectedElementId,
  onSelectElement,
  // eslint-disable-next-line no-unused-vars -- accepted for API compat
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  // eslint-disable-next-line no-unused-vars -- accepted for API compat
  onAddBoundary,
  onUpdateBoundary,
  onDeleteBoundary,
  selectedBoundaryLayer,
  onSelectedBoundaryLayerChange,
  placementMode,
  onPlacementModeChange,
  onOpenMeasure,
  onClose,
  onLock,
  onClearCache,
  showOriginCrosshair = false,
  onToggleOriginCrosshair,
}) {
  const selectedElement = elements.find((e) => e.id === selectedElementId);
  const panelRef = useRef(null);
  const [slidersExpanded, setSlidersExpanded] = useState(true);

  const handleDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;

    // Switch from right-anchored to left/top positioning on first drag
    panel.style.right = 'auto';
    panel.style.left = startLeft + 'px';
    panel.style.top = startTop + 'px';

    const onMove = (ev) => {
      panel.style.left = (startLeft + ev.clientX - startX) + 'px';
      panel.style.top = (startTop + ev.clientY - startY) + 'px';
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleAddPanel = useCallback(() => {
    onPlacementModeChange?.('panel');
  }, [onPlacementModeChange]);

  const handleAddButton = useCallback(() => {
    onPlacementModeChange?.('button');
  }, [onPlacementModeChange]);

  const handleDrawBoundary = useCallback(() => {
    onPlacementModeChange?.('boundary');
  }, [onPlacementModeChange]);

  const handleSliderChange = useCallback(
    (key, value) => {
      if (!selectedElementId) return;
      onUpdateElement?.(selectedElementId, { [key]: value });
    },
    [selectedElementId, onUpdateElement]
  );

  const handleNameChange = useCallback(
    (e) => {
      if (!selectedElementId) return;
      onUpdateElement?.(selectedElementId, { name: e.target.value });
    },
    [selectedElementId, onUpdateElement]
  );

  const handleDeleteElement = useCallback(() => {
    if (selectedElementId) {
      onDeleteElement?.(selectedElementId);
      onSelectElement?.(null);
    }
  }, [selectedElementId, onDeleteElement, onSelectElement]);

  const handleDeleteBoundary = useCallback(
    (id) => (e) => {
      e.stopPropagation();
      onDeleteBoundary?.(id);
    },
    [onDeleteBoundary]
  );

  const panelStyle = {
    position: 'fixed',
    top: 110,
    right: 20,
    zIndex: 210,
    background: 'rgba(0,0,0,0.95)',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid var(--accent)',
    boxShadow: '0 0 30px rgba(0,255,65,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 280,
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  return (
    <div ref={panelRef} style={panelStyle}>
      <div
        role="button"
        tabIndex={0}
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px' }}>
          WANKING LIVE DEV
        </span>
        <button
          type="button"
          onClick={() => onIndentionPanelChange?.(!isIndentionPanel)}
          onMouseDown={(e) => e.stopPropagation()}
          title={isIndentionPanel ? 'Switch to extension panel' : 'Switch to indention panel'}
          style={{
            padding: '4px 8px',
            fontSize: 10,
            background: isIndentionPanel ? 'rgba(0,255,65,0.2)' : 'rgba(100,100,100,0.3)',
            border: `1px solid ${isIndentionPanel ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 4,
            color: isIndentionPanel ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          {isIndentionPanel ? 'Extension' : 'Indention'}
        </button>
        {onClearCache && (
          <button
            type="button"
            onClick={onClearCache}
            onMouseDown={(e) => e.stopPropagation()}
            title="Clear stored elements and boundaries (localStorage)"
            style={{
              background: 'transparent',
              border: '1px solid rgba(150,150,255,0.5)',
              borderRadius: 4,
              color: '#99aaff',
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear cache
          </button>
        )}
        {onLock && (
          <button
            type="button"
            onClick={onLock}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,180,0,0.6)',
              borderRadius: 4,
              color: '#ffb84d',
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            LOCK
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,100,100,0.5)',
            borderRadius: 4,
            color: '#ff6b6b',
            padding: '4px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
      </div>

      {onToggleOriginCrosshair && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={onToggleOriginCrosshair}
            style={{
              padding: '6px 10px',
              fontSize: 11,
              background: showOriginCrosshair ? 'rgba(255,0,0,0.25)' : 'rgba(100,100,100,0.3)',
              border: `1px solid ${showOriginCrosshair ? '#f00' : 'rgba(255,255,255,0.3)'}`,
              borderRadius: 4,
              color: showOriginCrosshair ? '#f66' : 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
            }}
            title="Toggle red crosshair at viewport origin (0,0)"
          >
            Origin {showOriginCrosshair ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
      {/* Tool modes */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
          Placement Tools
        </span>
      </div>
      {/* Boundary layer: choose layer before drawing (login screen: Hand, Arm, Login panel, Login button) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted-content)' }}>Boundary layer:</span>
        <select
          value={selectedBoundaryLayer ?? BOUNDARY_LAYERS[0]}
          onChange={(e) => onSelectedBoundaryLayerChange?.(e.target.value)}
          style={{
            padding: '4px 6px',
            fontSize: 10,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(0,255,65,0.4)',
            borderRadius: 4,
            color: 'var(--accent)',
            minWidth: 120,
          }}
        >
          {BOUNDARY_LAYERS.map((layer) => (
            <option key={layer} value={layer}>{layer}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          onClick={handleAddPanel}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: placementMode === 'panel' ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
            border: `1px solid ${placementMode === 'panel' ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 4,
            color: placementMode === 'panel' ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          Add Panel
        </button>
        <button
          type="button"
          onClick={handleAddButton}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: placementMode === 'button' ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
            border: `1px solid ${placementMode === 'button' ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 4,
            color: placementMode === 'button' ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          Add Button
        </button>
        <button
          type="button"
          onClick={handleDrawBoundary}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: placementMode === 'boundary' ? 'rgba(0,255,65,0.25)' : 'rgba(100,100,100,0.3)',
            border: `1px solid ${placementMode === 'boundary' ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 4,
            color: placementMode === 'boundary' ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          Draw Boundary
        </button>
        <button
          type="button"
          onClick={() => onOpenMeasure?.()}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: 'rgba(100,100,100,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          2-pt Measure
        </button>
      </div>
      {placementMode && (
        <div style={{ fontSize: 10, color: 'var(--text-muted-content)' }}>
          Click two corners on the panel. Esc to cancel.
        </div>
      )}

      {/* Element list */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
          Elements
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 80, overflowY: 'auto' }}>
        {elements.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted-content)' }}>No elements yet</span>}
        {elements.map((el) => (
          <div
            key={el.id}
            onClick={() => onSelectElement?.(el.id)}
            style={{
              padding: '6px 8px',
              fontSize: 11,
              background: selectedElementId === el.id ? 'rgba(0,255,65,0.2)' : 'rgba(100,100,100,0.2)',
              border: `1px solid ${selectedElementId === el.id ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 4,
              color: 'var(--text-content)',
              cursor: 'pointer',
            }}
          >
            {(el.name && String(el.name).trim()) ? String(el.name).trim() : `${el.type} ${el.id.slice(-6)}`}
          </div>
        ))}
      </div>

      {/* Boundaries list */}
      <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
          Boundaries
        </span>
        <button
          type="button"
          onClick={() => onHideBoundariesVisualChange?.(!hideBoundariesVisual)}
          style={{
            padding: '4px 8px',
            fontSize: 10,
            background: hideBoundariesVisual ? 'rgba(0,255,65,0.2)' : 'rgba(100,100,100,0.3)',
            border: `1px solid ${hideBoundariesVisual ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 4,
            color: hideBoundariesVisual ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
        >
          {hideBoundariesVisual ? 'Show' : 'Hide'} visually
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
        {boundaries.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted-content)' }}>No boundaries</span>}
        {boundaries.map((b) => (
          <div
            key={b.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              fontSize: 11,
              background: 'rgba(100,100,100,0.2)',
              borderRadius: 4,
            }}
          >
            <select
              value={b.layer ?? ''}
              onChange={(e) => onUpdateBoundary?.(b.id, { layer: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '2px 4px',
                fontSize: 10,
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(0,255,65,0.3)',
                borderRadius: 4,
                color: 'var(--accent)',
                minWidth: 110,
                flexShrink: 0,
              }}
            >
              <option value="">— layer —</option>
              {BOUNDARY_LAYERS.map((layer) => (
                <option key={layer} value={layer}>{layer}</option>
              ))}
            </select>
            <span style={{ color: 'var(--text-muted-content)', flex: 1, minWidth: 0 }}>
              {Math.round(b.left * 100)}–{Math.round(b.right * 100)}% × {Math.round(b.top * 100)}–{Math.round(b.bottom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleDeleteBoundary(b.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,100,100,0.8)',
                cursor: 'pointer',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Selected element: name + collapsible sliders */}
      {selectedElement && (
        <>
          <div style={{ borderTop: '1px solid rgba(0,255,65,0.3)', paddingTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
              Sizing &amp; Positioning
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <input
              type="text"
              value={selectedElement.name ?? ''}
              onChange={handleNameChange}
              placeholder="Name this element"
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 11,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(0,255,65,0.4)',
                borderRadius: 4,
                color: 'var(--accent)',
                minWidth: 0,
              }}
            />
            <button
              type="button"
              onClick={() => setSlidersExpanded((v) => !v)}
              title={slidersExpanded ? 'Collapse sliders' : 'Expand sliders'}
              style={{
                padding: 4,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 4,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              {slidersExpanded ? '▼' : '▶'}
            </button>
          </div>
          {slidersExpanded && (
            <>
              <SliderRow label="Left (%)" min={0} max={100} value={selectedElement.left ?? 0} onChange={(v) => handleSliderChange('left', v)} step={0.5} />
              <SliderRow label="Top (%)" min={0} max={100} value={selectedElement.top ?? 0} onChange={(v) => handleSliderChange('top', v)} step={0.5} />
              <SliderRow label="Width (%)" min={1} max={100} value={selectedElement.width ?? 20} onChange={(v) => handleSliderChange('width', v)} step={0.5} />
              <SliderRow label="Height (%)" min={1} max={100} value={selectedElement.height ?? 10} onChange={(v) => handleSliderChange('height', v)} step={0.5} />
              <SliderRow label="Padding (px)" min={0} max={40} value={selectedElement.padding ?? 8} onChange={(v) => handleSliderChange('padding', v)} />
              <SliderRow label="Margin (px)" min={0} max={40} value={selectedElement.margin ?? 4} onChange={(v) => handleSliderChange('margin', v)} />
              <SliderRow label="Border radius (px)" min={0} max={24} value={selectedElement.borderRadius ?? 8} onChange={(v) => handleSliderChange('borderRadius', v)} />
              <SliderRow label="z-index" min={0} max={100} value={selectedElement.zIndex ?? 10} onChange={(v) => handleSliderChange('zIndex', v)} />
              <button
                type="button"
                onClick={handleDeleteElement}
                style={{
                  marginTop: 8,
                  padding: '6px 12px',
                  background: 'rgba(255,100,100,0.2)',
                  border: '1px solid rgba(255,100,100,0.5)',
                  borderRadius: 4,
                  color: '#ff6b6b',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Delete Element
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export { ELEMENT_DEFAULTS };
