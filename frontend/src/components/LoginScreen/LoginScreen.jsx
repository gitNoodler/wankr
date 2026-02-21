import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import RobotScene from './RobotScene';
import RobotDevPanel from './RobotDevPanel';
import { saveDevDefaults, fetchDevDefaultsFromBackend, getPrimaryDevDefaults, LAYERS_LOCKED_KEY, isIOS, isPortrait } from './loginScreenConfig';
import { isDevToolsAllowed } from '../../utils/devToolsAllowed';
import { computePanelBackground } from './helpers';
import { useLoginScreenState } from './useLoginScreenState';
import { useLoginScreenUndo } from './useLoginScreenUndo';
import { useLoginScreenAuth } from './useLoginScreenAuth';
import DevPasswordGate from './DevPasswordGate';
import { isDevPanelUnlocked, lockDevPanel } from './devPanelLock';
import WankingLiveDevPanel from '../WankingLive/WankingLiveDevPanel';
import { useWankingLiveDevState } from '../WankingLive/useWankingLiveDevState';
import './LoginScreen.css';

const DEV_PANEL_BOX_STYLE = {
  position: 'fixed',
  top: 20,
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
  minWidth: 260,
  maxHeight: '90vh',
  overflowY: 'auto',
};

export default function LoginScreen({
  onLogin,
  collapsing,
  onOpenMeasure,
  devPanelOpen = false,
  onDevPanelClose,
  onRequestDevPanel,
  showOriginCrosshair = false,
  onToggleOriginCrosshair,
}) {
  const [devPanelUnlockedThisSession, setDevPanelUnlockedThisSession] = useState(false);
  const [dev2Open, setDev2Open] = useState(false);
  const dev1 = useWankingLiveDevState();
  const [, setLayersLocked] = useState(() => {
    try {
      return localStorage.getItem(LAYERS_LOCKED_KEY) !== 'false';
    } catch { return true; }
  });
  const sceneRef = React.useRef(null);
  const sceneUnitRef = React.useRef(null);
  const [portrait, setPortrait] = useState(() => (typeof window !== 'undefined' ? isPortrait() : true));
  useEffect(() => {
    const sync = () => setPortrait(isPortrait());
    window.addEventListener('orientationchange', sync);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const state = useLoginScreenState({});
  useLoginScreenUndo({
    buildSnapshot: state.buildSnapshot,
    applySnapshotRef: state.applySnapshotRef,
    getSavedDefaults: () => fetchDevDefaultsFromBackend(api),
    onResetToPrimaryApplied: (primary) => api.post('/api/settings/dev-defaults', primary).catch(() => {}),
  });
  useLoginScreenAuth({ onLogin });

  const handleLockLayers = useCallback(() => {
    setLayersLocked(true);
    try { localStorage.setItem(LAYERS_LOCKED_KEY, 'true'); } catch { /* ignore */ }
  }, []);

  const panelBg = computePanelBackground(state.loginBrightness, state.loginShadeOfGray, state.loginLightToBlack);

  const handleRestoreSavedLayout = useCallback(() => {
    fetchDevDefaultsFromBackend(api).then((data) => {
      state.applySnapshotRef.current?.(data || getPrimaryDevDefaults());
    });
  }, [state]);

  const applyPartChange = useCallback((id, { offsetX, offsetY, scaleX, scaleY }) => {
    if (id === 'back') {
      state.setBackOffsetX(offsetX);
      state.setBackOffsetY(offsetY);
      state.setBackScaleX(scaleX);
      state.setBackScaleY(scaleY);
    } else if (id === 'robot') {
      state.setRobotOffsetX(offsetX);
      state.setRobotOffsetY(offsetY);
      state.setRobotScaleX(scaleX);
      state.setRobotScaleY(scaleY);
    } else if (id === 'shoulder') {
      state.setShoulderOffsetX(offsetX);
      state.setShoulderOffsetY(offsetY);
      state.setShoulderScaleX(scaleX);
      state.setShoulderScaleY(scaleY);
    } else if (id === 'handLeft') {
      state.setHandLeftOffsetX(offsetX);
      state.setHandLeftOffsetY(offsetY);
      state.setHandLeftScaleX(scaleX);
      state.setHandLeftScaleY(scaleY);
    } else if (id === 'handRight') {
      state.setHandRightOffsetX(offsetX);
      state.setHandRightOffsetY(offsetY);
      state.setHandRightScaleX(scaleX);
      state.setHandRightScaleY(scaleY);
    }
  }, [state]);

  const handleSaveGlobalDefaults = useCallback(() => {
    const valuesToSave = state.buildSnapshot();
    if (!valuesToSave) return;
    saveDevDefaults();
    api
      .post('/api/settings/dev-defaults', valuesToSave)
      .then((res) => {
        if (res.ok) {
          handleLockLayers();
        } else if (res.status === 403) {
          window.alert('Could not save defaults. Use the dev server (port 5173) to save.');
        } else {
          window.alert('Save failed.');
        }
      })
      .catch(() => window.alert('Save failed.'));
  }, [state, handleLockLayers]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        handleRestoreSavedLayout();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleRestoreSavedLayout]);

  // Single source of truth: load saved layout from backend on mount (so 5000 and 5173 match)
  useEffect(() => {
    fetchDevDefaultsFromBackend(api).then((data) => {
      if (data) state.applySnapshotRef.current?.(data);
    });
  }, [state.applySnapshotRef]);

  return (
    <div
      className="login-screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        background: '#000',
        pointerEvents: collapsing ? 'none' : 'auto',
        boxSizing: 'border-box',
        padding: 'env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0)',
      }}
    >
      {isIOS() && !portrait && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            color: 'var(--accent)',
            fontFamily: "'VT323', monospace",
            fontSize: 'clamp(24px, 6vw, 32px)',
            textAlign: 'center',
            pointerEvents: 'auto',
          }}
          aria-live="polite"
        >
          <p style={{ margin: 0, textShadow: '0 0 12px var(--accent)' }}>Please rotate your device to portrait</p>
        </div>
      )}
      {state.defaultsReady ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <RobotScene
          sceneRef={sceneRef}
          sceneUnitRef={sceneUnitRef}
          sceneOffsetX={state.sceneOffsetX}
          sceneOffsetY={state.sceneOffsetY}
          sceneScaleX={state.sceneScaleX}
          sceneScaleY={state.sceneScaleY}
          backOffsetX={state.backOffsetX}
          backOffsetY={state.backOffsetY}
          backScaleX={state.backScaleX}
          backScaleY={state.backScaleY}
          robotOffsetX={state.robotOffsetX}
          robotOffsetY={state.robotOffsetY}
          robotScaleX={state.robotScaleX}
          robotScaleY={state.robotScaleY}
          shoulderOffsetX={state.shoulderOffsetX}
          shoulderOffsetY={state.shoulderOffsetY}
          shoulderScaleX={state.shoulderScaleX}
          shoulderScaleY={state.shoulderScaleY}
          handLeftOffsetX={state.handLeftOffsetX}
          handLeftOffsetY={state.handLeftOffsetY}
          handLeftScaleX={state.handLeftScaleX}
          handLeftScaleY={state.handLeftScaleY}
          handRightOffsetX={state.handRightOffsetX}
          handRightOffsetY={state.handRightOffsetY}
          handRightScaleX={state.handRightScaleX}
          handRightScaleY={state.handRightScaleY}
          showLayerBackground={state.showLayerBackground}
          showLayerWankrBody={state.showLayerWankrBody}
          showLayerLogin={state.showLayerLogin}
          showLayerHands={state.showLayerHands}
          characterSharpness={state.characterSharpness}
          leftCushion={state.leftCushion}
          topCushion={state.topCushion}
          loginBoxWidth={state.loginBoxWidth}
          loginBoxHeight={state.loginBoxHeight}
          scaleX={state.scaleX}
          scaleY={state.scaleY}
          panelBg={panelBg}
          panelBorderBrightness={state.panelBorderBrightness}
          panelContentOffsetX={state.panelContentOffsetX}
          panelRightMargin={state.panelRightMargin}
          buttonsBottomGap={state.buttonsBottomGap}
          ductTapeStrips={[]}
          respectDuctTape={true}
        />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#000' }} aria-hidden="true" />
      )}

      {isDevToolsAllowed && (
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 60, display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => onRequestDevPanel?.()}
            title="Dev1 – Wanking Live dev (Ctrl+Alt+D or Ctrl+Shift+D)"
            style={{
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,65,0.5)',
              borderRadius: 6,
              cursor: 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            Dev1
          </button>
          <button
            type="button"
            onClick={() => setDev2Open((o) => !o)}
            title="Dev2 – Robot position & scale (px, relative to screen origin)"
            style={{
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 6,
              cursor: 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            Dev2
          </button>
        </div>
      )}

      {isDevToolsAllowed && devPanelOpen && !isDevPanelUnlocked() && !devPanelUnlockedThisSession && (
        <div style={DEV_PANEL_BOX_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px' }}>DEV1</span>
            <button type="button" onClick={onDevPanelClose} style={{ background: 'transparent', border: '1px solid rgba(255,100,100,0.5)', borderRadius: 4, color: '#ff6b6b', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>CLOSE</button>
          </div>
          <DevPasswordGate onUnlock={() => setDevPanelUnlockedThisSession(true)} onClose={onDevPanelClose} />
        </div>
      )}
      {isDevToolsAllowed && devPanelOpen && (isDevPanelUnlocked() || devPanelUnlockedThisSession) && (
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
          onClose={onDevPanelClose}
          onLock={() => {
            lockDevPanel();
            setDevPanelUnlockedThisSession(false);
            onDevPanelClose();
          }}
          onClearCache={dev1.handleClearCache}
          showOriginCrosshair={showOriginCrosshair}
          onToggleOriginCrosshair={onToggleOriginCrosshair}
        />
      )}
      {isDevToolsAllowed && dev2Open && (
        <RobotDevPanel
          onClose={() => setDev2Open(false)}
          robotSnapshot={state}
          applyPartChange={applyPartChange}
          onSaveGlobalDefaults={handleSaveGlobalDefaults}
        />
      )}
    </div>
  );
}
