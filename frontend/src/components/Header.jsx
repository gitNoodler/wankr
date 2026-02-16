import React, { useState, useRef, useEffect } from 'react';
import LOGO_URL from '../assets/logo.js';

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const menuItemStyle = {
  width: '100%',
  padding: '10px 16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: 14,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};

function Header({ onLogout, onOpenMeasure, onOpenGlowPoint, onOpenEffectsBounds }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((o) => !o);

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
        {/* Left: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dashboard-title-gap)' }}>
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
        </div>

        {/* Center: Logo on ribbon */}
        <img
          src={LOGO_URL}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            opacity: 0.9,
            filter: 'drop-shadow(0 0 6px rgba(0, 255, 0, 0.5)) drop-shadow(0 0 12px rgba(0, 255, 0, 0.25))',
            pointerEvents: 'none',
          }}
        />
        {/* Right: Status + Gear menu */}
        <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'calc(11px * var(--scale))', color: 'var(--accent)', fontSize: 'calc(20px * var(--scale))' }}>
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
          <span>Online</span>
          <button
            type="button"
            onClick={toggleMenu}
            aria-label="Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              padding: 0,
              border: '2px solid var(--accent)',
              borderRadius: '50%',
              background: menuOpen ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
              color: 'var(--accent)',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 255, 65, 0.4), inset 0 0 12px rgba(0, 255, 65, 0.08)',
            }}
          >
            <GearIcon />
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                minWidth: 200,
                background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: '2px solid var(--accent)',
                borderRadius: 12,
                boxShadow: '0 0 20px rgba(0, 255, 65, 0.3), 0 8px 24px rgba(0,0,0,0.6)',
                padding: '8px 0',
                zIndex: 100,
              }}
            >
              <button type="button" className="header-menu-item" onClick={() => { onLogout?.(); setMenuOpen(false); }} style={menuItemStyle}>
                Logout
              </button>
              <button type="button" className="header-menu-item" onClick={() => { onOpenMeasure?.(); setMenuOpen(false); }} style={menuItemStyle}>
                Measure
              </button>
              <button type="button" className="header-menu-item" onClick={() => { onOpenGlowPoint?.(); setMenuOpen(false); }} style={menuItemStyle}>
                Glow Point
              </button>
              <button type="button" className="header-menu-item" onClick={() => { onOpenEffectsBounds?.(); setMenuOpen(false); }} style={menuItemStyle}>
                Effects Bounds
              </button>
              <a href="#docs" className="header-menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }} style={{ ...menuItemStyle, textDecoration: 'none', display: 'block' }}>
                Docs
              </a>
              <a href="#help" className="header-menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }} style={{ ...menuItemStyle, textDecoration: 'none', display: 'block' }}>
                Help
              </a>
              <a href="#disclaimer" className="header-menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }} style={{ ...menuItemStyle, textDecoration: 'none', display: 'block' }}>
                Disclaimer
              </a>
              <a href="#terms" className="header-menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }} style={{ ...menuItemStyle, textDecoration: 'none', display: 'block' }}>
                Terms of use
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Beam separator - gradient extends to edges for seamless blend with sidebar/chat panels */}
      <div
        style={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
          height: '3px',
          background: 'linear-gradient(90deg, rgba(0, 255, 0, 0.08) 0%, rgba(0, 255, 0, 0.5) 15%, rgba(0, 255, 0, 0.5) 85%, rgba(0, 255, 0, 0.08) 100%)',
        }}
      />
    </>
  );
}

export default Header;
