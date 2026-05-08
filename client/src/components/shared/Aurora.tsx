/**
 * Aurora — animated gradient backdrop in the new violet/magenta/cyan
 * palette. Three slow-drifting blurred orbs, plus a field of pinpoint
 * stars that twinkle on a staggered timer. Pure CSS keyframes.
 *
 * Drop in once near the root of a page (above all content). It's
 * `pointer-events: none` and `z-index: 0`, so foreground content
 * always renders above it untouched.
 */
export function Aurora() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Base wash — deep indigo into nearly-black, with a violet
          highlight at the very top of the screen. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(74,56,36,0.85) 0%, rgba(20,15,10,0.95) 60%, rgba(10,8,5,1) 100%)',
        }}
      />
      {/* Three slow-drifting orbs — violet, magenta, cyan. */}
      <div className="aurora-orb" style={{
        top: '-15%', left: '-10%', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(212,169,106,0.25) 0%, rgba(212,169,106,0) 65%)',
        animation: 'aurora-drift-1 22s ease-in-out infinite',
      }} />
      <div className="aurora-orb" style={{
        top: '20%', right: '-15%', width: '55vw', height: '55vw',
        background: 'radial-gradient(circle, rgba(92,128,56,0.20) 0%, rgba(92,128,56,0) 65%)',
        animation: 'aurora-drift-2 28s ease-in-out infinite',
      }} />
      <div className="aurora-orb" style={{
        bottom: '-20%', left: '10%', width: '65vw', height: '65vw',
        background: 'radial-gradient(circle, rgba(215,122,51,0.16) 0%, rgba(215,122,51,0) 65%)',
        animation: 'aurora-drift-3 32s ease-in-out infinite',
      }} />

      {/* Pinpoint star field — lavender twinkles. */}
      <Dust />

      <style>{`
        .aurora-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
        }
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(8vw, 6vh) scale(1.08); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-7vw, 9vh) scale(1.12); }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(5vw, -6vh) scale(1.06); }
        }
      `}</style>
    </div>
  );
}

function Dust() {
  const pts = Array.from({ length: 80 }, (_, i) => ({
    x: ((i * 137) % 100),
    y: ((i * 71) % 100),
    s: i % 7 === 0 ? 2 : i % 3 === 0 ? 1.4 : 0.9,
    o: i % 5 === 0 ? 0.55 : 0.20,
    delay: (i % 7) * 0.4,
  }));
  return (
    <div className="absolute inset-0">
      {pts.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.s, height: p.s,
            background: '#F5E8C9',
            opacity: p.o,
            boxShadow: p.s > 1.2 ? '0 0 6px rgba(248,239,213,0.65)' : 'none',
            animation: `aurora-twinkle 4s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes aurora-twinkle {
          0%, 100% { opacity: var(--o, 0.2); }
          50%      { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
