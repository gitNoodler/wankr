function Particles() {
  return (
    <div
      className="fixed top-0 right-0 w-[120px] h-[120px] pointer-events-none z-0"
      aria-hidden
    >
      <span
        className="absolute w-[3px] h-[3px] rounded-full"
        style={{
          top: 20,
          right: 30,
          background: 'var(--gold)',
          opacity: 0.4,
          animation: 'sparkle 4s ease-in-out infinite',
        }}
      />
      <span
        className="absolute w-[3px] h-[3px] rounded-full"
        style={{
          top: 50,
          right: 60,
          background: 'var(--gold)',
          opacity: 0.4,
          animation: 'sparkle 4s ease-in-out infinite 1s',
        }}
      />
      <span
        className="absolute w-[3px] h-[3px] rounded-full"
        style={{
          top: 80,
          right: 20,
          background: 'var(--gold)',
          opacity: 0.4,
          animation: 'sparkle 4s ease-in-out infinite 2s',
        }}
      />
    </div>
  );
}

export default Particles;
