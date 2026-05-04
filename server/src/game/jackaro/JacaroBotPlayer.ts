import { JacaroGameState, JacaroCard } from '@check-game/shared';
import { validateMeld, calculateMeldPoints } from './JacaroValidator';
import { getCardPoints } from './JacaroDeck';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface JacaroBotAction {
  type: 'DRAW' | 'DRAW_DISCARD' | 'DISCARD' | 'MELD' | 'EXTEND_MELD' | 'KNOCK';
  cardId?: string;
  cardIds?: string[];
  meldId?: string;
  fromDiscard?: boolean;
}

export class JacaroBotPlayer {
  readonly uid: string;
  readonly difficulty: BotDifficulty;

  constructor(uid: string, difficulty: BotDifficulty) {
    this.uid = uid;
    this.difficulty = difficulty;
  }

  decideAction(state: JacaroGameState, hand: JacaroCard[]): JacaroBotAction {
    const me = state.players.find(p => p.uid === this.uid);
    if (!me) return { type: 'DRAW' };

    if (!me.hasDrawn) {
      // Decide whether to draw from deck or discard
      if (this.difficulty !== 'easy' && state.discardTop) {
        // Medium/Hard: draw discard if it helps
        const discardTop = state.discardTop;
        if (this.wouldHelp(discardTop, hand)) {
          return { type: 'DRAW_DISCARD', fromDiscard: true };
        }
      }
      return { type: 'DRAW' };
    }

    // Has drawn: try to meld, then discard
    if (this.difficulty !== 'easy' && !me.hasOpenedMeld) {
      const meld = this.findBestMeld(hand);
      if (meld && calculateMeldPoints(meld) >= 51) {
        return { type: 'MELD', cardIds: meld.map(c => c.id) };
      }
    }

    // Discard worst card
    const worst = [...hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
    return { type: 'DISCARD', cardId: worst.id };
  }

  private wouldHelp(card: JacaroCard, hand: JacaroCard[]): boolean {
    // Check if card can form a meld with existing hand cards
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        const test = [card, hand[i], hand[j]];
        if (validateMeld(test).valid) return true;
      }
    }
    return false;
  }

  private findBestMeld(hand: JacaroCard[]): JacaroCard[] | null {
    // Try all combinations of 3+ cards
    for (let size = 3; size <= Math.min(hand.length, 6); size++) {
      const combo = this.findMeldOfSize(hand, size);
      if (combo) return combo;
    }
    return null;
  }

  private findMeldOfSize(hand: JacaroCard[], size: number): JacaroCard[] | null {
    const combos = this.combinations(hand, size);
    for (const combo of combos) {
      if (validateMeld(combo).valid) return combo;
    }
    return null;
  }

  private combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    const withFirst = this.combinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = this.combinations(rest, k);
    return [...withFirst, ...withoutFirst];
  }
}
