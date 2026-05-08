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
      {/* Two-layer base wash — keeps the warm sand halo visible at the
          top no matter the viewport aspect ratio. On portrait phones
          the radial does the heavy lifting; on landscape desktops the
          linear takes over so the top-of-screen warmth doesn't get
          stretched too thin. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70vmin 50vmin at 50% 0%, rgba(105,80,50,0.85) 0%, rgba(24,18,12,0.95) 70%, rgba(8,6,4,1) 100%),
            linear-gradient(180deg, rgba(60,42,26,0.55) 0%, rgba(8,6,4,1) 80%)
          `,
        }}
      />
      {/* Sunset glow on the lower horizon — scaled to viewport height so
          it reads as a meaningful band on tall desktop monitors instead
          of a thin 280px strip. */}
      <div
        className="absolute"
        style={{
          left: 0, right: 0, bottom: 0, height: '40vh', minHeight: 240,
          background:
            'linear-gradient(0deg, rgba(224,140,58,0.20) 0%, rgba(229,188,124,0.10) 30%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* Three slow-drifting orbs — sand, palm, date. Sized in vmax so
          they always read as large atmospheric blobs on either portrait
          or landscape, and spread across the screen so a wide desktop
          doesn't leave the right half empty. */}
      <div className="aurora-orb" style={{
        top: '-20%', left: '-10%', width: '85vmax', height: '85vmax',
        background: 'radial-gradient(circle, rgba(229,188,124,0.28) 0%, rgba(229,188,124,0) 60%)',
        animation: 'aurora-drift-1 22s ease-in-out infinite',
      }} />
      <div className="aurora-orb" style={{
        top: '10%', right: '-25%', width: '75vmax', height: '75vmax',
        background: 'radial-gradient(circle, rgba(122,168,71,0.22) 0%, rgba(122,168,71,0) 60%)',
        animation: 'aurora-drift-2 28s ease-in-out infinite',
      }} />
      <div className="aurora-orb" style={{
        bottom: '-30%', left: '20%', width: '90vmax', height: '90vmax',
        background: 'radial-gradient(circle, rgba(224,140,58,0.18) 0%, rgba(224,140,58,0) 60%)',
        animation: 'aurora-drift-3 32s ease-in-out infinite',
      }} />
      {/* Center warm glow — fills the middle of wide desktop viewports
          so the orbs along the corners aren't carrying the whole load. */}
      <div className="aurora-orb" style={{
        top: '30%', left: '30%', width: '60vmax', height: '60vmax',
        background: 'radial-gradient(circle, rgba(229,188,124,0.10) 0%, rgba(229,188,124,0) 65%)',
        animation: 'aurora-drift-1 36s ease-in-out infinite reverse',
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
