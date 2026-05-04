export function PageBackground() {
  const stars = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: (i * 137.5) % 100,
    y: (i * 97.3) % 65,
    r: i % 5 === 0 ? 1.8 : i % 3 === 0 ? 1.2 : 0.7,
    delay: (i * 0.41) % 4,
    dur: 2.5 + (i % 3) * 1.2,
  }));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: 'linear-gradient(180deg, #040A10 0%, #070F1A 20%, #0A1220 45%, #0D1828 70%, #0A1410 100%)' }}>

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
        {/* Larger bright stars */}
        {[{x:15,y:8},{x:72,y:5},{x:88,y:18},{x:33,y:12},{x:55,y:3},{x:8,y:22},{x:95,y:9}].map((s,i) => (
          <g key={`bright-${i}`} style={{ animation: `twinkle ${3+i*0.5}s ${i*0.7}s ease-in-out infinite` }}>
            <circle cx={`${s.x}%`} cy={`${s.y}%`} r="2.2" fill="#E8C97A" opacity="0.9"/>
            <circle cx={`${s.x}%`} cy={`${s.y}%`} r="4" fill="#C9A84C" opacity="0.2"/>
          </g>
        ))}
      </svg>

      {/* Crescent moon */}
      <svg className="absolute top-8 right-16 w-20 h-20 opacity-90" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#FFF8DC" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#moonGlow)"/>
        <path d="M48 14 C32 14 20 26 20 42 C20 58 32 70 48 70 C36 64 28 54 28 42 C28 30 36 20 48 14Z" fill="#E8C97A" opacity="0.9"/>
      </svg>

      {/* Arabesque pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="arabesque" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
            <circle cx="50" cy="50" r="20" fill="none" stroke="#C9A84C" strokeWidth="0.8"/>
            <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="none" stroke="#C9A84C" strokeWidth="0.6"/>
            <circle cx="50" cy="50" r="4" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
            <path d="M50 10 L50 30 M90 50 L70 50 M50 90 L50 70 M10 50 L30 50" stroke="#C9A84C" strokeWidth="0.4" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arabesque)"/>
      </svg>

      {/* Horizon warm glow */}
      <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(to top, rgba(139,94,60,0.18) 0%, rgba(160,120,48,0.10) 30%, transparent 100%)' }}/>

      {/* Desert dunes */}
      <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 280" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Back dune layer */}
        <path d="M0 280 L0 190 Q180 140 360 170 Q540 200 720 155 Q900 110 1080 150 Q1260 190 1440 165 L1440 280 Z" fill="#0C1608" opacity="0.7"/>
        {/* Mid dune layer */}
        <path d="M0 280 L0 220 Q200 175 400 205 Q600 235 800 195 Q1000 155 1200 200 Q1320 225 1440 210 L1440 280 Z" fill="#0D1A0A" opacity="0.85"/>
        {/* Front dune with sand rim */}
        <path d="M0 280 L0 255 Q120 230 280 248 Q440 266 600 242 Q760 218 920 245 Q1080 272 1240 250 Q1360 235 1440 248 L1440 280 Z" fill="#101508"/>
        {/* Sand crest highlights */}
        <path d="M0 255 Q120 230 280 248 Q440 266 600 242 Q760 218 920 245 Q1080 272 1240 250 Q1360 235 1440 248" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="2"/>
      </svg>

      {/* Left palm tree */}
      <svg className="absolute bottom-0 left-0 w-72 h-96 opacity-80" viewBox="0 0 240 380" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Trunk */}
        <path d="M108 380 Q104 320 100 260 Q96 200 98 160 Q100 130 104 110" stroke="#3D2810" strokeWidth="14" fill="none" strokeLinecap="round"/>
        <path d="M112 380 Q108 320 106 260 Q104 200 106 160 Q108 130 112 110" stroke="#5C3A1E" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* Trunk texture */}
        {[340,310,280,250,220,190,165,145,128].map((y,i) => (
          <path key={i} d={`M${102+i*0.5} ${y} Q${108} ${y-4} ${114-i*0.5} ${y}`} stroke="#2A1A08" strokeWidth="3" fill="none" opacity="0.5"/>
        ))}
        {/* Fronds */}
        <path d="M104 110 Q80 80 30 55 Q50 75 80 90 Q92 100 104 110" fill="#1A4A28" opacity="0.9"/>
        <path d="M104 110 Q70 70 15 40 Q40 65 72 85 Q88 98 104 110" fill="#1E5530" opacity="0.8"/>
        <path d="M104 110 Q90 65 75 20 Q85 55 95 85 Q100 98 104 110" fill="#225F35" opacity="0.9"/>
        <path d="M104 110 Q110 60 115 15 Q110 55 108 85 Q107 98 104 110" fill="#1E5530" opacity="0.85"/>
        <path d="M104 110 Q120 65 145 25 Q128 58 115 85 Q109 98 104 110" fill="#1A4A28" opacity="0.9"/>
        <path d="M104 110 Q135 75 175 55 Q150 75 125 92 Q112 102 104 110" fill="#164020" opacity="0.85"/>
        <path d="M104 110 Q145 85 190 80 Q160 88 132 98 Q115 105 104 110" fill="#122E18" opacity="0.8"/>
        <path d="M104 110 Q55 88 10 95 Q45 92 78 98 Q94 104 104 110" fill="#164020" opacity="0.75"/>
        <path d="M104 110 Q88 90 60 105 Q82 100 98 106 Q102 108 104 110" fill="#1A4A28" opacity="0.7"/>
      </svg>

      {/* Right palm tree */}
      <svg className="absolute bottom-0 right-0 w-64 h-80 opacity-75" viewBox="0 0 220 340" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scaleX(-1)' }} aria-hidden="true">
        <path d="M100 340 Q97 285 95 230 Q93 180 96 148 Q98 122 102 105" stroke="#3D2810" strokeWidth="12" fill="none" strokeLinecap="round"/>
        <path d="M104 340 Q102 285 101 230 Q100 180 102 148 Q104 122 107 105" stroke="#5C3A1E" strokeWidth="7" fill="none" strokeLinecap="round"/>
        {[308,280,252,225,200,178,160,143,127].map((y,i) => (
          <path key={i} d={`M${94+i*0.4} ${y} Q${100} ${y-4} ${106-i*0.4} ${y}`} stroke="#2A1A08" strokeWidth="2.5" fill="none" opacity="0.4"/>
        ))}
        <path d="M102 105 Q78 75 28 50 Q48 70 78 86 Q90 96 102 105" fill="#1A4A28" opacity="0.9"/>
        <path d="M102 105 Q68 66 14 36 Q38 62 70 81 Q86 93 102 105" fill="#1E5530" opacity="0.8"/>
        <path d="M102 105 Q88 62 72 18 Q82 52 92 82 Q97 94 102 105" fill="#225F35" opacity="0.9"/>
        <path d="M102 105 Q108 57 112 12 Q108 52 106 82 Q105 94 102 105" fill="#1E5530" opacity="0.85"/>
        <path d="M102 105 Q118 62 142 22 Q126 55 113 82 Q107 94 102 105" fill="#1A4A28" opacity="0.9"/>
        <path d="M102 105 Q132 72 170 52 Q146 72 122 88 Q110 98 102 105" fill="#164020" opacity="0.85"/>
        <path d="M102 105 Q140 82 182 78 Q155 86 128 95 Q113 101 102 105" fill="#122E18" opacity="0.8"/>
      </svg>

      {/* Far-back smaller palms */}
      <svg className="absolute bottom-16 left-40 w-24 h-52 opacity-35" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M50 200 Q48 160 47 120 Q46 90 48 72" stroke="#2A1A08" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M48 72 Q30 50 5 35 Q22 50 40 62 Q44 67 48 72" fill="#0E2E18" opacity="0.9"/>
        <path d="M48 72 Q44 40 42 10 Q46 38 47 62 Q47 67 48 72" fill="#0E2E18" opacity="0.9"/>
        <path d="M48 72 Q54 40 60 10 Q54 38 51 62 Q49 67 48 72" fill="#0E2E18" opacity="0.85"/>
        <path d="M48 72 Q65 52 90 40 Q72 55 56 65 Q52 69 48 72" fill="#0A2212" opacity="0.8"/>
      </svg>
      <svg className="absolute bottom-20 right-48 w-20 h-44 opacity-30" viewBox="0 0 90 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M45 180 Q43 145 42 108 Q41 80 43 64" stroke="#2A1A08" strokeWidth="5" fill="none" strokeLinecap="round"/>
        <path d="M43 64 Q25 45 2 32 Q18 46 36 57 Q40 61 43 64" fill="#0E2E18" opacity="0.9"/>
        <path d="M43 64 Q40 35 38 8 Q42 34 43 57 Q43 61 43 64" fill="#0E2E18" opacity="0.85"/>
        <path d="M43 64 Q48 35 55 8 Q50 34 47 57 Q45 61 43 64" fill="#0A2212" opacity="0.8"/>
        <path d="M43 64 Q60 47 82 36 Q65 50 52 60 Q47 63 43 64" fill="#0A2212" opacity="0.75"/>
      </svg>

      {/* Gold top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70"/>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4,10,16,0.55) 100%)' }}/>
    </div>
  );
}
