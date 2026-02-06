function Header() {
  return (
    <>
      <header
        className="shrink-0 relative z-20"
        style={{
          minHeight: 'var(--dashboard-header-height)',
          height: 'var(--dashboard-header-height)',
          padding: '0 clamp(22px, 5.6vw, 45px)',
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(60, 60, 60, 0.5)',
          boxShadow: `
            0 8px 24px rgba(0, 0, 0, 0.8),
            0 4px 12px rgba(0, 0, 0, 0.6),
            inset 0 2px 0 rgba(255, 255, 255, 0.04),
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
            src="/static/logo.png"
            alt="Wankr"
            style={{
              width: 'var(--dashboard-title-logo-size)',
              height: 'var(--dashboard-title-logo-size)',
              borderRadius: '11px',
              background: 'transparent',
              mixBlendMode: 'multiply',
              filter: 'drop-shadow(0 0 10px var(--accent)) drop-shadow(0 0 20px rgba(0, 255, 0, 0.4))',
              border: '2px solid rgba(0, 255, 0, 0.4)',
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
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 0, 0.5) 20%, rgba(0, 255, 0, 0.5) 80%, transparent 100%)',
        }}
      />
    </>
  );
}

export default Header;
