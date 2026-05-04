import { v4 as uuidv4 } from 'uuid';
import { JacaroGameState, JacaroCard, JacaroMeld, JacaroPlayerState } from '@check-game/shared';
import { GameEventEmitter } from '../GameEngine';
import { buildJacaroDeck, getCardPoints, calculateHandPenalty } from './JacaroDeck';
import { validateMeld, canExtendMeld, calculateMeldPoints } from './JacaroValidator';

const TURN_DURATION_MS = 45000;
const ROUND_DELAY_MS = 6000;
const OPENING_THRESHOLD = 51;
const ELIMINATION_SCORE = 500;

interface InternalPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  hand: JacaroCard[];
  isBot: boolean;
  cumulativeScore: number;
  isEliminated: boolean;
  hasOpenedMeld: boolean;
  hasDrawn: boolean;
}

export class JacaroEngine {
  readonly gameId: string;
  readonly roomId: string;

  private players: InternalPlayer[];
  private phase: 'WAITING' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER' = 'WAITING';
  private deck: JacaroCard[] = [];
  private discardPile: JacaroCard[] = [];
  private tableMelds: JacaroMeld[] = [];
  private currentTurnIndex = 0;
  private turnEndAt: number | null = null;
  private timers: NodeJS.Timeout[] = [];
  private roundNumber = 0;
  private scores: Record<string, number> = {};
  private meldCounter = 0;
  private emit: GameEventEmitter;

  constructor(
    roomId: string,
    players: { uid: string; displayName: string; avatarId: string; isBot: boolean }[],
    emit: GameEventEmitter
  ) {
    this.gameId = uuidv4();
    this.roomId = roomId;
    this.emit = emit;

    this.players = players.map(p => ({
      ...p,
      hand: [],
      cumulativeScore: 0,
      isEliminated: false,
      hasOpenedMeld: false,
      hasDrawn: false,
    }));

    for (const p of this.players) {
      this.scores[p.uid] = 0;
    }
  }

  start(): void {
    this.startRound();
  }

  private startRound(): void {
    this.roundNumber++;
    this.deck = buildJacaroDeck();
    this.discardPile = [];
    this.tableMelds = [];
    this.meldCounter = 0;
    this.currentTurnIndex = 0;

    for (const p of this.activePlayers()) {
      p.hand = this.deck.splice(0, 13);
      p.hasOpenedMeld = false;
      p.hasDrawn = false;
    }

    // Flip first card to start discard pile
    const first = this.deck.pop()!;
    this.discardPile.push(first);
    this.phase = 'PLAYING';

    this.broadcastState();

    // Send private hands
    for (const p of this.activePlayers()) {
      this.emit('jackaro:card_drawn', { cards: p.hand }, undefined, p.uid);
    }

    this.startTurn();
  }

  onDraw(uid: string, fromDiscard = false): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    const player = this.getPlayer(uid)!;
    if (player.hasDrawn) return false;

    let card: JacaroCard;
    if (fromDiscard) {
      if (!this.discardPile.length) return false;
      card = this.discardPile.pop()!;
    } else {
      if (!this.deck.length) {
        // Reshuffle discard (keep top)
        const top = this.discardPile.pop()!;
        this.deck = [...this.discardPile].reverse();
        this.discardPile = [top];
        if (!this.deck.length) return false;
      }
      card = this.deck.pop()!;
    }

    player.hand.push(card);
    player.hasDrawn = true;
    this.emit('jackaro:card_drawn', { card }, undefined, uid);
    this.broadcastState();
    return true;
  }

  onDiscard(uid: string, cardId: string): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    const player = this.getPlayer(uid)!;
    if (!player.hasDrawn) return false;

    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return false;

    const card = player.hand.splice(cardIdx, 1)[0];
    this.discardPile.push(card);
    player.hasDrawn = false;
    this.clearTimers();

    this.emit('jackaro:card_discarded', { uid, card });

    if (player.hand.length === 0) {
      this.endRound(uid);
      return true;
    }

    this.advanceTurn();
    return true;
  }

  onMeld(uid: string, cardIds: string[]): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    const player = this.getPlayer(uid)!;
    if (!player.hasDrawn) return false;

    const cards = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean) as JacaroCard[];
    if (cards.length !== cardIds.length) return false;

    const validation = validateMeld(cards);
    if (!validation.valid) {
      this.emit('jackaro:invalid_action', { reason: validation.reason });
      return false;
    }

    // Check opening threshold if first meld
    if (!player.hasOpenedMeld) {
      const points = calculateMeldPoints(cards);
      if (points < OPENING_THRESHOLD) {
        this.emit('jackaro:invalid_action', { reason: `تحتاج ${OPENING_THRESHOLD} نقطة للفتح` });
        return false;
      }
      player.hasOpenedMeld = true;
    }

    // Remove cards from hand
    for (const id of cardIds) {
      const idx = player.hand.findIndex(c => c.id === id);
      if (idx !== -1) player.hand.splice(idx, 1);
    }

    const meld: JacaroMeld = {
      id: `meld-${++this.meldCounter}`,
      type: validation.type,
      cards,
      ownerId: uid,
    };
    this.tableMelds.push(meld);

    this.emit('jackaro:meld_placed', { uid, meld });
    this.broadcastState();
    return true;
  }

  onExtendMeld(uid: string, meldId: string, cardId: string): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    const player = this.getPlayer(uid)!;
    if (!player.hasOpenedMeld) return false;

    const meld = this.tableMelds.find(m => m.id === meldId);
    if (!meld) return false;

    const card = player.hand.find(c => c.id === cardId);
    if (!card) return false;

    if (!canExtendMeld(meld, card)) {
      this.emit('jackaro:invalid_action', { reason: 'لا يمكن إضافة هذه الورقة' });
      return false;
    }

    meld.cards.push(card);
    player.hand = player.hand.filter(c => c.id !== cardId);

    this.emit('jackaro:meld_extended', { uid, meldId, card });
    this.broadcastState();
    return true;
  }

  onKnock(uid: string): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    const player = this.getPlayer(uid)!;
    if (!player.hasDrawn) return false;
    if (player.hand.length > 0) return false; // must have empty hand to knock

    this.clearTimers();
    this.emit('jackaro:knocked', { uid });
    this.endRound(uid);
    return true;
  }

  private endRound(winnerUid: string | null): void {
    this.clearTimers();
    this.phase = 'ROUND_OVER';

    const roundScores: Record<string, number> = {};
    for (const p of this.activePlayers()) {
      if (p.uid === winnerUid) {
        roundScores[p.uid] = 0;
      } else {
        const penalty = calculateHandPenalty(p.hand);
        roundScores[p.uid] = penalty;
        p.cumulativeScore += penalty;
        this.scores[p.uid] = p.cumulativeScore;
      }
    }

    this.emit('jackaro:round_over', {
      roundNumber: this.roundNumber,
      roundScores,
      cumulative: this.scores,
      winnerUid,
    });

    for (const p of this.activePlayers()) {
      if (p.cumulativeScore >= ELIMINATION_SCORE) {
        p.isEliminated = true;
      }
    }

    const remaining = this.activePlayers();
    if (remaining.length <= 1) {
      this.phase = 'GAME_OVER';
      const winner = remaining[0] || this.players.reduce((min, p) =>
        p.cumulativeScore < min.cumulativeScore ? p : min
      );
      this.emit('jackaro:game_over', { winnerId: winner.uid, finalScores: this.scores, gameId: this.gameId });
      this.broadcastState();
      return;
    }

    this.broadcastState();
    setTimeout(() => this.startRound(), ROUND_DELAY_MS);
  }

  getPublicState(): JacaroGameState {
    const active = this.activePlayers();
    const current = active[this.currentTurnIndex % (active.length || 1)];

    return {
      gameId: this.gameId,
      roomId: this.roomId,
      phase: this.phase,
      players: this.players.map(p => ({
        uid: p.uid,
        displayName: p.displayName,
        avatarId: p.avatarId,
        cardCount: p.hand.length,
        hasOpenedMeld: p.hasOpenedMeld,
        isTurn: p.uid === current?.uid,
        cumulativeScore: p.cumulativeScore,
        isEliminated: p.isEliminated,
        hasDrawn: p.hasDrawn,
      })),
      tableMelds: this.tableMelds,
      deckCount: this.deck.length,
      discardTop: this.discardPile[this.discardPile.length - 1] || null,
      currentTurnUid: current?.uid || '',
      turnEndAt: this.turnEndAt,
      roundNumber: this.roundNumber,
      scores: this.scores,
      winnerId: null,
    };
  }

  getPrivateHand(uid: string): JacaroCard[] {
    return this.getPlayer(uid)?.hand || [];
  }

  private startTurn(): void {
    const active = this.activePlayers();
    if (!active.length) return;
    const player = active[this.currentTurnIndex % active.length];
    player.hasDrawn = false;

    this.turnEndAt = Date.now() + TURN_DURATION_MS;
    this.broadcastState();
    this.emit('jackaro:turn_start', { uid: player.uid, timeoutMs: TURN_DURATION_MS });

    const timer = setTimeout(() => this.autoTurn(player.uid), TURN_DURATION_MS);
    this.timers.push(timer);
  }

  private autoTurn(uid: string): void {
    const player = this.getPlayer(uid);
    if (!player) return;

    if (!player.hasDrawn) this.onDraw(uid);

    // Discard highest value card
    if (player.hand.length > 0) {
      const worst = [...player.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
      this.onDiscard(uid, worst.id);
    }
  }

  private advanceTurn(): void {
    this.clearTimers();
    this.turnEndAt = null;
    const active = this.activePlayers();
    this.currentTurnIndex = (this.currentTurnIndex + 1) % active.length;
    this.broadcastState();
    this.startTurn();
  }

  private broadcastState(): void {
    this.emit('jackaro:state', this.getPublicState());
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

  destroy(): void {
    this.clearTimers();
  }
}
