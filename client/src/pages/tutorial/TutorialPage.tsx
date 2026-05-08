import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell } from '../../components/shared/PageShell';
import { useLang } from '../../i18n/useT';
import { soundService } from '../../services/sound.service';

/**
 * TutorialPage — full text-driven walkthrough that teaches a brand-new
 * player the idea of Check, the rules, and what to actually *do* on a
 * turn. Unlike the RulesModal (terse one-screen reference), this page
 * explains the *why* behind each mechanic in friendly Emirati Arabic
 * and walks the reader chapter-by-chapter so nothing feels overwhelming.
 */

type ChapterId =
  | 'idea' | 'setup' | 'values' | 'turn' | 'special'
  | 'burn' | 'check' | 'tips' | 'modes' | 'ready';

interface Chapter {
  id: ChapterId;
  icon: string;
  titleAr: string;
  titleEn: string;
}

const CHAPTERS: Chapter[] = [
  { id: 'idea',    icon: '💡', titleAr: 'فكرة اللعبة',       titleEn: 'The Idea' },
  { id: 'setup',   icon: '🃏', titleAr: 'التحضير',           titleEn: 'Setup' },
  { id: 'values',  icon: '🔢', titleAr: 'قيمة كل ورقة',      titleEn: 'Card Values' },
  { id: 'turn',    icon: '🔄', titleAr: 'كيف تلعب دورك',     titleEn: 'Your Turn' },
  { id: 'special', icon: '✨', titleAr: 'الأوراق الخاصة',    titleEn: 'Special Cards' },
  { id: 'burn',    icon: '🔥', titleAr: 'الحرق',             titleEn: 'Burning' },
  { id: 'check',   icon: '🏆', titleAr: 'CHECK والفوز',      titleEn: 'CHECK & Winning' },
  { id: 'tips',    icon: '🧠', titleAr: 'نصائح للمبتدئين',   titleEn: 'Beginner Tips' },
  { id: 'modes',   icon: '🎮', titleAr: 'الأوضاع',           titleEn: 'Game Modes' },
  { id: 'ready',   icon: '🚀', titleAr: 'صرت جاهز',          titleEn: "You're Ready" },
];

export function TutorialPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const [active, setActive] = useState<ChapterId>('idea');

  const idx = CHAPTERS.findIndex(c => c.id === active);
  const prev = CHAPTERS[idx - 1];
  const next = CHAPTERS[idx + 1];

  const goto = (id: ChapterId) => {
    soundService.playClick();
    setActive(id);
    // Scroll the chapter body into view on small screens
    requestAnimationFrame(() => {
      document.getElementById('tutorial-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <PageShell
      title={lang === 'ar' ? '🎓 تعلم لعبة Check' : '🎓 Learn Check'}
      subtitle={lang === 'ar' ? 'دليل شامل من الصفر إلى أول فوز' : 'Full walkthrough — zero to first win'}
      lang={lang}
    >
      {/* ── Chapter navigator ── */}
      <div
        className="rounded-2xl p-3 mb-4 border"
        style={{
          background: 'rgba(229,188,124,0.05)',
          borderColor: 'rgba(229,188,124,0.18)',
        }}
      >
        <p className="font-arabic text-xs mb-2.5" style={{ color: 'rgba(251,243,219,0.45)' }}>
          {lang === 'ar' ? `الفصل ${idx + 1} من ${CHAPTERS.length}` : `Chapter ${idx + 1} of ${CHAPTERS.length}`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => goto(c.id)}
              className="rounded-lg font-arabic text-xs transition-all"
              style={{
                padding: '6px 10px',
                background: c.id === active
                  ? 'linear-gradient(135deg, rgba(229,188,124,0.30), rgba(229,188,124,0.10))'
                  : i < idx
                    ? 'rgba(80,200,120,0.08)'
                    : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  c.id === active
                    ? 'rgba(229,188,124,0.55)'
                    : i < idx
                      ? 'rgba(80,200,120,0.30)'
                      : 'rgba(255,255,255,0.08)'
                }`,
                color: c.id === active
                  ? '#FBF3DB'
                  : i < idx
                    ? 'rgba(80,200,120,0.85)'
                    : 'rgba(251,243,219,0.55)',
                fontWeight: c.id === active ? 700 : 500,
              }}
            >
              <span className="mr-1">{i < idx ? '✓' : c.icon}</span>
              {lang === 'ar' ? c.titleAr : c.titleEn}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chapter body ── */}
      <div id="tutorial-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {active === 'idea'    && <ChapterIdea    lang={lang} />}
            {active === 'setup'   && <ChapterSetup   lang={lang} />}
            {active === 'values'  && <ChapterValues  lang={lang} />}
            {active === 'turn'    && <ChapterTurn    lang={lang} />}
            {active === 'special' && <ChapterSpecial lang={lang} />}
            {active === 'burn'    && <ChapterBurn    lang={lang} />}
            {active === 'check'   && <ChapterCheck   lang={lang} />}
            {active === 'tips'    && <ChapterTips    lang={lang} />}
            {active === 'modes'   && <ChapterModes   lang={lang} />}
            {active === 'ready'   && <ChapterReady   lang={lang} onPlay={() => navigate('/home')} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Prev / Next chapter ── */}
      <div className="flex gap-2 mt-5">
        <button
          disabled={!prev}
          onClick={() => prev && goto(prev.id)}
          className="flex-1 py-2.5 rounded-xl font-arabic text-sm transition-all disabled:opacity-30"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(251,243,219,0.65)',
            cursor: prev ? 'pointer' : 'not-allowed',
          }}
        >
          {lang === 'ar'
            ? `${prev ? '→ ' + prev.titleAr : 'البداية'}`
            : `${prev ? '← ' + prev.titleEn : 'Start'}`}
        </button>
        <button
          disabled={!next}
          onClick={() => next && goto(next.id)}
          className="flex-1 py-2.5 rounded-xl font-arabic font-bold text-sm transition-all disabled:opacity-50"
          style={{
            background: next
              ? 'linear-gradient(135deg, #E5BC7C, #A07338)'
              : 'rgba(80,200,120,0.20)',
            color: next ? '#100A05' : '#7AC74F',
            border: `1px solid ${next ? 'rgba(229,188,124,0.65)' : 'rgba(80,200,120,0.45)'}`,
            cursor: next ? 'pointer' : 'default',
            boxShadow: next ? '0 0 16px rgba(229,188,124,0.30)' : 'none',
          }}
        >
          {lang === 'ar'
            ? next ? `${next.titleAr} ←` : 'انتهى الدرس ✓'
            : next ? `${next.titleEn} →` : 'Done ✓'}
        </button>
      </div>
    </PageShell>
  );
}

// ── Section primitive ────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 mb-3 border"
      style={{
        background: 'linear-gradient(160deg, rgba(54,38,24,0.55) 0%, rgba(24,18,12,0.55) 100%)',
        borderColor: 'rgba(229,188,124,0.20)',
      }}
    >
      <h3 className="font-arabic font-bold flex items-center gap-2 mb-3" style={{ fontSize: 18, color: '#E8C97A' }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        {title}
      </h3>
      <div className="font-arabic" style={{ color: 'rgba(251,243,219,0.85)', fontSize: 14, lineHeight: 1.85 }}>
        {children}
      </div>
    </div>
  );
}

function Callout({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'good'; children: React.ReactNode }) {
  const palette = tone === 'warn'
    ? { bg: 'rgba(196,92,58,0.10)', border: 'rgba(196,92,58,0.40)', text: '#E07040', icon: '⚠️' }
    : tone === 'good'
      ? { bg: 'rgba(80,200,120,0.08)', border: 'rgba(80,200,120,0.35)', text: '#7AC74F', icon: '💡' }
      : { bg: 'rgba(122,180,255,0.08)', border: 'rgba(122,180,255,0.30)', text: '#9DC4FF', icon: 'ℹ️' };
  return (
    <div className="rounded-xl p-3 my-3 flex gap-2 items-start"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
      <span style={{ fontSize: 16, lineHeight: 1.4 }}>{palette.icon}</span>
      <div className="font-arabic flex-1" style={{ fontSize: 13, color: palette.text, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-2.5 items-start">
      <span
        className="rounded-full flex items-center justify-center font-bold shrink-0"
        style={{
          width: 26, height: 26,
          background: 'rgba(229,188,124,0.18)',
          border: '1px solid rgba(229,188,124,0.45)',
          color: '#E8C97A',
          fontSize: 13,
        }}
      >
        {n}
      </span>
      <div className="flex-1" style={{ fontSize: 14, lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

// ── Chapters ─────────────────────────────────────────────────────────────────

function ChapterIdea({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="The Idea" icon="💡">
        <p>
          Check is a card-and-memory game for 2–10 players. Everyone gets four face-down cards.
          You can only see the bottom two — memorize them.
        </p>
        <p className="mt-3">
          Every turn you swap a card from your hand with one from the deck or the discard pile,
          trying to lower the total points hidden in your hand.
        </p>
        <p className="mt-3">
          When you think your hand is the lowest at the table, you call <b>CHECK</b>.
          Everyone reveals — if you really were the lowest, you score 0. If someone is lower than you,
          your score doubles. Last player standing wins.
        </p>
        <Callout tone="good">It's part poker face, part memory test, part timing — you'll get the hang of it in two rounds.</Callout>
      </Section>
    );
  }
  return (
    <Section title="فكرة اللعبة" icon="💡">
      <p>
        <b>Check</b> لعبة كروت وذاكرة من ٢ إلى ١٠ لاعبين. كل لاعب ياخذ ٤ كروت مخفية،
        ما يقدر يشوف غير الكرتين السفليين فقط في البداية — يحفظهم لمدة ١٠ ثوان وبعدها يلتفون.
      </p>
      <p className="mt-3">
        في كل دور تستبدل كرت من يدك بكرت من السحب أو من المرمى، وهدفك تنزّل
        مجموع النقاط اللي بإيدك. كل ما النقاط أقل، أنت أقرب للفوز.
      </p>
      <p className="mt-3">
        لما تحس إن إيدك صارت أقل واحد على الطاولة، تضغط زر <b style={{ color: '#E8C97A' }}>CHECK</b>.
        كل اللاعبين يكشفون أوراقهم — لو كنت فعلاً الأقل: تاخذ <b>٠ نقاط</b>.
        لو في حد أقل منك: نقاطك تتضاعف ×٢ ⚠️.
      </p>
      <p className="mt-3">
        أول لاعب يوصل ١٠٠ نقطة يطلع برّا اللعبة. وآخر لاعب يبقى على الطاولة = الفائز 🏆
      </p>
      <Callout tone="good">
        اللعبة خليط ذاكرة + توقيت + قراءة الخصوم. أول جولتين بس وراح تفهمها، لا تستعجل.
      </Callout>
    </Section>
  );
}

function ChapterSetup({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="Setup" icon="🃏">
        <p>Each game starts the same way:</p>
        <Step n={1}>You're dealt <b>4 face-down cards</b> arranged in a 2×2 grid.</Step>
        <Step n={2}>The two <b>bottom</b> cards flip up for <b>10 seconds</b> — memorize them.</Step>
        <Step n={3}>The two <b>top</b> cards stay hidden — even from you.</Step>
        <Step n={4}>A <b>draw pile</b> sits in the middle and a <b>discard pile</b> beside it (one card face-up to start).</Step>
        <Callout>2–4 players use one deck (52 cards). 5+ players use two decks (104 cards).</Callout>
      </Section>
    );
  }
  return (
    <Section title="التحضير" icon="🃏">
      <p>كل لعبة تبدأ بنفس الطريقة:</p>
      <Step n={1}>توزع عليك <b>٤ كروت مخفية</b> مرتبة في شبكة ٢×٢.</Step>
      <Step n={2}>الكرتين <b>السفليين</b> ينقلبون لك لمدة <b>١٠ ثوان</b> — احفظهم زين.</Step>
      <Step n={3}>الكرتين <b>العلويين</b> يظلون مخفيين — حتى عنك أنت.</Step>
      <Step n={4}>في النص يكون فيه <b>كومة سحب</b>، وبجنبها <b>المرمى</b> (الكومة المفتوحة) فيه ورقة وحدة مكشوفة.</Step>
      <Callout>
        ٢-٤ لاعبين: مجموعة وحدة (٥٢ ورقة).<br/>
        ٥ لاعبين أو أكثر: مجموعتين (١٠٤ ورقة).
      </Callout>
      <p className="mt-3">
        أهم شي في هالمرحلة: <b style={{ color: '#E8C97A' }}>ركّز على الكرتين السفليين وقت الكشف</b>.
        لو ما تذكرت أرقامهم، راح تلعب أعمى طول الجولة.
      </p>
    </Section>
  );
}

function ChapterValues({ lang }: { lang: string }) {
  const VALUES_AR = [
    { card: '١٠ أحمر (♥/♦)', val: '٠', note: 'أحسن ورقة في اللعبة! 🌟' },
    { card: 'A (آس)',          val: '١', note: '' },
    { card: '٢',               val: '٢', note: '' },
    { card: '٣',               val: '٣', note: '' },
    { card: '٤',               val: '٤', note: '' },
    { card: '٥',               val: '٥', note: '' },
    { card: '٦',               val: '٦', note: '' },
    { card: '٧',               val: '٧', note: '' },
    { card: '٨',               val: '٨', note: '' },
    { card: '٩',               val: '٩', note: '' },
    { card: '١٠ أسود (♣/♠)',  val: '١٠', note: '' },
    { card: 'J (شايب)',        val: '١١', note: 'كرت خاص — تبادل' },
    { card: 'Q أحمر (♥/♦)',   val: '١٢', note: 'كرت خاص — كشف' },
    { card: 'Q أسود (♣/♠)',   val: '١٢', note: '' },
    { card: 'K (ملك)',         val: '١٣', note: 'كرت خاص — استبدال مزدوج' },
  ];
  if (lang !== 'ar') {
    return (
      <Section title="Card Values" icon="🔢">
        <p>Hand score = sum of these values. Lower is better.</p>
        <Callout tone="good">
          The <b>red 10s (♥ / ♦)</b> are worth <b>0 points</b> — the best card in the game.
          If you ever see one go to the discard pile, try to grab it.
        </Callout>
        <ul className="mt-3 space-y-1.5" style={{ fontSize: 13 }}>
          <li>A = 1, 2 = 2 ... up to 9 = 9</li>
          <li>Black 10 (♣/♠) = 10</li>
          <li>J (special) = 11</li>
          <li>Q (special, red) = 12 — black Q also 12 but no power</li>
          <li>K (special) = 13</li>
        </ul>
      </Section>
    );
  }
  return (
    <Section title="قيمة كل ورقة" icon="🔢">
      <p>نقاط يدك = مجموع قيم الكروت. كل ما المجموع أقل، أنت أقوى.</p>
      <Callout tone="good">
        <b>الـ ١٠ الحمراء (♥/♦) = ٠ نقاط</b> — أحسن كرت في اللعبة كله.
        لو شفت وحدة طلعت في المرمى، خذها فوراً!
      </Callout>
      <div className="mt-3 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(229,188,124,0.20)' }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(229,188,124,0.10)' }}>
              <th className="font-arabic text-right p-2" style={{ color: '#E8C97A', fontWeight: 700 }}>الورقة</th>
              <th className="font-arabic text-center p-2" style={{ color: '#E8C97A', fontWeight: 700 }}>النقاط</th>
              <th className="font-arabic text-right p-2" style={{ color: '#E8C97A', fontWeight: 700 }}>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {VALUES_AR.map((v, i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderTop: '1px solid rgba(229,188,124,0.06)',
              }}>
                <td className="font-arabic p-2 text-right">{v.card}</td>
                <td className="font-arabic p-2 text-center font-bold" style={{ color: '#E8C97A' }}>{v.val}</td>
                <td className="font-arabic p-2 text-right" style={{ color: 'rgba(251,243,219,0.55)', fontSize: 12 }}>{v.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout>
        ركّز: <b>الـ ١٠ السود (♣/♠) قيمتها ١٠ نقاط — مب صفر</b>. الصفر فقط للحمراء.
      </Callout>
    </Section>
  );
}

function ChapterTurn({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="Your Turn" icon="🔄">
        <p>On your turn you have exactly three options:</p>
        <Step n={1}><b>Draw from the deck.</b> Then either swap it into your hand (the card you drop goes to the discard) or burn it straight to the discard.</Step>
        <Step n={2}><b>Take the top of the discard pile.</b> You must swap it with one of your cards (no burning option here).</Step>
        <Step n={3}><b>Burn from your hand.</b> If you remember a card in your hand matching the rank of the top discard, you can throw it directly. Hand size shrinks from 4 → 3.</Step>
        <Callout>The card you remove always lands face-up on the discard pile, so opponents can see what just left your hand.</Callout>
        <Callout tone="warn">If the deck runs out, the discard is reshuffled into a new deck (keeping just the top card visible).</Callout>
      </Section>
    );
  }
  return (
    <Section title="كيف تلعب دورك" icon="🔄">
      <p>في دورك، عندك ثلاث خيارات بس — ولا أكثر:</p>
      <Step n={1}>
        <b style={{ color: '#E8C97A' }}>اسحب ورقة من السحب.</b> بعدها إما:
        <div className="mt-1.5 ms-4" style={{ fontSize: 13, color: 'rgba(251,243,219,0.7)' }}>
          • تستبدلها بكرت من يدك (الكرت اللي طلع من إيدك يروح للمرمى) <br/>
          • أو تحرقها مباشرة (تروح للمرمى وأنت تظل بنفس عدد الكروت)
        </div>
      </Step>
      <Step n={2}>
        <b style={{ color: '#E8C97A' }}>خذ آخر ورقة من المرمى.</b> هنا لازم تستبدلها بكرت من يدك — ما تقدر تحرقها.
      </Step>
      <Step n={3}>
        <b style={{ color: '#E8C97A' }}>احرق ورقة من يدك.</b> لو تذكرت إن في يدك كرت بنفس رقم آخر ورقة في المرمى،
        تقدر ترميه مباشرة. عدد كروتك ينقص من ٤ إلى ٣ (ميزة كبيرة!).
      </Step>
      <Callout>
        الكرت اللي يطلع من إيدك يروح <b>دايماً</b> للمرمى مكشوف — عشان كذا الخصوم يقدرون يشوفون شو خرج منك.
      </Callout>
      <Callout tone="warn">
        لو خلصت كومة السحب: المرمى يتقلب ويصير سحب جديد، وتبقى آخر ورقة فيه مكشوفة.
      </Callout>
    </Section>
  );
}

function ChapterSpecial({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="Special Cards" icon="✨">
        <p className="mb-3">Three cards have powers — but only when you <b>draw them from the deck</b>, never from the discard.</p>
        <SpecialBlock title="🔄 J — Swap" body="Pick any one of your cards and any one card from any opponent. They swap, blind. Neither side sees what's traded." />
        <SpecialBlock title="👁️ Red Q (♥/♦) — Peek" body="Pick one of your own face-down cards and reveal it to yourself only. Use it to learn one of your hidden top cards." />
        <SpecialBlock title="🃏 K — Double Draw" body="The server pulls two cards from the deck. You pick one to swap into your hand, the other goes to the discard." />
        <Callout tone="warn">If you take a J / red Q / K from the discard pile, the power does NOT trigger — it's just a high-point card you swapped in.</Callout>
      </Section>
    );
  }
  return (
    <Section title="الأوراق الخاصة وأوامرها" icon="✨">
      <p className="mb-3">
        ثلاث كروت عندهم قدرات خاصة — بس بشرط: <b>تسحبهم من السحب</b>، مب من المرمى.
      </p>
      <SpecialBlock
        title="🔄 J — التبادل"
        body="تختار ورقة من يدك، وورقة من أي خصم — ويتبادلون مكانهم بدون ما أحد يشوف وجه الكرتين. سلاح قوي ضد لاعب تشك إن عنده كرت قوي."
      />
      <SpecialBlock
        title="👁️ Q الحمراء (♥/♦) — الكشف"
        body="تختار وحدة من كروتك المخفية وتكشفها لنفسك فقط — ما حد ثاني يشوفها. أحسن استخدام: تكشف وحدة من الكرتين العلويين عشان تعرف رقمها."
      />
      <SpecialBlock
        title="🃏 K — الاستبدال المزدوج"
        body="السيرفر يسحب لك كرتين من السحب. تختار وحدة تستبدلها بكرت من يدك، والثانية تروح للمرمى. يعني تحصل على فرصتين في دور واحد."
      />
      <Callout tone="warn">
        مهم: لو سحبت J / Q حمراء / K <b>من المرمى</b> — القدرة ما تشتغل. تظل بس كرت بنقاط عالية.
      </Callout>
    </Section>
  );
}

function SpecialBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl p-3 mb-2.5 border"
      style={{ background: 'rgba(229,188,124,0.05)', borderColor: 'rgba(229,188,124,0.18)' }}>
      <p className="font-arabic font-bold mb-1.5" style={{ color: '#E8C97A', fontSize: 15 }}>{title}</p>
      <p className="font-arabic" style={{ fontSize: 13.5, color: 'rgba(251,243,219,0.80)', lineHeight: 1.7 }}>{body}</p>
    </div>
  );
}

function ChapterBurn({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="Burning" icon="🔥">
        <p>Burning is the most powerful free move in the game — and the most dangerous.</p>
        <Step n={1}>Look at the top discard. Note its rank.</Step>
        <Step n={2}>If you remember a card in your hand of that same rank, click it.</Step>
        <Step n={3}>That card goes straight to the discard. Your hand shrinks 4 → 3.</Step>
        <Callout tone="good">A successful burn means one less card to score and one less to track. Two burns and you're sitting on just two cards.</Callout>
        <Callout tone="warn">If you burn the wrong card, the discard's top card lands in your hand as punishment — you go 4 → 5. Don't guess.</Callout>
        <Callout>You cannot burn while the top discard is a King (K).</Callout>
      </Section>
    );
  }
  return (
    <Section title="الحرق 🔥" icon="🔥">
      <p>الحرق أقوى حركة مجانية في اللعبة — وأخطر وحدة كمان.</p>
      <Step n={1}>شوف آخر ورقة في المرمى وانتبه لرقمها.</Step>
      <Step n={2}>لو فاكر إن في إيدك كرت بنفس الرقم، اضغط عليه.</Step>
      <Step n={3}>الكرت يطير للمرمى مباشرة، وإيدك تصير ٣ بدل ٤.</Step>
      <Callout tone="good">
        الحرق الناجح يعني: نقاط أقل، وكروت أقل تحفظها. حرقتين ناجحات وأنت بس على كرتين — قريب جداً من CHECK.
      </Callout>
      <Callout tone="warn">
        لو حرقت غلط (الرقم ما يطابق): كرت المرمى ينضاف ليدك كعقوبة. تصير ٥ بدل ٤. لا تقامر — لو ما متأكد، لا تحرق.
      </Callout>
      <Callout>
        ممنوع الحرق إذا الورقة الأخيرة في المرمى من K (الملك). انتظر دور ثاني.
      </Callout>
    </Section>
  );
}

function ChapterCheck({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="CHECK & Winning" icon="🏆">
        <p>The CHECK call is how you cash in. Pull it at the right moment and you ride free.</p>
        <Step n={1}>After 4 full rounds, the CHECK button unlocks. You can press it on your turn.</Step>
        <Step n={2}>Once pressed, every other player gets one final turn — then everyone reveals.</Step>
        <Step n={3}>Scoring follows three branches:</Step>
        <Callout tone="good"><b>You really were the lowest:</b> you score 0. Everyone else gets the full value of their hand added to their cumulative score.</Callout>
        <Callout><b>Tied for lowest:</b> no penalty. Everyone (including you) takes the value of their hand.</Callout>
        <Callout tone="warn"><b>Someone is lower than you:</b> your hand value is doubled. Big punishment for calling early.</Callout>
        <p className="mt-3">First player to reach <b>100 cumulative points</b> is eliminated. Last player standing wins.</p>
      </Section>
    );
  }
  return (
    <Section title="CHECK والفوز" icon="🏆">
      <p>زر <b style={{ color: '#E8C97A' }}>CHECK</b> هو طريقتك تكسب الجولة. لازم توقّت ضغطه صح.</p>
      <Step n={1}>بعد ٤ لفات كاملة، زر CHECK يفتح. تقدر تضغطه في دورك.</Step>
      <Step n={2}>لما تضغط CHECK، كل لاعب باقي ياخذ <b>دور أخير وحيد</b> — وبعدها الكل يكشف أوراقه.</Step>
      <Step n={3}>الحساب يصير على ثلاث حالات:</Step>
      <Callout tone="good">
        ✅ <b>لو كنت فعلاً الأقل:</b> تاخذ <b>٠ نقاط</b>. كل واحد ثاني يتسجّل عليه قيمة يده الكاملة.
      </Callout>
      <Callout>
        🤝 <b>لو تعادلت مع لاعب ثاني (نفس النقاط):</b> ما في عقوبة، الكل (بما فيهم أنت) ياخذ قيمة يده.
      </Callout>
      <Callout tone="warn">
        ❌ <b>لو في لاعب أقل منك:</b> نقاطك تتضاعف <b>×٢</b>. عقوبة قاسية لو ضغطت بدري.
      </Callout>
      <p className="mt-3">
        أول لاعب يوصل <b>١٠٠ نقطة</b> تراكمية يطلع من اللعبة. وآخر لاعب يبقى = الفائز 🏆
      </p>
    </Section>
  );
}

function ChapterTips({ lang }: { lang: string }) {
  const TIPS_AR = [
    'احفظ الكرتين السفليين في البداية — هذا أهم ١٠ ثوان في الجولة كلها.',
    'استخدم Q الحمراء على الكرتين العلويين عشان تعرف وش عندك مخفي.',
    'لا تحرق إلا لو متأكد ١٠٠٪. خسارة الحرق = +٥ كروت = موت بطيء.',
    'الـ ١٠ الحمراء = ٠ نقاط. لو طلعت في المرمى، خذها بأي ثمن.',
    'راقب لاعب يحرق كثير — معناها هو قريب جداً من CHECK، وقتك يجي تضرب J عليه.',
    'لا تضغط CHECK بدري. ٤٠ نقطة بإيدك مب أقل واحد — انتظر تنزل تحت ١٥.',
    'لو كرت بإيدك J: استخدمه ضد اللاعب اللي عنده أقل كروت — احتمال كبير عنده كرت قوي.',
    'تعلّم تتذكّر شو رمى كل خصم — ذاكرتك سلاحك الأول.',
  ];
  if (lang !== 'ar') {
    return (
      <Section title="Beginner Tips" icon="🧠">
        <ul className="space-y-2">
          <li>• Memorize your bottom two — those 10 seconds are the most important in the round.</li>
          <li>• Use red Q peeks on your <i>top</i> hidden cards, not the bottom ones you already saw.</li>
          <li>• Don't burn unless you're 100% sure. A wrong burn = +5 cards = slow death.</li>
          <li>• Red 10 = 0. Snatch any you see in the discard.</li>
          <li>• Watch who burns a lot — they're close to CHECK. Hit them with a J.</li>
          <li>• Don't press CHECK too early. With 40 points in hand you're rarely the lowest.</li>
          <li>• If you draw a J, use it on the opponent with the fewest cards — they're likely sitting on something nasty.</li>
          <li>• Track what each opponent discards. Memory is your edge.</li>
        </ul>
      </Section>
    );
  }
  return (
    <Section title="نصائح للمبتدئين" icon="🧠">
      <p className="mb-3">هذي أهم الدروس اللي راح توفّر عليك جولات كثيرة من الخسارة:</p>
      <ul className="space-y-2.5" style={{ fontSize: 14 }}>
        {TIPS_AR.map((t, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span style={{ color: '#E8C97A', fontWeight: 700, minWidth: 22 }}>{i + 1}.</span>
            <span style={{ lineHeight: 1.75 }}>{t}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ChapterModes({ lang }: { lang: string }) {
  if (lang !== 'ar') {
    return (
      <Section title="Game Modes" icon="🎮">
        <SpecialBlock title="🤖 Bots" body="Practice against AI. No coin entry, no risk. Use this to learn the rules without losing chips." />
        <SpecialBlock title="🌍 Online" body="Public matchmaking against real players. Costs coins to enter, winner takes the pot." />
        <SpecialBlock title="🔒 Private Room" body="Create a code, share with friends. They join with that code. You can fill empty seats with bots." />
        <SpecialBlock title="🏆 Tournaments" body="Multi-round bracket events with bigger pots. Solo mode is bot-only practice." />
      </Section>
    );
  }
  return (
    <Section title="الأوضاع المتوفرة" icon="🎮">
      <SpecialBlock
        title="🤖 ضد البوتات"
        body="تمرّن ضد الذكاء الاصطناعي. ما يكلّفك كوينز ولا في خطر. استخدمه عشان تتعلم القوانين بدون ما تخسر."
      />
      <SpecialBlock
        title="🌍 أونلاين"
        body="مباريات عامة ضد لاعبين حقيقيين من كل مكان. لها رسم اشتراك بالكوينز، والفايز ياخذ كل الجائزة."
      />
      <SpecialBlock
        title="🔒 غرفة خاصة"
        body="تسوي غرفة برمز خاص وتعطيه ربعك. يدخلون بالرمز. لو في مقاعد فاضية تقدر تكمّلها ببوتات."
      />
      <SpecialBlock
        title="🏆 البطولات"
        body="بطولات بنظام إقصاء (عدة جولات) مع جوائز أكبر. وضع 'فردي' للتمرن ضد البوتات."
      />
      <Callout tone="good">
        نصيحة: ابدأ بـ <b>وضع البوتات على صعوبة سهل</b> لأول ٣-٤ جولات. لما تحس إنك مرتاح، انتقل أونلاين.
      </Callout>
    </Section>
  );
}

function ChapterReady({ lang, onPlay }: { lang: string; onPlay: () => void }) {
  if (lang !== 'ar') {
    return (
      <Section title="You're Ready" icon="🚀">
        <p>You now know:</p>
        <ul className="mt-2 space-y-1.5" style={{ fontSize: 14 }}>
          <li>• The goal — lowest hand, last player standing.</li>
          <li>• How a turn works — draw, take, or burn.</li>
          <li>• The three special cards — J, red Q, K.</li>
          <li>• How CHECK scoring resolves.</li>
          <li>• When to play it safe vs. push.</li>
        </ul>
        <Callout tone="good">Recommended first match: bot mode, easy difficulty, 3 bots.</Callout>
        <button
          onClick={onPlay}
          className="w-full mt-4 py-3 rounded-xl font-arabic font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, #E5BC7C, #A07338)',
            color: '#100A05',
            border: '1.5px solid rgba(229,188,124,0.7)',
            boxShadow: '0 0 22px rgba(229,188,124,0.40)',
            fontSize: 16,
          }}
        >
          🎮 Start Playing
        </button>
      </Section>
    );
  }
  return (
    <Section title="صرت جاهز 🚀" icon="🚀">
      <p>الحين أنت تعرف:</p>
      <ul className="mt-2 space-y-1.5" style={{ fontSize: 14 }}>
        <li>✓ <b>الهدف:</b> أقل يد، وآخر لاعب يبقى يفوز.</li>
        <li>✓ <b>الدور:</b> اسحب، خذ من المرمى، أو احرق.</li>
        <li>✓ <b>الكروت الخاصة:</b> J للتبادل، Q الحمراء للكشف، K للاستبدال المزدوج.</li>
        <li>✓ <b>CHECK:</b> متى تضغط ومتى تنتظر.</li>
        <li>✓ <b>متى تامن ومتى تجازف.</b></li>
      </ul>
      <Callout tone="good">
        لأول مباراة: <b>وضع البوتات + صعوبة سهل + ٣ بوتات</b>. اخسر أو افز — هدفك بس تحس باللعبة على الواقع.
      </Callout>
      <button
        onClick={onPlay}
        className="w-full mt-4 py-3 rounded-xl font-arabic font-bold transition-all"
        style={{
          background: 'linear-gradient(135deg, #E5BC7C, #A07338)',
          color: '#100A05',
          border: '1.5px solid rgba(229,188,124,0.7)',
          boxShadow: '0 0 22px rgba(229,188,124,0.40)',
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        🎮 يلا، نلعب!
      </button>
    </Section>
  );
}
