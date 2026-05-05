import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { LangToggle } from '../../components/shared/LangToggle';
import { useLang } from '../../i18n/useT';

// ── UAE Skyline SVG ────────────────────────────────────────────────────────────
function UAESkyline() {
  return (
    <svg viewBox="0 0 900 320" className="w-full" preserveAspectRatio="xMidYMax meet" style={{ maxHeight: 280 }}>
      <defs>
        <linearGradient id="buildingGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A0E30" />
          <stop offset="100%" stopColor="#1A1408" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {[[60,18],[130,8],[200,25],[310,12],[420,6],[500,22],[590,10],[680,28],[760,5],[820,18],[870,30]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={Math.random()>.6?2:1.2} fill="#E8C97A" opacity={0.5+Math.random()*.4}/>
      ))}
      {[[90,45],[170,38],[260,50],[380,35],[460,44],[540,32],[620,48],[710,36],[800,42]].map(([x,y],i)=>(
        <circle key={`s2-${i}`} cx={x} cy={y} r="1" fill="white" opacity="0.4"/>
      ))}
      <circle cx="820" cy="52" r="32" fill="#E8C97A" opacity="0.9" filter="url(#glow)"/>
      <circle cx="835" cy="45" r="26" fill="#0E0905"/>
      <rect x="50" y="210" width="22" height="90" fill="#140C28" opacity="0.6"/>
      <rect x="80" y="195" width="18" height="105" fill="#140C28" opacity="0.6"/>
      <rect x="108" y="220" width="25" height="80" fill="#140C28" opacity="0.6"/>
      <rect x="740" y="200" width="20" height="100" fill="#140C28" opacity="0.6"/>
      <rect x="768" y="215" width="16" height="85" fill="#140C28" opacity="0.6"/>
      <rect x="792" y="205" width="24" height="95" fill="#140C28" opacity="0.6"/>
      <rect x="824" y="225" width="18" height="75" fill="#140C28" opacity="0.6"/>
      <rect x="140" y="180" width="35" height="120" fill="#1A1035" opacity="0.8"/>
      <rect x="183" y="160" width="28" height="140" fill="#1A1035" opacity="0.8"/>
      <rect x="219" y="190" width="40" height="110" fill="#1A1035" opacity="0.8"/>
      {[145,155,165,175].map(x=>
        [185,198,211,224].map(y=>(
          <rect key={`w-${x}-${y}`} x={x} y={y} width="4" height="4"
            fill="#C9A84C" opacity={Math.random()>.4?0.6:0.1}/>
        ))
      )}
      <rect x="640" y="170" width="38" height="130" fill="#1A1035" opacity="0.8"/>
      <rect x="686" y="185" width="30" height="115" fill="#1A1035" opacity="0.8"/>
      <rect x="724" y="160" width="36" height="140" fill="#1A1035" opacity="0.8"/>
      <line x1="185" y1="300" x2="200" y2="180" stroke="#0F2010" strokeWidth="6"/>
      <ellipse cx="200" cy="175" rx="28" ry="12" fill="#142A18" transform="rotate(-15 200 175)"/>
      <ellipse cx="200" cy="175" rx="24" ry="10" fill="#1A3820" transform="rotate(20 200 175)"/>
      <ellipse cx="200" cy="175" rx="26" ry="11" fill="#152C1A" transform="rotate(-40 200 175)"/>
      <ellipse cx="200" cy="175" rx="22" ry="9" fill="#1D3E22" transform="rotate(50 200 175)"/>
      <line x1="700" y1="300" x2="710" y2="175" stroke="#0F2010" strokeWidth="6"/>
      <ellipse cx="710" cy="170" rx="28" ry="12" fill="#142A18" transform="rotate(15 710 170)"/>
      <ellipse cx="710" cy="170" rx="24" ry="10" fill="#1A3820" transform="rotate(-20 710 170)"/>
      <ellipse cx="710" cy="170" rx="26" ry="11" fill="#152C1A" transform="rotate(40 710 170)"/>
      <ellipse cx="710" cy="170" rx="22" ry="9" fill="#1D3E22" transform="rotate(-50 710 170)"/>
      <polygon points="450,2 451.5,60 448.5,60" fill="#1A0E30"/>
      <polygon points="447,55 453,55 456,110 444,110" fill="#1A0E30"/>
      <polygon points="442,105 458,105 462,150 438,150" fill="#1C1035"/>
      <polygon points="436,145 464,145 468,185 432,185" fill="#1C1035"/>
      <polygon points="430,180 470,180 476,215 424,215" fill="#200F38"/>
      <polygon points="422,210 478,210 485,245 415,245" fill="#200F38"/>
      <polygon points="415,240 485,240 490,270 410,270" fill="#240E40"/>
      <rect x="395" y="265" width="110" height="35" fill="#1A0E30" rx="2"/>
      {[0,1,2,3].map(col=>
        [65,80,95,115,130,155,170,190,210,230].map((y,j)=>(
          <rect key={`bw-${col}-${j}`}
            x={447+col*3} y={y} width="2" height="3"
            fill="#C9A84C" opacity={Math.random()>.3?0.7:0.15}/>
        ))
      )}
      <path d="M0,300 Q150,270 300,285 Q450,300 600,275 Q750,255 900,280 L900,320 L0,320 Z"
        fill="#180C04" opacity="0.95"/>
      <path d="M0,310 Q200,290 400,300 Q600,310 900,295 L900,320 L0,320 Z"
        fill="#1C0D05" opacity="0.95"/>
    </svg>
  );
}

// ── Arabesque border ──────────────────────────────────────────────────────────
function ArabesqueDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }}/>
      <span style={{ color: '#C9A84C', fontSize: 18, lineHeight: 1 }}>✦</span>
      <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.4)' }}/>
      <span style={{ color: '#C9A84C', fontSize: 14, lineHeight: 1 }}>◆</span>
      <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.4)' }}/>
      <span style={{ color: '#C9A84C', fontSize: 18, lineHeight: 1 }}>✦</span>
      <div style={{ width: 80, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }}/>
    </div>
  );
}

// ── Rules data ────────────────────────────────────────────────────────────────
const RULES_AR = [
  { title: 'الهدف من اللعبة', icon: '🎯', content: 'هدفك تجمع أقل نقاط ممكنة. كل لاعب عنده 4 أوراق. الأول اللي يوصل 100 نقطة يخسر — آخر لاعب يبقى هو الفائز.' },
  { title: 'قيم الأوراق', icon: '🃏', content: 'A = 1 نقطة • 2-9 قيمتها الرقم • 10 الأحمر (♥♦) = 0 • 10 الأسود (♠♣) = 10 • J = 11 • Q = 12 • K = 13' },
  { title: 'الأوراق الخاصة', icon: '✨', content: 'J → يروح للمرمي فوراً ثم تبادل ورقة من يدك مع ورقة عند خصم.\nQ الحمرا (♥♦) → يروح للمرمي وتكشف ورقة من يدك.\nK → تسحب ورقتين وتختار وحدة منهم (أو تحرق الكل).' },
  { title: 'الحرق', icon: '🔥', content: 'اذا رمى اليسار ورقة ويطابق رقمها ورقة من يدك — اضغط عليها واحرقها! إذا أخطأت تأخذ ورقة عقوبة تُضاف لإيدك.' },
  { title: 'قول CHECK', icon: '⚡', content: 'بعد جولة كاملة لكل اللاعبين (×4)، تقدر تقول CHECK في دورك بعد ما تلعب. بعدها كل لاعب ياخذ دور أخير ثم تنكشف الأوراق.\nإذا كنت الأقل → تأخذ 0. إذا في أحد أقل منك → نقاطك تتضاعف!' },
  { title: 'البداية', icon: '👁️', content: 'في بداية كل جولة تتلصص على ورقتيك السفليتين السريتين وتحفظهم. ورقتيك العلويتين مخفيتين أيضاً — كل اللعبة تعتمد على الحفظ والذكاء.' },
];

const RULES_EN = [
  { title: 'Goal of the Game', icon: '🎯', content: 'Your goal is to collect the fewest points. Each player has 4 cards. The first to reach 100 points loses — the last player remaining wins.' },
  { title: 'Card Values', icon: '🃏', content: 'A = 1 point • 2-9 face value • Red 10 (♥♦) = 0 • Black 10 (♠♣) = 10 • J = 11 • Q = 12 • K = 13' },
  { title: 'Special Cards', icon: '✨', content: 'J → Goes to discard immediately, then swap one of your cards with an opponent\'s card.\nRed Q (♥♦) → Goes to discard and you reveal one of your own cards.\nK → Draw two cards and keep one (or burn them all).' },
  { title: 'Burning', icon: '🔥', content: 'If the player to your left discards a card that matches one in your hand — tap it and burn it! If you\'re wrong, you receive a penalty card added to your hand.' },
  { title: 'Calling CHECK', icon: '⚡', content: 'After a full round for all players (×4), you can call CHECK on your turn after playing. Then each player takes one final turn before cards are revealed.\nIf you have the lowest score → you get 0. If someone has fewer → your points are doubled!' },
  { title: 'The Start', icon: '👁️', content: 'At the beginning of each round, peek at your two bottom hidden cards and memorize them. Your two top cards are also hidden — the whole game relies on memory and strategy.' },
];

// ── Rules section ─────────────────────────────────────────────────────────────
function RulesSection({ lang }: { lang: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const rules = lang === 'ar' ? RULES_AR : RULES_EN;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <section id="rules" style={{ background: '#14100A', padding: '60px 0' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-center font-arabic font-bold mb-2" style={{ fontSize: 28, color: '#E8C97A' }}>
            {lang === 'ar' ? 'كيف تلعب؟' : 'How to Play?'}
          </h2>
          <p className="text-center font-arabic mb-6" style={{ fontSize: 14, color: 'rgba(245,230,200,0.4)' }}>
            {lang === 'ar' ? 'قواعد CHECK في ست نقاط' : 'CHECK rules in six points'}
          </p>
          <ArabesqueDivider />
        </motion.div>

        <div className="mt-6 space-y-2" style={{ direction: dir }}>
          {rules.map((rule, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{
                  background: open === i ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${open === i ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  textAlign: dir === 'rtl' ? 'right' : 'left',
                }}
              >
                <span style={{ fontSize: 22 }}>{rule.icon}</span>
                <span className="flex-1 font-arabic font-bold" style={{ fontSize: 15, color: open === i ? '#E8C97A' : 'rgba(245,230,200,0.75)' }}>
                  {rule.title}
                </span>
                <span style={{ color: '#C9A84C', fontSize: 12, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-5 py-3 font-arabic" style={{ fontSize: 14, color: 'rgba(245,230,200,0.6)', lineHeight: 1.8, whiteSpace: 'pre-line', borderInlineStart: '2px solid rgba(201,168,76,0.25)', marginInlineStart: 6 }}>
                      {rule.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main LandingPage ──────────────────────────────────────────────────────────
export function LandingPage() {
  const { user } = useAuthStore();
  const lang = useLang();
  const navigate = useNavigate();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isAr = lang === 'ar';

  return (
    <div style={{ minHeight: '100vh', background: '#0E0905', overflowX: 'hidden', direction: dir }}>

      {/* ── Top Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3"
        style={{ background: 'rgba(8,4,18,0.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(201,168,76,0.10)' }}>
        <span className="font-display tracking-widest" style={{ fontSize: 20, color: '#C9A84C', textShadow: '0 0 18px rgba(201,168,76,0.45)' }}>CHECK</span>
        <div className="flex items-center gap-2">
          <LangToggle />
          {user ? (
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-1.5 rounded-lg font-arabic font-bold transition-all"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.5)', color: '#E8C97A', fontSize: 13 }}
            >
              {isAr ? 'ابدأ اللعب ←' : 'Play Now →'}
            </button>
          ) : (
            <>
              <Link to="/login"
                className="px-4 py-1.5 rounded-lg font-arabic transition-all"
                style={{ color: 'rgba(245,230,200,0.7)', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>
                {isAr ? 'تسجيل دخول' : 'Log In'}
              </Link>
              <Link to="/register"
                className="px-4 py-1.5 rounded-lg font-arabic font-bold transition-all"
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.5)', color: '#E8C97A', fontSize: 13 }}>
                {isAr ? 'إنشاء حساب' : 'Sign Up'}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0E0905 0%, #14100A 28%, #1A1408 55%, #241208 80%, #200C04 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        position: 'relative', overflow: 'hidden', paddingBottom: 40,
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C9A84C' stroke-width='0.8'%3E%3Cpath d='M40 5 L50 20 L70 20 L55 32 L60 50 L40 38 L20 50 L25 32 L10 20 L30 20 Z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}/>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1 }}>
          <UAESkyline />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px', marginBottom: 180 }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.7 }}>
            <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(201,168,76,0.6)', letterSpacing: 4, marginBottom: 8 }}>
              {isAr ? '✦ لعبة ورق بأجواء إماراتية ✦' : '✦ A Card Game with UAE Spirit ✦'}
            </p>
            <h1 className="font-display" style={{
              fontSize: 'clamp(56px, 12vw, 96px)', color: '#C9A84C', lineHeight: 1,
              textShadow: '0 0 40px rgba(201,168,76,0.4), 0 0 80px rgba(201,168,76,0.15)',
              letterSpacing: '0.12em', marginBottom: 16,
            }}>
              CHECK
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}>
            <p className="font-arabic" style={{
              fontSize: 'clamp(14px, 2.5vw, 18px)', color: 'rgba(245,230,200,0.55)',
              lineHeight: 2, maxWidth: 520, margin: '0 auto 8px', fontStyle: 'italic',
            }}>
              {isAr
                ? '"في ظل النخيل و دفء الديار، تجتمع الأوراق و تُروى الحكايا"'
                : '"Under the shade of palms, cards are played and stories are told"'}
            </p>
            <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.35)', marginBottom: 24 }}>
              {isAr
                ? 'اجمع أقل النقاط، احرق أوراقك بذكاء، وقول CHECK في الوقت المناسب'
                : 'Collect the fewest points, burn cards wisely, and call CHECK at the right moment'}
            </p>
            <p className="font-arabic font-bold" style={{ fontSize: 14, color: 'rgba(201,168,76,0.5)', marginBottom: 28 }}>
              {isAr ? 'أول من يوصل ١٠٠ نقطة يخسر — كن الأذكى' : 'First to reach 100 points loses — be the smartest'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            {user ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/home')}
                className="font-arabic font-bold px-8 py-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#0E0905', fontSize: 16, boxShadow: '0 0 32px rgba(201,168,76,0.4)' }}>
                {isAr ? 'ابدأ اللعب الآن ←' : 'Play Now →'}
              </motion.button>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/register" className="font-arabic font-bold px-8 py-3 rounded-2xl block"
                    style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#0E0905', fontSize: 16, boxShadow: '0 0 32px rgba(201,168,76,0.4)', textDecoration: 'none' }}>
                    {isAr ? 'إنشاء حساب مجاني ←' : 'Create Free Account →'}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/login" className="font-arabic px-8 py-3 rounded-2xl block"
                    style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.35)', color: '#E8C97A', fontSize: 16, textDecoration: 'none' }}>
                    {isAr ? 'تسجيل دخول' : 'Log In'}
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{ marginTop: 28, cursor: 'pointer', color: 'rgba(201,168,76,0.4)', fontSize: 12 }}
            className="font-arabic"
            onClick={() => document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {isAr ? 'اكتشف القواعد ↓' : 'Discover the Rules ↓'}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Feature chips ── */}
      <section style={{ background: '#120A20', padding: '36px 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {(isAr ? [
              { icon: '👥', label: 'حتى ١٠ لاعبين', sub: 'أونلاين أو مع أصدقاء' },
              { icon: '🤖', label: 'بوتات ذكية', sub: '٣ مستويات صعوبة' },
              { icon: '🏆', label: 'تصنيف عالمي', sub: 'نافس اللاعبين' },
              { icon: '🎁', label: 'متجر الشخصيات', sub: 'شخصيات حصرية' },
            ] : [
              { icon: '👥', label: 'Up to 10 Players', sub: 'Online or with friends' },
              { icon: '🤖', label: 'Smart Bots', sub: '3 difficulty levels' },
              { icon: '🏆', label: 'Global Leaderboard', sub: 'Compete with players' },
              { icon: '🎁', label: 'Character Store', sub: 'Exclusive characters' },
            ]).map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <div>
                  <p className="font-arabic font-bold" style={{ fontSize: 13, color: '#E8C97A' }}>{f.label}</p>
                  <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>{f.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rules section ── */}
      <RulesSection lang={lang} />

      {/* ── Bottom CTA ── */}
      <section style={{ background: 'linear-gradient(180deg, #14100A 0%, #0E0905 100%)', padding: '60px 20px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-arabic font-bold mb-3" style={{ fontSize: 24, color: '#E8C97A' }}>
            {isAr ? 'جاهز للعب؟' : 'Ready to Play?'}
          </h2>
          <p className="font-arabic mb-6" style={{ fontSize: 14, color: 'rgba(245,230,200,0.4)' }}>
            {isAr ? 'انضم إلى آلاف اللاعبين وابدأ مغامرتك' : 'Join thousands of players and start your adventure'}
          </p>
          {!user && (
            <div className="flex justify-center gap-3 flex-wrap">
              <Link to="/register" className="font-arabic font-bold px-8 py-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#0E0905', fontSize: 15, boxShadow: '0 0 24px rgba(201,168,76,0.35)', textDecoration: 'none' }}>
                {isAr ? 'إنشاء حساب مجاني' : 'Create Free Account'}
              </Link>
              <Link to="/login" className="font-arabic px-8 py-3 rounded-2xl"
                style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#E8C97A', fontSize: 15, textDecoration: 'none' }}>
                {isAr ? 'لديّ حساب' : 'I have an account'}
              </Link>
            </div>
          )}
          {user && (
            <button onClick={() => navigate('/home')}
              className="font-arabic font-bold px-8 py-3 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#0E0905', fontSize: 15, boxShadow: '0 0 24px rgba(201,168,76,0.35)' }}>
              {isAr ? 'ابدأ اللعب الآن ←' : 'Play Now →'}
            </button>
          )}
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0A0604', borderTop: '1px solid rgba(201,168,76,0.10)', padding: '24px 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <p className="font-display tracking-widest mb-2" style={{ fontSize: 18, color: 'rgba(201,168,76,0.5)' }}>CHECK</p>
          <ArabesqueDivider />
          <p className="font-arabic mt-3" style={{ fontSize: 13, color: 'rgba(245,230,200,0.35)' }}>
            {isAr ? 'صُنع بحب في الإمارات 🇦🇪' : 'Made with love in UAE 🇦🇪'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(245,230,200,0.18)', marginTop: 6 }}>
            {isAr ? '© 2025 CHECK Game · جميع الحقوق محفوظة' : '© 2025 CHECK Game · All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  );
}
