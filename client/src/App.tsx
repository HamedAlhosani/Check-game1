import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from './services/api.service';
import { socketService } from './services/socket.service';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { useGameStore } from './store/gameStore';
import { UserProfile, SOCKET_EVENTS, GameState } from '@check-game/shared';

// Critical-path pages — keep eager so first paint is instant
import { LoginPage } from './pages/auth/LoginPage';
import { LandingPage } from './pages/landing/LandingPage';
import { HomePage } from './pages/home/HomePage';
import { CheckGamePage } from './pages/game/CheckGamePage';
import { CheckSpectatePage } from './pages/game/CheckSpectatePage';
import { ToastContainer } from './components/shared/ToastContainer';
import { RulesModal } from './components/shared/RulesModal';
import { hapticService } from './services/haptic.service';
import { pushService } from './services/push.service';

// Secondary pages — code-split. Loaded on first navigation.
// We also keep references to the dynamic-import factories so we can prefetch
// them silently during browser idle time (see PrefetchOnIdle below).
const loadRegister      = () => import('./pages/auth/RegisterPage');
const loadProfile       = () => import('./pages/profile/ProfilePage');
const loadUserProfile   = () => import('./pages/profile/UserProfilePage');
const loadLeaderboard   = () => import('./pages/leaderboard/LeaderboardPage');
const loadStore         = () => import('./pages/store/StorePage');
const loadFriends       = () => import('./pages/friends/FriendsPage');
const loadHistory       = () => import('./pages/history/HistoryPage');
const loadCardsPreview  = () => import('./pages/cards-preview/CardsPreviewPage');
const loadTournaments   = () => import('./pages/tournaments/TournamentsPage');
const loadClans         = () => import('./pages/clans/ClansPage');
const loadTutorial      = () => import('./pages/tutorial/TutorialPage');
const loadTeams         = () => import('./pages/teams/TeamsPage');
const loadReplay        = () => import('./pages/replay/ReplayPage');

const RegisterPage      = lazy(() => loadRegister().then(m => ({ default: m.RegisterPage })));
const ProfilePage       = lazy(() => loadProfile().then(m => ({ default: m.ProfilePage })));
const UserProfilePage   = lazy(() => loadUserProfile().then(m => ({ default: m.UserProfilePage })));
const LeaderboardPage   = lazy(() => loadLeaderboard().then(m => ({ default: m.LeaderboardPage })));
const StorePage         = lazy(() => loadStore().then(m => ({ default: m.StorePage })));
const FriendsPage       = lazy(() => loadFriends().then(m => ({ default: m.FriendsPage })));
const HistoryPage       = lazy(() => loadHistory().then(m => ({ default: m.HistoryPage })));
const CardsPreviewPage  = lazy(() => loadCardsPreview().then(m => ({ default: m.CardsPreviewPage })));
const TournamentsPage   = lazy(() => loadTournaments().then(m => ({ default: m.TournamentsPage })));
const ClansPage         = lazy(() => loadClans().then(m => ({ default: m.ClansPage })));
const TutorialPage      = lazy(() => loadTutorial().then(m => ({ default: m.TutorialPage })));
const TeamsPage         = lazy(() => loadTeams().then(m => ({ default: m.TeamsPage })));
const ReplayPage        = lazy(() => loadReplay().then(m => ({ default: m.ReplayPage })));

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

/**
 * If the URL contains ?ref=CODE and the user is logged in but hasn't already
 * redeemed someone's code, fire the redeem call once. Strips the param after
 * so a refresh doesn't loop. New signups land on /login first; the param
 * survives the redirect via localStorage.
 */
function ReferralRedeemer() {
  const { user, profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref) {
      // Stash so the redeem fires after auth completes if the user just signed up.
      try { localStorage.setItem('pending_referral', ref.toUpperCase()); } catch { /* noop */ }
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    const stashed = (() => { try { return localStorage.getItem('pending_referral'); } catch { return null; } })();
    if (!stashed) return;
    if ((profile as any).referredBy) {
      try { localStorage.removeItem('pending_referral'); } catch { /* noop */ }
      return;
    }
    apiClient.post<{ profile: UserProfile; granted: number }>('/api/referral/redeem', { code: stashed })
      .then(res => {
        if (res?.profile) setProfile(res.profile);
        try { localStorage.removeItem('pending_referral'); } catch { /* noop */ }
        addToast(`+${res.granted.toLocaleString()} 🪙 (referral bonus)`, 'success');
      })
      .catch(() => { try { localStorage.removeItem('pending_referral'); } catch { /* noop */ } });
  }, [user, profile?.uid]);

  return null;
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

/**
 * After the app is interactive, silently prefetch every lazy route chunk
 * during browser idle time. By the time the user clicks 'Profile' or
 * 'Store' those chunks are already in the HTTP cache → instant navigation.
 */
function PrefetchOnIdle() {
  useEffect(() => {
    const idle = (cb: () => void) => {
      const ric = (window as any).requestIdleCallback;
      if (ric) ric(cb, { timeout: 4000 });
      else setTimeout(cb, 1500);
    };
    idle(() => {
      loadProfile(); loadStore(); loadLeaderboard();
      loadFriends(); loadHistory(); loadCardsPreview();
      loadUserProfile(); loadRegister(); loadTournaments(); loadClans();
      loadTutorial(); loadTeams(); loadReplay();
    });
  }, []);
  return null;
}

/**
 * Listens for SYSTEM_RECONNECT_STATE on the global socket. If the server
 * reports the user is in an active in-progress game and we're not already
 * on the matching /game/check/:id URL, navigate there. This is what makes
 * "open the site URL again and you're back in the game" work.
 */
/**
 * Listens for `reward:first_win_of_day` so the player gets a celebratory
 * toast the first time they win a Check match each calendar day. The
 * payload also tells us how many bonus coins were granted on top of the
 * normal payout.
 */
/**
 * Silently re-syncs the push subscription when the user already opted in
 * on this device. Browsers occasionally rotate the endpoint (e.g. on a
 * service-worker update) so re-POSTing on app start keeps the server
 * pointing at the live subscription. No permission prompt fires here —
 * we only re-subscribe if permission was already granted previously.
 */
function PushResubscribeGate() {
  const { user } = useAuthStore();
  useEffect(() => {
    if (!user) return;
    if (!pushService.isSupported()) return;
    if (!pushService.isOptedIn()) return;
    if (pushService.permission() !== 'granted') return;
    pushService.enable().catch(() => null);
  }, [user]);
  return null;
}

function FirstWinBonusGate() {
  const { user, profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();

  useEffect(() => {
    if (!user) return;
    const sock = socketService.connect();
    const onBonus = (data: { baseCoins: number; bonusCoins: number }) => {
      addToast(`🌅 أول فوز اليوم! +${data.bonusCoins} كوينز إضافية`, 'success', 6000);
      // Tactile cue so the bonus feels rewarding even before the toast loads.
      hapticService.reward();
      // Reflect the bonus on the local coin balance so the header counter
      // updates without a profile refetch.
      if (profile) setProfile({ ...profile, coins: (profile.coins || 0) + data.bonusCoins });
    };
    sock.on('reward:first_win_of_day', onBonus);
    return () => { sock.off('reward:first_win_of_day', onBonus); };
  }, [user, profile, setProfile, addToast]);

  return null;
}

function ResumeGameGate() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setGameState } = useGameStore();

  useEffect(() => {
    if (!user) return;
    const sock = socketService.connect();
    // Only redirect on the FIRST reconnect of this page lifecycle. Otherwise
    // clicking Start from Home (which can momentarily reconnect the socket)
    // would yank the user back into their old game. URL-refresh / direct URL
    // entry triggers a fresh page load, so this ref resets to false again.
    let used = false;
    const onResume = (state: GameState) => {
      if (used) { setGameState(state); return; }
      used = true;
      if (!state?.gameId) return;
      setGameState(state);
      const target = `/game/check/${state.gameId}`;
      // Only redirect from genuinely 'idle' pages — / or /home — never from
      // /game/* (we're already there) or /profile etc (user is doing
      // something else and shouldn't get yanked away).
      const path = window.location.pathname;
      const isIdle = path === '/' || path === '/home';
      if (isIdle && path !== target) navigate(target, { replace: true });
    };
    sock.on(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, onResume);
    return () => { sock.off(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, onResume); };
  }, [user, navigate, setGameState]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <GlobalOverlays />
        <ResumeGameGate />
        <FirstWinBonusGate />
        <PushResubscribeGate />
        <ReferralRedeemer />
        <PrefetchOnIdle />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/game/check/:gameId" element={<ProtectedRoute><CheckGamePage /></ProtectedRoute>} />
            <Route path="/watch/check/:gameId" element={<ProtectedRoute><CheckSpectatePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/user/:uid" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
            <Route path="/store" element={<ProtectedRoute><StorePage /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/tournaments" element={<ProtectedRoute><TournamentsPage /></ProtectedRoute>} />
            <Route path="/clans" element={<ProtectedRoute><ClansPage /></ProtectedRoute>} />
            <Route path="/tutorial" element={<ProtectedRoute><TutorialPage /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/replay/:gameId" element={<ProtectedRoute><ReplayPage /></ProtectedRoute>} />
            <Route path="/cards-preview" element={<CardsPreviewPage />} />
            <Route path="*" element={<FallbackRoute />} />
          </Routes>
        </Suspense>
      </AuthGate>
    </BrowserRouter>
  );
}
