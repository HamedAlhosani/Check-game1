import { Card, GameState } from '@check-game/shared';
import { getCardValue } from './Card';

export type BotAction =
  | { type: 'DRAW' }
  | { type: 'CALL_CHECK' }
  | { type: 'BURN_DRAWN' }
  | { type: 'SWAP_DRAWN'; position: number }
  | { type: 'TAKE_DISCARD'; position: number }
  | { type: 'BURN_DISCARD'; position: number }
  | { type: 'KING_SWAP'; choiceIndex: number; handPosition: number }
  | { type: 'SPECIAL_PEEK_OWN'; position: number }
  | { type: 'SPECIAL_SWAP'; myPosition: number; targetUid: string; targetPosition: number };

export class BotPlayer {
  readonly uid: string;
  private difficulty: 'easy' | 'medium' | 'hard';
  private myCards: Map<number, Card> = new Map();

  constructor(uid: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.uid = uid;
    this.difficulty = difficulty;
  }

  updateCards(cards: (Card | null)[]): void {
    this.myCards.clear();
    for (let i = 0; i < cards.length; i++) {
      if (cards[i]) this.myCards.set(i, cards[i]!);
    }
  }

  decideTurn(state: GameState, drawnCard?: Card): BotAction {
    const me = state.players.find(p => p.uid === this.uid);
    if (!me) return { type: 'DRAW' };

    if (state.phase === 'SPECIAL_J' && state.specialActionUid === this.uid) {
      return this.decideSpecialSwap(state);
    }
    if (state.phase === 'SPECIAL_Q' && state.specialActionUid === this.uid) {
      return this.decideSpecialPeek();
    }

    if (drawnCard) {
      return this.decideDrawnCard(drawnCard);
    }

    const discardTop = state.discardTop;

    // ─── EASY: training-level bot ───────────────────────────────────────────
    // Doesn't burn from discard, doesn't take from discard, rarely calls check.
    // Just draws and either swaps a high card or burns the drawn one.
    if (this.difficulty === 'easy') {
      // Easy almost never calls check — only when hand is obviously tiny
      const activePlayers = state.players.filter(p => !p.isEliminated).length;
      const checkUnlocked = state.dealTurnCount >= activePlayers * 4;
      if (checkUnlocked && !state.checkCallerId && Math.random() < 0.05) {
        const estimate = this.estimateHandValue();
        if (estimate <= 6) return { type: 'CALL_CHECK' };
      }
      return { type: 'DRAW' };
    }

    // ─── MEDIUM: normal play ────────────────────────────────────────────────
    // Burns from discard rarely (~25%), takes from discard rarely (~15%),
    // calls check at a reasonable threshold.
    if (this.difficulty === 'medium') {
      if (discardTop && !state.lastDiscardFromKing && Math.random() < 0.25) {
        const burnPos = this.findRankMatch(discardTop.rank);
        if (burnPos !== -1) return { type: 'BURN_DISCARD', position: burnPos };
      }

      if (discardTop && !state.lastDiscardFromKing && Math.random() < 0.15) {
        const discardVal = getCardValue(discardTop);
        const worstPos = this.findWorstPosition();
        if (worstPos !== -1) {
          const worstVal = this.getCardVal(worstPos);
          if (discardVal < worstVal - 3 && discardVal <= 4) {
            return { type: 'TAKE_DISCARD', position: worstPos };
          }
        }
      }

      const activePlayers = state.players.filter(p => !p.isEliminated).length;
      const checkUnlocked = state.dealTurnCount >= activePlayers * 4;
      if (checkUnlocked && !state.checkCallerId) {
        const estimate = this.estimateHandValue();
        if (estimate <= 14 && Math.random() > 0.3) return { type: 'CALL_CHECK' };
      }

      return { type: 'DRAW' };
    }

    // ─── HARD: pro bot ──────────────────────────────────────────────────────
    // Always burns matching discard rank, eagerly takes from discard if it
    // beats worst card, calls check aggressively when hand is low.
    if (discardTop && !state.lastDiscardFromKing) {
      const burnPos = this.findRankMatch(discardTop.rank);
      if (burnPos !== -1) return { type: 'BURN_DISCARD', position: burnPos };
    }

    if (discardTop && !state.lastDiscardFromKing) {
      const discardVal = getCardValue(discardTop);
      const worstPos = this.findWorstPosition();
      if (worstPos !== -1) {
        const worstVal = this.getCardVal(worstPos);
        if (discardVal < worstVal - 1 && discardVal <= 6) {
          return { type: 'TAKE_DISCARD', position: worstPos };
        }
      }
    }

    const activePlayers = state.players.filter(p => !p.isEliminated).length;
    const checkUnlocked = state.dealTurnCount >= activePlayers * 4;
    if (checkUnlocked && !state.checkCallerId) {
      const estimate = this.estimateHandValue();
      if (estimate <= 10 && Math.random() > 0.15) return { type: 'CALL_CHECK' };
    }

    return { type: 'DRAW' };
  }

  decideKingSwap(kingCards: Card[]): BotAction {
    let bestIdx = 0, bestVal = Infinity;
    for (let i = 0; i < kingCards.length; i++) {
      const v = getCardValue(kingCards[i]);
      if (v < bestVal) { bestVal = v; bestIdx = i; }
    }
    const worstPos = this.findWorstPosition();
    const handPos = worstPos !== -1 ? worstPos : 0;
    const worstVal = handPos !== -1 ? this.getCardVal(handPos) : 13;
    if (bestVal < worstVal) {
      return { type: 'KING_SWAP', choiceIndex: bestIdx, handPosition: handPos };
    }
    return { type: 'KING_SWAP', choiceIndex: -1, handPosition: -1 };
  }

  private decideDrawnCard(drawn: Card): BotAction {
    const drawnValue = getCardValue(drawn);
    const worstPos = this.findWorstPosition();

    if (this.difficulty === 'easy') {
      // Easy makes random-ish choices — sometimes swaps a low drawn card with
      // a low hand card (suboptimal) and burns even okay cards.
      if (Math.random() < 0.4) return { type: 'BURN_DRAWN' };
      if (worstPos !== -1 && drawnValue < this.getCardVal(worstPos) - 1) {
        return { type: 'SWAP_DRAWN', position: worstPos };
      }
      return drawnValue <= 4
        ? { type: 'SWAP_DRAWN', position: worstPos !== -1 ? worstPos : 0 }
        : { type: 'BURN_DRAWN' };
    }

    if (worstPos !== -1 && drawnValue < this.getCardVal(worstPos)) {
      return { type: 'SWAP_DRAWN', position: worstPos };
    }

    if (this.difficulty === 'hard' && drawnValue <= 2) {
      const unknownPos = this.findUnknownPosition();
      if (unknownPos !== -1) return { type: 'SWAP_DRAWN', position: unknownPos };
    }

    return { type: 'BURN_DRAWN' };
  }

  private decideSpecialSwap(state: GameState): BotAction {
    const opponents = state.players.filter(p => p.uid !== this.uid && !p.isEliminated);
    if (!opponents.length) return { type: 'DRAW' };
    const target = opponents.reduce((best, p) => p.cardCount > best.cardCount ? p : best, opponents[0]);
    const validCards = target.cards.map((c, i) => ({ c, i })).filter(x => x.c !== null);
    const targetPos = validCards[Math.floor(Math.random() * validCards.length)]?.i ?? 0;
    const worstPos = this.findWorstPosition();
    return {
      type: 'SPECIAL_SWAP',
      myPosition: worstPos !== -1 ? worstPos : 0,
      targetUid: target.uid,
      targetPosition: targetPos,
    };
  }

  private decideSpecialPeek(): BotAction {
    const worstPos = this.findWorstPosition();
    if (worstPos !== -1) return { type: 'SPECIAL_PEEK_OWN', position: worstPos };
    return { type: 'SPECIAL_PEEK_OWN', position: 0 };
  }

  private findRankMatch(rank: string): number {
    for (const [pos, card] of this.myCards) {
      if (card.rank === rank) return pos;
    }
    return -1;
  }

  private findWorstPosition(): number {
    let worst = -1, worstVal = -1;
    for (const [pos] of this.myCards) {
      const v = this.getCardVal(pos);
      if (v > worstVal) { worstVal = v; worst = pos; }
    }
    return worst;
  }

  private findUnknownPosition(): number {
    const allPos = Array.from(this.myCards.keys());
    return allPos.length > 0 ? allPos[allPos.length - 1] : -1;
  }

  private getCardVal(position: number): number {
    const c = this.myCards.get(position);
    return c ? getCardValue(c) : 6.5;
  }

  private estimateHandValue(): number {
    let total = 0;
    for (const [, card] of this.myCards) {
      total += getCardValue(card);
    }
    return total;
  }
}
