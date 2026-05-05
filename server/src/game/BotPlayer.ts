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
  // Full card knowledge — updated each turn by the scheduler using getBotCards()
  private myCards: Map<number, Card> = new Map();

  constructor(uid: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.uid = uid;
    this.difficulty = difficulty;
  }

  /** Called by the scheduler before each decision with the server's actual card data. */
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

    // 1. Try burning a card from hand that matches discard rank
    if (discardTop && !state.lastDiscardFromKing) {
      const burnPos = this.findRankMatch(discardTop.rank);
      if (burnPos !== -1) return { type: 'BURN_DISCARD', position: burnPos };
    }

    // 2. Try taking the discard pile top if it's significantly better than worst card
    if (discardTop && !state.lastDiscardFromKing && this.difficulty !== 'easy') {
      const discardVal = getCardValue(discardTop);
      const worstPos = this.findWorstPosition();
      if (worstPos !== -1) {
        const worstVal = this.getCardVal(worstPos);
        if (discardVal < worstVal - 2 && discardVal <= 5) {
          return { type: 'TAKE_DISCARD', position: worstPos };
        }
      }
    }

    // 3. Call check if hand is good enough
    const activePlayers = state.players.filter(p => !p.isEliminated).length;
    const checkUnlocked = state.dealTurnCount >= activePlayers * 4;
    if (checkUnlocked && !state.checkCallerId) {
      const estimate = this.estimateHandValue();
      if (this.shouldCallCheck(estimate)) return { type: 'CALL_CHECK' };
    }

    return { type: 'DRAW' };
  }

  decideKingSwap(kingCards: Card[]): BotAction {
    // Pick the lowest-value king choice
    let bestIdx = 0, bestVal = Infinity;
    for (let i = 0; i < kingCards.length; i++) {
      const v = getCardValue(kingCards[i]);
      if (v < bestVal) { bestVal = v; bestIdx = i; }
    }
    // Replace the worst card in hand, or first position if no info
    const worstPos = this.findWorstPosition();
    const handPos = worstPos !== -1 ? worstPos : 0;
    // Only swap if king choice is better than worst card
    const worstVal = handPos !== -1 ? this.getCardVal(handPos) : 13;
    if (bestVal < worstVal) {
      return { type: 'KING_SWAP', choiceIndex: bestIdx, handPosition: handPos };
    }
    // Burn all king cards (return first choice, engine handles burn via onKingBurn)
    return { type: 'KING_SWAP', choiceIndex: -1, handPosition: -1 };
  }

  private decideDrawnCard(drawn: Card): BotAction {
    const drawnValue = getCardValue(drawn);
    const worstPos = this.findWorstPosition();

    if (this.difficulty === 'easy') {
      if (worstPos !== -1 && drawnValue < this.getCardVal(worstPos)) {
        return { type: 'SWAP_DRAWN', position: worstPos };
      }
      return drawnValue <= 5 ? { type: 'SWAP_DRAWN', position: worstPos !== -1 ? worstPos : 0 } : { type: 'BURN_DRAWN' };
    }

    if (worstPos !== -1 && drawnValue < this.getCardVal(worstPos)) {
      return { type: 'SWAP_DRAWN', position: worstPos };
    }

    // Hard: gamble on unknown slots if drawn card is very low
    if (this.difficulty === 'hard' && drawnValue <= 2) {
      const unknownPos = this.findUnknownPosition();
      if (unknownPos !== -1) return { type: 'SWAP_DRAWN', position: unknownPos };
    }

    return { type: 'BURN_DRAWN' };
  }

  private decideSpecialSwap(state: GameState): BotAction {
    const opponents = state.players.filter(p => p.uid !== this.uid && !p.isEliminated);
    if (!opponents.length) return { type: 'DRAW' };
    // Target the opponent with the most cards (likely higher score)
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
    // Peek at the highest-value card we don't know well
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
    // In practice we know all cards now, but find lowest-known as fallback
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

  private shouldCallCheck(estimate: number): boolean {
    const threshold = this.difficulty === 'hard' ? 10 : this.difficulty === 'medium' ? 14 : 18;
    return estimate <= threshold && Math.random() > 0.25;
  }
}
