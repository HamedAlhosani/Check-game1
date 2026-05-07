import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';
import { useUiStore } from '../../store/uiStore';

const SAND = {
  bg1: '#0E0905',
  panel: '#14100A',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  goldDark: '#7A6303',
  cream: '#F4E4BE',
};

type CupKind = 'solo' | 'clan';

const CUPS: { kind: CupKind; ar: string; en: string; subAr: string; subEn: string; icon: string; prizeAr: string; prizeEn: string }[] = [
  {
    kind: 'solo',
    ar: 'كأس الفارس',
    en: 'Solo Cup',
    subAr: '٤ أو ٨ متسابقين · شجرة إقصاء واحدة',
    subEn: '4 or 8 racers · single-elimination bracket',
    icon: '🏆',
    prizeAr: 'حتى ١٨٠٠٠ كوينز لودو + جوهرة',
    prizeEn: 'Up to 18000 Ludo coins + gem',
  },
  {
    kind: 'clan',
    ar: 'كأس القبائل',
    en: 'Clan Cup',
    subAr: '٤ ضد ٤ · قبيلتك تواجه قبيلة أخرى',
    subEn: '4-vs-4 clan bracket',
    icon: '🛡️',
    prizeAr: '٧٠٪ للفائز و ٣٠٪ لبنك القبيلة',
    prizeEn: '70% to the champion · 30% to the clan bank',
  },
];

const SCHEDULE: { ar: string; en: string }[] = [
  { ar: 'يومياً ٨ مساءً — كأس الفارس مفتوح', en: 'Daily 8 PM — Solo Cup opens' },
  { ar: 'الجمعة ٩ مساءً — كأس القبائل', en: 'Friday 9 PM — Clan Cup' },
  { ar: 'الأخير من كل شهر — كأس السلطان', en: 'Last of each month — Sultan\'s Grand Cup' },
];

/**
 * Ludo Tournaments — standalone page. Doesn't fall through to /tournaments
 * (which is Check-only). True Ludo brackets need server-side bracket
 * orchestration on top of LudoEngine, which is in the Phase-2 backlog —
 * for now this page lays out the format, prize tiers, and schedule so the
 * player isn't bounced to the Check world.
 */
export function LudoTournamentsPageFull() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [notify, setNotify] = useState<CupKind | null>(null);

  const handleNotify = (k: CupKind) => {
    setNotify(k);
    addToast(isAr ? '✓ بنخبرك أول ما يفتح' : '✓ We\'ll ping you when it opens', 'success');
  };

  return (
    <div className="min-h-screen relative pb-12" style={{ background: SAND.bg1, direction: dir }}>
      <LudoPageBackground />

      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{ background: '#0E0905', borderBottom: `1.5px solid ${SAND.gold}55`, boxShadow: '0 4px 18px rgba(0,0,0,0.5)' }}>
        <button onClick={() => navigate('/ludo')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>{isAr ? 'لودو' : 'Ludo'}</span>
        </button>
        <span className="font-display tracking-widest flex items-center gap-1.5"
          style={{ fontSize: 14, color: SAND.gold }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          {isAr ? 'بطولات لودو' : 'LUDO TOURNAMENTS'}
        </span>
        <LangToggle />
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-3 pt-4">
        {/* Hero — anchors the section */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 mb-5 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${SAND.gold}24 0%, #14100A 70%)`,
            border: `2px solid ${SAND.gold}88`,
            boxShadow: `0 12px 36px rgba(0,0,0,0.6), 0 0 30px ${SAND.gold}33`,
          }}>
          <span style={{ fontSize: 48, lineHeight: 1, filter: `drop-shadow(0 0 20px ${SAND.gold}99)` }}>🎯</span>
          <p className="font-arabic mt-2" style={{ fontSize: 11, color: `${SAND.gold}AA`, letterSpacing: 5 }}>
            {isAr ? '✦ ميدان السباق الأكبر ✦' : '✦ THE GRAND ARENA ✦'}
          </p>
          <h1 className="font-display tracking-widest mt-1"
            style={{
              fontSize: 32, color: SAND.gold, letterSpacing: '0.16em',
              textShadow: `0 0 22px ${SAND.gold}66`,
            }}>
            {isAr ? 'بطولات لودو' : 'LUDO CUPS'}
          </h1>
          <p className="font-arabic italic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.6)', lineHeight: 1.7, maxWidth: 360, margin: '8px auto 0' }}>
            {isAr
              ? '"النصر في الصحراء لا يُمنح — يُكسب بصبر وحكمة"'
              : '"Victory in the desert isn\'t given — it\'s earned with patience and wit"'}
          </p>
        </motion.div>

        {/* Cup cards */}
        <p className="font-arabic mb-2" style={{ fontSize: 11, color: SAND.gold, letterSpacing: 2, paddingInlineStart: 6 }}>
          {isAr ? '✦ الكؤوس' : '✦ CUPS'}
        </p>
        <div className="space-y-2.5 mb-5">
          {CUPS.map(cup => {
            const enabled = false; // Phase-2: real Ludo brackets land soon
            return (
              <motion.div key={cup.kind}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: enabled
                    ? `linear-gradient(135deg, ${SAND.gold}28, ${SAND.panel})`
                    : SAND.panel,
                  border: `2px ${enabled ? 'solid' : 'dashed'} ${enabled ? SAND.gold : SAND.gold + '55'}`,
                  boxShadow: enabled ? `0 0 22px ${SAND.gold}44` : 'none',
                }}>
                {/* Coming-soon ribbon — top corner */}
                {!enabled && (
                  <div className="absolute top-2 inset-inline-end-2 rounded-lg px-2 py-0.5 font-arabic font-bold"
                    style={{
                      insetInlineEnd: 8, top: 8,
                      background: SAND.goldDark, color: SAND.goldLight,
                      fontSize: 9, letterSpacing: 1,
                    }}>
                    {isAr ? 'قريباً' : 'SOON'}
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 38, lineHeight: 1, opacity: enabled ? 1 : 0.7, filter: enabled ? `drop-shadow(0 0 14px ${SAND.gold}99)` : 'none' }}>
                    {cup.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-arabic font-bold" style={{ fontSize: 17, color: SAND.cream }}>
                      {isAr ? cup.ar : cup.en}
                    </h3>
                    <p className="font-arabic mt-0.5" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
                      {isAr ? cup.subAr : cup.subEn}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 rounded-lg px-2 py-1 inline-flex"
                      style={{ background: `${SAND.gold}18`, border: `1px solid ${SAND.gold}55` }}>
                      <span style={{ fontSize: 12 }}>🏆</span>
                      <span className="font-arabic font-bold" style={{ fontSize: 11, color: SAND.gold }}>
                        {isAr ? cup.prizeAr : cup.prizeEn}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleNotify(cup.kind)}
                  disabled={notify === cup.kind}
                  className="w-full mt-3 rounded-xl py-2.5 font-arabic font-bold disabled:opacity-50"
                  style={{
                    background: notify === cup.kind
                      ? 'rgba(122,199,79,0.18)'
                      : `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
                    color: notify === cup.kind ? '#7AC74F' : '#0E0905',
                    border: `1.5px solid ${notify === cup.kind ? '#7AC74F77' : SAND.gold}`,
                    fontSize: 13, cursor: notify === cup.kind ? 'default' : 'pointer',
                    boxShadow: notify === cup.kind ? 'none' : `0 0 16px ${SAND.gold}55`,
                  }}>
                  {notify === cup.kind
                    ? (isAr ? '✓ سننبهك عند الافتتاح' : '✓ We\'ll notify you')
                    : (isAr ? '🔔 نبهني عند الافتتاح' : '🔔 Notify me')}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Schedule preview */}
        <p className="font-arabic mb-2" style={{ fontSize: 11, color: SAND.gold, letterSpacing: 2, paddingInlineStart: 6 }}>
          {isAr ? '✦ الجدول' : '✦ SCHEDULE'}
        </p>
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: SAND.panel, border: `1.5px solid ${SAND.gold}33` }}>
          {SCHEDULE.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0"
              style={{ borderBottom: i < SCHEDULE.length - 1 ? `1px solid ${SAND.gold}18` : 'none' }}>
              <span style={{ color: SAND.gold, fontSize: 11 }}>✦</span>
              <span className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.7)' }}>
                {isAr ? s.ar : s.en}
              </span>
            </div>
          ))}
        </div>

        {/* Honest note — no fallback to Check */}
        <div className="rounded-2xl p-4 text-center"
          style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
          <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)', lineHeight: 1.7 }}>
            {isAr
              ? 'البطولات قاعدة تتبنى — شجرة لودو حقيقية على نظامها الخاص. لن نوّجهك لبطولات تشيك.'
              : 'Live Ludo brackets are still being built — running on their own engine. We won\'t bounce you to the Check tournaments.'}
          </p>
        </div>
      </main>
    </div>
  );
}
