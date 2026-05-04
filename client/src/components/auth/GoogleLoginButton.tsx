import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { loginWithGoogle } from '../../services/auth.service';
import { apiClient } from '../../services/api.service';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { UserProfile } from '@check-game/shared';
import { useNavigate } from 'react-router-dom';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function GoogleLoginButton() {
  const { setUser, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();

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
      addToast('فشل تسجيل الدخول بـ Google', 'error');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-gold/20" />
        <span className="text-sand/40 text-xs font-arabic">أو</span>
        <div className="flex-1 h-px bg-gold/20" />
      </div>
      <div className="flex justify-center [&>div]:w-full [&_iframe]:w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => addToast('فشل تسجيل الدخول بـ Google', 'error')}
          text="continue_with"
          shape="rectangular"
          size="large"
          theme="filled_black"
          locale="ar"
          width="100%"
        />
      </div>
    </div>
  );
}
