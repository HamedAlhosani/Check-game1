import { create } from 'zustand';
import type { TournamentState } from '@check-game/shared';

export interface TournamentFinished {
  tournamentId: string;
  championUid: string | null;
  isHostChampion: boolean;
  prizeCoins: number;
}

interface TournamentStore {
  state: TournamentState | null;
  finished: TournamentFinished | null;
  setState: (s: TournamentState | null) => void;
  setFinished: (f: TournamentFinished | null) => void;
  clear: () => void;
}

export const useTournamentStore = create<TournamentStore>((set) => ({
  state: null,
  finished: null,
  setState: (s) => set({ state: s, finished: s?.status === 'finished' ? null : null }),
  setFinished: (f) => set({ finished: f }),
  clear: () => set({ state: null, finished: null }),
}));
