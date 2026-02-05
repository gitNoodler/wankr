function Header({ onArchive }) {
  return (
    <>
      <header
        className="shrink-0 relative z-20"
        style={{
          minHeight: 'var(--dashboard-header-height)',
          height: 'var(--dashboard-header-height)',
          padding: '0 var(--dashboard-content-padding)',
          background: 'linear-gradient(180deg, #0b0b0b 0%, #070707 100%)',
          borderBottom: '2px solid rgba(0, 255, 0, 0.3)',
          boxShadow: `
            0 4px 20px rgba(0, 0, 0, 0.7),
            0 2px 8px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dashboard-title-gap)' }}>
          <img
            src="/static/avatar.png"
            alt="Wankr"
            style={{
              width: 'var(--dashboard-title-logo-size)',
              height: 'var(--dashboard-title-logo-size)',
              borderRadius: '8px',
              filter: 'drop-shadow(0 0 10px var(--accent)) drop-shadow(0 0 20px rgba(0, 255, 0, 0.4))',
              border: '2px solid rgba(0, 255, 0, 0.4)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          />
        </div>

        {/* Center: Title + Quote */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: 'min(56vw, 780px)',
            padding: '0 12px',
            pointerEvents: 'none',
            gap: '2px',
          }}
        >
          <div
            className="font-wankr"
            style={{
              color: 'var(--accent)',
              fontSize: 'clamp(24px, 2.6vw, 40px)',
              fontWeight: 800,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              textShadow: '0 0 18px rgba(0, 255, 0, 0.85), 0 2px 6px rgba(0, 0, 0, 0.7)',
            }}
          >
            WANKER-BOT
          </div>
          <div
            style={{
              fontSize: 'clamp(10px, 1vw, 13px)',
              color: 'rgba(0, 255, 0, 0.72)',
              lineHeight: 1.2,
              letterSpacing: '0.2px',
              textShadow: '0 0 10px rgba(0, 255, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.7)',
              maxWidth: 'min(56vw, 780px)',
            }}
          >
            The fembots tell me &quot;ACCESS Denied&quot;, But floppy disc in hand and pumping charts beats any disc drive they can offer, anyways
          </div>
        </div>

        {/* Right: Status + Archive */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.5vw, 24px)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent)',
              fontSize: 'clamp(11px, 1vw, 14px)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent), 0 0 16px var(--accent)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            Online
          </div>
          <button
            type="button"
            onClick={onArchive}
            style={{
              padding: 'clamp(8px, 0.8vw, 12px) clamp(16px, 1.5vw, 24px)',
              fontSize: 'clamp(11px, 1vw, 14px)',
              fontWeight: 600,
              background: 'linear-gradient(180deg, rgba(0, 255, 0, 0.25) 0%, rgba(0, 255, 0, 0.15) 100%)',
              border: '1px solid rgba(0, 255, 0, 0.6)',
              borderRadius: 'var(--dashboard-panel-radius)',
              color: 'var(--accent)',
              cursor: 'pointer',
              boxShadow: `
                0 4px 12px rgba(0, 255, 0, 0.2),
                0 2px 4px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.15),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
              `,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(180deg, rgba(0, 255, 0, 0.35) 0%, rgba(0, 255, 0, 0.25) 100%)';
              e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(180deg, rgba(0, 255, 0, 0.25) 0%, rgba(0, 255, 0, 0.15) 100%)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.2)';
            }}
          >
            Archive
          </button>
        </div>
      </header>

      {/* Glowing beam separator */}
      <div
        className="shrink-0 relative z-20"
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, var(--accent) 20%, var(--accent) 80%, transparent 100%)',
          boxShadow: '0 0 12px var(--accent), 0 0 24px rgba(0, 255, 0, 0.5)',
        }}
      />
    </>
  );
}

export default Header;
