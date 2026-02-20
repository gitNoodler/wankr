import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import { useLoginScreenAuth } from './useLoginScreenAuth';
import { isDevToolsAllowed } from '../../utils/devToolsAllowed';
import { isIOS, isPortrait } from './loginScreenConfig';
import DevPasswordGate, { isDevPanelUnlocked, lockDevPanel } from './DevPasswordGate';
import WankingLiveDevPanel from '../WankingLive/WankingLiveDevPanel';
import { useWankingLiveDevState } from '../WankingLive/useWankingLiveDevState';

import greenGridImg from '@mascot/dashLayers/greenGrid.png';
import musicNotesImg from '@mascot/dashLayers/neonMusicNotes.png';
import boomboxImg from '@mascot/dashLayers/boombox.png';
import robotImg from '@mascot/dashLayers/wankrBot.png';

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
  onSpectate,
  collapsing,
  onOpenMeasure,
  devPanelOpen = false,
  onDevPanelClose,
  onRequestDevPanel,
  showOriginCrosshair = false,
  onToggleOriginCrosshair,
}) {
  const [devPanelUnlockedThisSession, setDevPanelUnlockedThisSession] = useState(false);
  const dev1 = useWankingLiveDevState();
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

  const auth = useLoginScreenAuth({ onLogin });

  const handleSubmit = (e) => { e?.preventDefault(); auth.doAuth(auth.isRegistering); };
  const handleSpectate = (e) => { e?.preventDefault(); onSpectate?.(); };

  return (
    <div
      className="login-screen"
      style={{ pointerEvents: collapsing ? 'none' : 'auto' }}
    >
      {/* iOS landscape overlay */}
      {isIOS() && !portrait && (
        <div className="login-ios-landscape" aria-live="polite">
          <p style={{ margin: 0, textShadow: '0 0 12px var(--accent)' }}>
            Please rotate your device to portrait
          </p>
        </div>
      )}

      {/* Green grid perspective floor */}
      <div
        className="login-grid-floor"
        style={{ backgroundImage: `url(${greenGridImg})` }}
      />

      {/* Decorative floating music notes */}
      <img src={musicNotesImg} className="login-decor login-notes-1" alt="" aria-hidden="true" draggable={false} />
      <img src={musicNotesImg} className="login-decor login-notes-2" alt="" aria-hidden="true" draggable={false} />

      {/* Decorative boombox */}
      <img src={boomboxImg} className="login-decor login-boombox" alt="" aria-hidden="true" draggable={false} />

      {/* Robot + Login Panel composite */}
      <div className="login-composite">
        <img
          src={robotImg}
          className="login-robot"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <div className="login-panel">
          <div className="login-panel-inner">
            <LoginForm
              username={auth.username}
              password={auth.password}
              confirmPassword={auth.confirmPassword}
              email={auth.email}
              isRegistering={auth.isRegistering}
              usernameStatus={auth.usernameStatus}
              loading={auth.loading}
              error={auth.error}
              onUsernameChange={auth.handleUsernameChange}
              onPasswordChange={auth.setPassword}
              onConfirmPasswordChange={auth.setConfirmPassword}
              onEmailChange={auth.setEmail}
              onSubmit={handleSubmit}
              onNewUser={auth.handleNewUser}
              onSpectate={handleSpectate}
              onBackToLogin={auth.handleBackToLogin}
              titleTopGap={1.5}
              titleToSubtitleGap={0.5}
              subtitleToUsernameGap={1.5}
              usernamePasswordGap={1.5}
              passwordToSubmitGap={2}
              submitToButtonsGap={2}
              controlHeightScale={100}
              titleScale={100}
              subtitleScale={100}
              inputWidthScale={100}
            />
          </div>
        </div>
      </div>

      {/* Dev panel button */}
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
        </div>
      )}

      {/* Dev1 panel: password gate */}
      {isDevToolsAllowed && devPanelOpen && !isDevPanelUnlocked() && !devPanelUnlockedThisSession && (
        <div style={DEV_PANEL_BOX_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px' }}>DEV1</span>
            <button type="button" onClick={onDevPanelClose} style={{ background: 'transparent', border: '1px solid rgba(255,100,100,0.5)', borderRadius: 4, color: '#ff6b6b', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>CLOSE</button>
          </div>
          <DevPasswordGate onUnlock={() => setDevPanelUnlockedThisSession(true)} onClose={onDevPanelClose} />
        </div>
      )}

      {/* Dev1 panel: WankingLive */}
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
    </div>
  );
}
