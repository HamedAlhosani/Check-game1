/**
 * Decorative SVG silhouettes for the redesigned light theme.
 *
 *  <EmiratiBackdrop /> — drop in once at the top of a page; renders a
 *  fixed, full-bleed, non-interactive layer with a soft sky/sand wash,
 *  the Burj skyline along the lower third, and palm trees flanking the
 *  bottom corners. All silhouettes are SVG so they scale cleanly on
 *  every screen and barely cost anything to render.
 *
 *  pointer-events: none keeps clicks/taps falling through to the real
 *  UI above it.
 */

interface BackdropProps {
  /** Fade the whole layer; defaults to a subtle 0.55 so foreground UI
   *  stays the focal point. Pass a higher value on splash / lobby
   *  screens where the imagery should be more present. */
  intensity?: number;
}

export function EmiratiBackdrop({ intensity = 0.55 }: BackdropProps) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Sky / sand wash */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #F5F8FB 0%, #F8F1DF 55%, #F1E6C5 100%)' }}
      />

      {/* Distant sun glow */}
      <div
        className="absolute"
        style={{
          width: 280, height: 280, top: '12%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(255,210,140,0.55) 0%, rgba(255,210,140,0) 70%)',
          filter: 'blur(2px)',
          opacity: intensity,
        }}
      />

      {/* Skyline + palms on a single SVG so they share one paint pass */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: intensity }}
      >
        <defs>
          <linearGradient id="bk-skyline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#9B8451" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#5C4720" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="bk-palm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1F4030" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#102018" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="bk-dune" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#E8C97A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#C29A4C" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Far dunes */}
        <path
          d="M0 720 Q 240 660 480 700 T 960 700 T 1440 690 L 1440 900 L 0 900 Z"
          fill="url(#bk-dune)"
        />

        {/* ── Skyline ── Burj Khalifa center, low-rises flanking, Burj Al
              Arab sail on the right. All approximate silhouettes. */}
        <g fill="url(#bk-skyline)">
          {/* Burj Al Arab — sail */}
          <path d="M 1240 720 C 1255 580 1305 470 1340 470 L 1345 720 Z" />
          <path d="M 1340 470 C 1352 470 1366 540 1370 720 L 1340 720 Z" opacity="0.6" />

          {/* Low-rise cluster left of center */}
          <rect x="380" y="640" width="38" height="80"  />
          <rect x="424" y="610" width="44" height="110" />
          <rect x="476" y="630" width="32" height="90"  />
          <rect x="514" y="600" width="50" height="120" />

          {/* Burj Khalifa — stepped, slender, needle */}
          <path d="
            M 700 720
            L 700 360
            L 712 360 L 712 300
            L 720 300 L 720 220
            L 728 220 L 728 110
            L 734 110 L 734 60
            L 738 60  L 738 20
            L 742 20  L 742 60
            L 746 60  L 746 110
            L 752 110 L 752 220
            L 760 220 L 760 300
            L 768 300 L 768 360
            L 780 360 L 780 720
            Z
          " />

          {/* Mid-rise cluster right of center */}
          <rect x="820" y="620" width="42" height="100" />
          <rect x="868" y="600" width="36" height="120" />
          <rect x="910" y="640" width="50" height="80"  />
          <rect x="966" y="615" width="38" height="105" />
          <rect x="1010" y="635" width="44" height="85" />
          <rect x="1060" y="610" width="32" height="110" />
          <rect x="1098" y="640" width="40" height="80"  />

          {/* Tower windows — tiny dots so silhouettes don't read flat */}
          <g fill="#FFFDF7" opacity="0.18">
            <rect x="734" y="100" width="2" height="3" />
            <rect x="744" y="100" width="2" height="3" />
            <rect x="734" y="180" width="2" height="3" />
            <rect x="744" y="180" width="2" height="3" />
            <rect x="734" y="260" width="2" height="3" />
            <rect x="744" y="260" width="2" height="3" />
            <rect x="430" y="640" width="3" height="3" />
            <rect x="438" y="660" width="3" height="3" />
            <rect x="876" y="630" width="3" height="3" />
            <rect x="884" y="660" width="3" height="3" />
            <rect x="1066" y="640" width="3" height="3" />
            <rect x="1074" y="670" width="3" height="3" />
          </g>
        </g>

        {/* ── Palm trees, two on the left and two on the right edge ── */}
        <g fill="url(#bk-palm)">
          <Palm x={70}   scale={1.05} />
          <Palm x={195}  scale={0.78} />
          <Palm x={1320} scale={0.95} />
          <Palm x={1395} scale={0.7}  />
        </g>
      </svg>
    </div>
  );
}

/**
 * One palm tree silhouette positioned at (x, baseline=900) with its
 * crown at roughly y=560 before scaling. Drawn with a slim curving
 * trunk and 8 fronds radiating from the top — recognisable but
 * deliberately stylised so it reads as a silhouette rather than a
 * detailed illustration.
 */
function Palm({ x, scale }: { x: number; scale: number }) {
  return (
    <g transform={`translate(${x} 900) scale(${scale})`}>
      {/* Trunk */}
      <path d="
        M -3 0
        C -6 -90 -2 -180 4 -270
        C 7 -340 0 -360 -2 -360
        L 6 -360
        C 8 -360 11 -340 8 -270
        C 2 -180 6 -90 3 0
        Z
      " />
      {/* Trunk segment ridges */}
      <g opacity="0.4" fill="#FFFDF7">
        <ellipse cx="2" cy="-60"  rx="3" ry="1.5" />
        <ellipse cx="2" cy="-120" rx="3" ry="1.5" />
        <ellipse cx="2" cy="-180" rx="3" ry="1.5" />
        <ellipse cx="2" cy="-240" rx="3" ry="1.5" />
      </g>
      {/* Fronds — 8 radiating, mirrored pairs */}
      <Frond rotate={-110} />
      <Frond rotate={-80}  />
      <Frond rotate={-50}  />
      <Frond rotate={-20}  />
      <Frond rotate={20}   />
      <Frond rotate={50}   />
      <Frond rotate={80}   />
      <Frond rotate={110}  />
    </g>
  );
}

function Frond({ rotate }: { rotate: number }) {
  return (
    <path
      transform={`rotate(${rotate})`}
      d="M 0 -360 Q 30 -385 70 -395 Q 50 -380 35 -365 Q 60 -370 85 -360 Q 55 -360 30 -355 Q 15 -358 0 -360 Z"
    />
  );
}
