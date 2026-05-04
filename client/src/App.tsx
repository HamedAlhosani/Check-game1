import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { apiClient } from './services/api.service';
import { socketService } from './services/socket.service';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { UserProfile } from '@check-game/shared';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LandingPage } from './pages/landing/LandingPage';
import { HomePage } from './pages/home/HomePage';
import { CheckGamePage } from './pages/game/CheckGamePage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage';
import { StorePage } from './pages/store/StorePage';
import { FriendsPage } from './pages/friends/FriendsPage';
import { HistoryPage } from './pages/history/HistoryPage';
import { ToastContainer } from './components/shared/ToastContainer';
import { RulesModal } from './components/shared/RulesModal';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();
  const { setShowRulesModal } = useUiStore();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setLoading(false); return; }

    let uid: string;
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      uid = JSON.parse(atob(b64)).uid;
    } catch {
      localStorage.removeItem('auth_token');
      setLoading(false);
      return;
    }

    setUser({ uid, email: null, displayName: null });
    socketService.connect();

    apiClient.get<UserProfile>('/api/profile')
      .then(p => {
        setUser({ uid, email: p.email, displayName: p.displayName });
        setProfile(p);
        if (!p.hasSeenRules) setShowRulesModal(true);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setUser(null);
        socketService.disconnect();
      })
      .finally(() => setLoading(false));
  }, []);

  return <>{children}</>;
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#04080F' }}>
      <div className="text-center">
        <p className="font-display text-3xl tracking-widest shimmer-text mb-6">CHECK</p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: '#C9A84C', animation: `bounce 0.8s ${i * 0.15}s ease-in-out infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function FallbackRoute() {
  const { user, loading } = useAuthStore();
  if (loading) return <Loading />;
  return <Navigate to={user ? '/home' : '/'} replace />;
}

function GlobalOverlays() {
  const { showRulesModal, setShowRulesModal } = useUiStore();
  return (
    <>
      <ToastContainer />
      <RulesModal open={showRulesModal} onClose={() => setShowRulesModal(false)} />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <GlobalOverlays />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/game/check/:gameId" element={<ProtectedRoute><CheckGamePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/store" element={<ProtectedRoute><StorePage /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}
