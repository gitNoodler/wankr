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
      {/* Main title - scaled up */}
      <div
        className="font-wankr"
        style={{
          fontSize: `clamp(${54 * ts}px, ${12 * ts}cqi, ${108 * ts}px)`,
          fontWeight: 900,
          color: 'var(--accent)',
          textAlign: 'center',
          letterSpacing: '4px',
          textShadow: '0 0 16px rgba(0, 255, 65, 0.7)',
          marginBottom: 'clamp(1px, 0.25cqi, 3px)',
          transform: `translate(${titleOffsetX}%, ${titleOffsetY}%)`,
        }}
      >
        WANKR BOT
      </div>
      {/* Subtitle - morphs between LOGIN and REGISTER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(6px, 1.5cqi, 12px)',
          marginBottom: 'clamp(1px, 0.25cqi, 3px)',
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
              padding: '4px',
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
            fontSize: `clamp(${24 * ss}px, ${6 * ss}cqi, ${48 * ss}px)`,
            fontWeight: 700,
            color: 'var(--accent)',
            textAlign: 'center',
            letterSpacing: '2px',
            textShadow: '0 0 12px rgba(0, 255, 65, 0.6)',
            flex: 1,
            transition: 'all 0.3s ease',
          }}
        >
          {isRegistering ? 'NEW DEGEN' : 'DEGEN LOGIN'}
        </div>
      </div>
      {error && (
        <div style={{ color: '#ff6b6b', fontSize: 'clamp(10px, 1.4cqi, 13px)', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        autoComplete="off"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `clamp(${4 * fg}px, ${1 * fg}cqi, ${10 * fg}px)`,
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          marginTop: formMarginTop !== 0 ? `${formMarginTop}px` : undefined,
        }}
      >
        {/* Username field with availability indicator - icon gap anchored */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5cqi, 12px)' }}>
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
                padding: `clamp(${10 * ihs}px, ${2.5 * ihs}cqi, ${18 * ihs}px) clamp(12px, 3cqi, 24px)`,
                paddingRight: isRegistering ? `clamp(${36 * ihs}px, ${8 * ihs}cqi, ${52 * ihs}px)` : 'clamp(12px, 3cqi, 24px)',
                minHeight: `clamp(${36 * ihs}px, ${8 * ihs}cqi, ${52 * ihs}px)`,
                background: '#3a3a3a',
                border: `2px solid ${isRegistering && usernameStatus.available === false ? 'rgba(255, 107, 107, 0.6)' : isRegistering && usernameStatus.available ? 'rgba(0, 255, 65, 0.6)' : 'rgba(100, 100, 100, 0.5)'}`,
                borderRadius: 'clamp(8px, 2.5cqi, 14px)',
                color: 'var(--accent)',
                fontSize: 'clamp(14px, 2.5cqi, 20px)',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                transition: 'border-color 0.2s',
              }}
            />
            {isRegistering && username.trim().length >= 2 && (
              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}>
                {usernameStatus.checking ? (
                  <div style={{ width: 16, height: 16, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
          <div style={{ color: '#ff6b6b', fontSize: 'clamp(9px, 1.2cqi, 12px)', marginLeft: '28px', marginTop: '-4px' }}>
            {usernameStatus.error}
          </div>
        )}
        {isRegistering && usernameStatus.available && !usernameStatus.checking && (
          <div style={{ color: 'var(--accent)', fontSize: 'clamp(9px, 1.2cqi, 12px)', marginLeft: '28px', marginTop: '-4px' }}>
            Username available
          </div>
        )}

        {/* Password field - icon gap anchored */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5cqi, 12px)' }}>
          <div style={{ color: 'var(--accent)', flexShrink: 0 }}><KeyIcon /></div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: iws < 1 ? `${iws * 100}%` : undefined }}>
          <input
            type="password"
            placeholder={isRegistering ? 'Create password (6+ chars)' : 'Password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            style={{ width: '100%', minWidth: 0, minHeight: `clamp(${36 * ihs}px, ${8 * ihs}cqi, ${52 * ihs}px)`, padding: `clamp(${10 * ihs}px, ${2.5 * ihs}cqi, ${18 * ihs}px) clamp(12px, 3cqi, 24px)`, background: '#3a3a3a', border: '2px solid rgba(100, 100, 100, 0.5)', borderRadius: 'clamp(8px, 2.5cqi, 14px)', color: 'var(--accent)', fontSize: 'clamp(14px, 2.5cqi, 20px)', outline: 'none',                 boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
          />
          </div>
        </div>

        {isRegistering && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5cqi, 12px)' }}>
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
                minHeight: `clamp(${36 * ihs}px, ${8 * ihs}cqi, ${52 * ihs}px)`,
                padding: `clamp(${10 * ihs}px, ${2.5 * ihs}cqi, ${18 * ihs}px) clamp(12px, 3cqi, 24px)`,
                background: '#3a3a3a',
                border: `2px solid ${confirmPassword && password !== confirmPassword ? 'rgba(255, 107, 107, 0.6)' : 'rgba(100, 100, 100, 0.5)'}`,
                borderRadius: 'clamp(8px, 2.5cqi, 14px)',
                color: 'var(--accent)',
                fontSize: 'clamp(14px, 2.5cqi, 20px)',
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
            flex: 1,
            minHeight: `clamp(${44 * smhs}px, ${10 * smhs}cqi, ${64 * smhs}px)`,
            padding: `clamp(${12 * smhs}px, ${3 * smhs}cqi, ${22 * smhs}px)`,
            borderRadius: 'clamp(8px, 2.5cqi, 14px)',
            fontWeight: 'bold',
            fontSize: 'clamp(14px, 2.5cqi, 20px)',
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
        <div style={{ display: 'flex', gap: 'clamp(6px, 1.5cqi, 12px)', minWidth: 0, marginTop: bvg !== 1 ? `calc(${bvg - 1} * clamp(4px, 1.25cqi, 14px))` : undefined }}>
          <button type="button" className="btn-primary" onClick={onNewUser} disabled={loading} style={{ flex: 1, minWidth: 0, minHeight: `clamp(${40 * bbs}px, ${9 * bbs}cqi, ${56 * bbs}px)`, padding: `clamp(${10 * bbs}px, ${2.5 * bbs}cqi, ${18 * bbs}px)`, borderRadius: 'clamp(8px, 2.5cqi, 14px)', fontWeight: 'bold', fontSize: 'clamp(14px, 2.5cqi, 18px)', border: '2px solid var(--accent)', boxShadow: '0 0 8px rgba(0, 255, 65, 0.25)' }}>
            New User
          </button>
          <button type="button" className="btn" onClick={onSpectate} disabled={loading} style={{ flex: 1, minWidth: 0, minHeight: `clamp(${40 * bbs}px, ${9 * bbs}cqi, ${56 * bbs}px)`, padding: `clamp(${10 * bbs}px, ${2.5 * bbs}cqi, ${18 * bbs}px)`, borderRadius: 'clamp(8px, 2.5cqi, 14px)', fontSize: 'clamp(14px, 2.5cqi, 18px)', border: '2px solid var(--accent)', color: 'var(--accent)' }}>
            Spectate
          </button>
        </div>
      )}
    </>
  );
}
