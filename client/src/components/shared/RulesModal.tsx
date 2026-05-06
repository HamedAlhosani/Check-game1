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
      'أول لاعب يوصل ١٠٠ نقطة يطلع من اللعبة',
      'آخر لاعب يبقى = الفائز 🏆',
    ],
  },
  {
    title: 'قيمة كل ورقة (مرتّبة من الأقل للأكثر)',
    icon: '🃏',
    items: [
      '١٠ الأحمر (♥/♦) = ٠ نقطة — أحسن ورقة في اللعبة! 🌟',
      'A (آس) = ١ نقطة — أقل ورقة عادية',
      '٢ = ٢ نقطة',
      '٣ = ٣ نقاط',
      '٤ = ٤ نقاط',
      '٥ = ٥ نقاط',
      '٦ = ٦ نقاط',
      '٧ = ٧ نقاط',
      '٨ = ٨ نقاط',
      '٩ = ٩ نقاط',
      '١٠ الأسود (♣/♠) = ١٠ نقاط',
      'J (شايب) = ١١ نقطة + ميزة خاصة 🔄',
      'Q الأحمر (♥/♦) = ١٢ نقطة + ميزة خاصة 👁️',
      'Q الأسود (♣/♠) = ١٢ نقطة (بدون ميزة)',
      'K (ملك) = ١٣ نقطة + ميزة خاصة 🃏',
    ],
  },
  {
    title: 'الأوراق الخاصة وأوامرها',
    icon: '✨',
    items: [
      '🔄 J (شايب) — "بدّل كرت": تبدّل كرت من يدك مع كرت من أي خصم (بدون ما تشوفه)',
      '👁️ Q الأحمر (♥/♦) — "اكشف كرت": تشوف ورقة مخفية من يدك',
      '🃏 K (ملك) — "اسحب كرتين": تسحب كرتين، تختار واحد تستبدله بكرت من يدك (والثاني يتحرق)',
      'مهم: الميزات تشتغل فقط لو سحبت الورقة من السحب — مب من المرمى',
    ],
  },
  {
    title: 'بداية اللعبة',
    icon: '👀',
    items: [
      'كل لاعب يحصل على ٤ أوراق مخفية',
      'تشوف الورقتين السفليتين فقط (تحت) لمدة ١٠ ثوانٍ — احفظهم!',
      'الورقتين العلويتين تبقى مجهولة حتى لك',
      '٢-٤ لاعبين: مجموعة واحدة (٥٢ ورقة) · ٥+ لاعبين: مجموعتين (١٠٤ ورقة)',
    ],
  },
  {
    title: 'كيف تلعب دورك',
    icon: '🔄',
    items: [
      'في دورك: ١) اسحب من السحب · ٢) أو خذ آخر ورقة من المرمى · ٣) أو احرق ورقة من يدك (لو تطابق آخر ورقة في المرمى)',
      'بعد السحب من السحب: إما تستبدل الورقة المسحوبة بكرت من يدك، أو تحرقها مباشرة',
      'الورقة المستبدَلة تروح للمرمى',
      'لو السحب خلص — المرمى يتقلب ويصير سحب جديد (آخر ورقة تبقى في المرمى)',
    ],
  },
  {
    title: 'الحرق 🔥',
    icon: '🔥',
    items: [
      'لو عندك ورقة بنفس رقم آخر ورقة في المرمى وتعرف مكانها — تقدر تحرقها',
      'الحرق ينقص ورقة من يدك → عندك ٣ بدل ٤',
      'كل اللاعبين يقدرون يحرقون مب اللاعب اللي بدوره فقط',
      'ممنوع الحرق لو الورقة الأخيرة في المرمى من K (الملك)',
      'لو حرقت غلط (الرقم مايطابق): عقوبة = ورقتين زيادة في يدك ⚠️',
    ],
  },
  {
    title: 'CHECK — كيف تفوز',
    icon: '🏆',
    items: [
      'بعد ٤ لفات كاملة، أي لاعب في دوره يقدر يقول CHECK',
      'بعد CHECK، يكمل كل لاعب دور واحد أخير',
      'بعدها كل اللاعبين يكشفون أوراقهم — تُحسب النقاط',
      '✅ صاحب CHECK كان الأقل وحده: يأخذ ٠ نقاط، الباقي يتسجل لكل واحد قيمة يده',
      '🤝 صاحب CHECK تعادل مع غيره (نفس النقاط): الكل يتسجل قيمة يده، بدون عقوبة',
      '❌ لاعب آخر أقل من صاحب CHECK: العقوبة! نقاط صاحب CHECK تتضاعف × ٢',
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
