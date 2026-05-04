export type LudoColor = 'red' | 'blue' | 'green' | 'yellow';
export type PieceStatus = 'home_base' | 'active' | 'finished';

export interface LudoPiece {
  id: string;
  color: LudoColor;
  relativePos: number; // -1=home_base, 0-51=path, 52-57=home_column, 58=finished
  status: PieceStatus;
}

export interface LudoPlayerState {
  uid: string;
  displayName: string;
  avatarId: string;
  color: LudoColor;
  pieces: LudoPiece[];
  finishedCount: number;
  isTurn: boolean;
  isEliminated: boolean;
  rank: number | null;
}

export interface LudoGameState {
  gameId: string;
  roomId: string;
  phase: 'WAITING' | 'PLAYING' | 'GAME_OVER';
  players: LudoPlayerState[];
  currentTurnUid: string;
  diceValue: number | null;
  diceRolled: boolean;
  movablePieces: string[];
  consecutiveSixes: number;
  turnEndAt: number | null;
  roundNumber: number;
  winners: string[];
}

export const LUDO_COLORS: LudoColor[] = ['red', 'blue', 'green', 'yellow'];
export const LUDO_START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};
export const LUDO_SAFE_RELATIVE: number[] = [0, 8, 13, 21, 26, 34, 39, 47];
