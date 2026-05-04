import { LudoGameState } from '@check-game/shared';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface LudoBotAction {
  type: 'ROLL' | 'MOVE';
  pieceId?: string;
}

export class LudoBotPlayer {
  readonly uid: string;
  readonly difficulty: BotDifficulty;

  constructor(uid: string, difficulty: BotDifficulty) {
    this.uid = uid;
    this.difficulty = difficulty;
  }

  decideAction(state: LudoGameState): LudoBotAction {
    const me = state.players.find(p => p.uid === this.uid);
    if (!me) return { type: 'ROLL' };

    if (!state.diceRolled) return { type: 'ROLL' };

    const movable = state.movablePieces;
    if (movable.length === 0) return { type: 'ROLL' };

    if (this.difficulty === 'easy') {
      return { type: 'MOVE', pieceId: movable[0] };
    }

    if (this.difficulty === 'medium') {
      // Prefer piece closest to home
      const sorted = [...movable].sort((a, b) => {
        const pA = me.pieces.find(p => p.id === a)?.relativePos ?? 0;
        const pB = me.pieces.find(p => p.id === b)?.relativePos ?? 0;
        return pB - pA;
      });
      return { type: 'MOVE', pieceId: sorted[0] };
    }

    // Hard: prefer capture > advance home column > advance nearest > bring out on 6
    const diceVal = state.diceValue ?? 0;
    let best = movable[0];
    let bestScore = -1;

    for (const pid of movable) {
      const piece = me.pieces.find(p => p.id === pid);
      if (!piece) continue;
      let score = piece.relativePos;
      // Bonus if already in home column
      if (piece.relativePos >= 52) score += 100;
      // Bonus for entering board with 6
      if (piece.relativePos === -1 && diceVal === 6) score += 10;
      if (score > bestScore) { bestScore = score; best = pid; }
    }

    return { type: 'MOVE', pieceId: best };
  }
}
