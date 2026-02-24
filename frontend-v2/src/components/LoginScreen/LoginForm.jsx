import React from 'react';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

/**
 * LoginForm — ultra-compact form anchored inside the robot's green panel box.
 *
 * Titles removed (already on robot's head screen). Uses cqi units so
 * everything scales with the panel container width.
 */
export default function LoginForm({
  username,
  password,
  confirmPassword,
  email = '',
  isRegistering,
  usernameStatus,
  loading,
  error,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onEmailChange,
  onSubmit,
  onNewUser,
  onSpectate,
  onBackToLogin,
}) {
  /* ── Shared styles ────────────────────────────────────────────────── */
  const inputStyle = {
    width: '100%',
    minWidth: 0,
    height: '7cqi',
    padding: '0 2.5cqi',
    background: 'rgba(0, 0, 0, 0.55)',
    border: '1px solid rgba(0, 255, 65, 0.22)',
    borderRadius: 1,
    color: '#00ff41',
    fontSize: '4cqi',
    fontFamily: "'VT323', 'Courier New', monospace",
    letterSpacing: '0.06em',
    outline: 'none',
    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)',
    transition: 'border-color 0.25s, box-shadow 0.25s',
    caretColor: '#00ff41',
    boxSizing: 'border-box',
  };

  const focusHandlers = {
    onFocus: (e) => {
      e.target.style.borderColor = 'rgba(0, 255, 65, 0.55)';
      e.target.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,0.4), 0 0 8px rgba(0,255,65,0.15)';
    },
    onBlur: (e) => {
      e.target.style.borderColor = 'rgba(0, 255, 65, 0.22)';
      e.target.style.boxShadow = 'inset 0 1px 4px rgba(0,0,0,0.4)';
    },
  };

  const btnBase = {
    borderRadius: 1,
    fontWeight: 700,
    fontFamily: "'VT323', 'Courier New', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    cursor: loading ? 'wait' : 'pointer',
    transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.12s',
    boxSizing: 'border-box',
  };

  return (
    <form
      onSubmit={onSubmit}
      autoComplete="off"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.8cqi',
        minWidth: 0,
        width: '100%',
      }}
    >
      {/* ── Subtitle row (compact) ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1cqi' }}>
        {isRegistering && (
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: 'transparent', border: 'none', color: '#00ff41',
              cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
              opacity: 0.7, transition: 'opacity 0.2s', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          >
            <BackIcon />
          </button>
        )}
        <div
          className="font-wankr"
          style={{
            fontSize: '4.5cqi',
            fontWeight: 700,
            color: '#00ff41',
            textAlign: 'center',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow: '0 0 6px rgba(0,255,65,0.5)',
            flex: 1,
            lineHeight: 1,
            opacity: 0.85,
          }}
        >
          {isRegistering ? 'NEW DEGEN' : 'DEGEN LOGIN'}
        </div>
      </div>

      {/* ── Error message ──────────────────────────────────────────── */}
      {error && (
        <div style={{
          color: '#ff4444', fontSize: '3cqi', textAlign: 'center',
          fontFamily: "'VT323', monospace", textShadow: '0 0 4px rgba(255,68,68,0.4)',
          marginTop: '-0.5cqi',
        }}>
          {error}
        </div>
      )}

      {/* ── Username ───────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={isRegistering ? 'Choose username' : 'Username'}
          autoComplete="off"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          style={{
            ...inputStyle,
            paddingRight: isRegistering ? '8cqi' : '2.5cqi',
            borderColor: isRegistering && usernameStatus.available === false
              ? 'rgba(255, 68, 68, 0.5)'
              : isRegistering && usernameStatus.available
                ? 'rgba(0, 255, 65, 0.5)'
                : inputStyle.borderColor,
          }}
          {...focusHandlers}
        />
        {isRegistering && username.trim().length >= 5 && (
          <div style={{
            position: 'absolute', right: '1.5cqi', top: '50%',
            transform: 'translateY(-50%)', display: 'flex', alignItems: 'center',
          }}>
            {usernameStatus.checking ? (
              <div style={{ width: '2.5cqi', height: '2.5cqi', border: '1px solid #00ff41', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : usernameStatus.available ? (
              <CheckIcon />
            ) : usernameStatus.available === false ? (
              <XIcon />
            ) : null}
          </div>
        )}
      </div>

      {/* ── Email (registration only) ──────────────────────────────── */}
      {isRegistering && onEmailChange && (
        <input
          type="email"
          placeholder="Email (optional)"
          autoComplete="email"
          value={email ?? ''}
          onChange={(e) => onEmailChange(e.target.value)}
          style={inputStyle}
          {...focusHandlers}
        />
      )}

      {/* ── Password ───────────────────────────────────────────────── */}
      <input
        type="password"
        placeholder={isRegistering ? 'Password (6+ chars)' : 'Password'}
        autoComplete="new-password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        style={inputStyle}
        {...focusHandlers}
      />

      {/* ── Confirm password (registration) ────────────────────────── */}
      {isRegistering && (
        <input
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: confirmPassword && password !== confirmPassword
              ? 'rgba(255, 68, 68, 0.5)'
              : inputStyle.borderColor,
          }}
          {...focusHandlers}
        />
      )}

      {/* ── Submit button ──────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading || (isRegistering && !usernameStatus.available)}
        style={{
          ...btnBase,
          width: '100%',
          height: '8cqi',
          padding: 0,
          fontSize: '4.2cqi',
          color: '#000',
          border: '1px solid #00ff41',
          background: 'linear-gradient(180deg, #00ff50 0%, #00dd3a 50%, #00bb30 100%)',
          boxShadow: '0 0 10px rgba(0,255,65,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          opacity: (isRegistering && !usernameStatus.available) ? 0.4 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = '0 0 18px rgba(0,255,65,0.5), inset 0 1px 0 rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 10px rgba(0,255,65,0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {loading ? '...' : isRegistering ? 'CREATE ACCOUNT' : 'ENTER'}
      </button>

      {/* ── Bottom actions (login mode) ────────────────────────────── */}
      {!isRegistering && (
        <div style={{ display: 'flex', gap: '1.5cqi', minWidth: 0 }}>
          <button
            type="button"
            onClick={onNewUser}
            disabled={loading}
            style={{
              ...btnBase,
              flex: 1, minWidth: 0,
              height: '6.5cqi',
              padding: 0,
              fontSize: '3.2cqi',
              border: '1px solid rgba(0,255,65,0.4)',
              color: '#00ff41',
              background: 'rgba(0, 255, 65, 0.08)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 65, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(0,255,65,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 65, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(0,255,65,0.4)';
            }}
          >
            New User
          </button>
          <button
            type="button"
            onClick={onSpectate}
            disabled={loading}
            style={{
              ...btnBase,
              flex: 1, minWidth: 0,
              height: '6.5cqi',
              padding: 0,
              fontSize: '3.2cqi',
              border: '1px solid rgba(0,255,65,0.2)',
              color: 'rgba(0,255,65,0.55)',
              background: 'rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 65, 0.06)';
              e.currentTarget.style.color = 'rgba(0,255,65,0.8)';
              e.currentTarget.style.borderColor = 'rgba(0,255,65,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.color = 'rgba(0,255,65,0.55)';
              e.currentTarget.style.borderColor = 'rgba(0,255,65,0.2)';
            }}
          >
            Spectate
          </button>
        </div>
      )}
    </form>
  );
}
