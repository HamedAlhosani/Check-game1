import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { FrameRing } from '../../components/shared/FrameRing';
import { soundService } from '../../services/sound.service';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';
import { LudoConfigModal, LudoConfigMode } from '../../components/game/ludo/LudoConfigModal';

// ─── Sand palette tokens (kept here so this page doesn't drag the whole
// home dashboard's chunky theme module). All gold/sand based — this is
// LUDO's identity, separate from CHECK's card-table feel.
const SAND = {
  bg1: '#0E0905',
  bg2: '#1A1408',
  panel: 'rgba(20,14,8,0.78)',
  gold: '#D9A441',
  goldDark: '#7A6303',
  goldLight: '#F6E6BE',
  cream: '#F4E4BE',
  sand: '#C9A84C',
};

// ─── Animated falcon flying across the page background ───────────────────────
function FlyingFalcon() {
  return (
    <motion.svg
      viewBox="0 0 60 30"
      className="fixed pointer-events-none"
      style={{ top: '32%', width: 60, height: 30, color: '#0A0604', opacity: 0.55, zIndex: 1 }}
      initial={{ x: -100 }}
      animate={{ x: '110vw' }}
      transition={{ duration: 38, repeat: Infinity, ease: 'linear', repeatDelay: 12 }}
      aria-hidden="true"
    >
      <g fill="currentColor">
        <path d="M 16 18 Q 24 14 36 16 Q 50 18 46 22 Q 38 24 30 23 L 16 20 Z" />
        <path d="M 14 18 Q 4 8 -2 0 Q 12 6 24 16 Z" />
        <path d="M 44 17 Q 50 14 54 12 L 58 14 L 53 17 L 52 21 Z" />
      </g>
    </motion.svg>
  );
}

// ─── Drifting sand particles for ambient warmth ──────────────────────────────
function SandDrift() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const left = (i * 7.3 + 3) % 100;
        const dur = 18 + (i % 5) * 4;
        const delay = i * 1.2;
        return (
          <motion.div
            key={i}
            initial={{ y: '110vh', opacity: 0 }}
            animate={{ y: '-10vh', opacity: [0, 0.8, 0.8, 0] }}
            transition={{ duration: dur, repeat: Infinity, delay, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
            style={{
              position: 'absolute',
              left: `${left}%`,
              width: 2,
              height: 2,
              borderRadius: '50%',
              background: SAND.gold,
              boxShadow: `0 0 4px ${SAND.gold}88`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Decorative khatim divider ───────────────────────────────────────────────
function GoldDivider({ wide = false }: { wide?: boolean }) {
  const w = wide ? 90 : 50;
  return (
    <div className="flex items-center justify-center gap-2.5 my-2">
      <div style={{ width: w, height: 1, background: `linear-gradient(to right, transparent, ${SAND.gold}66)` }} />
      <span style={{ color: SAND.gold, fontSize: 14, lineHeight: 1, textShadow: `0 0 12px ${SAND.gold}99` }}>✦</span>
      <div style={{ width: w, height: 1, background: `linear-gradient(to left, transparent, ${SAND.gold}66)` }} />
    </div>
  );
}

// ─── Currency chip with subtle pulse on the icon ─────────────────────────────
function CurrencyChip({ icon, value, color, label }: { icon: string; value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
      title={label}
      style={{ background: 'rgba(20,14,8,0.55)', border: `1px solid ${color}55`, boxShadow: `0 0 14px ${color}22` }}>
      <span style={{ fontSize: 15, lineHeight: 1, filter: `drop-shadow(0 0 6px ${color}66)` }}>{icon}</span>
      <span className="font-bold font-mono" style={{ fontSize: 13, color, lineHeight: 1 }}>{value.toLocaleString()}</span>
    </div>
  );
}

// ─── Big play-mode card ──────────────────────────────────────────────────────
function ModeCard({ icon, title, sub, accent, onClick, isAr }: {
  icon: string; title: string; sub: string; accent: string;
  onClick: () => void; isAr: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-2xl text-start overflow-hidden"
      style={{
        padding: '18px 18px 16px',
        background: `linear-gradient(135deg, ${accent}24 0%, rgba(20,14,8,0.92) 100%)`,
        border: `2px solid ${accent}AA`,
        boxShadow: `0 10px 28px rgba(0,0,0,0.6), 0 0 32px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
        cursor: 'pointer',
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 78% 22%, ${accent}33 0%, transparent 60%)` }} />
      <div className="relative flex items-center gap-3">
        <span style={{ fontSize: 36, lineHeight: 1, filter: `drop-shadow(0 0 14px ${accent})` }}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-arabic font-bold" style={{ fontSize: 16, color: SAND.cream }}>{title}</p>
          <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>{sub}</p>
        </div>
        <span style={{ color: accent, fontSize: 18, lineHeight: 1 }}>{isAr ? '←' : '→'}</span>
      </div>
    </motion.button>
  );
}

// ─── Quick-link tile (Store / Friends / Tournaments / etc.) ──────────────────
function NavTile({ icon, label, sub, color, to, badge }: {
  icon: string; label: string; sub: string; color: string; to: string; badge?: string;
}) {
  return (
    <Link to={to}
      className="rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all relative active:scale-95"
      style={{
        padding: '12px 8px',
        background: `linear-gradient(135deg, ${color}18 0%, rgba(20,14,8,0.7) 100%)`,
        border: `1.5px solid ${color}55`,
        textDecoration: 'none',
        minHeight: 86,
      }}>
      <span style={{ fontSize: 24, lineHeight: 1, filter: `drop-shadow(0 0 10px ${color}88)` }}>{icon}</span>
      <span className="font-arabic font-bold" style={{ fontSize: 12, color: SAND.cream, lineHeight: 1.1 }}>{label}</span>
      <span className="font-arabic" style={{ fontSize: 9, color: 'rgba(245,230,200,0.45)' }}>{sub}</span>
      {badge && (
        <span className="absolute font-bold rounded-full"
          style={{ top: 4, insetInlineEnd: 4, padding: '0 5px', minWidth: 16, height: 16, lineHeight: '16px',
                   background: '#E04030', color: '#fff', fontSize: 9, border: '1.5px solid #14100A' }}>
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function LudoHomePage() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [configMode, setConfigMode] = useState<LudoConfigMode | null>(null);

  useEffect(() => {
    // Make sure socket is alive when the user tries to launch
    socketService.connect();
  }, []);

  const openConfig = (mode: LudoConfigMode) => {
    soundService.playClick();
    setConfigMode(mode);
  };

  // Ludo wallet — fully separate from Check's coins/gems.
  const ludoCoins = (profile as any)?.ludoCoins ?? 0;
  const ludoGems  = (profile as any)?.ludoGems  ?? 0;
  const ludoWins = profile?.stats?.ludoWins ?? 0;
  const totalGames = profile?.stats?.totalGames ?? 0;
  const level = profile?.ranking?.level ?? 1;

  return (
    <div className="min-h-screen relative" style={{ background: SAND.bg1, direction: dir, overflowX: 'hidden' }}>
      {/* Page background — desert + skyline + dunes + palms (shared with the board) */}
      <LudoPageBackground />
      <SandDrift />
      <FlyingFalcon />

      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{
          background: 'rgba(8,4,2,0.88)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${SAND.gold}33`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
        }}>
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
          aria-label={isAr ? 'رجوع' : 'Back'}>
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>
            {isAr ? 'الرئيسية' : 'Home'}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="font-display tracking-widest"
            style={{ fontSize: 16, color: SAND.gold, textShadow: `0 0 14px ${SAND.gold}99` }}>
            LUDO
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <CurrencyChip icon="🪙" value={ludoCoins} color={SAND.gold} label={isAr ? 'كوينز لودو' : 'Ludo Coins'} />
          <CurrencyChip icon="💎" value={ludoGems}  color="#9DD8E8" label={isAr ? 'جواهر لودو' : 'Ludo Gems'} />
          <LangToggle />
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-4 pb-12 pt-4 sm:pt-6">
        {/* ── Hero / player card ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-4 sm:p-5 mb-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${SAND.gold}24 0%, rgba(20,14,8,0.92) 70%)`,
            border: `2px solid ${SAND.gold}88`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 36px ${SAND.gold}33`,
          }}>
          {/* Tagline */}
          <p className="font-arabic text-center" style={{ fontSize: 11, color: `${SAND.gold}AA`, letterSpacing: 5, marginBottom: 4 }}>
            {isAr ? '✦ سباق على الرمال ✦' : '✦ RACE ON THE SANDS ✦'}
          </p>
          <h1 className="font-display text-center"
            style={{
              fontSize: 'clamp(40px, 9vw, 64px)',
              color: SAND.gold,
              letterSpacing: '0.18em',
              lineHeight: 1,
              textShadow: `0 0 28px ${SAND.gold}66, 0 0 48px ${SAND.gold}22`,
            }}>
            LUDO
          </h1>
          <p className="font-arabic text-center italic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)', lineHeight: 1.6 }}>
            {isAr
              ? '"كل قطعة لها مجدٍ، وكل دحرجة لها قصة"'
              : '"Every piece has its glory, every roll has its tale"'}
          </p>

          <GoldDivider wide />

          {/* Player avatar + stats */}
          <div className="flex items-center gap-3 mt-1">
            <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
              <CharacterArt id={profile?.avatarId || 'avatar_1'} size={64} />
              <FrameRing size={64} frameId={profile?.equippedItems?.avatarFrame} />
              <div className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center font-bold"
                style={{
                  width: 22, height: 22,
                  background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.goldDark})`,
                  border: `2px solid ${SAND.bg1}`,
                  fontSize: 11, color: SAND.bg1,
                  boxShadow: `0 2px 8px ${SAND.gold}99`,
                }}>{level}</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-arabic font-bold truncate" style={{ fontSize: 17, color: SAND.cream }}>
                {profile?.displayName || (isAr ? 'مغامر' : 'Adventurer')}
              </p>
              <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.4)', direction: 'ltr' }}>
                {profile?.username || ''}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-arabic" style={{ color: SAND.gold }}>
                <span>🏆 {ludoWins} {isAr ? 'فوز' : 'wins'}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>🎲 {totalGames} {isAr ? 'مباراة' : 'games'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Play modes ── */}
        <p className="font-arabic mb-2" style={{ fontSize: 11, letterSpacing: 3, color: `${SAND.gold}99`, paddingInlineStart: 6 }}>
          {isAr ? '✦ ابدأ مباراة ✦' : '✦ START A MATCH ✦'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
          <ModeCard
            icon="🤖"
            title={isAr ? 'ضد البوتات' : 'Vs Bots'}
            sub={isAr ? 'اختر العدد والصعوبة' : 'Pick count and difficulty'}
            accent={SAND.gold}
            onClick={() => openConfig('bots')}
            isAr={isAr}
          />
          <ModeCard
            icon="🌐"
            title={isAr ? 'أونلاين' : 'Online'}
            sub={isAr ? 'اختر الرهان والعدد' : 'Pick bet and players'}
            accent="#7AC74F"
            onClick={() => openConfig('online')}
            isAr={isAr}
          />
          <ModeCard
            icon="🔒"
            title={isAr ? 'غرفة خاصة' : 'Private Room'}
            sub={isAr ? 'العب مع أصدقائك' : 'Play with friends'}
            accent="#9DD8E8"
            onClick={() => openConfig('private')}
            isAr={isAr}
          />
        </div>

        {/* ── Quick nav grid — links into the broader app for now (Ludo gets
              its own dedicated screens in a follow-up) ── */}
        <p className="font-arabic mb-2" style={{ fontSize: 11, letterSpacing: 3, color: `${SAND.gold}99`, paddingInlineStart: 6 }}>
          {isAr ? '✦ القائمة ✦' : '✦ MENU ✦'}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
          <NavTile icon="🛒" label={isAr ? 'متجر النرد' : 'Dice Store'}    sub={isAr ? 'نرد و طاولات' : 'dice & boards'} color="#D9A441" to="/ludo/store" />
          <NavTile icon="🏆" label={isAr ? 'التصنيف' : 'Leaderboard'}      sub={isAr ? 'عالمي · أصدقاء' : 'global · friends'} color="#F1C40F" to="/ludo/leaderboard" />
          <NavTile icon="👥" label={isAr ? 'الأصدقاء' : 'Friends'}          sub={isAr ? 'أضف خصومك' : 'add players'} color="#7AC74F" to="/ludo/friends" />
          <NavTile icon="🛡️" label={isAr ? 'القبائل' : 'Clans'}             sub={isAr ? 'انضم لقبيلة' : 'join a clan'} color="#9DD8E8" to="/ludo/clans" />
          <NavTile icon="🎯" label={isAr ? 'البطولات' : 'Tournaments'}      sub={isAr ? 'فرديه · قبائل' : 'solo · clan'} color="#E07040" to="/ludo/tournaments" />
          <NavTile icon="📜" label={isAr ? 'التاريخ' : 'History'}           sub={isAr ? 'مبارياتك' : 'your matches'} color="#C495FF" to="/ludo/history" />
        </div>

        {/* ── Coming-soon banner — sets expectations honestly ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="rounded-2xl px-4 py-3 mb-4"
          style={{
            background: 'rgba(20,14,8,0.55)',
            border: `1px dashed ${SAND.gold}55`,
          }}>
          <p className="font-arabic font-bold mb-1" style={{ fontSize: 13, color: SAND.gold }}>
            {isAr ? '✦ قريباً في لودو' : '✦ Coming soon in LUDO'}
          </p>
          <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)', lineHeight: 1.7 }}>
            {isAr
              ? 'متجر نرد وطاولات حصرية · بطولات قبائل لودو · مهام يومية خاصة · عجلة حظ صحراوية · إشعارات داخل اللعبة'
              : 'Exclusive dice & board store · Ludo clan tournaments · daily missions · desert wheel of fortune · in-app notifications'}
          </p>
        </motion.div>

        {/* ── Footer poetry ── */}
        <GoldDivider wide />
        <p className="font-arabic text-center italic mt-3" style={{ fontSize: 11, color: 'rgba(245,230,200,0.30)', lineHeight: 1.8 }}>
          {isAr
            ? 'في ظلِّ النخيل و دفءِ الديار ✦ يلعب أهلُنا و تُروى الحكايا'
            : 'In the shade of palms and warmth of homes ✦ our people play and tales are told'}
        </p>
      </main>

      <LudoConfigModal
        open={!!configMode}
        mode={configMode || 'bots'}
        onClose={() => setConfigMode(null)}
        ludoCoins={ludoCoins}
        lang={lang}
      />
    </div>
  );
}
