import { Modal } from './Modal';
import { Button } from './Button';
import { apiClient } from '../../services/api.service';
import { useUiStore } from '../../store/uiStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'الهدف',
    icon: '🎯',
    items: [
      'اجمع أقل عدد ممكن من النقاط في يدك',
      'أول لاعب يوصل 100 نقطة يطلع من اللعبة',
      'آخر لاعب يبقى = الفائز 🏆',
    ],
  },
  {
    title: 'قيمة كل ورقة',
    icon: '🃏',
    items: [
      '10 الأحمر (♥/♦) = 0 نقطة — أحسن ورقة في اللعبة! 🌟',
      'A (آس) = 1 نقطة',
      '2 = 2 نقطة',
      '3 = 3 نقاط',
      '4 = 4 نقاط',
      '5 = 5 نقاط',
      '6 = 6 نقاط',
      '7 = 7 نقاط',
      '8 = 8 نقاط',
      '9 = 9 نقاط',
      '10 الأسود (♣/♠) = 10 نقاط',
      'J (شايب) = 11 نقطة',
      'Q الأحمر (♥/♦) = 12 نقطة',
      'Q الأسود (♣/♠) = 12 نقطة',
      'K (ملك) = 13 نقطة',
    ],
  },
  {
    title: 'الأوراق الخاصة وأوامرها',
    icon: '✨',
    items: [
      '🔄 J — تبادل ورقة من يدك (تختارها) مع ورقة من خصم (تختارها) — بدون ما تشوف وجه أي ورقة',
      '👁️ Q الأحمر (♥/♦) — تختار ورقة من يدك وتكشفها لك أنت فقط، بقية اللاعبين ما يشوفونها',
      '🃏 K — السيرفر يسحب لك ورقتين من السحب، تختار وحدة تستبدلها بكرت من يدك، والثانية تروح للمرمى',
      'مهم: الأوامر تشتغل فقط لو سحبت الورقة من السحب — مب من المرمى',
    ],
  },
  {
    title: 'بداية اللعبة',
    icon: '👀',
    items: [
      'كل لاعب يحصل على 4 أوراق مخفية (وجه لتحت)',
      'تشوف الورقتين السفليتين فقط (تحت) لمدة 10 ثوانٍ — احفظهم!',
      'الورقتين العلويتين تبقى مجهولة حتى لك',
      '2-4 لاعبين: مجموعة واحدة (52 ورقة)',
      '5+ لاعبين: مجموعتين (104 ورقة)',
    ],
  },
  {
    title: 'كيف تلعب دورك',
    icon: '🔄',
    items: [
      'في دورك عندك 3 خيارات:',
      '1️⃣ اسحب ورقة من السحب → بعدها إما تستبدلها بكرت من يدك، أو تحرقها',
      '2️⃣ خذ آخر ورقة من المرمى → تستبدلها بكرت من يدك',
      '3️⃣ احرق ورقة من يدك إذا كانت بنفس رقم آخر ورقة في المرمى',
      'الورقة المستبدَلة دائماً تروح للمرمى',
      'لو السحب خلص: المرمى يتقلب ويصير سحب جديد (تبقى آخر ورقة في المرمى)',
    ],
  },
  {
    title: 'الحرق 🔥',
    icon: '🔥',
    items: [
      'إذا عندك ورقة بنفس رقم آخر ورقة في المرمى وتعرف مكانها → تقدر تحرقها',
      'الحرق ينقص ورقة من يدك → تصير 3 بدل 4',
      'ممنوع الحرق إذا الورقة الأخيرة في المرمى من K (الملك)',
      '⚠️ لو حرقت غلط (الرقم ما يطابق): ياخذ كرت المرمى ينضاف ليدك، تصير 5 بدل 4',
    ],
  },
  {
    title: 'CHECK — كيف تفوز',
    icon: '🏆',
    items: [
      'بعد 4 لفات كاملة، أي لاعب في دوره يقدر يضغط CHECK',
      'بعد ضغط CHECK، يكمل كل لاعب دور واحد أخير',
      'بعدها كل اللاعبين يكشفون أوراقهم — تُحسب النقاط',
      '✅ صاحب CHECK كان وحده الأقل: ياخذ 0 نقاط، الباقي يتسجل لكل واحد قيمة يده',
      '🤝 صاحب CHECK تعادل مع غيره (نفس النقاط): الكل يتسجل قيمة يده، بدون عقوبة',
      '❌ في لاعب آخر أقل من صاحب CHECK: نقاط صاحب CHECK تتضاعف × 2 ⚠️',
    ],
  },
];

export function RulesModal({ open, onClose }: Props) {
  const { addToast } = useUiStore();

  const handleDone = async () => {
    try { await apiClient.post('/api/profile/rules-seen'); } catch { }
    onClose();
    addToast('أهلاً! استمتع بلعبة Check 🃏', 'success');
  };

  return (
    <Modal open={open} title="قوانين لعبة Check 🃏" size="xl">
      {/* Themed outer banner — distinct from regular modal headers */}
      <div
        className="relative overflow-hidden mb-4"
        style={{
          background: 'linear-gradient(95deg, rgba(60,40,12,0.65) 0%, rgba(40,28,12,0.65) 50%, rgba(14,9,5,0.65) 100%)',
          border: '1.5px solid rgba(232,201,122,0.40)',
          boxShadow: '0 8px 22px rgba(0,0,0,0.55), 0 0 22px rgba(232,201,122,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
          clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)',
          padding: '12px 28px 14px 16px',
        }}>
        <span aria-hidden style={{
          position: 'absolute', top: 6, left: 18, right: 28, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(232,201,122,0.55), transparent)',
        }} />
        <div className="flex items-center gap-3">
          <div className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: 44, height: 44,
              background: 'radial-gradient(circle at 30% 30%, rgba(232,201,122,0.55), rgba(40,28,12,0.55) 75%)',
              border: '1.5px solid rgba(232,201,122,0.65)',
              boxShadow: '0 0 14px rgba(232,201,122,0.40), inset 0 -2px 6px rgba(0,0,0,0.45)',
              fontSize: 22,
            }}>📖</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display tracking-wider"
              style={{
                fontSize: 16, color: '#FFE9B0',
                letterSpacing: '0.10em',
                textShadow: '0 0 12px rgba(232,201,122,0.45)',
              }}>
              قوانين Check
            </h2>
            <p className="font-arabic mt-0.5" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
              تعلم اللعبة بأقل من دقيقة
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 mb-5">
        {SECTIONS.map((sec, i) => (
          <div key={i} className="bg-night/50 rounded-xl p-4 border border-gold/10">
            <h3 className="font-arabic font-bold text-gold mb-3 flex items-center gap-2">
              <span className="text-lg">{sec.icon}</span>
              {sec.title}
            </h3>
            <ul className="space-y-1.5">
              {sec.items.map((rule, j) => (
                <li key={j} className="flex items-start gap-2 text-sand-light text-sm font-arabic leading-relaxed">
                  <span className="text-gold/60 mt-1 shrink-0 text-xs">◆</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <a href="/cards-preview" target="_blank" rel="noopener" className="block w-full mb-3">
        <button
          className="w-full py-3 rounded-xl font-arabic font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(120,80,20,0.15) 100%)',
            border: '1.5px solid rgba(201,168,76,0.55)',
            color: '#E8C97A',
            fontSize: 14,
          }}>
          🃏 شاهد جميع الأوراق
        </button>
      </a>

      <Button onClick={handleDone} className="w-full">
        فهمت! ابدأ اللعب 🎮
      </Button>
    </Modal>
  );
}
