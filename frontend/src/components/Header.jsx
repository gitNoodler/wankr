import LOGO_URL from '../assets/logo.js'

function Header() {
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
        {/* Right: Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(11px * var(--scale))', color: 'var(--accent)', fontSize: 'calc(20px * var(--scale))' }}>
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
          Online
        </div>
      </header>

      {/* Beam separator */}
      <div
        style={{
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 0, 0.5) 20%, rgba(0, 255, 0, 0.5) 80%, transparent 100%)',
        }}
      />
    </>
  );
}

export default Header;
