import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { loginWithGoogle } from '../../services/auth.service';
import { apiClient } from '../../services/api.service';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { UserProfile } from '@check-game/shared';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../i18n/useT';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function GoogleLoginButton() {
  const { setUser, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const lang = useLang();
  const isAr = lang === 'ar';

  if (!CLIENT_ID) return null;

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    try {
      const authUser = await loginWithGoogle(response.credential);
      setUser(authUser);
      socketService.connect();
      const profile = await apiClient.get<UserProfile>('/api/profile');
      setProfile(profile);
      navigate('/home');
    } catch {
      addToast(isAr ? 'فشل تسجيل الدخول بـ Google' : 'Google sign-in failed', 'error');
    }
  };

  return (
    <div className="w-full">
      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.3))' }} />
        <span style={{ color: 'rgba(201,168,76,0.45)', fontSize: 11, letterSpacing: '0.12em', fontWeight: 500 }}>
          {isAr ? 'أو تابع بـ' : 'or continue with'}
        </span>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.3))' }} />
      </div>

      {/* Google button wrapper */}
      <div
        style={{
          borderRadius: 12,
          border: '1px solid rgba(201,168,76,0.18)',
          background: 'rgba(255,255,255,0.025)',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(6px)',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.18)'; }}
      >
        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span style={{ color: 'rgba(245,230,200,0.55)', fontSize: 12, letterSpacing: '0.04em' }}>
            {isAr ? 'Google' : 'Google'}
          </span>
        </div>

        {/* The actual Google button */}
        <div className="[&>div]:!w-full [&_iframe]:!w-full" style={{ width: '100%' }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => addToast(isAr ? 'فشل تسجيل الدخول بـ Google' : 'Google sign-in failed', 'error')}
            text="continue_with"
            shape="rectangular"
            size="large"
            theme="filled_black"
            locale={lang === 'ar' ? 'ar' : 'en'}
            width="100%"
          />
        </div>
      </div>
    </div>
  );
}
