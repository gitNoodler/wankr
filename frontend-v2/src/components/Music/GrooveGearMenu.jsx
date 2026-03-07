import React, { useState, useRef, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * GrooveGearMenu — gear icon opens a multi-screen settings flyout.
 * Standalone mute button: green when active, red when muted.
 */
export default function GrooveGearMenu({ volume, muted, onVolumeChange, onToggleMute, onLogout }) {
  const { isMobile } = useResponsive();
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState('main'); // 'main' | 'music'
  const menuRef = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setScreen('main');
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const pct = Math.round(volume * 100);
  const btnSize = isMobile ? 40 : 32;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: isMobile ? 'auto' : 14,
        bottom: isMobile ? 14 : 'auto',
        right: 14,
        zIndex: 200,
        fontFamily: "'VT323', monospace",
        userSelect: 'none',
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {/* Button row: mute + gear */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Mute button — standalone */}
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
            boxShadow: muted
              ? '0 0 10px rgba(255,60,60,0.2)'
              : '0 0 10px rgba(0,255,65,0.2)',
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
          onClick={() => { setOpen((o) => { if (o) setScreen('main'); return !o; }); }}
          aria-label="Settings"
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: '50%',
            border: `1.5px solid ${open ? '#00ff41' : 'rgba(0,255,65,0.35)'}`,
            background: open ? 'rgba(0,255,65,0.10)' : 'rgba(0,0,0,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: open ? '0 0 14px rgba(0,255,65,0.25)' : 'none',
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={open ? '#00ff41' : 'rgba(0,255,65,0.6)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.4s ease, stroke 0.2s',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Flyout menu */}
      {open && (
        <div
          style={{
            background: '#020602',
            border: '1px solid rgba(0,255,65,0.35)',
            borderRadius: 8,
            padding: '12px 14px',
            minWidth: 210,
            boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,65,0.06)',
            animation: 'gearMenuIn 0.18s ease-out',
          }}
        >
          {screen === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={styles.screenTitle}>Settings</div>
              <button type="button" style={styles.menuItem} onClick={() => setScreen('music')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                <span>Music</span>
                <span style={styles.menuArrow}>›</span>
              </button>
              {onLogout && (
                <>
                  <div style={{ height: 1, background: 'rgba(0,255,65,0.12)', margin: '4px 0' }} />
                  <button type="button" style={styles.menuItem} onClick={() => { setOpen(false); setScreen('main'); onLogout(); }}>
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
                <button type="button" onClick={() => setScreen('main')} style={styles.backBtn} aria-label="Back">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div style={styles.screenTitle}>Music</div>
              </div>

              {/* Volume row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pct}
                    onChange={(e) => onVolumeChange(+e.target.value / 100)}
                    aria-label="Volume"
                    style={{
                      width: '100%',
                      height: 4,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: `linear-gradient(to right, #00ff41 0%, #00ff41 ${pct}%, rgba(0,255,65,0.15) ${pct}%, rgba(0,255,65,0.15) 100%)`,
                      borderRadius: 2,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: muted ? '#ff4444' : '#00ff41',
                    minWidth: 36,
                    textAlign: 'right',
                  }}
                >
                  {muted ? 'OFF' : `${pct}%`}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes gearMenuIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00ff41;
          border: 2px solid rgba(0,0,0,0.8);
          box-shadow: 0 0 6px rgba(0,255,65,0.5);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00ff41;
          border: 2px solid rgba(0,0,0,0.8);
          box-shadow: 0 0 6px rgba(0,255,65,0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

const styles = {
  screenTitle: {
    fontSize: 13,
    color: 'rgba(0,255,65,0.5)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  menuItem: {
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
  menuArrow: {
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
