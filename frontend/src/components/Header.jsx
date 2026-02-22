function Header() {
  return (
    <>
      <header
        className="shrink-0 relative z-20"
        style={{
          minHeight: 'var(--dashboard-header-height)',
          height: 'var(--dashboard-header-height)',
          padding: '0 var(--dashboard-content-padding)',
          background: '#0c0c0c',
          borderBottom: '2px solid rgba(0, 255, 0, 0.35)',
          boxShadow: `
            0 10px 26px rgba(0, 0, 0, 0.85),
            0 4px 14px rgba(0, 0, 0, 0.65),
            inset 0 2px 0 rgba(255, 255, 255, 0.06),
            inset 0 -1px 0 rgba(0, 0, 0, 0.7),
            0 0 20px rgba(0, 255, 0, 0.18)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dashboard-title-gap)' }}>
          <img
            src="/static/logo.png"
            alt="Wankr"
            style={{
              width: 'var(--dashboard-title-logo-size)',
              height: 'var(--dashboard-title-logo-size)',
              borderRadius: '14px',
              background: '#0b0b0b',
              mixBlendMode: 'normal',
              filter: 'drop-shadow(0 0 12px var(--accent)) drop-shadow(0 0 26px rgba(0, 255, 0, 0.55))',
              border: '2px solid rgba(0, 255, 0, 0.55)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 14px rgba(0, 255, 0, 0.2)',
            }}
          />
          <div
            className="font-wankr"
            style={{
              color: 'var(--accent)',
              fontSize: 'var(--dashboard-title-font-size)',
              fontWeight: 700,
              letterSpacing: '3.5px',
              textTransform: 'uppercase',
              textShadow: '0 0 16px var(--accent), 0 0 28px rgba(0, 255, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7)',
            }}
          >
            WANKR
          </div>
        </div>

        {/* Right: Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', color: 'var(--accent)', fontSize: 'clamp(15px, 1.4vw, 20px)' }}>
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent), 0 0 16px var(--accent)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          Online
        </div>
      </header>

      {/* Beam separator */}
      <div
        className="shrink-0 relative z-20"
        style={{
          height: '4px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 0, 0.65) 20%, rgba(0, 255, 0, 0.65) 80%, transparent 100%)',
          boxShadow: '0 0 12px rgba(0, 255, 0, 0.35)',
        }}
      />
    </>
  );
}

export default Header;
