import React, { useState } from 'react';
import { DEV_PANEL_PASSWORD, setDevPanelUnlocked } from './devPanelStorage';

export default function DevPasswordGate({ onUnlock, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (password === DEV_PANEL_PASSWORD) {
      setDevPanelUnlocked();
      onUnlock();
    } else {
      setError('Wrong password');
    }
  };

  return (
    <div style={{ padding: '8px 0', minWidth: 220 }}>
      <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Dev1 – enter password to open
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="new-password"
          autoFocus
          style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(0,255,65,0.4)',
            borderRadius: 6,
            color: 'var(--text-content)',
            fontSize: 13,
          }}
        />
        {error && <span style={{ fontSize: 11, color: '#ff6b6b' }}>{error}</span>}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 10px', fontSize: 11, background: 'rgba(100,100,100,0.3)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" style={{ padding: '6px 10px', fontSize: 11, background: 'rgba(0,255,65,0.25)', border: '1px solid var(--accent)', borderRadius: 4, color: 'var(--accent)', cursor: 'pointer' }}>
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
