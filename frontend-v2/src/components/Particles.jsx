function Particles() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 120,
        height: 120,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden
    >
      <span
        style={{
          position: 'absolute',
          top: 20,
          right: 30,
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: 'var(--gold)',
          opacity: 0.4,
          animation: 'sparkle 4s ease-in-out infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 50,
          right: 60,
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: 'var(--gold)',
          opacity: 0.4,
          animation: 'sparkle 4s ease-in-out infinite 1s',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 80,
          right: 20,
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: 'var(--gold)',
          opacity: 0.4,
          animation: 'sparkle 4s ease-in-out infinite 2s',
        }}
      />
    </div>
  );
}

export default Particles;
