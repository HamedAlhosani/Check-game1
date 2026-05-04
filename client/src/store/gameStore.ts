import { create } from 'zustand';
import { GameState, RoomState, Card } from '@check-game/shared';

interface ChatMessage {
  uid: string;
  displayName: string;
  avatarId: string;
  text: string;
  emoji: string;
  timestamp: number;
}

interface ScoreResult {
  roundNumber: number;
  scores: Record<string, number>;
  cumulative: Record<string, number>;
  checkPenalty: boolean;
  checkCallerId: string;
  lowestUid: string | null;
}

interface GameStoreState {
  gameState: GameState | null;
  room: RoomState | null;
  drawnCard: Card | null;
  chatMessages: ChatMessage[];
  lastScores: ScoreResult | null;
  showScoreBoard: boolean;
  gameOverData: { winnerId: string | null; finalScores: Record<string, number> } | null;

  setGameState: (s: GameState) => void;
  setRoom: (r: RoomState | null) => void;
  setDrawnCard: (c: Card | null) => void;
  addChatMessage: (m: ChatMessage) => void;
  setLastScores: (s: ScoreResult | null) => void;
  setShowScoreBoard: (v: boolean) => void;
  setGameOverData: (d: { winnerId: string | null; finalScores: Record<string, number> } | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  gameState: null,
  room: null,
  drawnCard: null,
  chatMessages: [],
  lastScores: null,
  showScoreBoard: false,
  gameOverData: null,

  setGameState: (gameState) => set({ gameState }),
  setRoom: (room) => set({ room }),
  setDrawnCard: (drawnCard) => set({ drawnCard }),
  addChatMessage: (m) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), m] })),
  setLastScores: (lastScores) => set({ lastScores }),
  setShowScoreBoard: (showScoreBoard) => set({ showScoreBoard }),
  setGameOverData: (gameOverData) => set({ gameOverData }),
  reset: () => set({
    gameState: null, drawnCard: null, chatMessages: [],
    lastScores: null, showScoreBoard: false, gameOverData: null,
  }),
}));
