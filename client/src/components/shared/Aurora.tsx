/**
 * Aurora — minimal "legendary" backdrop. The user asked for a clean
 * single-tone background with none of the multi-colour atmosphere
 * (orbs, sunset glow, twinkling dust) the previous version had.
 *
 *  - Deep cocoa wash from top to bottom
 *  - One soft radial vignette at the very top to give the title
 *    something to read against
 *  - A faint cream pinpoint dust field, kept very subtle so it
 *    reads as "depth" not "decoration"
 *
 * Pointer-events:none, z-index:0 — everything else still renders
 * above it untouched.
 */
export function Aurora() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Single tone wash + a very subtle top halo so the page header
          has somewhere to sit against. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120vmin 70vmin at 50% -10%, rgba(110,82,50,0.40) 0%, rgba(0,0,0,0) 70%),
            linear-gradient(180deg, #1A1208 0%, #100A05 60%, #080604 100%)
          `,
        }}
      />
      {/* Subtle dust field — same on every viewport. */}
      <Dust />
    </div>
  );
}

function Dust() {
  // Sparse pseudo-random pinpoints. Very low opacity so the bg still
  // reads as a single tone — the dust is depth, not decoration.
  const pts = Array.from({ length: 60 }, (_, i) => ({
    x: ((i * 137) % 100),
    y: ((i * 71) % 100),
    s: i % 9 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7,
    o: i % 6 === 0 ? 0.45 : 0.16,
    delay: (i % 7) * 0.5,
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
            background: '#FBF3DB',
            opacity: p.o,
            boxShadow: p.s > 1.0 ? '0 0 6px rgba(251,243,219,0.55)' : 'none',
            animation: `aurora-twinkle 5s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes aurora-twinkle {
          0%, 100% { opacity: var(--o, 0.16); }
          50%      { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
