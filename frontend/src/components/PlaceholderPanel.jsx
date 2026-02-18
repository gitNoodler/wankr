import { useState, useRef } from 'react';
import { useWankingLiveDevState } from './WankingLive/useWankingLiveDevState';
import WankingLiveDevPanel from './WankingLive/WankingLiveDevPanel';
import WankingLiveCustomLayer from './WankingLive/WankingLiveCustomLayer';
import WankingLivePlacementOverlay from './WankingLive/WankingLivePlacementOverlay';

function PlaceholderPanel({ onOpenMeasure, devPanelOpen: devPanelOpenProp, onDevPanelClose }) {
  const [xCalls, setXCalls] = useState([]);
  const feedRef = useRef(null);
  const contentRef = useRef(null);

  // dev1 (WankingLiveDevPanel): shared state via hook; controlled by App keybind when props passed
  const [devPanelOpenLocal, setDevPanelOpenLocal] = useState(false);
  const isDevPanelOpen = devPanelOpenProp !== undefined ? devPanelOpenProp : devPanelOpenLocal;
  const handleDevPanelClose = onDevPanelClose ?? (() => setDevPanelOpenLocal(false));
  const dev1 = useWankingLiveDevState();

  return (
    <div
      className="placeholder-panel training-panel wankr-panel sidebar-panel"
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header - same style as Wankr Vision */}
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
          position: 'relative',
        }}
      >
        <h2
          className="font-wankr"
          style={{
            margin: 0,
            fontSize: 'var(--dashboard-title-font-size)',
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: '0 0 12px rgba(0, 255, 0, 0.7), 0 0 24px rgba(0, 255, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.6)',
          }}
        >
          Wanking Live
        </h2>
      </div>

      {/* Content area - uniform with left panel */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(180deg, #141414 0%, #0e0e0e 100%)',
          boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.6)',
        }}
      >
        <WankingLiveCustomLayer
          elements={dev1.elements}
          boundaries={dev1.boundaries}
          hideBoundariesVisual={dev1.hideBoundariesVisual}
          selectedElementId={dev1.selectedElementId}
          onSelectElement={dev1.setSelectedElementId}
          indentionSelectedElement={dev1.isIndentionPanel}
        />
        {/* X @wankr / @bankr feed - fills content area */}
        <div
          ref={feedRef}
          className="wanking-live-x-feed"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              padding: 'calc(8px * var(--scale))',
              gap: 'calc(6px * var(--scale))',
              maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 55%, transparent 100%)',
            }}
          >
            {xCalls.map((call) => (
              <div
                key={call.id}
                className="x-call-item"
                style={{
                  padding: 'calc(8px * var(--scale)) calc(10px * var(--scale))',
                  background: 'linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                  border: '1px solid rgba(100, 100, 100, 0.35)',
                  borderRadius: 'calc(6px * var(--scale))',
                  color: 'var(--text-content)',
                  fontSize: 'calc(12px * var(--scale))',
                  lineHeight: 1.35,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                  animation: call.isNew ? 'xCallSlideIn 0.4s ease-out' : undefined,
                }}
              >
                <span style={{ color: 'var(--text-muted-content)', fontSize: '11px' }}>{call.time}</span>
                <div style={{ marginTop: '4px', wordBreak: 'break-word' }}>{call.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      {isDevPanelOpen && (
        <WankingLiveDevPanel
          elements={dev1.elements}
          boundaries={dev1.boundaries}
          hideBoundariesVisual={dev1.hideBoundariesVisual}
          onHideBoundariesVisualChange={dev1.setHideBoundariesVisual}
          isIndentionPanel={dev1.isIndentionPanel}
          onIndentionPanelChange={dev1.setIsIndentionPanel}
          selectedElementId={dev1.selectedElementId}
          onSelectElement={dev1.setSelectedElementId}
          onAddElement={dev1.handleAddElement}
          onUpdateElement={dev1.handleUpdateElement}
          onDeleteElement={dev1.handleDeleteElement}
          onAddBoundary={dev1.handleAddBoundary}
          onUpdateBoundary={dev1.handleUpdateBoundary}
          onDeleteBoundary={dev1.handleDeleteBoundary}
          selectedBoundaryLayer={dev1.selectedBoundaryLayer}
          onSelectedBoundaryLayerChange={dev1.setSelectedBoundaryLayer}
          placementMode={dev1.placementMode}
          onPlacementModeChange={dev1.setPlacementMode}
          onOpenMeasure={onOpenMeasure}
          onClose={handleDevPanelClose}
        />
      )}
      {dev1.placementMode && (
        <WankingLivePlacementOverlay
          contentRef={contentRef}
          mode={dev1.placementMode}
          onAddElement={dev1.handleAddElement}
          onAddBoundary={dev1.handleAddBoundary}
          onCancel={dev1.handlePlacementCancel}
        />
      )}
    </div>
  );
}

export default PlaceholderPanel;
