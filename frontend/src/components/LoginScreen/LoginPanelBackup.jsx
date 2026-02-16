/**
 * BACKUP: Original login panel (form, inputs, buttons).
 * Restore by importing and rendering <LoginPanelBackup /> in LoginScreen.jsx
 */
import React from 'react';
import { motion } from 'framer-motion';

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="15" r="4" />
    <path d="M10.85 12.15L19 4" />
    <path d="M18 5l2 2" />
    <path d="M15 8l2 2" />
  </svg>
);

export default function LoginPanelBackup({
  username,
  setUsername,
  password,
  setPassword,
  handleSubmit,
  handleSpectate,
  panelRef,
  panelControls,
  flashControls,
  panelBorderBrightness,
  loginBrightness,
  loginShadeOfGray,
  loginLightToBlack,
}) {
  const panelBg = (() => {
    const lightToBlack = loginLightToBlack / 100;
    let base = 220 - lightToBlack * 200;
    base *= 0.5 + (loginBrightness / 100) * 0.5;
    base = Math.round(base);
    const t = loginShadeOfGray / 100;
    const r = Math.max(0, Math.min(255, Math.round(base - t * 8)));
    const g = Math.max(0, Math.min(255, Math.round(base + t * 8)));
    const b = Math.max(0, Math.min(255, Math.round(base - t * 4)));
    return `rgb(${r}, ${g}, ${b})`;
  })();

  return (
    <motion.div
      ref={panelRef}
      animate={panelControls}
      initial={{ rotateX: 0, scale: 1 }}
      style={{
        transformOrigin: 'top center',
        width: '380px',
        maxWidth: '90%',
        padding: '32px',
        background: panelBg,
        borderRadius: '16px',
        border: `1px solid rgba(0, 255, 65, ${panelBorderBrightness / 100})`,
        boxShadow: `0 0 20px rgba(0, 255, 65, ${panelBorderBrightness / 100 * 0.4}), 0 0 40px rgba(0, 255, 65, ${panelBorderBrightness / 100 * 0.2})`,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
      }}
    >
      <div
        className="font-wankr"
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--accent)',
          textAlign: 'center',
          letterSpacing: '2px',
          textShadow: '0 0 12px rgba(0, 255, 65, 0.6)',
        }}
      >
        DEGEN LOGIN
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--accent)' }}><UserIcon /></div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: '#1e1e1e',
              border: '1px solid rgba(100, 100, 100, 0.5)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--accent)' }}><KeyIcon /></div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: '#1e1e1e',
              border: '1px solid rgba(100, 100, 100, 0.5)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 12px rgba(0, 255, 65, 0.3)',
          }}
        >
          SUBMIT
        </button>
      </form>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '14px',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 8px rgba(0, 255, 65, 0.25)',
          }}
        >
          New User
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleSpectate}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            fontSize: '14px',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
          }}
        >
          Spectate
        </button>
      </div>

      <motion.div
        animate={flashControls}
        initial={{ opacity: 0 }}
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '24px',
          boxShadow: '0 0 120px #00ff41',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}
