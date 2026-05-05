import { v4 as uuidv4 } from 'uuid';
import { Card, GamePhase, GameState, PlayerGameState } from '@check-game/shared';
import { Deck } from './Deck';
import { getCardValue, isSpecialCard } from './Card';
import { canBurnCard } from './BurnValidator';
import { calculateRoundScores, ScoreResult } from './ScoreCalculator';

const PEEK_DURATION_MS = 8000;
const TURN_DURATION_MS = 25000;
const BURN_WINDOW_MS = 3000;
const ROUND_OVER_DELAY_MS = 4000;
const SPECIAL_ACTION_TIMEOUT_MS = 15000;
const CHECK_WINDOW_MS = 1000;     // window after playing to call CHECK (human)
const BOT_CHECK_WINDOW_MS = 300;  // much shorter for bot turns

interface InternalPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  isBot: boolean;
  cards: (Card | null)[];
  cumulativeScore: number;
  isEliminated: boolean;
  seatIndex: number;
  peekedAtStart: boolean;
}

export type GameEventEmitter = (event: string, data: unknown, roomId?: string, toUid?: string) => void;

export class GameEngine {
  readonly gameId: string;
  readonly roomId: string;

  private deck: Deck;
  private players: InternalPlayer[];
  private phase: GamePhase = 'WAITING';
  private currentTurnIndex: number = 0;
  private roundNumber: number = 0;
  private checkCallerId: string | null = null;
  private turnsAfterCheck: number = 0;
  private lastDiscardFromKing: boolean = false;
  private dealTurnCount: number = 0;
  private drawnCards: Map<string, Card> = new Map();
  private peekPhaseEndAt: number | null = null;
  private turnEndAt: number | null = null;
  private burnWindowUid: string | null = null;
  private burnWindowEndAt: number | null = null;
  private specialActionUid: string | null = null;
  private specialActionType: 'J' | 'RED_Q' | null = null;
  private pendingSpecialCard: Card | null = null;
  private kingChoiceCards: Card[] = [];
  private timers: NodeJS.Timeout[] = [];
  private peekDoneSet: Set<string> = new Set();
  private turnActedUid: string | null = null; // blocks double-action in check window

  private emit: GameEventEmitter;

  constructor(
    roomId: string,
    players: { uid: string; displayName: string; avatarId: string; isBot: boolean }[],
    emit: GameEventEmitter
  ) {
    this.gameId = uuidv4();
    this.roomId = roomId;
    this.deck = new Deck();
    this.emit = emit;

    this.players = players.map((p, i) => ({
      ...p,
      cards: [],
      cumulativeScore: 0,
      isEliminated: false,
      seatIndex: i,
      peekedAtStart: false,
    }));
  }

  start(): void {
    this.dealCards();
    this.phase = 'PEEK_PHASE';
    this.peekPhaseEndAt = Date.now() + PEEK_DURATION_MS;
    this.broadcastState();

    // Send each player their two bottom cards privately (all cards are face-down now)
    for (const p of this.players) {
      this.emit('game:peek_own', { cards: [{ card: p.cards[2], position: 2 }, { card: p.cards[3], position: 3 }] }, undefined, p.uid);
    }

    const timer = setTimeout(() => this.endPeekPhase(), PEEK_DURATION_MS);
    this.timers.push(timer);
  }

  private dealCards(): void {
    this.deck.reset();
    for (const p of this.players) {
      p.cards = [];
      for (let i = 0; i < 4; i++) {
        const card = this.deck.draw()!;
        card.isRevealed = false; // all cards start face-down
        p.cards.push(card);
      }
    }
    this.roundNumber++;
  }

  onPeekComplete(uid: string): void {
    const p = this.getPlayer(uid);
    if (!p || this.phase !== 'PEEK_PHASE') return;
    p.peekedAtStart = true;

    const allDone = this.players.filter(p2 => !p2.isEliminated).every(p2 => p2.peekedAtStart);
    if (allDone) {
      this.clearTimers();
      this.endPeekPhase();
    }
  }

  private endPeekPhase(): void {
    this.peekPhaseEndAt = null;
    this.phase = 'PLAYING';
    this.currentTurnIndex = 0;
    this.players.forEach(p => p.peekedAtStart = false);
    this.broadcastState();
    this.startTurn();
  }

  private startTurn(): void {
    this.turnActedUid = null; // reset for the new player's turn
    const player = this.activePlayers()[this.currentTurnIndex % this.activePlayers().length];
    if (!player) return;

    this.turnEndAt = Date.now() + TURN_DURATION_MS;
    this.broadcastState();
    this.emit('game:turn_start', { uid: player.uid, timeoutMs: TURN_DURATION_MS });

    const timer = setTimeout(() => {
      if (this.drawnCards.has(player.uid)) {
        this.performBurnDrawn(player.uid);
      } else {
        this.performDrawAndBurn(player.uid);
      }
    }, TURN_DURATION_MS);
    this.timers.push(timer);
  }

  private performDrawAndBurn(uid: string): void {
    const card = this.deck.draw();
    if (!card) return;
    this.deck.discard(card);
    this.lastDiscardFromKing = false;
    this.emit('game:card_discarded', { uid, card, fromKingPenalty: false });
    this.advanceTurn();
  }

  onDrawDeck(uid: string): boolean {
    const player = this.getPlayer(uid);
    if (!player || !this.isPlayerTurn(uid)) return false;
    if (this.drawnCards.has(uid)) return false;
    if (this.turnActedUid === uid) return false; // already acted this turn

    this.clearTimers();
    const card = this.deck.draw();
    if (!card) return false;

    this.turnActedUid = uid;

    if (card.rank === 'K') {
      this.applyKChoice(uid, card);
      return true;
    }

    const special = isSpecialCard(card);
    if (special === 'J') {
      this.applyJSpecial(uid, card);
      return true;
    }
    if (special === 'RED_Q') {
      this.applyQSpecial(uid, card);
      return true;
    }

    this.drawnCards.set(uid, card);
    this.emit('game:card_drawn', { card }, undefined, uid);
    this.broadcastState();
    return true;
  }

  private applyKChoice(uid: string, kCard: Card): void {
    this.deck.discard(kCard);
    this.emit('game:card_discarded', { uid, card: kCard, fromKingPenalty: true });

    // Draw 2 cards; each K among them is also discarded and replaced by 2 more
    this.kingChoiceCards = [];
    const pending: Card[] = [];
    for (let i = 0; i < 2; i++) {
      const c = this.deck.draw();
      if (c) pending.push(c);
    }
    while (pending.length > 0) {
      const c = pending.shift()!;
      if (c.rank === 'K') {
        this.deck.discard(c);
        this.emit('game:card_discarded', { uid, card: c, fromKingPenalty: true });
        const c1 = this.deck.draw();
        const c2 = this.deck.draw();
        if (c1) pending.push(c1);
        if (c2) pending.push(c2);
      } else {
        this.kingChoiceCards.push(c);
      }
    }

    this.specialActionUid = uid;
    this.lastDiscardFromKing = true;
    this.drawnCards.delete(uid);
    this.phase = 'KING_CHOICE';

    this.emit('game:king_choice', { cards: this.kingChoiceCards }, undefined, uid);
    this.broadcastState();

    const timer = setTimeout(() => {
      if (this.phase === 'KING_CHOICE' && this.specialActionUid === uid) {
        this.onKingBurn(uid);
      }
    }, 20000);
    this.timers.push(timer);
  }

  private applyJSpecial(uid: string, jCard: Card): void {
    this.deck.discard(jCard);
    this.lastDiscardFromKing = false;
    this.specialActionUid = uid;
    this.specialActionType = 'J';
    this.pendingSpecialCard = jCard;
    this.phase = 'SPECIAL_J';
    this.emit('game:card_discarded', { uid, card: jCard, fromKingPenalty: false });
    this.broadcastState();

    const timer = setTimeout(() => {
      if (this.phase === 'SPECIAL_J' && this.specialActionUid === uid) {
        this.specialActionUid = null;
        this.specialActionType = null;
        this.pendingSpecialCard = null;
        this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';
        this.advanceTurn();
      }
    }, SPECIAL_ACTION_TIMEOUT_MS);
    this.timers.push(timer);
  }

  private applyQSpecial(uid: string, qCard: Card): void {
    this.deck.discard(qCard);
    this.lastDiscardFromKing = false;
    this.specialActionUid = uid;
    this.specialActionType = 'RED_Q';
    this.pendingSpecialCard = qCard;
    this.phase = 'SPECIAL_Q';
    this.emit('game:card_discarded', { uid, card: qCard, fromKingPenalty: false });
    this.broadcastState();

    const timer = setTimeout(() => {
      if (this.phase === 'SPECIAL_Q' && this.specialActionUid === uid) {
        this.specialActionUid = null;
        this.specialActionType = null;
        this.pendingSpecialCard = null;
        this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';
        this.advanceTurn();
      }
    }, SPECIAL_ACTION_TIMEOUT_MS);
    this.timers.push(timer);
  }

  onKingSwap(uid: string, choiceIndex: number, handPosition: number): boolean {
    if (this.phase !== 'KING_CHOICE' || this.specialActionUid !== uid) return false;
    if (choiceIndex < 0 || choiceIndex >= this.kingChoiceCards.length) return false;

    const player = this.getPlayer(uid);
    if (!player) return false;
    if (handPosition < 0 || handPosition >= player.cards.length) return false;
    if (!player.cards[handPosition]) return false;

    this.clearTimers();

    const chosen = this.kingChoiceCards[choiceIndex];
    const others = this.kingChoiceCards.filter((_, i) => i !== choiceIndex);
    const displaced = player.cards[handPosition]!;

    player.cards[handPosition] = { ...chosen, isRevealed: false };
    this.emit('game:peek_own', { card: chosen, position: handPosition }, undefined, uid);

    this.deck.discard(displaced);
    for (const c of others) this.deck.discard(c);

    this.kingChoiceCards = [];
    this.specialActionUid = null;
    this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';

    this.emit('game:card_discarded', { uid, card: displaced, fromKingPenalty: true });
    this.broadcastState();
    this.advanceTurn();
    return true;
  }

  onKingBurn(uid: string): boolean {
    if (this.phase !== 'KING_CHOICE' || this.specialActionUid !== uid) return false;

    this.clearTimers();

    for (const c of this.kingChoiceCards) {
      this.deck.discard(c);
    }

    this.kingChoiceCards = [];
    this.specialActionUid = null;
    this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';

    this.broadcastState();
    this.advanceTurn();
    return true;
  }

  onBurnDrawn(uid: string): boolean {
    if (!this.isPlayerTurn(uid) || !this.drawnCards.has(uid)) return false;
    return this.performBurnDrawn(uid);
  }

  private performBurnDrawn(uid: string): boolean {
    const card = this.drawnCards.get(uid);
    if (!card) return false;

    this.drawnCards.delete(uid);
    this.deck.discard(card);
    this.lastDiscardFromKing = false;
    this.emit('game:card_discarded', { uid, card, fromKingPenalty: false });
    this.broadcastState();

    // check window — player can call CHECK before turn advances
    const advTimer = setTimeout(() => this.advanceTurn(), this.currentAdvanceDelay());
    this.timers.push(advTimer);
    return true;
  }

  onSwapDrawn(uid: string, position: number): boolean {
    const player = this.getPlayer(uid);
    if (!player || !this.isPlayerTurn(uid)) return false;
    const drawnCard = this.drawnCards.get(uid);
    if (!drawnCard) return false;
    if (position < 0 || position >= player.cards.length) return false;

    this.clearTimers();
    const replacedCard = player.cards[position];
    player.cards[position] = { ...drawnCard, isRevealed: false };
    this.drawnCards.delete(uid);

    if (replacedCard) {
      this.deck.discard(replacedCard);
      this.lastDiscardFromKing = false;
      this.emit('game:card_discarded', { uid, card: replacedCard, fromKingPenalty: false });
    }

    // J/Q kept in hand from old swap flow — still handle special if somehow reached
    const special = isSpecialCard(drawnCard);
    if (special === 'J' || special === 'RED_Q') {
      this.specialActionUid = uid;
      this.specialActionType = special;
      this.pendingSpecialCard = drawnCard;
      this.phase = special === 'J' ? 'SPECIAL_J' : 'SPECIAL_Q';
      this.broadcastState();

      const specialTimer = setTimeout(() => {
        if ((this.phase === 'SPECIAL_J' || this.phase === 'SPECIAL_Q') && this.specialActionUid === uid) {
          this.specialActionUid = null;
          this.specialActionType = null;
          this.pendingSpecialCard = null;
          this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';
          this.advanceTurn();
        }
      }, SPECIAL_ACTION_TIMEOUT_MS);
      this.timers.push(specialTimer);

      return true;
    }

    this.broadcastState();
    // 3s check window
    const advTimer = setTimeout(() => this.advanceTurn(), this.currentAdvanceDelay());
    this.timers.push(advTimer);
    return true;
  }

  onBurnDiscard(uid: string, position: number): boolean {
    if (this.burnWindowUid !== uid) return false;

    const player = this.getPlayer(uid);
    const discardTop = this.deck.peekDiscard();
    if (!player || !discardTop) return false;

    const card = player.cards[position];
    if (!card) return false;

    const result = canBurnCard(card, discardTop, this.lastDiscardFromKing);
    if (!result.valid) {
      for (let i = 0; i < 2; i++) {
        const penalty = this.deck.draw();
        if (penalty) {
          player.cards.push({ ...penalty, isRevealed: false });
        }
      }
      this.emit('game:burn_invalid', { uid, penaltyCards: 2 });
      this.broadcastState();
      return false;
    }

    player.cards[position] = null;
    this.burnWindowUid = null;
    this.emit('game:card_burned', { uid, position });
    this.broadcastState();
    return true;
  }

  onCallCheck(uid: string): boolean {
    if (this.phase !== 'PLAYING') return false;
    const minTurns = this.activePlayers().length * 4;
    if (this.dealTurnCount < minTurns) return false;
    if (this.checkCallerId) return false;
    if (!this.isPlayerTurn(uid)) return false;

    this.clearTimers();
    this.checkCallerId = uid;
    this.turnsAfterCheck = this.activePlayers().length;
    this.phase = 'CHECK_CALLED';
    this.emit('game:check_called', { callerUid: uid, turnsRemaining: this.turnsAfterCheck });
    this.broadcastState();
    this.advanceTurn(true); // calling check was the caller's action — skip first decrement
    return true;
  }

  onSpecialSwap(uid: string, myPosition: number, targetUid: string, targetPosition: number): boolean {
    if (this.specialActionUid !== uid || this.specialActionType !== 'J') return false;

    const myPlayer = this.getPlayer(uid)!;
    const targetPlayer = this.getPlayer(targetUid);
    if (!targetPlayer) return false;

    const myCard = myPlayer.cards[myPosition];
    const targetCard = targetPlayer.cards[targetPosition];

    myPlayer.cards[myPosition] = targetCard;
    targetPlayer.cards[targetPosition] = myCard;

    this.specialActionUid = null;
    this.specialActionType = null;
    this.pendingSpecialCard = null;
    this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';

    this.emit('game:swap_executed', { uid, myPosition, targetUid, targetPosition });
    this.broadcastState();

    // 3s check window after J swap
    const advTimer = setTimeout(() => this.advanceTurn(), this.currentAdvanceDelay());
    this.timers.push(advTimer);
    return true;
  }

  onSpecialPeekOwn(uid: string, position: number): boolean {
    if (this.specialActionUid !== uid || this.specialActionType !== 'RED_Q') return false;

    const player = this.getPlayer(uid)!;
    const card = player.cards[position];
    if (!card) return false;

    this.emit('game:peek_own', { card, position }, undefined, uid);

    this.specialActionUid = null;
    this.specialActionType = null;
    this.pendingSpecialCard = null;
    this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';

    this.broadcastState();

    // 3s check window after Q peek
    const advTimer = setTimeout(() => this.advanceTurn(), this.currentAdvanceDelay());
    this.timers.push(advTimer);
    return true;
  }

  onTakeDiscard(uid: string, handPosition: number): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    if (this.phase !== 'PLAYING' && this.phase !== 'CHECK_CALLED') return false;
    if (this.drawnCards.has(uid)) return false;
    if (this.lastDiscardFromKing) return false;
    if (this.turnActedUid === uid) return false;

    const player = this.getPlayer(uid);
    const discardTop = this.deck.peekDiscard();
    if (!player || !discardTop) return false;
    if (handPosition < 0 || handPosition >= player.cards.length) return false;
    if (!player.cards[handPosition]) return false;

    this.clearTimers();
    this.turnActedUid = uid;

    const takenCard = this.deck.takeDiscard()!;
    const displaced = player.cards[handPosition]!;

    player.cards[handPosition] = { ...takenCard, isRevealed: false };
    this.deck.discard(displaced);
    this.lastDiscardFromKing = false;

    this.emit('game:peek_own', { card: takenCard, position: handPosition }, undefined, uid);
    this.emit('game:card_discarded', { uid, card: displaced, fromKingPenalty: false });

    const special = isSpecialCard(takenCard);
    if (special === 'J' || special === 'RED_Q') {
      this.specialActionUid = uid;
      this.specialActionType = special;
      this.pendingSpecialCard = takenCard;
      this.phase = special === 'J' ? 'SPECIAL_J' : 'SPECIAL_Q';
      this.broadcastState();
      const specialTimer = setTimeout(() => {
        if ((this.phase === 'SPECIAL_J' || this.phase === 'SPECIAL_Q') && this.specialActionUid === uid) {
          this.specialActionUid = null;
          this.specialActionType = null;
          this.pendingSpecialCard = null;
          this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';
          this.advanceTurn();
        }
      }, SPECIAL_ACTION_TIMEOUT_MS);
      this.timers.push(specialTimer);
      return true;
    }

    this.broadcastState();
    // 3s check window after taking from discard
    const advTimer = setTimeout(() => this.advanceTurn(), this.currentAdvanceDelay());
    this.timers.push(advTimer);
    return true;
  }

  onBurnAttempt(uid: string, position: number): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    if (this.phase !== 'PLAYING' && this.phase !== 'CHECK_CALLED') return false;
    if (this.drawnCards.has(uid)) return false;
    if (this.lastDiscardFromKing) return false;
    if (this.turnActedUid === uid) return false; // can't burn during check window

    const player = this.getPlayer(uid);
    const discardTop = this.deck.peekDiscard();
    if (!player || !discardTop) return false;

    const card = player.cards[position];
    if (!card) return false;

    this.clearTimers();

    if (card.rank === discardTop.rank) {
      player.cards[position] = null;
      this.emit('game:card_burned', { uid, position, success: true });
      const stillHasMatch = player.cards.some(c => c !== null && c.rank === discardTop.rank);
      if (stillHasMatch) {
        this.broadcastState();
        this.startTurn(); // restart timer so player can burn another matching card
      } else {
        this.broadcastState();
        this.advanceTurn();
      }
    } else {
      const penaltyCard = this.deck.takeDiscard();
      if (penaltyCard) {
        player.cards.push({ ...penaltyCard, isRevealed: false });
        const newPos = player.cards.length - 1;
        this.emit('game:peek_own', { card: penaltyCard, position: newPos }, undefined, uid);
      }
      this.lastDiscardFromKing = false;
      this.emit('game:burn_invalid', { uid, penaltyCard });
      this.broadcastState();
      this.advanceTurn();
    }

    return true;
  }

  private advanceTurn(skipCheckDecrement = false): void {
    this.clearTimers();
    this.burnWindowUid = null;
    this.burnWindowEndAt = null;

    if (this.checkCallerId && !skipCheckDecrement) {
      this.turnsAfterCheck--;
      if (this.turnsAfterCheck <= 0) {
        this.startReveal();
        return;
      }
    }

    const active = this.activePlayers();
    this.currentTurnIndex = (this.currentTurnIndex + 1) % active.length;
    this.dealTurnCount++;

    this.phase = this.checkCallerId ? 'CHECK_CALLED' : 'PLAYING';
    this.broadcastState();
    this.startTurn();
  }

  private startReveal(): void {
    this.clearTimers();
    this.phase = 'REVEAL';
    const revealData = this.players
      .filter(p => !p.isEliminated)
      .map(p => ({ uid: p.uid, cards: p.cards }));
    this.emit('game:reveal_all', { players: revealData });
    this.broadcastState();

    setTimeout(() => this.processScoring(), 3000);
  }

  private processScoring(): void {
    this.phase = 'SCORING';
    const playerCards = this.players
      .filter(p => !p.isEliminated)
      .map(p => ({ uid: p.uid, cards: p.cards }));

    const result: ScoreResult = calculateRoundScores(playerCards, this.checkCallerId!);

    for (const p of this.players) {
      if (!p.isEliminated && result.roundScores[p.uid] !== undefined) {
        p.cumulativeScore += result.roundScores[p.uid];
      }
    }

    const cumulative: { [uid: string]: number } = {};
    for (const p of this.players) {
      cumulative[p.uid] = p.cumulativeScore;
    }

    this.emit('game:scores', {
      roundNumber: this.roundNumber,
      scores: result.roundScores,
      cumulative,
      checkPenalty: result.checkPenalty,
      checkCallerId: this.checkCallerId,
      lowestUid: result.lowestUid,
    });

    for (const p of this.players) {
      if (!p.isEliminated && p.cumulativeScore >= 100) {
        p.isEliminated = true;
        this.emit('game:elimination', { uid: p.uid, totalScore: p.cumulativeScore });
      }
    }

    const remaining = this.activePlayers();
    if (remaining.length <= 1) {
      this.endGame(remaining[0]?.uid || null);
      return;
    }

    this.broadcastState();
    setTimeout(() => this.startNextRound(), ROUND_OVER_DELAY_MS);
  }

  private startNextRound(): void {
    this.checkCallerId = null;
    this.turnsAfterCheck = 0;
    this.lastDiscardFromKing = false;
    this.dealTurnCount = 0;
    this.drawnCards.clear();
    this.turnActedUid = null;
    this.dealCards();
    this.phase = 'PEEK_PHASE';
    this.peekPhaseEndAt = Date.now() + PEEK_DURATION_MS;
    this.broadcastState();

    for (const p of this.players.filter(p2 => !p2.isEliminated)) {
      this.emit('game:peek_own', { cards: [{ card: p.cards[2], position: 2 }, { card: p.cards[3], position: 3 }] }, undefined, p.uid);
    }

    const timer = setTimeout(() => this.endPeekPhase(), PEEK_DURATION_MS);
    this.timers.push(timer);
  }

  private endGame(winnerId: string | null): void {
    this.phase = 'GAME_OVER';
    const finalScores: { [uid: string]: number } = {};
    for (const p of this.players) {
      finalScores[p.uid] = p.cumulativeScore;
    }
    this.emit('game:over', { winnerId, finalScores, gameId: this.gameId });
    this.broadcastState();
  }

  getDrawnCard(uid: string): Card | undefined {
    return this.drawnCards.get(uid);
  }

  getPublicState(): GameState {
    return {
      gameId: this.gameId,
      roomId: this.roomId,
      phase: this.phase,
      currentTurnUid: this.activePlayers()[this.currentTurnIndex % this.activePlayers().length]?.uid || '',
      players: this.players.map(p => ({
        uid: p.uid,
        displayName: p.displayName,
        avatarId: p.avatarId,
        cards: p.cards.map(c => c ? { ...c, isRevealed: this.phase === 'REVEAL' ? true : c.isRevealed } : null),
        cardCount: p.cards.filter(Boolean).length,
        isTurn: this.activePlayers()[this.currentTurnIndex % this.activePlayers().length]?.uid === p.uid,
        hasCalledCheck: p.uid === this.checkCallerId,
        isEliminated: p.isEliminated,
        cumulativeScore: p.cumulativeScore,
        seatIndex: p.seatIndex,
      })),
      deckCount: this.deck.drawCount,
      discardTop: this.deck.peekDiscard(),
      roundNumber: this.roundNumber,
      checkCallerId: this.checkCallerId,
      turnsAfterCheck: this.turnsAfterCheck,
      lastDiscardFromKing: this.lastDiscardFromKing,
      peekPhaseEndAt: this.peekPhaseEndAt,
      turnEndAt: this.turnEndAt,
      burnWindowUid: this.burnWindowUid,
      burnWindowEndAt: this.burnWindowEndAt,
      specialActionUid: this.specialActionUid,
      dealTurnCount: this.dealTurnCount,
    };
  }

  private broadcastState(): void {
    this.emit('game:state', this.getPublicState());
  }

  private isPlayerTurn(uid: string): boolean {
    const active = this.activePlayers();
    return active[this.currentTurnIndex % active.length]?.uid === uid;
  }

  private getPlayer(uid: string): InternalPlayer | undefined {
    return this.players.find(p => p.uid === uid);
  }

  private activePlayers(): InternalPlayer[] {
    return this.players.filter(p => !p.isEliminated);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.turnEndAt = null;
  }

  private currentAdvanceDelay(): number {
    const active = this.activePlayers();
    const cur = active[this.currentTurnIndex % active.length];
    return cur?.isBot ? BOT_CHECK_WINDOW_MS : CHECK_WINDOW_MS;
  }

  /** Called when a connected player disconnects mid-game — makes a bot play for them. */
  replaceWithBot(uid: string): void {
    const player = this.getPlayer(uid);
    if (!player || player.isBot || player.isEliminated) return;
    player.isBot = true;
    player.displayName = player.displayName + ' 🤖';
    this.broadcastState();
    // If it's their turn, advance quickly so the game doesn't freeze
    if (this.isPlayerTurn(uid) && (this.phase === 'PLAYING' || this.phase === 'CHECK_CALLED')) {
      this.clearTimers();
      setTimeout(() => this.performDrawAndBurn(uid), 800);
    }
  }

  /** Returns the actual (server-side) cards for a bot to make decisions. */
  getBotCards(uid: string): (Card | null)[] {
    return this.getPlayer(uid)?.cards ?? [];
  }

  destroy(): void {
    this.clearTimers();
  }
}
