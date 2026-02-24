import React, { useState, useEffect, useCallback } from 'react';
import RobotScene from './RobotScene';
import LoginForm from './LoginForm';
import { isIOS, isPortrait } from './loginScreenConfig';
import { useLoginScreenAuth } from './useLoginScreenAuth';
import useLofiMusic from './useLofiMusic';
import useWankrGroove from './useWankrGroove';
import GrooveGearMenu from './GrooveGearMenu';
import './LoginScreen.css';

export default function LoginScreen({ onLogin, onSpectate, collapsing }) {
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
  const lofi = useLofiMusic();
  const groove = useWankrGroove();

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    auth.doAuth(false);
  }, [auth]);

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

      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <RobotScene
          musicPlaying={lofi.playing}
          onToggleMusic={lofi.toggle}
          groovePlaying={groove.playing}
          grooveGetAudio={groove.getAudio}
          panelContent={
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
              onSpectate={onSpectate}
              onBackToLogin={auth.handleBackToLogin}
            />
          }
        />
      </div>

      {/* Gear menu — audio controls */}
      <GrooveGearMenu
        volume={groove.volume}
        muted={groove.muted}
        onVolumeChange={groove.setVolume}
        onToggleMute={groove.toggleMute}
      />
    </div>
  );
}
