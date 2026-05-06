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
