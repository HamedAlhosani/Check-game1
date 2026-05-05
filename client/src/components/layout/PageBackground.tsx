export function PageBackground() {
  const stars = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: (i * 137.5) % 100,
    y: (i * 97.3) % 60,
    r: i % 5 === 0 ? 1.8 : i % 3 === 0 ? 1.2 : 0.7,
    delay: (i * 0.41) % 4,
    dur: 2.5 + (i % 3) * 1.2,
  }));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0E0905 0%, #14100A 22%, #1A1408 48%, #241608 72%, #2A1408 88%, #1C0E04 100%)',
    }}>

      {/* Stars */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {stars.map(s => (
          <circle
            key={s.id}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#F5E6C8"
            opacity="0.7"
            style={{ animation: `twinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }}
          />
        ))}
        {[{x:15,y:8},{x:72,y:5},{x:88,y:18},{x:33,y:12},{x:55,y:3},{x:8,y:22},{x:95,y:9}].map((s,i) => (
          <g key={`bright-${i}`} style={{ animation: `twinkle ${3+i*0.5}s ${i*0.7}s ease-in-out infinite` }}>
            <circle cx={`${s.x}%`} cy={`${s.y}%`} r="2.2" fill="#E8C97A" opacity="0.9"/>
            <circle cx={`${s.x}%`} cy={`${s.y}%`} r="4" fill="#E8903A" opacity="0.18"/>
          </g>
        ))}
      </svg>

      {/* Crescent moon with warm halo */}
      <svg className="absolute top-8 right-16 w-20 h-20 opacity-95" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#FFE89A" stopOpacity="0.4"/>
            <stop offset="60%" stopColor="#E8903A" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#moonGlow)"/>
        <path d="M48 14 C32 14 20 26 20 42 C20 58 32 70 48 70 C36 64 28 54 28 42 C28 30 36 20 48 14Z" fill="#FFEAA0" opacity="0.92"/>
      </svg>

      {/* Subtle arabesque pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="arabesque" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" fill="none" stroke="#E8C97A" strokeWidth="1.2"/>
            <circle cx="50" cy="50" r="20" fill="none" stroke="#E8C97A" strokeWidth="0.8"/>
            <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="none" stroke="#E8C97A" strokeWidth="0.6"/>
            <circle cx="50" cy="50" r="4" fill="none" stroke="#E8C97A" strokeWidth="0.5"/>
            <path d="M50 10 L50 30 M90 50 L70 50 M50 90 L50 70 M10 50 L30 50" stroke="#E8C97A" strokeWidth="0.4" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arabesque)"/>
      </svg>

      {/* Sunset horizon glow — desert orange */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: '45%',
        background: 'linear-gradient(to top, rgba(232,144,58,0.20) 0%, rgba(194,94,26,0.10) 25%, rgba(122,48,8,0.05) 55%, transparent 100%)',
      }}/>

      {/* Burj Khalifa silhouette — far distance, center-back */}
      <svg className="absolute" style={{ bottom: '14%', left: '50%', transform: 'translateX(-50%)', width: 90, height: 360, opacity: 0.32 }} viewBox="0 0 90 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="burjGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8C97A" stopOpacity="0.55"/>
            <stop offset="50%" stopColor="#8B6914" stopOpacity="0.65"/>
            <stop offset="100%" stopColor="#1A1408" stopOpacity="0.95"/>
          </linearGradient>
        </defs>
        {/* Antenna spire */}
        <line x1="45" y1="0" x2="45" y2="40" stroke="#E8C97A" strokeWidth="0.8" opacity="0.6"/>
        <circle cx="45" cy="0" r="1.2" fill="#FFE89A" opacity="0.7"/>
        {/* Tower body — tapered */}
        <path d="M44 40 L46 40 L47 80 L43 80 Z" fill="url(#burjGrad)"/>
        <path d="M43 80 L47 80 L48.5 130 L41.5 130 Z" fill="url(#burjGrad)"/>
        <path d="M41.5 130 L48.5 130 L50 180 L40 180 Z" fill="url(#burjGrad)"/>
        <path d="M40 180 L50 180 L52 230 L38 230 Z" fill="url(#burjGrad)"/>
        <path d="M38 230 L52 230 L55 280 L35 280 Z" fill="url(#burjGrad)"/>
        <path d="M35 280 L55 280 L58 330 L32 330 Z" fill="url(#burjGrad)"/>
        <path d="M32 330 L58 330 L62 360 L28 360 Z" fill="url(#burjGrad)"/>
        {/* Window glow rows */}
        {[110, 160, 215, 270, 320].map((y, i) => (
          <line key={i} x1={42 - i * 0.8} y1={y} x2={48 + i * 0.8} y2={y} stroke="#FFE89A" strokeWidth="0.4" opacity="0.45"/>
        ))}
      </svg>

      {/* City skyline - left side smaller buildings */}
      <svg className="absolute" style={{ bottom: '14%', left: '8%', width: 180, height: 140, opacity: 0.28 }} viewBox="0 0 180 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g fill="#1A1408">
          <rect x="10" y="60" width="22" height="80"/>
          <rect x="35" y="40" width="28" height="100"/>
          <rect x="65" y="70" width="18" height="70"/>
          <rect x="85" y="20" width="20" height="120"/>
          <rect x="108" y="55" width="24" height="85"/>
          <rect x="135" y="35" width="18" height="105"/>
          <rect x="156" y="65" width="20" height="75"/>
        </g>
        {/* Window dots */}
        <g fill="#E8C97A" opacity="0.5">
          {[[20,72],[20,88],[44,55],[44,70],[44,90],[72,82],[72,100],[92,38],[92,58],[92,78],[92,98],[114,68],[114,88],[140,50],[140,70],[140,90],[164,75],[164,95]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="2" height="2"/>
          ))}
        </g>
      </svg>

      {/* City skyline - right side */}
      <svg className="absolute" style={{ bottom: '14%', right: '8%', width: 200, height: 130, opacity: 0.26 }} viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g fill="#1A1408">
          <rect x="6" y="55" width="20" height="75"/>
          <rect x="30" y="30" width="22" height="100"/>
          <rect x="55" y="70" width="16" height="60"/>
          <rect x="74" y="40" width="26" height="90"/>
          {/* Pointy mosque-like with dome silhouette */}
          <path d="M105 130 L105 70 Q120 50 135 70 L135 130 Z"/>
          <circle cx="120" cy="60" r="10"/>
          <line x1="120" y1="38" x2="120" y2="50" stroke="#1A1408" strokeWidth="1.5"/>
          <rect x="140" y="55" width="20" height="75"/>
          <rect x="163" y="38" width="22" height="92"/>
          <rect x="187" y="65" width="13" height="65"/>
        </g>
        <g fill="#E8C97A" opacity="0.5">
          {[[14,68],[14,84],[40,42],[40,60],[40,80],[40,100],[62,82],[84,52],[84,72],[84,92],[84,112],[148,68],[148,86],[170,48],[170,68],[170,90],[192,78]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="2" height="2"/>
          ))}
        </g>
      </svg>

      {/* Desert dunes — warm sand */}
      <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 280" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="duneBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A1F08" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#1A0E04" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="duneMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A1808" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#160A04" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="duneFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F1208" stopOpacity="1"/>
            <stop offset="100%" stopColor="#0E0905" stopOpacity="1"/>
          </linearGradient>
        </defs>
        {/* Back dune */}
        <path d="M0 280 L0 190 Q180 140 360 170 Q540 200 720 155 Q900 110 1080 150 Q1260 190 1440 165 L1440 280 Z" fill="url(#duneBack)"/>
        {/* Mid dune */}
        <path d="M0 280 L0 220 Q200 175 400 205 Q600 235 800 195 Q1000 155 1200 200 Q1320 225 1440 210 L1440 280 Z" fill="url(#duneMid)"/>
        {/* Front dune */}
        <path d="M0 280 L0 255 Q120 230 280 248 Q440 266 600 242 Q760 218 920 245 Q1080 272 1240 250 Q1360 235 1440 248 L1440 280 Z" fill="url(#duneFront)"/>
        {/* Sand crest highlight */}
        <path d="M0 255 Q120 230 280 248 Q440 266 600 242 Q760 218 920 245 Q1080 272 1240 250 Q1360 235 1440 248" fill="none" stroke="rgba(232,144,58,0.18)" strokeWidth="2"/>
      </svg>

      {/* Bedouin tent (Bait al-shaar) — bottom right */}
      <svg className="absolute" style={{ bottom: '5%', right: '4%', width: 170, height: 100, opacity: 0.55 }} viewBox="0 0 170 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Tent body — peaked with slack lines */}
        <path d="M10 90 Q40 88 75 90 L85 35 Q88 28 91 28 L95 35 L155 90 Q120 88 85 90 Z" fill="#1A0F08"/>
        {/* Stripes (camel-hair pattern) */}
        <path d="M16 90 Q42 88 76 90" stroke="#3A2010" strokeWidth="1" fill="none" opacity="0.7"/>
        <path d="M22 80 Q50 78 80 80 L88 47" stroke="#3A2010" strokeWidth="1" fill="none" opacity="0.6"/>
        <path d="M28 70 Q60 68 90 70" stroke="#5C3A1E" strokeWidth="0.8" fill="none" opacity="0.5"/>
        <path d="M150 90 Q120 88 90 90" stroke="#3A2010" strokeWidth="1" fill="none" opacity="0.7"/>
        <path d="M140 80 Q110 78 92 80" stroke="#3A2010" strokeWidth="1" fill="none" opacity="0.6"/>
        {/* Tent pole tip */}
        <line x1="91" y1="28" x2="91" y2="20" stroke="#5C3A1E" strokeWidth="1.2"/>
        <circle cx="91" cy="19" r="1.5" fill="#E8C97A" opacity="0.7"/>
        {/* Guy ropes */}
        <line x1="20" y1="90" x2="5" y2="100" stroke="#3A2010" strokeWidth="0.6" opacity="0.6"/>
        <line x1="155" y1="90" x2="167" y2="100" stroke="#3A2010" strokeWidth="0.6" opacity="0.6"/>
        {/* Warm campfire glow at entrance */}
        <ellipse cx="85" cy="92" rx="12" ry="3" fill="#E8903A" opacity="0.25"/>
        <ellipse cx="85" cy="91" rx="6" ry="1.5" fill="#FFB840" opacity="0.45"/>
      </svg>

      {/* Left palm tree */}
      <svg className="absolute bottom-0 left-0 w-72 h-96 opacity-85" viewBox="0 0 240 380" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M108 380 Q104 320 100 260 Q96 200 98 160 Q100 130 104 110" stroke="#3D2810" strokeWidth="14" fill="none" strokeLinecap="round"/>
        <path d="M112 380 Q108 320 106 260 Q104 200 106 160 Q108 130 112 110" stroke="#5C3A1E" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {[340,310,280,250,220,190,165,145,128].map((y,i) => (
          <path key={i} d={`M${102+i*0.5} ${y} Q${108} ${y-4} ${114-i*0.5} ${y}`} stroke="#2A1A08" strokeWidth="3" fill="none" opacity="0.5"/>
        ))}
        {/* Date clusters */}
        <ellipse cx="98" cy="125" rx="5" ry="7" fill="#7A3008" opacity="0.7"/>
        <ellipse cx="118" cy="128" rx="4" ry="6" fill="#7A3008" opacity="0.65"/>
        {/* Fronds — slightly warmer green */}
        <path d="M104 110 Q80 80 30 55 Q50 75 80 90 Q92 100 104 110" fill="#1A4A28" opacity="0.92"/>
        <path d="M104 110 Q70 70 15 40 Q40 65 72 85 Q88 98 104 110" fill="#225F35" opacity="0.85"/>
        <path d="M104 110 Q90 65 75 20 Q85 55 95 85 Q100 98 104 110" fill="#2A6B3E" opacity="0.92"/>
        <path d="M104 110 Q110 60 115 15 Q110 55 108 85 Q107 98 104 110" fill="#225F35" opacity="0.88"/>
        <path d="M104 110 Q120 65 145 25 Q128 58 115 85 Q109 98 104 110" fill="#1A4A28" opacity="0.92"/>
        <path d="M104 110 Q135 75 175 55 Q150 75 125 92 Q112 102 104 110" fill="#164020" opacity="0.88"/>
        <path d="M104 110 Q145 85 190 80 Q160 88 132 98 Q115 105 104 110" fill="#122E18" opacity="0.82"/>
        <path d="M104 110 Q55 88 10 95 Q45 92 78 98 Q94 104 104 110" fill="#164020" opacity="0.78"/>
        <path d="M104 110 Q88 90 60 105 Q82 100 98 106 Q102 108 104 110" fill="#1A4A28" opacity="0.72"/>
      </svg>

      {/* Right palm tree */}
      <svg className="absolute bottom-0 right-0 w-64 h-80 opacity-78" viewBox="0 0 220 340" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }} aria-hidden="true">
        <path d="M100 340 Q97 285 95 230 Q93 180 96 148 Q98 122 102 105" stroke="#3D2810" strokeWidth="12" fill="none" strokeLinecap="round"/>
        <path d="M104 340 Q102 285 101 230 Q100 180 102 148 Q104 122 107 105" stroke="#5C3A1E" strokeWidth="7" fill="none" strokeLinecap="round"/>
        {[308,280,252,225,200,178,160,143,127].map((y,i) => (
          <path key={i} d={`M${94+i*0.4} ${y} Q${100} ${y-4} ${106-i*0.4} ${y}`} stroke="#2A1A08" strokeWidth="2.5" fill="none" opacity="0.4"/>
        ))}
        <path d="M102 105 Q78 75 28 50 Q48 70 78 86 Q90 96 102 105" fill="#1A4A28" opacity="0.92"/>
        <path d="M102 105 Q68 66 14 36 Q38 62 70 81 Q86 93 102 105" fill="#225F35" opacity="0.85"/>
        <path d="M102 105 Q88 62 72 18 Q82 52 92 82 Q97 94 102 105" fill="#2A6B3E" opacity="0.92"/>
        <path d="M102 105 Q108 57 112 12 Q108 52 106 82 Q105 94 102 105" fill="#225F35" opacity="0.88"/>
        <path d="M102 105 Q118 62 142 22 Q126 55 113 82 Q107 94 102 105" fill="#1A4A28" opacity="0.92"/>
        <path d="M102 105 Q132 72 170 52 Q146 72 122 88 Q110 98 102 105" fill="#164020" opacity="0.88"/>
        <path d="M102 105 Q140 82 182 78 Q155 86 128 95 Q113 101 102 105" fill="#122E18" opacity="0.82"/>
      </svg>

      {/* Far-back smaller palms */}
      <svg className="absolute bottom-16 left-40 w-24 h-52 opacity-35" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M50 200 Q48 160 47 120 Q46 90 48 72" stroke="#2A1A08" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M48 72 Q30 50 5 35 Q22 50 40 62 Q44 67 48 72" fill="#0E2E18" opacity="0.9"/>
        <path d="M48 72 Q44 40 42 10 Q46 38 47 62 Q47 67 48 72" fill="#0E2E18" opacity="0.9"/>
        <path d="M48 72 Q54 40 60 10 Q54 38 51 62 Q49 67 48 72" fill="#0E2E18" opacity="0.85"/>
        <path d="M48 72 Q65 52 90 40 Q72 55 56 65 Q52 69 48 72" fill="#0A2212" opacity="0.8"/>
      </svg>

      {/* Falcon silhouette gliding — top-left */}
      <svg className="absolute" style={{ top: '14%', left: '12%', width: 50, height: 22, opacity: 0.28 }} viewBox="0 0 50 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 12 Q10 4 18 10 L25 8 L32 10 Q40 4 48 12 Q42 14 32 12 L25 14 L18 12 Q10 14 2 12 Z" fill="#E8C97A"/>
      </svg>

      {/* Gold top hairline */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70"/>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(8,4,0,0.55) 100%)' }}/>
    </div>
  );
}
