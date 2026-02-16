import React from 'react';
import { UserIcon, KeyIcon, CheckIcon, XIcon, BackIcon } from './LoginScreenIcons';

export default function LoginForm({
  username,
  password,
  confirmPassword,
  isRegistering,
  usernameStatus,
  loading,
  error,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onNewUser,
  onSpectate,
  onBackToLogin,
  titleOffsetX = 0,
  titleOffsetY = 0,
  titleScale = 100,
  subtitleOffsetX = 0,
  subtitleOffsetY = 0,
  subtitleScale = 100,
  formMarginTop = 0,
  inputHeightScale = 100,
  inputWidthScale = 100,
  formGap = 100,
  submitMinHeightScale = 100,
  bottomButtonsHeightScale = 100,
  buttonsVerticalGap = 100,
}) {
  const ts = titleScale / 100;
  const ss = subtitleScale / 100;
  const ihs = inputHeightScale / 100;
  const iws = inputWidthScale / 100;
  const fg = formGap / 100;
  const smhs = submitMinHeightScale / 100;
  const bbs = bottomButtonsHeightScale / 100;
  const bvg = buttonsVerticalGap / 100;

  return (
    <>
      {/* Main title - proportion-locked to pane (cqi/cqh) */}
      <div
        className="font-wankr"
        style={{
          fontSize: `${12 * ts}cqi`,
          fontWeight: 900,
          color: 'var(--accent)',
          textAlign: 'center',
          letterSpacing: '0.15cqi',
          textShadow: '0 0 16px rgba(0, 255, 65, 0.7)',
          marginBottom: '0.25cqi',
          transform: `translate(${titleOffsetX}%, ${titleOffsetY}%)`,
        }}
      >
        WANKR BOT
      </div>
      {/* Subtitle - proportion-locked */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5cqi',
          marginBottom: '0.25cqi',
          transform: `translate(${subtitleOffsetX}%, ${subtitleOffsetY}%)`,
        }}
      >
        {isRegistering && (
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              padding: '0.5cqi',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.8,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          >
            <BackIcon />
          </button>
        )}
        <div
          className="font-wankr"
          style={{
            fontSize: `${6 * ss}cqi`,
            fontWeight: 700,
            color: 'var(--accent)',
            textAlign: 'center',
            letterSpacing: '0.08cqi',
            textShadow: '0 0 12px rgba(0, 255, 65, 0.6)',
            flex: 1,
            transition: 'all 0.3s ease',
          }}
        >
          {isRegistering ? 'NEW DEGEN' : 'DEGEN LOGIN'}
        </div>
      </div>
      {error && (
        <div style={{ color: '#ff6b6b', fontSize: '1.4cqi', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        autoComplete="off"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${1 * fg}cqi`,
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          marginTop: formMarginTop !== 0 ? `${formMarginTop * 0.05}cqi` : undefined,
        }}
      >
        {/* Username field - proportion-locked */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5cqi' }}>
          <div style={{ color: 'var(--accent)', flexShrink: 0 }}><UserIcon /></div>
          <div style={{ flex: 1, minWidth: 0, position: 'relative', maxWidth: iws < 1 ? `${iws * 100}%` : undefined }}>
            <input
              type="text"
              placeholder={isRegistering ? 'Choose username' : 'Username'}
              autoComplete="off"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              style={{
                width: '100%',
                minWidth: 0,
                padding: `${2.5 * ihs}cqi 3cqi`,
                paddingRight: isRegistering ? `${8 * ihs}cqi` : '3cqi',
                minHeight: `${8 * ihs}cqi`,
                background: '#3a3a3a',
                border: `2px solid ${isRegistering && usernameStatus.available === false ? 'rgba(255, 107, 107, 0.6)' : isRegistering && usernameStatus.available ? 'rgba(0, 255, 65, 0.6)' : 'rgba(100, 100, 100, 0.5)'}`,
                borderRadius: '2.5cqi',
                color: 'var(--accent)',
                fontSize: '2.5cqi',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                transition: 'border-color 0.2s',
              }}
            />
            {isRegistering && username.trim().length >= 2 && (
              <div style={{
                position: 'absolute',
                right: '1.5cqi',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}>
                {usernameStatus.checking ? (
                  <div style={{ width: '1.5cqi', height: '1.5cqi', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : usernameStatus.available ? (
                  <CheckIcon />
                ) : usernameStatus.available === false ? (
                  <XIcon />
                ) : null}
              </div>
            )}
          </div>
        </div>

        {isRegistering && usernameStatus.error && !usernameStatus.checking && (
          <div style={{ color: '#ff6b6b', fontSize: '1.2cqi', marginLeft: '2cqi', marginTop: '-0.3cqi' }}>
            {usernameStatus.error}
          </div>
        )}
        {isRegistering && usernameStatus.available && !usernameStatus.checking && (
          <div style={{ color: 'var(--accent)', fontSize: '1.2cqi', marginLeft: '2cqi', marginTop: '-0.3cqi' }}>
            Username available
          </div>
        )}

        {/* Password field - proportion-locked */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5cqi' }}>
          <div style={{ color: 'var(--accent)', flexShrink: 0 }}><KeyIcon /></div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: iws < 1 ? `${iws * 100}%` : undefined }}>
          <input
            type="password"
            placeholder={isRegistering ? 'Create password (6+ chars)' : 'Password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            style={{ width: '100%', minWidth: 0, minHeight: `${8 * ihs}cqi`, padding: `${2.5 * ihs}cqi 3cqi`, background: '#3a3a3a', border: '2px solid rgba(100, 100, 100, 0.5)', borderRadius: '2.5cqi', color: 'var(--accent)', fontSize: '2.5cqi', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
          />
          </div>
        </div>

        {isRegistering && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5cqi' }}>
            <div style={{ color: 'var(--accent)', flexShrink: 0 }}><KeyIcon /></div>
            <div style={{ flex: 1, minWidth: 0, maxWidth: iws < 1 ? `${iws * 100}%` : undefined }}>
            <input
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: `${8 * ihs}cqi`,
                padding: `${2.5 * ihs}cqi 3cqi`,
                background: '#3a3a3a',
                border: `2px solid ${confirmPassword && password !== confirmPassword ? 'rgba(255, 107, 107, 0.6)' : 'rgba(100, 100, 100, 0.5)'}`,
                borderRadius: '2.5cqi',
                color: 'var(--accent)',
                fontSize: '2.5cqi',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                transition: 'border-color 0.2s',
              }}
            />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || (isRegistering && !usernameStatus.available)}
          style={{
            width: '100%',
            minWidth: 0,
            minHeight: `${10 * smhs}cqi`,
            padding: `${3 * smhs}cqi`,
            borderRadius: `${2.5 * smhs}cqi`,
            fontWeight: 'bold',
            fontSize: `${2.5 * smhs}cqi`,
            border: '2px solid var(--accent)',
            boxShadow: '0 0 12px rgba(0, 255, 65, 0.3)',
            opacity: (isRegistering && !usernameStatus.available) ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '...' : isRegistering ? 'CREATE ACCOUNT' : 'SUBMIT'}
        </button>
      </form>

      {!isRegistering && (
        <div style={{ display: 'flex', gap: '1.5cqi', minWidth: 0, marginTop: bvg !== 1 ? `${(bvg - 1) * 1}cqi` : undefined }}>
          <button type="button" className="btn-primary" disabled style={{ flex: 1, minWidth: 0, minHeight: `${9 * bbs}cqi`, padding: `${2.5 * bbs}cqi`, borderRadius: '2.5cqi', fontWeight: 'bold', fontSize: `${2.5 * bbs}cqi`, border: '2px solid rgba(120,120,120,0.6)', background: 'rgba(60,60,60,0.8)', color: 'rgba(160,160,160,0.9)', cursor: 'not-allowed', opacity: 0.85 }}>
            Coming soon
          </button>
          <button type="button" className="btn" onClick={onSpectate} disabled={loading} style={{ flex: 1, minWidth: 0, minHeight: `${9 * bbs}cqi`, padding: `${2.5 * bbs}cqi`, borderRadius: '2.5cqi', fontSize: `${2.5 * bbs}cqi`, border: '2px solid var(--accent)', color: 'var(--accent)' }}>
            Spectate
          </button>
        </div>
      )}
    </>
  );
}
