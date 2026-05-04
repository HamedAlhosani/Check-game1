import { create } from 'zustand';
import { UserProfile } from '@check-game/shared';
import { AuthUser } from '../services/auth.service';

interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
