import React, { useState, useRef, useEffect } from 'react';
import LOGO_URL from '../assets/logo.js';

const HamburgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

function Header({ isMobile, onMenuToggle, onLogout, volume, muted, onVolumeChange, onToggleMute }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState('main');
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setScreen('main');
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const pct = Math.round((volume ?? 0) * 100);
  const btnSize = isMobile ? 36 : 32;

  return (
    <>
      <header
        style={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
          minHeight: 'var(--dashboard-header-height)',
          height: 'var(--dashboard-header-height)',
          padding: '0 var(--dashboard-content-padding)',
          background: 'linear-gradient(180deg, #161616 0%, #0f0f0f 100%)',
          borderBottom: '1px solid rgba(100, 100, 100, 0.5)',
          boxShadow: `
            0 12px 36px rgba(0, 0, 0, 0.9),
            0 6px 20px rgba(0, 0, 0, 0.7),
            inset 0 2px 0 rgba(255, 255, 255, 0.06),
            inset 0 -1px 0 rgba(0, 0, 0, 0.5)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Hamburger (mobile) + Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dashboard-title-gap)' }}>
          {isMobile && (
            <button
              type="button"
              onClick={onMenuToggle}
              aria-label="Open menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                padding: 0,
                border: '1.5px solid rgba(0, 255, 65, 0.35)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--accent)',
                cursor: 'pointer',
              }}
            >
              <HamburgerIcon />
            </button>
          )}
          <img
            src={LOGO_URL}
            alt="Wankr"
            style={{
              width: 'var(--dashboard-title-logo-size)',
              height: 'var(--dashboard-title-logo-size)',
              borderRadius: 'calc(11px * var(--scale))',
              background: 'transparent',
              mixBlendMode: 'multiply',
              filter: 'drop-shadow(0 0 4px rgba(0, 255, 0, 0.5)) drop-shadow(0 0 8px rgba(0, 255, 0, 0.25))',
              border: '2px solid rgba(100, 100, 100, 0.5)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          />
          {!isMobile && (
            <div
              className="font-wankr"
              style={{
                color: 'var(--accent)',
                fontSize: 'var(--dashboard-title-font-size)',
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: '0 0 12px var(--accent), 0 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              WANKR
            </div>
          )}
        </div>

        {/* Center: Logo on ribbon (hidden on mobile) */}
        {!isMobile && (
          <img
            src={LOGO_URL}
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 92,
              height: 92,
              opacity: 0.9,
              filter: 'drop-shadow(0 0 6px rgba(0, 255, 0, 0.5)) drop-shadow(0 0 12px rgba(0, 255, 0, 0.25))',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Right: Online indicator + Mute + Gear */}
        <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--scale))', fontFamily: "'VT323', monospace" }}>
          {/* Online pulse */}
          <span
            style={{
              width: 'calc(14px * var(--scale))',
              height: 'calc(14px * var(--scale))',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent), 0 0 16px var(--accent)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          {!isMobile && <span style={{ color: 'var(--accent)', fontSize: 'calc(20px * var(--scale))' }}>Online</span>}

          {/* Mute button */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
            style={{
              width: btnSize,
              height: btnSize,
              borderRadius: '50%',
              border: `1.5px solid ${muted ? 'rgba(255,60,60,0.6)' : 'rgba(0,255,65,0.5)'}`,
              background: muted ? 'rgba(255,60,60,0.12)' : 'rgba(0,255,65,0.10)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.2s ease',
              boxShadow: muted ? '0 0 10px rgba(255,60,60,0.2)' : '0 0 10px rgba(0,255,65,0.2)',
            }}
          >
            {muted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          {/* Gear button */}
          <button
            type="button"
            onClick={() => { setMenuOpen((o) => { if (o) setScreen('main'); return !o; }); }}
            aria-label="Settings"
            style={{
              width: btnSize,
              height: btnSize,
              borderRadius: '50%',
              border: `1.5px solid ${menuOpen ? '#00ff41' : 'rgba(0,255,65,0.35)'}`,
              background: menuOpen ? 'rgba(0,255,65,0.10)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: menuOpen ? '0 0 14px rgba(0,255,65,0.25)' : 'none',
              padding: 0,
              color: 'var(--accent)',
            }}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={menuOpen ? '#00ff41' : 'rgba(0,255,65,0.6)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.4s ease, stroke 0.2s', transform: menuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Flyout menu */}
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: '#020602',
                border: '1px solid rgba(0,255,65,0.35)',
                borderRadius: 8,
                padding: '12px 14px',
                minWidth: 210,
                boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,65,0.06)',
                animation: 'gearMenuIn 0.18s ease-out',
                zIndex: 100,
              }}
            >
              {screen === 'main' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={flyoutStyles.title}>Settings</div>
                  <button type="button" style={flyoutStyles.item} onClick={() => setScreen('music')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                    <span>Music</span>
                    <span style={flyoutStyles.arrow}>›</span>
                  </button>
                  {onLogout && (
                    <>
                      <div style={{ height: 1, background: 'rgba(0,255,65,0.12)', margin: '4px 0' }} />
                      <button type="button" style={flyoutStyles.item} onClick={() => { setMenuOpen(false); setScreen('main'); onLogout(); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span style={{ color: '#ff4444' }}>Logout</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {screen === 'music' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <button type="button" onClick={() => setScreen('main')} style={flyoutStyles.backBtn} aria-label="Back">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <div style={flyoutStyles.title}>Music</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="range" min={0} max={100} step={1} value={pct}
                        onChange={(e) => onVolumeChange?.(+e.target.value / 100)}
                        aria-label="Volume"
                        className="gear-vol-slider"
                        style={{
                          width: '100%', height: 4,
                          appearance: 'none', WebkitAppearance: 'none',
                          background: `linear-gradient(to right, #00ff41 0%, #00ff41 ${pct}%, rgba(0,255,65,0.15) ${pct}%, rgba(0,255,65,0.15) 100%)`,
                          borderRadius: 2, outline: 'none', cursor: 'pointer',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 14, color: muted ? '#ff4444' : '#00ff41', minWidth: 36, textAlign: 'right', fontFamily: "'VT323', monospace" }}>
                      {muted ? 'OFF' : `${pct}%`}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Beam separator */}
      <div
        style={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
          height: '3px',
          background: 'linear-gradient(90deg, rgba(0, 255, 0, 0.08) 0%, rgba(0, 255, 0, 0.5) 15%, rgba(0, 255, 0, 0.5) 85%, rgba(0, 255, 0, 0.08) 100%)',
        }}
      />

      <style>{`
        @keyframes gearMenuIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .gear-vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: #00ff41; border: 2px solid rgba(0,0,0,0.8);
          box-shadow: 0 0 6px rgba(0,255,65,0.5); cursor: pointer;
        }
        .gear-vol-slider::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #00ff41; border: 2px solid rgba(0,0,0,0.8);
          box-shadow: 0 0 6px rgba(0,255,65,0.5); cursor: pointer;
        }
      `}</style>
    </>
  );
}

const flyoutStyles = {
  title: {
    fontSize: 13,
    color: 'rgba(0,255,65,0.5)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 6px',
    background: 'rgba(0,255,65,0.04)',
    border: '1px solid rgba(0,255,65,0.15)',
    borderRadius: 5,
    color: '#00ff41',
    fontSize: 14,
    fontFamily: "'VT323', monospace",
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.08em',
  },
  arrow: {
    marginLeft: 'auto',
    fontSize: 18,
    opacity: 0.5,
  },
  backBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    border: '1px solid rgba(0,255,65,0.25)',
    background: 'rgba(0,255,65,0.04)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'all 0.15s',
  },
};

export default Header;
