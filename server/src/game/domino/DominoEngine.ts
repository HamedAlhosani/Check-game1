import { v4 as uuidv4 } from 'uuid';
import { DominoGameState, DominoPlayerState, DominoTile, PlacedTile, DominoChain } from '@check-game/shared';
import { GameEventEmitter } from '../GameEngine';

const TURN_DURATION_MS = 30000;
const ROUND_DELAY_MS = 5000;
const ELIMINATION_SCORE = 150;

interface InternalPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  hand: DominoTile[];
  isBot: boolean;
  cumulativeScore: number;
  isEliminated: boolean;
  consecutivePasses: number;
}

function buildTileSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ id: `${i}-${j}`, left: i, right: j });
    }
  }
  return tiles;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class DominoEngine {
  readonly gameId: string;
  readonly roomId: string;

  private players: InternalPlayer[];
  private phase: 'WAITING' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER' = 'WAITING';
  private chain: DominoChain = { tiles: [], leftEnd: -1, rightEnd: -1 };
  private boneyard: DominoTile[] = [];
  private currentTurnIndex = 0;
  private turnEndAt: number | null = null;
  private timers: NodeJS.Timeout[] = [];
  private roundNumber = 0;
  private scores: Record<string, number> = {};
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
      consecutivePasses: 0,
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
    const tiles = shuffle(buildTileSet());
    const handSize = this.activePlayers().length <= 3 ? 7 : 6;

    for (const p of this.activePlayers()) {
      p.hand = tiles.splice(0, handSize);
      p.consecutivePasses = 0;
    }
    this.boneyard = tiles;
    this.chain = { tiles: [], leftEnd: -1, rightEnd: -1 };
    this.phase = 'PLAYING';
    this.currentTurnIndex = 0;

    // Determine first player: one with highest double (6-6 first)
    let firstPlayerIdx = 0;
    let highestDouble = -1;
    for (let i = 0; i < this.activePlayers().length; i++) {
      const p = this.activePlayers()[i];
      for (const t of p.hand) {
        if (t.left === t.right && t.left > highestDouble) {
          highestDouble = t.left;
          firstPlayerIdx = i;
        }
      }
    }
    this.currentTurnIndex = firstPlayerIdx;

    this.broadcastState();

    // Send each player their private hand
    for (const p of this.activePlayers()) {
      this.emit('domino:tile_drawn_private', { tiles: p.hand }, undefined, p.uid);
    }

    this.startTurn();
  }

  onPlayTile(uid: string, tileId: string, end: 'left' | 'right'): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    const player = this.getPlayer(uid)!;
    const tile = player.hand.find(t => t.id === tileId);
    if (!tile) return false;

    if (this.chain.tiles.length === 0) {
      // First tile
      this.chain.tiles.push({ ...tile, orientation: 'h', flipped: false });
      this.chain.leftEnd = tile.left;
      this.chain.rightEnd = tile.right;
    } else {
      const targetEnd = end === 'left' ? this.chain.leftEnd : this.chain.rightEnd;
      const placed = this.placeTile(tile, targetEnd, end);
      if (!placed) return false;
    }

    player.hand = player.hand.filter(t => t.id !== tileId);
    this.clearTimers();
    this.emit('domino:tile_played', { uid, tile, end, chainLeft: this.chain.leftEnd, chainRight: this.chain.rightEnd });

    if (player.hand.length === 0) {
      this.endRound(uid);
      return true;
    }

    player.consecutivePasses = 0;
    this.advanceTurn();
    return true;
  }

  private placeTile(tile: DominoTile, targetEnd: number, end: 'left' | 'right'): boolean {
    let flipped = false;
    if (tile.right === targetEnd) flipped = true;
    else if (tile.left !== targetEnd) return false;

    const placed: PlacedTile = { ...tile, orientation: 'h', flipped };
    if (end === 'left') {
      this.chain.tiles.unshift(placed);
      this.chain.leftEnd = flipped ? tile.right : tile.left;
      // after placing, leftEnd becomes the other side
      this.chain.leftEnd = flipped ? tile.left : tile.right;
      if (tile.left === tile.right) {
        this.chain.leftEnd = tile.left;
      } else {
        this.chain.leftEnd = tile.left === targetEnd ? tile.right : tile.left;
      }
    } else {
      this.chain.tiles.push(placed);
      this.chain.rightEnd = tile.left === targetEnd ? tile.right : tile.left;
      if (tile.left === tile.right) {
        this.chain.rightEnd = tile.right;
      }
    }
    return true;
  }

  onDrawTile(uid: string): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    if (this.boneyard.length === 0) return false;

    const tile = this.boneyard.pop()!;
    const player = this.getPlayer(uid)!;
    player.hand.push(tile);

    this.emit('domino:tile_drawn', { uid });
    this.emit('domino:tile_drawn_private', { tile }, undefined, uid);
    this.broadcastState();
    return true;
  }

  onPass(uid: string): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    if (this.boneyard.length > 0) return false; // must draw first

    const player = this.getPlayer(uid)!;
    player.consecutivePasses++;
    this.emit('domino:player_passed', { uid });

    const active = this.activePlayers();
    const allPassed = active.every(p => p.consecutivePasses > 0);
    if (allPassed) {
      this.emit('domino:blocked', {});
      this.endRound(null);
      return true;
    }

    this.clearTimers();
    this.advanceTurn();
    return true;
  }

  private endRound(winnerUid: string | null): void {
    this.clearTimers();
    this.phase = 'ROUND_OVER';

    // Calculate scores: each non-winner counts pip values in hand
    const roundScores: Record<string, number> = {};
    for (const p of this.activePlayers()) {
      if (p.uid === winnerUid) {
        roundScores[p.uid] = 0;
      } else {
        roundScores[p.uid] = p.hand.reduce((s, t) => s + t.left + t.right, 0);
        p.cumulativeScore += roundScores[p.uid];
        this.scores[p.uid] = p.cumulativeScore;
      }
    }

    this.emit('domino:round_over', {
      roundNumber: this.roundNumber,
      roundScores,
      cumulative: this.scores,
      winnerUid,
    });

    // Check eliminations
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
      this.emit('domino:game_over', { winnerId: winner.uid, finalScores: this.scores, gameId: this.gameId });
      this.broadcastState();
      return;
    }

    this.broadcastState();
    setTimeout(() => this.startRound(), ROUND_DELAY_MS);
  }

  getPublicState(): DominoGameState {
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
        tileCount: p.hand.length,
        isTurn: p.uid === current?.uid,
        isEliminated: p.isEliminated,
        cumulativeScore: p.cumulativeScore,
        passedThisTurn: p.consecutivePasses > 0,
      })),
      chain: this.chain,
      boneyardCount: this.boneyard.length,
      currentTurnUid: current?.uid || '',
      turnEndAt: this.turnEndAt,
      roundNumber: this.roundNumber,
      scores: this.scores,
      winnerId: null,
    };
  }

  getPrivateHand(uid: string): DominoTile[] {
    return this.getPlayer(uid)?.hand || [];
  }

  private startTurn(): void {
    const active = this.activePlayers();
    if (!active.length) return;
    const player = active[this.currentTurnIndex % active.length];

    this.turnEndAt = Date.now() + TURN_DURATION_MS;
    this.broadcastState();
    this.emit('domino:turn_start', { uid: player.uid, timeoutMs: TURN_DURATION_MS });

    const timer = setTimeout(() => this.autoTurn(player.uid), TURN_DURATION_MS);
    this.timers.push(timer);
  }

  private autoTurn(uid: string): void {
    const player = this.getPlayer(uid);
    if (!player) return;

    // Try to play any valid tile
    if (this.chain.tiles.length === 0) {
      const highest = player.hand.find(t => t.left === t.right && t.left === 6)
        || player.hand.find(t => t.left === t.right)
        || player.hand[0];
      if (highest) { this.onPlayTile(uid, highest.id, 'right'); return; }
    }

    for (const tile of player.hand) {
      if (tile.left === this.chain.leftEnd || tile.right === this.chain.leftEnd) {
        this.onPlayTile(uid, tile.id, 'left'); return;
      }
      if (tile.left === this.chain.rightEnd || tile.right === this.chain.rightEnd) {
        this.onPlayTile(uid, tile.id, 'right'); return;
      }
    }

    if (this.boneyard.length > 0) { this.onDrawTile(uid); return; }
    this.onPass(uid);
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
    this.emit('domino:state', this.getPublicState());
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
