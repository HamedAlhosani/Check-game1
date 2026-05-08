/**
 * Decorative SVG backdrop for the redesigned light theme.
 *
 *  <EmiratiBackdrop /> — drop in once at the top of a page; renders a
 *  fixed, full-bleed, non-interactive layer:
 *    1. soft sky → warm sand gradient wash
 *    2. a hazy sun
 *    3. layered Dubai-style skyline (Burj Khalifa, Burj Al Arab,
 *       low-rise cluster) with proper gradient lighting
 *    4. a pair of detailed date-palm trees flanking the corners,
 *       each with a banded trunk, ~24 feathered fronds and date
 *       clusters
 *
 *  The intent is "the page itself is white; the backdrop is the view
 *  out the window" — the imagery sits low and soft so white surfaces
 *  in the foreground always remain the focal point.
 *
 *  pointer-events: none keeps every click/tap falling through to the
 *  real UI above it.
 */

interface BackdropProps {
  /** Multiplier on the imagery layer's opacity. 1 is the design
   *  default; pass <1 on dense screens, >1 on splash/lobby screens. */
  intensity?: number;
}

export function EmiratiBackdrop({ intensity = 1 }: BackdropProps) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Sky / sand wash — warm cream that turns to richer sand near the
          horizon. Kept gentle so foreground cream surfaces stay legible
          and nothing in the layout fights for the user's eye. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #F8F2E0 0%, #F4ECD3 55%, #E8D7A8 90%, #D8C188 100%)',
        }}
      />

      {/* Soft hazy sun on the upper-third left. Keeps the warm tone the
          gradient establishes without ever fighting foreground UI. */}
      <div
        className="absolute"
        style={{
          width: 360, height: 360, top: '8%', left: '38%',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(circle, rgba(255,225,170,0.65) 0%, rgba(255,225,170,0.25) 35%, rgba(255,225,170,0) 70%)',
          filter: 'blur(4px)',
          opacity: 0.85 * intensity,
        }}
      />

      {/* A few thin streaky clouds drifting across the sky. */}
      <Clouds intensity={intensity} />

      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: intensity }}
      >
        <defs>
          {/* Tower silhouettes are warm sand fading slightly cooler at
              top so distance reads. Highlights are added separately. */}
          <linearGradient id="bk-tower-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#C2A675" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7C5E33" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="bk-tower-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#A98655" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#5A3F1E" stopOpacity="0.95" />
          </linearGradient>
          {/* The Burj sail catches the warm sun, so it's lighter. */}
          <linearGradient id="bk-sail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#FFFAF0" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E8C97A" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="bk-sail-back" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#C29A5E" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8E6A2E" stopOpacity="0.95" />
          </linearGradient>
          {/* Palm trunk — deep brown banded gradient. */}
          <linearGradient id="bk-trunk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5A3D20" />
            <stop offset="100%" stopColor="#2E1D0E" />
          </linearGradient>
          {/* Frond — two-tone green so the leaflets read in light/shadow. */}
          <linearGradient id="bk-frond" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#4F7A38" />
            <stop offset="100%" stopColor="#1F3D18" />
          </linearGradient>
          {/* Date clusters — warm rust. */}
          <radialGradient id="bk-date" cx="0.4" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#C75A2A" />
            <stop offset="100%" stopColor="#5A2810" />
          </radialGradient>
          {/* Sand foreground — slightly warmer than the gradient end. */}
          <linearGradient id="bk-dune" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#F0DAA5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C89E5A" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* ── Distant dunes / horizon ── */}
        <path
          d="M0 720 Q 240 670 480 700 T 960 700 T 1440 695 L 1440 900 L 0 900 Z"
          fill="url(#bk-dune)"
        />

        {/* ── Far skyline cluster left of center ── */}
        <g fill="url(#bk-tower-far)">
          <rect x="320" y="660" width="42" height="60" />
          <rect x="368" y="640" width="36" height="80" />
          <rect x="410" y="660" width="46" height="60" />
          <rect x="462" y="630" width="40" height="90" />
        </g>
        {/* Far-cluster window dots */}
        <g fill="#FFFDF7" opacity="0.25">
          <rect x="378" y="660" width="2" height="3" />
          <rect x="386" y="660" width="2" height="3" />
          <rect x="378" y="675" width="2" height="3" />
          <rect x="386" y="675" width="2" height="3" />
          <rect x="472" y="660" width="2" height="3" />
          <rect x="480" y="660" width="2" height="3" />
          <rect x="472" y="680" width="2" height="3" />
          <rect x="480" y="680" width="2" height="3" />
        </g>

        {/* ── Burj Khalifa — center, layered with gradient + highlight ── */}
        <BurjKhalifa />

        {/* ── Mid-rises right of center ── */}
        <g fill="url(#bk-tower-near)">
          <rect x="830" y="618" width="44" height="102" />
          <rect x="880" y="600" width="36" height="120" />
          <rect x="922" y="640" width="50" height="80"  />
          <rect x="980" y="615" width="38" height="105" />
          <rect x="1024" y="635" width="44" height="85" />
          <rect x="1074" y="610" width="32" height="110" />
          <rect x="1112" y="640" width="40" height="80"  />
        </g>
        {/* Mid-rise lit windows */}
        <g fill="#FFE9B0" opacity="0.55">
          <rect x="836"  y="640" width="3" height="3" />
          <rect x="844"  y="640" width="3" height="3" />
          <rect x="836"  y="660" width="3" height="3" />
          <rect x="844"  y="668" width="3" height="3" />
          <rect x="886"  y="630" width="3" height="3" />
          <rect x="894"  y="630" width="3" height="3" />
          <rect x="886"  y="660" width="3" height="3" />
          <rect x="930"  y="660" width="3" height="3" />
          <rect x="950"  y="668" width="3" height="3" />
          <rect x="986"  y="635" width="3" height="3" />
          <rect x="1000" y="650" width="3" height="3" />
          <rect x="1080" y="640" width="3" height="3" />
          <rect x="1086" y="660" width="3" height="3" />
          <rect x="1118" y="660" width="3" height="3" />
        </g>

        {/* ── Burj Al Arab sail ── */}
        <BurjAlArab />

        {/* ── Date palms — flanking corners, varied scale for depth ── */}
        <DatePalm x={120}  scale={1.05} />
        <DatePalm x={235}  scale={0.78} flipped />
        <DatePalm x={1310} scale={0.95} flipped />
        <DatePalm x={1385} scale={0.7}  />
      </svg>
    </div>
  );
}

// ─── Clouds ────────────────────────────────────────────────────────────────
function Clouds({ intensity }: { intensity: number }) {
  return (
    <svg
      viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice"
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.65 * intensity }}
    >
      <g fill="#FFFFFF">
        <path d="M 60 130
          q 18 -22 50 -18
          q 8 -18 32 -18
          q 26 0 36 20
          q 38 0 38 18
          q 0 16 -34 16
          l -120 0
          q -28 0 -28 -16 z"
          opacity="0.85" />
        <path d="M 540 90
          q 22 -28 60 -22
          q 12 -20 38 -20
          q 30 0 42 22
          q 44 0 44 22
          q 0 18 -40 18
          l -140 0
          q -30 0 -30 -18 q 0 -10 26 -22 z"
          opacity="0.7" />
        <path d="M 1080 160
          q 20 -22 52 -18
          q 10 -16 30 -16
          q 24 0 34 18
          q 36 0 36 16
          q 0 14 -32 14
          l -116 0
          q -26 0 -26 -14 z"
          opacity="0.75" />
      </g>
    </svg>
  );
}

// ─── Burj Khalifa ──────────────────────────────────────────────────────────
function BurjKhalifa() {
  // Slim, stepped, with a sunlit east-face highlight and an antenna.
  return (
    <g>
      {/* Body */}
      <path
        fill="url(#bk-tower-near)"
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
      {/* Sunlit east-face highlight (right side of the tower body) */}
      <path
        fill="#FFE5B0" opacity="0.32"
        d="
          M 770 720
          L 770 360
          L 768 360 L 768 300
          L 760 300 L 760 220
          L 752 220 L 752 110
          L 746 110 L 746 60
          L 742 60  L 742 14
          L 740 14
          L 740 60
          L 744 60  L 744 110
          L 750 110 L 750 220
          L 758 220 L 758 300
          L 766 300 L 766 360
          L 778 360 L 778 720
          Z
        "
      />
      {/* Setback shadow lines so the silhouette doesn't read flat */}
      <g stroke="#3E2A12" strokeWidth="0.6" opacity="0.55">
        <line x1="700" y1="360" x2="780" y2="360" />
        <line x1="712" y1="300" x2="768" y2="300" />
        <line x1="720" y1="220" x2="760" y2="220" />
        <line x1="728" y1="110" x2="752" y2="110" />
        <line x1="734" y1="60"  x2="746" y2="60" />
      </g>
      {/* Antenna */}
      <line x1="740" y1="14" x2="740" y2="-12" stroke="#3E2A12" strokeWidth="1" opacity="0.85" />
      {/* Window grid — sparse warm dots so it reads as a real building */}
      <g fill="#FFE9B0" opacity="0.6">
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={i}>
            <rect x="734" y={120 + i * 18} width="2" height="3" />
            <rect x="744" y={120 + i * 18} width="2" height="3" />
          </g>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i}>
            <rect x="724" y={400 + i * 28} width="2" height="3" />
            <rect x="754" y={400 + i * 28} width="2" height="3" />
          </g>
        ))}
      </g>
    </g>
  );
}

// ─── Burj Al Arab ──────────────────────────────────────────────────────────
function BurjAlArab() {
  return (
    <g>
      {/* Back of sail (in shadow) */}
      <path
        fill="url(#bk-sail-back)"
        d="M 1340 720
           C 1335 580 1310 470 1268 470
           C 1262 530 1264 600 1276 720 Z"
      />
      {/* Front sail (sunlit) */}
      <path
        fill="url(#bk-sail)"
        d="M 1268 470
           C 1290 470 1330 540 1340 720
           L 1276 720
           C 1264 600 1262 530 1268 470 Z"
      />
      {/* Curved front edge — emphasizes the sail */}
      <path
        d="M 1268 470 C 1290 470 1330 540 1340 720"
        stroke="#8E6A2E" strokeWidth="1.2" fill="none" opacity="0.8"
      />
      {/* Helipad disc at the tip */}
      <circle cx="1278" cy="466" r="6" fill="#FFFFFF" opacity="0.85" />
      <circle cx="1278" cy="466" r="6" stroke="#8E6A2E" strokeWidth="0.6" fill="none" opacity="0.7" />
      {/* Wing windows along the spine */}
      <g fill="#FFE9B0" opacity="0.7">
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={1280 - i * 0.7} y={490 + i * 24} width="2.5" height="3" />
        ))}
      </g>
    </g>
  );
}

// ─── Date palm — detailed silhouette ───────────────────────────────────────
/**
 * One date palm positioned at (x, baseline=900). 24 fronds laid out
 * radially from the crown, each frond a tapered "feather" shape that
 * reads as a real palm leaf at SVG-silhouette resolution. Banded trunk
 * + two date clusters under the crown.
 */
function DatePalm({
  x, scale, flipped = false,
}: { x: number; scale: number; flipped?: boolean }) {
  const sx = flipped ? -1 : 1;
  return (
    <g transform={`translate(${x} 900) scale(${sx * scale} ${scale})`}>
      {/* Trunk shadow on the ground */}
      <ellipse cx="0" cy="-2" rx="32" ry="6" fill="#3E2A12" opacity="0.25" />

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
      {/* Trunk bands — short hashes climbing the trunk */}
      <g stroke="#3E2A12" strokeWidth="1.5" opacity="0.6">
        {Array.from({ length: 14 }).map((_, i) => {
          const y = -20 - i * 24;
          // Trunk tapers as it goes up; widen left/right based on y.
          const t = Math.min(1, (-y) / 360);
          const w = 8 - t * 4;
          return <line key={i} x1={-w} y1={y} x2={w} y2={y} />;
        })}
      </g>
      {/* Trunk highlight on the right side */}
      <path
        fill="#825B30" opacity="0.5"
        d="
          M 5 0
          C 7 -90 11 -180 12 -270
          C 13 -340 14 -360 14 -360
          L 12 -360
          C 14 -360 17 -340 12 -270
          C 4 -180 10 -90 7 0
          Z
        "
      />

      {/* Date clusters — two reddish bunches under the crown */}
      <DateCluster cx={-12} cy={-345} />
      <DateCluster cx={14}  cy={-345} />

      {/* Crown — 24 fronds radiating, all anchored at (0, -360) */}
      <g>
        {Array.from({ length: 24 }).map((_, i) => {
          // Distribute across a ~340° arc, leaving a small gap at the
          // bottom so fronds don't fan into the trunk.
          const angle = -180 + (i / 23) * 340;
          // Slight length variation so the crown reads natural.
          const len = 110 + ((i * 7) % 14);
          const back = i % 3 === 0; // every third frond drops behind for depth
          return (
            <Frond
              key={i}
              rotate={angle}
              len={len}
              behind={back}
            />
          );
        })}
      </g>

      {/* Crown core — small dark blob hides the frond bases */}
      <circle cx="0" cy="-360" r="9" fill="#1A1208" opacity="0.85" />
      <circle cx="0" cy="-360" r="9" stroke="#3E2A12" strokeWidth="0.5" fill="none" />
    </g>
  );
}

function DateCluster({ cx, cy }: { cx: number; cy: number }) {
  // Two short rows of date "berries" hanging from the crown base.
  const dots: { dx: number; dy: number }[] = [];
  for (let i = 0; i < 8; i++) {
    dots.push({ dx: (i % 4) * 2.6 - 4, dy: Math.floor(i / 4) * 2.6 });
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.dx} cy={d.dy} r={1.6} fill="url(#bk-date)" />
      ))}
    </g>
  );
}

/**
 * One palm frond. Drawn as a tapered "feather" — central rib, ~14
 * leaflet pairs spread along it. Rotated around the crown anchor at
 * (0, -360) and translated so its base sits there.
 */
function Frond({
  rotate, len, behind,
}: { rotate: number; len: number; behind: boolean }) {
  // 14 leaflets per side, sized larger near the base, tapering to the
  // tip. Slight curve in the rib so it doesn't look stiff.
  const leaflets = 14;
  const leafElems: JSX.Element[] = [];
  for (let i = 0; i < leaflets; i++) {
    const t = i / (leaflets - 1);
    const along = t * len;
    const size = 14 * (1 - 0.6 * t);
    // The rib droops slightly — quadratic curve approximated as offset.
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
      opacity={behind ? 0.65 : 1}
    >
      {/* Mid-rib */}
      <path
        d={`M 0 0 Q ${len * 0.5} ${-len * 0.06} ${len} ${-len * 0.04}`}
        stroke="#1F3D18" strokeWidth={1.5} fill="none"
      />
      {leafElems}
    </g>
  );
}
