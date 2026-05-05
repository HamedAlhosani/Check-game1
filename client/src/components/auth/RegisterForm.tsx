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
import { useLang } from '../../i18n/useT';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useUiStore();
  const { setUser, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const lang = useLang();
  const isAr = lang === 'ar';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      addToast(isAr ? 'الاسم قصير جداً' : 'Name is too short', 'error'); return;
    }
    if (password.length < 8) {
      addToast(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters', 'error'); return;
    }
    if (password !== confirm) {
      addToast(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', 'error'); return;
    }

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
      if (msg.includes('use') || msg.includes('409') || msg.includes('already')) {
        addToast(isAr ? 'البريد الإلكتروني مستخدم بالفعل' : 'Email already in use', 'error');
      } else if (msg.includes('fetch') || msg.includes('network') || msg.toLowerCase().includes('failed to fetch')) {
        addToast(isAr ? 'تعذر الاتصال بالخادم' : 'Connection failed', 'error');
      } else {
        addToast(isAr ? 'حدث خطأ في إنشاء الحساب' : 'Registration error', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <Input
        label={isAr ? 'الاسم' : 'Name'}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={isAr ? 'اسمك في اللعبة' : 'Your game name'}
        required
      />
      <Input
        label={isAr ? 'البريد الإلكتروني' : 'Email'}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="example@email.com"
        required
        dir="ltr"
      />
      <Input
        label={isAr ? 'كلمة المرور' : 'Password'}
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder={isAr ? '8 أحرف على الأقل' : 'At least 8 characters'}
        required
        dir="ltr"
      />
      <Input
        label={isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder={isAr ? 'أعد كتابة كلمة المرور' : 'Re-enter password'}
        required
        dir="ltr"
      />

      <Button type="submit" loading={loading} className="w-full mt-2">
        {isAr ? 'إنشاء الحساب' : 'Create Account'}
      </Button>

      <GoogleLoginButton />

      <p className="text-center text-sand/60 text-sm font-arabic pt-1">
        {isAr ? 'لديك حساب؟' : 'Already have an account?'}{' '}
        <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
          {isAr ? 'تسجيل الدخول' : 'Login'}
        </Link>
      </p>
    </form>
  );
}
