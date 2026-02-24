import React, { useState, useRef, useEffect } from 'react';

/**
 * GrooveGearMenu — top-right gear icon that opens a flyout
 * with a volume slider and mute toggle for The WankrBot Groove.
 *
 * Matches the neon-green terminal aesthetic of the login screen.
 */
export default function GrooveGearMenu({ volume, muted, onVolumeChange, onToggleMute }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const pct = Math.round(volume * 100);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: 14,
        right: 14,
        zIndex: 200,
        fontFamily: "'VT323', monospace",
        userSelect: 'none',
      }}
    >
      {/* Gear button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Audio settings"
        style={{
          width: 36,
          height: 36,
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
          width="18"
          height="18"
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

      {/* Flyout menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            background: 'rgba(2,6,2,0.94)',
            border: '1px solid rgba(0,255,65,0.35)',
            borderRadius: 8,
            padding: '14px 16px 12px',
            minWidth: 200,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,65,0.06)',
            animation: 'gearMenuIn 0.18s ease-out',
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 13,
              color: 'rgba(0,255,65,0.5)',
              letterSpacing: '0.12em',
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            WankrBot Groove
          </div>

          {/* Volume row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mute button */}
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Unmute' : 'Mute'}
              style={{
                width: 30,
                height: 30,
                flexShrink: 0,
                border: `1px solid ${muted ? 'rgba(255,60,60,0.5)' : 'rgba(0,255,65,0.3)'}`,
                borderRadius: 4,
                background: muted ? 'rgba(255,60,60,0.08)' : 'rgba(0,255,65,0.06)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.15s',
              }}
            >
              {muted ? (
                /* Volume X (muted) */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                /* Volume 2 (unmuted) */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" opacity="0.3" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {/* Slider */}
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

            {/* Percentage readout */}
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
        </div>
      )}

      {/* Inline keyframes for the flyout animation */}
      <style>{`
        @keyframes gearMenuIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Style the range thumb for Webkit */
        .login-scene input[type="range"]::-webkit-slider-thumb {
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
        .login-scene input[type="range"]::-moz-range-thumb {
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
