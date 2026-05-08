/**
 * Night-Dubai backdrop for the redesigned theme.
 *
 *  <EmiratiBackdrop /> renders a fixed full-bleed, non-interactive
 *  layer:
 *    1. Deep navy sky → city-glow horizon gradient
 *    2. ~50 stars + a crescent moon
 *    3. Warm rust glow along the horizon (the city's reflected light
 *       on the lower atmosphere)
 *    4. Layered Dubai skyline lit at night — Burj Khalifa with a
 *       luminous window grid + spire light, Burj Al Arab sail with
 *       color-shifted facade lighting, mid-rise cluster with
 *       golden window dots, distant skyline twinkles
 *    5. Pair of date palms standing as warm-lit silhouettes
 *    6. Soft water reflection at the very bottom for that
 *       Marina / Creek vibe
 *
 *  pointer-events: none keeps every click/tap falling through to the
 *  real UI above it.
 */

interface BackdropProps {
  /** Multiplier on imagery layer opacity. 1 is the design default. */
  intensity?: number;
}

export function EmiratiBackdrop({ intensity = 1 }: BackdropProps) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0, background: '#070D24' }}
    >
      {/* Sky — deep navy at top, warming through navy → mauve → rust at
          the horizon as the city light bleeds into the atmosphere. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #070D24 0%, #0E1B3E 22%, #1F2D5C 55%, #38304E 75%, #4A2E3E 90%, #5C2E2E 100%)',
        }}
      />

      {/* Stars — a sparse field stays visible only above the city glow. */}
      <Stars intensity={intensity} />

      {/* Crescent moon, upper-right */}
      <CrescentMoon intensity={intensity} />

      {/* City-glow halo on the horizon (warm rust into navy). */}
      <div
        className="absolute"
        style={{
          left: 0, right: 0, height: 320, bottom: 0,
          background:
            'linear-gradient(0deg, rgba(255,170,90,0.25) 0%, rgba(255,170,90,0.10) 35%, rgba(120,60,90,0) 100%)',
          opacity: 0.95 * intensity,
        }}
      />

      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: intensity }}
      >
        <defs>
          {/* Tower silhouettes — much darker than day-time so window
              dots read as glowing. */}
          <linearGradient id="bk-tower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1A1F38" />
            <stop offset="100%" stopColor="#0A0E1F" />
          </linearGradient>
          <linearGradient id="bk-tower-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#2A2F4D" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#13182F" stopOpacity="0.95" />
          </linearGradient>

          {/* Burj Al Arab sail at night — washed in cyan/magenta light
              the way it's actually lit on big nights. */}
          <linearGradient id="bk-sail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#9CD8FF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#D67FF0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#E2B377" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="bk-sail-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#3A4A78" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1F2A50" stopOpacity="0.95" />
          </linearGradient>

          {/* Palm trunk — pure shadow against the lit sky. */}
          <linearGradient id="bk-trunk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1A1408" />
            <stop offset="100%" stopColor="#080604" />
          </linearGradient>
          <linearGradient id="bk-frond" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1F2818" />
            <stop offset="100%" stopColor="#080A04" />
          </linearGradient>

          {/* Window light — warm streetlight color used everywhere. */}
          <radialGradient id="bk-window-glow" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="#FFD68C" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFA94A" stopOpacity="0" />
          </radialGradient>

          {/* Reflection — vertical mirror for the lower fifth. */}
          <linearGradient id="bk-reflect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5C2E2E" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0A0E1F" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Distant skyline twinkles (far horizon) ── */}
        <g fill="#FFD68C" opacity="0.55">
          {Array.from({ length: 50 }).map((_, i) => (
            <rect key={i}
              x={(i * 37) % 1440}
              y={695 + ((i * 13) % 18)}
              width={1.5} height={2.5} />
          ))}
        </g>

        {/* ── Far skyline cluster left of center ── */}
        <g fill="url(#bk-tower-far)">
          <rect x="320" y="660" width="42" height="60" />
          <rect x="368" y="640" width="36" height="80" />
          <rect x="410" y="660" width="46" height="60" />
          <rect x="462" y="630" width="40" height="90" />
          <rect x="510" y="650" width="36" height="70" />
        </g>
        <Windows xs={[378, 386, 472, 480, 520, 528]} ys={[660, 675, 690]} />

        {/* ── Burj Khalifa — dark silhouette, glowing window grid, lit
              spire ── */}
        <BurjKhalifa />

        {/* ── Mid-rises right of center ── */}
        <g fill="url(#bk-tower)">
          <rect x="830" y="618" width="44" height="102" />
          <rect x="880" y="600" width="36" height="120" />
          <rect x="922" y="640" width="50" height="80"  />
          <rect x="980" y="615" width="38" height="105" />
          <rect x="1024" y="635" width="44" height="85" />
          <rect x="1074" y="610" width="32" height="110" />
          <rect x="1112" y="640" width="40" height="80"  />
        </g>
        {/* Mid-rise lit-window grid — denser at base, sparse at top. */}
        <g fill="#FFD68C">
          {[836, 844, 852].map(x =>
            [625, 640, 655, 670, 685].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
          {[886, 894, 902].map(x =>
            [610, 625, 640, 655, 670, 685].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
          {[930, 940, 950, 960].map(x =>
            [650, 665, 680, 695].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
          {[986, 996, 1004, 1012].map(x =>
            [625, 640, 655, 670, 685].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
          {[1030, 1040, 1050].map(x =>
            [645, 660, 675, 690].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
          {[1080, 1088, 1096].map(x =>
            [620, 635, 650, 665, 680, 695].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
          {[1118, 1128, 1138].map(x =>
            [650, 665, 680, 695].map(y => (
              <rect key={`${x}-${y}`} x={x} y={y} width={3} height={4} opacity={0.85} />
            ))
          )}
        </g>

        {/* ── Burj Al Arab — lit sail ── */}
        <BurjAlArab />

        {/* ── Date palms — silhouetted against the lit horizon ── */}
        <DatePalm x={120}  scale={1.05} />
        <DatePalm x={235}  scale={0.78} flipped />
        <DatePalm x={1310} scale={0.95} flipped />
        <DatePalm x={1385} scale={0.7}  />

        {/* ── Water reflection band at the very bottom ── */}
        <rect x="0" y="780" width="1440" height="120" fill="url(#bk-reflect)" />
        {/* Streaks of reflected lights on the water. */}
        <g fill="#FFD68C" opacity="0.45">
          {Array.from({ length: 40 }).map((_, i) => {
            const w = 4 + ((i * 11) % 16);
            return (
              <rect key={i}
                x={(i * 37) % 1440}
                y={790 + ((i * 7) % 80)}
                width={w} height={1} />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ─── Stars ─────────────────────────────────────────────────────────────────
function Stars({ intensity }: { intensity: number }) {
  // Pseudo-random but deterministic positions. Density tapers near the
  // horizon so they don't fight the city glow.
  const stars = Array.from({ length: 60 }, (_, i) => {
    const x = ((i * 137) % 1440);
    const y = ((i * 71) % 480) + 20; // never below y=500
    const r = (i % 7 === 0) ? 1.6 : (i % 3 === 0 ? 1.2 : 0.8);
    const o = (i % 5 === 0) ? 0.95 : 0.55;
    return { x, y, r, o };
  });
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice"
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.85 * intensity }}>
      <g fill="#FFFAF0">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
        {/* A few brighter stars with a tiny cross-glow. */}
        {[
          { x: 220, y: 110 }, { x: 540, y: 80 },
          { x: 950, y: 130 }, { x: 1280, y: 60 },
        ].map((s, i) => (
          <g key={`bright-${i}`} fill="#FFFAF0">
            <circle cx={s.x} cy={s.y} r={1.8} />
            <line x1={s.x - 5} y1={s.y} x2={s.x + 5} y2={s.y} stroke="#FFFAF0" strokeWidth={0.4} opacity={0.7} />
            <line x1={s.x} y1={s.y - 5} x2={s.x} y2={s.y + 5} stroke="#FFFAF0" strokeWidth={0.4} opacity={0.7} />
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Crescent moon ─────────────────────────────────────────────────────────
function CrescentMoon({ intensity }: { intensity: number }) {
  return (
    <div
      className="absolute"
      style={{
        top: 60, right: 130, width: 90, height: 90,
        opacity: 0.95 * intensity,
      }}
    >
      <svg viewBox="0 0 100 100" width={90} height={90}>
        <defs>
          <radialGradient id="moon-glow" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="#FFFAF0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFAF0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Soft halo */}
        <circle cx="50" cy="50" r="48" fill="url(#moon-glow)" />
        {/* Crescent shape — full disc minus an offset disc. */}
        <mask id="crescent-mask">
          <rect width="100" height="100" fill="black" />
          <circle cx="48" cy="48" r="28" fill="white" />
          <circle cx="56" cy="44" r="26" fill="black" />
        </mask>
        <rect width="100" height="100" fill="#FFFAF0" mask="url(#crescent-mask)" opacity="0.95" />
      </svg>
    </div>
  );
}

// ─── Burj Khalifa — night ──────────────────────────────────────────────────
function BurjKhalifa() {
  // Window grid: lots of small lit dots stepping up the body. Sparse
  // near the spire, dense near the base.
  const winRows: { y: number; cols: number[] }[] = [];
  // Body section (y 360→720): every 14px, 4 cols
  for (let y = 374; y < 720; y += 14) {
    winRows.push({ y, cols: [704, 712, 720, 728, 740, 748, 756, 764, 772, 780].slice(0, 10) });
  }
  // Mid section (300→360): tighter cols
  for (let y = 308; y < 360; y += 14) {
    winRows.push({ y, cols: [716, 724, 740, 748, 756, 764, 772] });
  }
  // Upper section (220→300)
  for (let y = 228; y < 300; y += 14) {
    winRows.push({ y, cols: [724, 732, 740, 748, 756, 764] });
  }
  // Tip section (110→220)
  for (let y = 116; y < 220; y += 16) {
    winRows.push({ y, cols: [732, 740, 748, 756] });
  }

  return (
    <g>
      {/* Body silhouette */}
      <path
        fill="url(#bk-tower)"
        d="
          M 700 720
          L 700 360
          L 712 360 L 712 300
          L 720 300 L 720 220
          L 728 220 L 728 110
          L 734 110 L 734 60
          L 738 60  L 738 14
          L 742 14  L 742 60
          L 746 60  L 746 110
          L 752 110 L 752 220
          L 760 220 L 760 300
          L 768 300 L 768 360
          L 780 360 L 780 720
          Z
        "
      />
      {/* Setback shadow lines — keep silhouette dimensional. */}
      <g stroke="#34406B" strokeWidth="0.6" opacity="0.5">
        <line x1="700" y1="360" x2="780" y2="360" />
        <line x1="712" y1="300" x2="768" y2="300" />
        <line x1="720" y1="220" x2="760" y2="220" />
        <line x1="728" y1="110" x2="752" y2="110" />
        <line x1="734" y1="60"  x2="746" y2="60" />
      </g>
      {/* Lit window grid */}
      <g fill="#FFD68C">
        {winRows.flatMap((row, ri) =>
          row.cols.map((cx, ci) => (
            <rect key={`${ri}-${ci}`}
              x={cx} y={row.y} width={2.2} height={3}
              opacity={0.65 + ((ri + ci) % 5) * 0.06} />
          ))
        )}
      </g>
      {/* Spire light — glowing tip */}
      <circle cx="740" cy="-2" r="3.5" fill="#FFD68C" />
      <circle cx="740" cy="-2" r="6" fill="#FFD68C" opacity="0.4" />
      <line x1="740" y1="14" x2="740" y2="-12" stroke="#0A0E1F" strokeWidth="1.4" opacity="0.9" />
    </g>
  );
}

// ─── Burj Al Arab — lit sail ───────────────────────────────────────────────
function BurjAlArab() {
  return (
    <g>
      {/* Shadowed back of sail */}
      <path
        fill="url(#bk-sail-back)"
        d="M 1340 720
           C 1335 580 1310 470 1268 470
           C 1262 530 1264 600 1276 720 Z"
      />
      {/* Front sail — lit cyan/magenta/gold for the night-show colors. */}
      <path
        fill="url(#bk-sail)"
        d="M 1268 470
           C 1290 470 1330 540 1340 720
           L 1276 720
           C 1264 600 1262 530 1268 470 Z"
        opacity={0.9}
      />
      {/* Spine outline */}
      <path
        d="M 1268 470 C 1290 470 1330 540 1340 720"
        stroke="#FFD68C" strokeWidth="1.2" fill="none" opacity="0.75"
      />
      {/* Helipad */}
      <circle cx="1278" cy="466" r="6" fill="#FFFAF0" opacity="0.95" />
      <circle cx="1278" cy="466" r="6" stroke="#A87A4C" strokeWidth="0.6" fill="none" opacity="0.9" />
      {/* Wing-window glow band */}
      <g fill="#FFD68C" opacity="0.95">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={1280 - i * 0.7} y={490 + i * 18} width="2.5" height="3.5" />
        ))}
      </g>
    </g>
  );
}

// ─── Tiny generic window-dot helper ────────────────────────────────────────
function Windows({ xs, ys }: { xs: number[]; ys: number[] }) {
  return (
    <g fill="#FFD68C" opacity="0.9">
      {xs.flatMap(x => ys.map(y => (
        <rect key={`${x}-${y}`} x={x} y={y} width={2} height={3} />
      )))}
    </g>
  );
}

// ─── Date palm — night silhouette ──────────────────────────────────────────
function DatePalm({
  x, scale, flipped = false,
}: { x: number; scale: number; flipped?: boolean }) {
  const sx = flipped ? -1 : 1;
  return (
    <g transform={`translate(${x} 900) scale(${sx * scale} ${scale})`}>
      <ellipse cx="0" cy="-2" rx="32" ry="6" fill="#000" opacity="0.4" />

      {/* Trunk */}
      <path
        fill="url(#bk-trunk)"
        d="
          M -7 0
          C -10 -90 -4 -180 4 -270
          C 9 -340 0 -360 -2 -360
          L 12 -360
          C 14 -360 17 -340 12 -270
          C 4 -180 10 -90 7 0
          Z
        "
      />
      {/* Trunk bands */}
      <g stroke="#0A0604" strokeWidth="1.5" opacity="0.85">
        {Array.from({ length: 14 }).map((_, i) => {
          const y = -20 - i * 24;
          const t = Math.min(1, (-y) / 360);
          const w = 8 - t * 4;
          return <line key={i} x1={-w} y1={y} x2={w} y2={y} />;
        })}
      </g>
      {/* Warm under-light edge — streetlight kissing the trunk. */}
      <path
        fill="#FFA94A" opacity="0.18"
        d="
          M 7 0
          C 9 -90 13 -180 13 -270
          L 12 -360
          L 14 -360
          C 14 -340 17 -270 9 -180
          C 12 -90 10 -45 7 0 Z
        "
      />

      {/* Crown — 24 fronds */}
      <g>
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = -180 + (i / 23) * 340;
          const len = 110 + ((i * 7) % 14);
          const back = i % 3 === 0;
          return <Frond key={i} rotate={angle} len={len} behind={back} />;
        })}
      </g>
      {/* Crown core */}
      <circle cx="0" cy="-360" r="9" fill="#000" opacity="0.95" />
    </g>
  );
}

function Frond({
  rotate, len, behind,
}: { rotate: number; len: number; behind: boolean }) {
  const leaflets = 14;
  const leafElems: JSX.Element[] = [];
  for (let i = 0; i < leaflets; i++) {
    const t = i / (leaflets - 1);
    const along = t * len;
    const size = 14 * (1 - 0.6 * t);
    const droop = 6 * t * t;
    leafElems.push(
      <ellipse
        key={`L-${i}`}
        cx={along}
        cy={-droop - size * 0.4}
        rx={size * 0.55}
        ry={size * 0.18}
        transform={`rotate(${-25 + t * -10} ${along} ${-droop - size * 0.4})`}
      />,
      <ellipse
        key={`R-${i}`}
        cx={along}
        cy={-droop + size * 0.4}
        rx={size * 0.55}
        ry={size * 0.18}
        transform={`rotate(${25 - t * -10} ${along} ${-droop + size * 0.4})`}
      />
    );
  }
  return (
    <g
      transform={`translate(0 -360) rotate(${rotate})`}
      fill="url(#bk-frond)"
      opacity={behind ? 0.55 : 0.9}
    >
      <path
        d={`M 0 0 Q ${len * 0.5} ${-len * 0.06} ${len} ${-len * 0.04}`}
        stroke="#080A04" strokeWidth={1.5} fill="none"
      />
      {leafElems}
    </g>
  );
}
