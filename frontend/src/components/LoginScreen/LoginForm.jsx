import React from 'react';
import { UserIcon, KeyIcon, CheckIcon, XIcon, BackIcon } from './LoginScreenIcons';

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
  titleOffsetX = 0,
  titleOffsetY = 0,
  titleScale = 100,
  subtitleOffsetX = 0,
  subtitleOffsetY = 0,
  subtitleScale = 100,
  inputWidthScale = 100,
  titleTopGap = 1,
  titleToSubtitleGap = 0.5,
  subtitleToUsernameGap = 1,
  usernamePasswordGap = 1,
  passwordToSubmitGap = 1,
  submitToButtonsGap = 1,
  controlHeightScale = 100,
}) {
  const ts = titleScale / 100;
  const ss = subtitleScale / 100;
  const iws = inputWidthScale / 100;
  const chs = controlHeightScale / 100;
  const h = 8 * chs;
  const hCqi = `${h}cqi`;
  const inputFontCqi = 3.5 * chs;
  const buttonFontCqi = 3.2 * chs;

  return (
    <>
      {/* Main title - spacing from panel top */}
      <div
        className="font-wankr"
        style={{
          marginTop: `${titleTopGap}cqi`,
          fontSize: `${12 * ts}cqi`,
          fontWeight: 900,
          color: 'var(--accent)',
          textAlign: 'center',
          letterSpacing: '0.15cqi',
          textTransform: 'uppercase',
          textShadow: '0 0 16px rgba(0, 255, 65, 0.7), 0 0 24px rgba(0, 255, 65, 0.4)',
          transform: `translate(${titleOffsetX}%, ${titleOffsetY}%)`,
        }}
      >
        WANKR BOT
      </div>
      {/* Subtitle - top relative to bottom of title */}
      <div
        style={{
          marginTop: `${titleToSubtitleGap}cqi`,
          display: 'flex',
          alignItems: 'center',
          gap: '1.5cqi',
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
            textTransform: 'uppercase',
            textShadow: '0 0 12px rgba(0, 255, 65, 0.6), 0 0 18px rgba(0, 255, 65, 0.35)',
            flex: 1,
            transition: 'all 0.3s ease',
          }}
        >
          {isRegistering ? 'NEW DEGEN' : 'DEGEN LOGIN'}
        </div>
      </div>
      {error && (
        <div style={{ color: '#ff6b6b', fontSize: '2.4cqi', fontWeight: 700, textAlign: 'center', marginTop: '0.8cqi', textShadow: '0 0 8px rgba(255,107,107,0.5)' }}>
          {error}
        </div>
      )}

      {/* Username top = subtitle bottom + subtitleToUsernameGap; username & password as one unit with usernamePasswordGap */}
      <form
        onSubmit={onSubmit}
        autoComplete="off"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          minWidth: 0,
          marginTop: `${subtitleToUsernameGap}cqi`,
        }}
      >
        {/* Username row */}
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
                paddingTop: `${2.5 * chs}cqi`,
                paddingRight: isRegistering ? `${8 * chs}cqi` : '3cqi',
                paddingBottom: `${2.5 * chs}cqi`,
                paddingLeft: '3cqi',
                minHeight: hCqi,
                background: 'linear-gradient(180deg, #404040 0%, #353535 40%, #2d2d2d 100%)',
                border: `2px solid ${isRegistering && usernameStatus.available === false ? 'rgba(255, 107, 107, 0.6)' : isRegistering && usernameStatus.available ? 'rgba(0, 255, 65, 0.6)' : 'rgba(140, 140, 140, 0.55)'}`,
                borderRadius: `${3 * chs}cqi`,
                color: 'var(--accent)',
                fontSize: `${inputFontCqi}cqi`,
                outline: 'none',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 3px 8px rgba(0,0,0,0.4)',
                transition: 'border-color 0.2s',
              }}
            />
            {isRegistering && username.trim().length >= 5 && (
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
          <div style={{ color: '#ff6b6b', fontSize: '2cqi', fontWeight: 600, marginLeft: '2cqi', marginTop: '0.2cqi', textShadow: '0 0 6px rgba(255,107,107,0.4)' }}>
            {usernameStatus.error}
          </div>
        )}
        {isRegistering && usernameStatus.available && !usernameStatus.checking && (
          <div style={{ color: 'var(--accent)', fontSize: '1.2cqi', marginLeft: '2cqi', marginTop: '-0.3cqi' }}>
            Username available (min 5 characters)
          </div>
        )}

        {/* Optional email - registration only */}
        {isRegistering && onEmailChange && (
          <div style={{ marginTop: `${usernamePasswordGap}cqi`, display: 'flex', alignItems: 'center', gap: '1.5cqi' }}>
            <div style={{ color: 'var(--accent)', flexShrink: 0 }}><UserIcon /></div>
            <div style={{ flex: 1, minWidth: 0, maxWidth: iws < 1 ? `${iws * 100}%` : undefined }}>
              <input
                type="email"
                placeholder="Email (optional)"
                autoComplete="email"
                value={email ?? ''}
                onChange={(e) => onEmailChange(e.target.value)}
                style={{
                  width: '100%',
                  minWidth: 0,
                  minHeight: hCqi,
                  padding: `${2.5 * chs}cqi 3cqi`,
                  background: 'linear-gradient(180deg, #3a3a3a 0%, #323232 40%, #2a2a2a 100%)',
                  border: '2px solid rgba(140, 140, 140, 0.55)',
                  borderRadius: `${2.5 * chs}cqi`,
                  color: 'var(--accent)',
                  fontSize: `${inputFontCqi}cqi`,
                  outline: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 3px 8px rgba(0,0,0,0.4)',
                }}
              />
            </div>
          </div>
        )}

        {/* Password row - gap from username = usernamePasswordGap */}
        <div style={{ marginTop: `${usernamePasswordGap}cqi`, display: 'flex', alignItems: 'center', gap: '1.5cqi' }}>
          <div style={{ color: 'var(--accent)', flexShrink: 0 }}><KeyIcon /></div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: iws < 1 ? `${iws * 100}%` : undefined }}>
          <input
            type="password"
            placeholder={isRegistering ? 'Create password (6+ chars)' : 'Password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            style={{ width: '100%', minWidth: 0, minHeight: hCqi, padding: `${2.5 * chs}cqi 3cqi`, background: 'linear-gradient(180deg, #3a3a3a 0%, #323232 40%, #2a2a2a 100%)', border: '2px solid rgba(140, 140, 140, 0.55)', borderRadius: `${3 * chs}cqi`, color: 'var(--accent)', fontSize: `${inputFontCqi}cqi`, outline: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 3px 8px rgba(0,0,0,0.4)' }}
          />
          </div>
        </div>

        {isRegistering && (
          <div style={{ marginTop: `${usernamePasswordGap}cqi`, display: 'flex', alignItems: 'center', gap: '1.5cqi' }}>
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
                minHeight: hCqi,
                padding: `${2.5 * chs}cqi 3cqi`,
                background: 'linear-gradient(180deg, #404040 0%, #353535 40%, #2d2d2d 100%)',
                border: `2px solid ${confirmPassword && password !== confirmPassword ? 'rgba(255, 107, 107, 0.6)' : 'rgba(100, 100, 100, 0.5)'}`,
                borderRadius: `${3 * chs}cqi`,
                color: 'var(--accent)',
                fontSize: `${inputFontCqi}cqi`,
                outline: 'none',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 3px 8px rgba(0,0,0,0.4)',
                transition: 'border-color 0.2s',
              }}
            />
            </div>
          </div>
        )}

        {/* Submit - top relative to bottom of password; height = h */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || (isRegistering && !usernameStatus.available)}
          style={{
            width: '100%',
            minWidth: 0,
            minHeight: hCqi,
            marginTop: `${passwordToSubmitGap}cqi`,
            padding: `${3 * chs}cqi`,
            borderRadius: `${3 * chs}cqi`,
            fontWeight: 'bold',
            fontSize: `${buttonFontCqi}cqi`,
            textTransform: 'uppercase',
            color: '#000',
            border: '2px solid var(--accent)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.25), 0 3px 0 rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.35), 0 0 14px rgba(0, 255, 65, 0.35)',
            background: 'linear-gradient(180deg, #00ff50 0%, #00e040 50%, #00c835 100%)',
            opacity: (isRegistering && !usernameStatus.available) ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '...' : isRegistering ? 'CREATE ACCOUNT' : 'SUBMIT'}
        </button>
      </form>

      {/* New User / Spectate - top relative to bottom of submit; bottom to panel ≥ 20px handled by panel padding */}
      {!isRegistering && (
        <>
          <div style={{ display: 'flex', gap: '1.5cqi', minWidth: 0, marginTop: `${submitToButtonsGap}cqi` }}>
            <button type="button" className="btn-primary" onClick={onNewUser} disabled={loading} style={{ flex: 1, minWidth: 0, minHeight: hCqi, padding: `${2.5 * chs}cqi`, borderRadius: `${3 * chs}cqi`, fontWeight: 'bold', fontSize: `${buttonFontCqi}cqi`, border: '2px solid var(--accent)', color: '#000', background: 'linear-gradient(180deg, rgba(0,255,65,0.9) 0%, rgba(0,200,80,0.85) 50%, rgba(0,180,70,0.8) 100%)', boxShadow: '0 0 10px rgba(0,255,65,0.25), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
              New User
            </button>
            <button type="button" className="btn" onClick={onSpectate} disabled={loading} style={{ flex: 1, minWidth: 0, minHeight: hCqi, padding: `${2.5 * chs}cqi`, borderRadius: `${3 * chs}cqi`, fontSize: `${buttonFontCqi}cqi`, fontWeight: 600, border: '2px solid var(--accent)', color: 'var(--accent)', background: 'rgba(18, 24, 20, 0.98)', boxShadow: '0 0 10px rgba(0,255,65,0.15), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              Spectate
            </button>
          </div>
          <p
            style={{
              marginTop: '2cqi',
              marginBottom: '2cqi',
              fontSize: `${buttonFontCqi}cqi`,
              fontWeight: 600,
              fontStyle: 'italic',
              color: 'rgba(120, 120, 120, 0.98)',
              textShadow: '1px 1px 0 rgba(255,255,255,0.28), 2px 2px 0 rgba(255,255,255,0.08), -1px -1px 0 rgba(0,0,0,0.55), -2px -2px 1px rgba(0,0,0,0.25)',
              letterSpacing: '0.04em',
              textAlign: 'center',
              lineHeight: 1.25,
            }}
          >
            &quot;Don&apos;t miss out! Join the WankrBot circle jerk today!&quot; — Wankr
          </p>
        </>
      )}
    </>
  );
}
