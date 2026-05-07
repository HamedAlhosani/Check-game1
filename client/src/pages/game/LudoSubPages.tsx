import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';

const SAND = {
  bg1: '#0E0905',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  cream: '#F4E4BE',
};

interface SubPageProps {
  icon: string;
  titleAr: string;
  titleEn: string;
  taglineAr: string;
  taglineEn: string;
  bullets: { ar: string; en: string }[];
}

function LudoSubPage({ icon, titleAr, titleEn, taglineAr, taglineEn, bullets }: SubPageProps) {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative" style={{ background: SAND.bg1, direction: dir }}>
      <LudoPageBackground />

      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${SAND.gold}33` }}>
        <button onClick={() => navigate('/ludo')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
          aria-label={isAr ? 'رجوع' : 'Back'}>
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>
            {isAr ? 'لودو' : 'Ludo'}
          </span>
        </button>
        <span className="font-display tracking-widest"
          style={{ fontSize: 14, color: SAND.gold, textShadow: `0 0 10px ${SAND.gold}99` }}>
          LUDO
        </span>
        <LangToggle />
      </nav>

      <main className="relative z-10 max-w-xl mx-auto px-4 pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-7 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${SAND.gold}24 0%, rgba(20,14,8,0.92) 70%)`,
            border: `2px solid ${SAND.gold}88`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 36px ${SAND.gold}33`,
          }}>
          <span style={{ fontSize: 72, lineHeight: 1, filter: `drop-shadow(0 0 22px ${SAND.gold})` }}>{icon}</span>
          <p className="font-arabic mt-3" style={{ fontSize: 11, letterSpacing: 5, color: `${SAND.gold}AA` }}>
            {isAr ? '✦ خاص بلودو ✦' : '✦ LUDO ONLY ✦'}
          </p>
          <h1 className="font-display tracking-widest mt-1"
            style={{ fontSize: 36, color: SAND.gold, letterSpacing: '0.16em', textShadow: `0 0 24px ${SAND.gold}66` }}>
            {isAr ? titleAr : titleEn}
          </h1>
          <p className="font-arabic italic mt-3" style={{ fontSize: 14, color: 'rgba(245,230,200,0.55)', lineHeight: 1.7 }}>
            {isAr ? taglineAr : taglineEn}
          </p>

          <div className="flex items-center justify-center gap-2 mt-5 mb-3">
            <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${SAND.gold}66)` }} />
            <span style={{ color: SAND.gold, fontSize: 14 }}>✦</span>
            <div style={{ width: 60, height: 1, background: `linear-gradient(to left, transparent, ${SAND.gold}66)` }} />
          </div>

          <p className="font-arabic font-bold mb-3" style={{ fontSize: 13, color: SAND.goldLight }}>
            {isAr ? 'قريباً • قيد البناء' : 'Coming soon · Under construction'}
          </p>

          <ul className="text-start space-y-2 inline-flex flex-col mt-2" style={{ direction: dir }}>
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.7)' }}>
                <span style={{ color: SAND.gold, marginTop: 2, fontSize: 11 }}>✦</span>
                <span>{isAr ? b.ar : b.en}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="font-arabic text-center italic mt-6" style={{ fontSize: 11, color: 'rgba(245,230,200,0.30)' }}>
          {isAr
            ? 'هذا القسم منفصل عن تشيك تماماً — له عملته وبيانته الخاصة'
            : 'This section is fully separate from Check — its own currency and data'}
        </p>
      </main>
    </div>
  );
}

// ── Six dedicated stubs ──────────────────────────────────────────────────────
export function LudoStorePage() {
  return <LudoSubPage
    icon="🛒"
    titleAr="متجر النرد" titleEn="DICE STORE"
    taglineAr="نرد ذهبية، طاولات حصرية، شخصيات بدوية"
    taglineEn="Golden dice, exclusive boards, Bedouin tokens"
    bullets={[
      { ar: 'نرد ذهبي، عاجي، صدفي، رملي', en: 'Gold, ivory, pearl, sand dice skins' },
      { ar: 'طاولات حصرية: الواحة، الصحراء، البيت الإماراتي', en: 'Boards: Oasis, Sahara, Diyar Al-Imarat' },
      { ar: 'توكنز: صقر، جمل، نخلة، لؤلؤة', en: 'Tokens: falcon, camel, palm, pearl' },
      { ar: 'شراء بكوينز لودو أو جواهر لودو', en: 'Pay with Ludo coins or Ludo gems' },
    ]}
  />;
}

export function LudoLeaderboardPage() {
  return <LudoSubPage
    icon="🏆"
    titleAr="تصنيف لودو" titleEn="LUDO LEADERBOARD"
    taglineAr="لكل سباق أبطاله — انت من الأحسن؟"
    taglineEn="Every race has its champions — are you one?"
    bullets={[
      { ar: 'تصنيف عالمي — أعلى انتصارات لودو في العالم', en: 'Global — most Ludo wins worldwide' },
      { ar: 'تصنيف محلي — أبطال الإمارات', en: 'Local — UAE\'s top players' },
      { ar: 'تصنيف الأصدقاء — لقاء بين دياركم', en: 'Friends — beat your circle' },
      { ar: 'مفصول تماماً عن تصنيف تشيك', en: 'Fully separate from the Check leaderboard' },
    ]}
  />;
}

export function LudoFriendsPage() {
  return <LudoSubPage
    icon="👥"
    titleAr="أصدقاء لودو" titleEn="LUDO FRIENDS"
    taglineAr="ألعب مع من تحب — ومن تنافس"
    taglineEn="Play with the ones you love — and rival"
    bullets={[
      { ar: 'قائمة أصدقاء خاصة بلودو', en: 'Friends list scoped to Ludo' },
      { ar: 'دعوات سريعة لغرفة لودو خاصة', en: 'Quick invites to a private Ludo room' },
      { ar: 'إشعارات داخلية لما يدخل صديقك', en: 'In-app pings when a friend joins' },
      { ar: 'سجل المباريات بينكم', en: 'Match history vs each friend' },
    ]}
  />;
}

export function LudoClansPage() {
  return <LudoSubPage
    icon="🛡️"
    titleAr="قبائل لودو" titleEn="LUDO CLANS"
    taglineAr="قبيلتك ميدانك — احمل اسمها بالنرد"
    taglineEn="Your clan, your arena — carry the banner"
    bullets={[
      { ar: 'قبائل خاصة بلودو منفصلة عن قبائل تشيك', en: 'Ludo-only clans, separate from Check clans' },
      { ar: 'بطولات قبائل لودو الأسبوعية', en: 'Weekly clan tournaments' },
      { ar: 'بنك القبيلة بكوينز لودو', en: 'Clan bank in Ludo coins' },
      { ar: 'إنجازات وتاريخ قبيلتك في النرد', en: 'Your clan\'s dice legacy' },
    ]}
  />;
}

export function LudoTournamentsPage() {
  return <LudoSubPage
    icon="🎯"
    titleAr="بطولات لودو" titleEn="LUDO TOURNAMENTS"
    taglineAr="من رمي النرد إلى رفع الكأس"
    taglineEn="From dice roll to lifting the cup"
    bullets={[
      { ar: 'بطولات فردية يومية وأسبوعية', en: 'Daily + weekly solo cups' },
      { ar: 'بطولات قبائل ٤×٤ — قبيلة ضد قبيلة', en: 'Clan brackets 4-on-4' },
      { ar: 'جوائز جواهر وكوينز لودو', en: 'Ludo gem & coin prizes' },
      { ar: 'كؤوس ذهبية تظهر في ملفك', en: 'Gold cups displayed on your profile' },
    ]}
  />;
}

export function LudoHistoryPage() {
  return <LudoSubPage
    icon="📜"
    titleAr="سجل لودو" titleEn="LUDO HISTORY"
    taglineAr="كل سباق له حكاية — هذي حكاياتك"
    taglineEn="Every race has a tale — these are yours"
    bullets={[
      { ar: 'كل مباريات لودو الماضية', en: 'All your past Ludo matches' },
      { ar: 'قتلاتك، إخراجاتك، وسرعة وصولك', en: 'Captures, launches, and time-to-finish' },
      { ar: 'فلاتر: ضد البوتات، أونلاين، خاصة', en: 'Filter: vs bots, online, private' },
      { ar: 'إعادة المباراة (في الجلسة القادمة)', en: 'Match replay (coming next)' },
    ]}
  />;
}
