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
      {/* Base wash — bayt al-sha'ar deep cocoa with a warm sand halo
          at the top of the screen and a subtle date-orange glow on
          the lower horizon (sunset on the dunes). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(105,80,50,0.85) 0%, rgba(24,18,12,0.95) 55%, rgba(8,6,4,1) 100%)',
        }}
      />
      {/* Sunset glow on the lower horizon */}
      <div
        className="absolute"
        style={{
          left: 0, right: 0, bottom: 0, height: 280,
          background:
            'linear-gradient(0deg, rgba(224,140,58,0.18) 0%, rgba(229,188,124,0.08) 35%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* Three slow-drifting orbs — sand, palm, date. */}
      <div className="aurora-orb" style={{
        top: '-15%', left: '-10%', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(229,188,124,0.25) 0%, rgba(229,188,124,0) 65%)',
        animation: 'aurora-drift-1 22s ease-in-out infinite',
      }} />
      <div className="aurora-orb" style={{
        top: '20%', right: '-15%', width: '55vw', height: '55vw',
        background: 'radial-gradient(circle, rgba(122,168,71,0.20) 0%, rgba(122,168,71,0) 65%)',
        animation: 'aurora-drift-2 28s ease-in-out infinite',
      }} />
      <div className="aurora-orb" style={{
        bottom: '-20%', left: '10%', width: '65vw', height: '65vw',
        background: 'radial-gradient(circle, rgba(224,140,58,0.16) 0%, rgba(224,140,58,0) 65%)',
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
            background: '#FAEDC4',
            opacity: p.o,
            boxShadow: p.s > 1.2 ? '0 0 6px rgba(251,243,219,0.65)' : 'none',
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
