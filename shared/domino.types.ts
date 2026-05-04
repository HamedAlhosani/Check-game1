export interface DominoTile {
  id: string; // e.g. '6-4' or '6-4-b' for second copy
  left: number;
  right: number;
}

export interface PlacedTile extends DominoTile {
  orientation: 'h' | 'v';
  flipped: boolean; // if true, left/right are displayed swapped
}

export interface DominoChain {
  tiles: PlacedTile[];
  leftEnd: number;
  rightEnd: number;
}

export interface DominoPlayerState {
  uid: string;
  displayName: string;
  avatarId: string;
  tileCount: number;
  isTurn: boolean;
  isEliminated: boolean;
  cumulativeScore: number;
  passedThisTurn: boolean;
}

export interface DominoGameState {
  gameId: string;
  roomId: string;
  phase: 'WAITING' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER';
  players: DominoPlayerState[];
  chain: DominoChain;
  boneyardCount: number;
  currentTurnUid: string;
  turnEndAt: number | null;
  roundNumber: number;
  scores: Record<string, number>;
  winnerId: string | null;
}
