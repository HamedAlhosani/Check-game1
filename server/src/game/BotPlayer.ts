import { Card, GameState } from '@check-game/shared';
import { getCardValue } from './Card';

type BotAction =
  | { type: 'DRAW' }
  | { type: 'CALL_CHECK' }
  | { type: 'BURN_DRAWN' }
  | { type: 'SWAP_DRAWN'; position: number }
  | { type: 'SPECIAL_PEEK_OWN'; position: number }
  | { type: 'SPECIAL_SWAP'; myPosition: number; targetUid: string; targetPosition: number };

export class BotPlayer {
  readonly uid: string;
  private difficulty: 'easy' | 'medium' | 'hard';
  private knownCardValues: Map<string, number> = new Map();

  constructor(uid: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.uid = uid;
    this.difficulty = difficulty;
  }

  recordKnownCard(position: number, value: number): void {
    this.knownCardValues.set(`${this.uid}-${position}`, value);
  }

  decideTurn(state: GameState, drawnCard?: Card): BotAction {
    const me = state.players.find(p => p.uid === this.uid);
    if (!me) return { type: 'DRAW' };

    // Sync values from revealed cards visible in public state (positions 0,1)
    for (let i = 0; i < me.cards.length; i++) {
      const c = me.cards[i];
      if (c && c.isRevealed) {
        this.knownCardValues.set(`${this.uid}-${i}`, getCardValue(c));
      }
    }

    if (state.phase === 'SPECIAL_J' && state.specialActionUid === this.uid) {
      return this.decideSpecialSwap(state);
    }

    if (state.phase === 'SPECIAL_Q' && state.specialActionUid === this.uid) {
      return this.decideSpecialPeek(me.cards.length);
    }

    if (drawnCard) {
      return this.decideDrawnCard(drawnCard, me.cards);
    }

    const activePlayers = state.players.filter(p => !p.isEliminated).length;
    const checkUnlocked = state.dealTurnCount >= activePlayers * 4;
    if (checkUnlocked && !state.checkCallerId) {
      const estimate = this.estimateHandValue(me.cards);
      if (this.shouldCallCheck(estimate)) {
        return { type: 'CALL_CHECK' };
      }
    }

    return { type: 'DRAW' };
  }

  private decideDrawnCard(drawn: Card, myCards: (Card | null)[]): BotAction {
    const drawnValue = getCardValue(drawn);

    if (this.difficulty === 'easy') {
      const pos = this.findWorstOrUnknownPosition(myCards);
      return drawnValue <= 6 ? { type: 'SWAP_DRAWN', position: pos } : { type: 'BURN_DRAWN' };
    }

    const worstPos = this.findWorstKnownPosition(myCards);
    if (worstPos !== -1) {
      const worstValue = this.knownCardValues.get(`${this.uid}-${worstPos}`) ?? 13;
      if (drawnValue < worstValue) {
        return { type: 'SWAP_DRAWN', position: worstPos };
      }
    }

    // Hard: if drawn is very low and there's an unknown slot, gamble swap
    if (this.difficulty === 'hard' && drawnValue <= 2) {
      const unknownPos = this.findUnknownPosition(myCards);
      if (unknownPos !== -1) return { type: 'SWAP_DRAWN', position: unknownPos };
    }

    return { type: 'BURN_DRAWN' };
  }

  private decideSpecialSwap(state: GameState): BotAction {
    const opponents = state.players.filter(p => p.uid !== this.uid && !p.isEliminated);
    if (!opponents.length) return { type: 'DRAW' };

    const me = state.players.find(p => p.uid === this.uid)!;
    const myWorstPos = this.findWorstKnownPosition(me.cards);
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    const validTargetCards = target.cards.map((c, i) => ({ c, i })).filter(x => x.c !== null);
    const targetPos = validTargetCards[Math.floor(Math.random() * validTargetCards.length)]?.i ?? 0;

    return {
      type: 'SPECIAL_SWAP',
      myPosition: myWorstPos !== -1 ? myWorstPos : 0,
      targetUid: target.uid,
      targetPosition: targetPos,
    };
  }

  private decideSpecialPeek(cardCount: number): BotAction {
    for (let i = 0; i < cardCount; i++) {
      if (!this.knownCardValues.has(`${this.uid}-${i}`)) {
        return { type: 'SPECIAL_PEEK_OWN', position: i };
      }
    }
    return { type: 'SPECIAL_PEEK_OWN', position: 0 };
  }

  private shouldCallCheck(estimate: number): boolean {
    const threshold = this.difficulty === 'hard' ? 12 : this.difficulty === 'medium' ? 16 : 20;
    return estimate <= threshold && Math.random() > 0.3;
  }

  private estimateHandValue(cards: (Card | null)[]): number {
    let total = 0;
    for (let i = 0; i < cards.length; i++) {
      if (!cards[i]) continue;
      const known = this.knownCardValues.get(`${this.uid}-${i}`);
      total += known !== undefined ? known : 6.5;
    }
    return total;
  }

  private findWorstKnownPosition(cards: (Card | null)[]): number {
    let worstPos = -1;
    let worstValue = -1;
    for (let i = 0; i < cards.length; i++) {
      if (!cards[i]) continue;
      const known = this.knownCardValues.get(`${this.uid}-${i}`);
      if (known !== undefined && known > worstValue) {
        worstValue = known;
        worstPos = i;
      }
    }
    return worstPos;
  }

  private findUnknownPosition(cards: (Card | null)[]): number {
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i] && !this.knownCardValues.has(`${this.uid}-${i}`)) return i;
    }
    return -1;
  }

  private findWorstOrUnknownPosition(cards: (Card | null)[]): number {
    const worst = this.findWorstKnownPosition(cards);
    if (worst !== -1) return worst;
    const unknown = this.findUnknownPosition(cards);
    return unknown !== -1 ? unknown : 0;
  }
}
