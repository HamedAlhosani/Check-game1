import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { registerWithEmail } from '../../services/auth.service';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api.service';
import { socketService } from '../../services/socket.service';
import { UserProfile } from '@check-game/shared';
import { GoogleLoginButton } from './GoogleLoginButton';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useUiStore();
  const { setUser, setProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { addToast('الاسم قصير جداً', 'error'); return; }
    if (password.length < 8) { addToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error'); return; }
    if (password !== confirm) { addToast('كلمتا المرور غير متطابقتين', 'error'); return; }

    setLoading(true);
    try {
      const authUser = await registerWithEmail(email, password, name.trim());
      setUser(authUser);
      socketService.connect();
      const profile = await apiClient.get<UserProfile>('/api/profile');
      setProfile(profile);
      navigate('/home');
    } catch (err: any) {
      const msg = err.message || '';
      addToast(msg.includes('use') || msg.includes('409') ? 'البريد الإلكتروني مستخدم بالفعل' : 'حدث خطأ في إنشاء الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <Input
        label="الاسم"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="اسمك في اللعبة"
        required
      />
      <Input
        label="البريد الإلكتروني"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="example@email.com"
        required
        dir="ltr"
      />
      <Input
        label="كلمة المرور"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="8 أحرف على الأقل"
        required
        dir="ltr"
      />
      <Input
        label="تأكيد كلمة المرور"
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="أعد كتابة كلمة المرور"
        required
        dir="ltr"
      />

      <Button type="submit" loading={loading} className="w-full mt-2">
        إنشاء الحساب
      </Button>

      <GoogleLoginButton />

      <p className="text-center text-sand/60 text-sm font-arabic pt-1">
        لديك حساب؟{' '}
        <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
