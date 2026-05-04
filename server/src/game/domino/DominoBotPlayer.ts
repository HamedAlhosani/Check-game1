import { DominoGameState, DominoTile } from '@check-game/shared';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface DominoBotAction {
  type: 'PLAY' | 'DRAW' | 'PASS';
  tileId?: string;
  end?: 'left' | 'right';
}

export class DominoBotPlayer {
  readonly uid: string;
  readonly difficulty: BotDifficulty;
  private knownTiles: Map<string, DominoTile> = new Map();

  constructor(uid: string, difficulty: BotDifficulty) {
    this.uid = uid;
    this.difficulty = difficulty;
  }

  trackDraw(tile: DominoTile): void {
    this.knownTiles.set(tile.id, tile);
  }

  decideAction(state: DominoGameState, hand: DominoTile[]): DominoBotAction {
    if (state.chain.tiles.length === 0) {
      const highest = hand.find(t => t.left === t.right && t.left === 6)
        || hand.find(t => t.left === t.right)
        || hand[0];
      if (highest) return { type: 'PLAY', tileId: highest.id, end: 'right' };
    }

    const { leftEnd, rightEnd } = state.chain;
    const playable = hand.filter(t =>
      t.left === leftEnd || t.right === leftEnd ||
      t.left === rightEnd || t.right === rightEnd
    );

    if (playable.length === 0) {
      if (state.boneyardCount > 0) return { type: 'DRAW' };
      return { type: 'PASS' };
    }

    if (this.difficulty === 'easy') {
      const tile = playable[0];
      const end = (tile.left === leftEnd || tile.right === leftEnd) ? 'left' : 'right';
      return { type: 'PLAY', tileId: tile.id, end };
    }

    // Medium/Hard: prefer to play highest pip tile
    const sorted = [...playable].sort((a, b) => (b.left + b.right) - (a.left + a.right));
    const best = sorted[0];
    const end = (best.left === leftEnd || best.right === leftEnd) ? 'left' : 'right';
    return { type: 'PLAY', tileId: best.id, end };
  }
}
