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
      'اجمع أقل نقاط ممكنة بين جميع اللاعبين',
      'أول واحد يوصل 100 نقطة يطلع من اللعبة',
      'آخر واحد يبقى يفوز',
    ],
  },
  {
    title: 'قيمة الأوراق',
    icon: '🃏',
    items: [
      'A (آس) = 1 نقطة',
      '2 إلى 9 = قيمتها كما هي',
      'J ، Q ، K = 10 نقاط',
      '10 أحمر (قلب♥ أو ديموند♦) = 0 نقطة',
    ],
  },
  {
    title: 'بداية اللعبة',
    icon: '👀',
    items: [
      'كل لاعب يحصل على 4 أوراق: 2 فوق مكشوفة و2 تحت مخفية',
      'في البداية لديك 8 ثوانٍ لتتلصص على أوراقك المخفية فقط',
      'تذكر مكان أوراقك المخفية — هذا مهم جداً',
    ],
  },
  {
    title: 'كيف تلعب',
    icon: '🔄',
    items: [
      'في دورك: اسحب ورقة من المجموعة أو من المرمية',
      'بعد السحب: إما تحرق الورقة (ترميها للمكان المرمي) أو تبادلها مع ورقة من عندك',
      'إذا أبدلت: الورقة القديمة من عندك تذهب للمرمي',
    ],
  },
  {
    title: 'الأوراق الخاصة',
    icon: '✨',
    items: [
      'K (كينغ): اسحب ورقتين زيادة من المجموعة',
      'Q حمراء (♥ أو ♦): اكشف ورقة مخفية من عندك',
      'J (جوكر): تبادل ورقة من عندك مع ورقة من عند أي لاعب',
      'هذه الأوراق تفعل مفعولها فقط إذا سحبتها من المجموعة',
    ],
  },
  {
    title: 'الحرق 🔥',
    icon: '🔥',
    items: [
      'إذا رمى اللاعب على يسارك ورقة تطابق واحدة من أوراقك وتعرف مكانها',
      'تقدر "تحرقها" — يعني ترمي ورقتك المشابهة على نفس الورقة المرمية',
      'الحرق يجعلك تتخلص من ورقة وعندك الآن 3 أوراق فقط',
      'لا يمكن الحرق إذا جاءت الورقة من K (الكينغ)',
      'الحرق الخاطئ يعاقبك بورقتين زيادة',
    ],
  },
  {
    title: 'Check — كيف تفوز',
    icon: '🏆',
    items: [
      'بعد الجولة الرابعة، أي لاعب يقدر يقول "CHECK"',
      'بعد CHECK يلف دور واحد أخير على الجميع',
      'ثم يكشف الجميع أوراقهم ويحسب النقاط',
      'إذا صاحب CHECK أقل واحد: يأخذ 0 نقطة والباقون يتسجلون',
      'إذا في أحد عنده نقاط أقل منه: صاحب CHECK نقاطه تتضاعف ⚠️',
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

      <Button onClick={handleDone} className="w-full">
        فهمت! ابدأ اللعب 🎮
      </Button>
    </Modal>
  );
}
