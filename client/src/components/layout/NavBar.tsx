import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../services/auth.service';
import { Avatar } from '../shared/Avatar';

export function NavBar() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-gold/20" style={{ background: 'rgba(7,15,26,0.92)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"/>
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">

        <Link to="/home" className="flex items-center gap-2 group">
          <span className="text-2xl select-none" aria-hidden="true">🂡</span>
          <div>
            <span className="font-display text-lg font-bold tracking-widest shimmer-text">CHECK</span>
            <span className="block text-gold/50 text-xs font-arabic leading-none tracking-wide">لعبة الأوراق</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1 border border-gold/20" style={{ background: 'rgba(201,168,76,0.06)' }}>
            <span className="text-sm">🪙</span>
            <span className="text-gold font-bold text-sm font-mono">{profile?.coins ?? 0}</span>
          </div>

          <Link to="/store" className="flex items-center gap-1.5 text-sand/70 hover:text-gold transition-colors text-sm font-arabic">
            <span className="text-base">🛍</span>
            <span className="hidden sm:inline">المتجر</span>
          </Link>

          <Link to="/leaderboard" className="text-sand/70 hover:text-gold transition-colors text-sm font-arabic hidden sm:inline">
            التصنيف
          </Link>

          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar
              avatarId={profile?.avatarId || 'avatar_1'}
              size="sm"
              frameId={profile?.equippedItems?.avatarFrame}
            />
            <div className="hidden sm:block">
              <p className="text-sand-light text-sm font-arabic leading-none">{profile?.displayName}</p>
              <p className="text-gold/70 text-xs">{profile?.ranking?.title ?? ''}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="text-sand/40 hover:text-danger/80 transition-colors text-xs font-arabic border border-transparent hover:border-danger/20 rounded px-1.5 py-0.5"
          >
            خروج
          </button>
        </div>
      </div>
    </nav>
  );
}
