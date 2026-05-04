import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { loginWithEmail } from '../../services/auth.service';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api.service';
import { socketService } from '../../services/socket.service';
import { UserProfile } from '@check-game/shared';
import { GoogleLoginButton } from './GoogleLoginButton';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useUiStore();
  const { setUser, setProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authUser = await loginWithEmail(email, password);
      setUser(authUser);
      socketService.connect();
      const profile = await apiClient.get<UserProfile>('/api/profile');
      setProfile(profile);
      navigate('/home');
    } catch (err: any) {
      const msg = err.message || '';
      addToast(msg.includes('password') || msg.includes('Wrong') ? 'كلمة المرور غير صحيحة' : 'البريد الإلكتروني غير موجود', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
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
        placeholder="••••••••"
        required
        dir="ltr"
      />

      <Button type="submit" loading={loading} className="w-full">
        تسجيل الدخول
      </Button>

      <GoogleLoginButton />

      <p className="text-center text-sand/60 text-sm font-arabic pt-1">
        ليس لديك حساب؟{' '}
        <Link to="/register" className="text-gold hover:text-gold-light transition-colors">
          إنشاء حساب
        </Link>
      </p>
    </form>
  );
}
