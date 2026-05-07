import { v4 as uuidv4 } from 'uuid';
import {
  LudoGameState, LudoPlayerState, LudoPiece, LudoColor,
  LUDO_COLORS, LUDO_START_OFFSETS,
} from '@check-game/shared';
import { GameEventEmitter } from '../GameEngine';

const TURN_DURATION_MS = 30000;
const SAFE_GLOBAL: number[] = [0, 8, 13, 21, 26, 34, 39, 47];
const HOME_COLUMN_START = 52;
const HOME_FINISH = 58;

interface InternalPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  color: LudoColor;
  pieces: LudoPiece[];
  isBot: boolean;
  rank: number | null;
}

export class LudoEngine {
  readonly gameId: string;
  readonly roomId: string;

  private players: InternalPlayer[];
  private phase: 'WAITING' | 'PLAYING' | 'GAME_OVER' = 'WAITING';
  private currentTurnIndex = 0;
  private diceValue: number | null = null;
  private diceRolled = false;
  private consecutiveSixes = 0;
  private turnEndAt: number | null = null;
  private timers: NodeJS.Timeout[] = [];
  private winners: string[] = [];
  private rankCounter = 1;
  private emit: GameEventEmitter;

  constructor(
    roomId: string,
    players: { uid: string; displayName: string; avatarId: string; isBot: boolean }[],
    emit: GameEventEmitter
  ) {
    this.gameId = uuidv4();
    this.roomId = roomId;
    this.emit = emit;

    this.players = players.map((p, i) => ({
      ...p,
      color: LUDO_COLORS[i % 4],
      pieces: this.createPieces(LUDO_COLORS[i % 4]),
      rank: null,
    }));
  }

  private createPieces(color: LudoColor): LudoPiece[] {
    return [0, 1, 2, 3].map(i => ({
      id: `${color}-${i}`,
      color,
      relativePos: -1,
      status: 'home_base' as const,
    }));
  }

  start(): void {
    this.phase = 'PLAYING';
    this.broadcastState();
    this.startTurn();
  }

  onRollDice(uid: string): boolean {
    if (!this.isPlayerTurn(uid) || this.diceRolled) return false;
    this.clearTimers();

    const value = Math.floor(Math.random() * 6) + 1;
    this.diceValue = value;
    this.diceRolled = true;

    if (value === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes >= 3) {
        this.diceValue = null;
        this.diceRolled = false;
        this.consecutiveSixes = 0;
        this.emit('ludo:dice_rolled', { uid, value, forfeit: true });
        this.advanceTurn();
        return true;
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const movable = this.getMovablePieces(uid, value);
    this.emit('ludo:dice_rolled', { uid, value, forfeit: false });

    if (movable.length === 0) {
      // No valid moves
      setTimeout(() => this.advanceTurn(), 1500);
    } else {
      this.broadcastState();
      const timer = setTimeout(() => this.autoMoveBest(uid), TURN_DURATION_MS);
      this.timers.push(timer);
    }

    return true;
  }

  onMovePiece(uid: string, pieceId: string): boolean {
    if (!this.isPlayerTurn(uid) || !this.diceRolled || !this.diceValue) return false;

    const movable = this.getMovablePieces(uid, this.diceValue);
    if (!movable.includes(pieceId)) {
      this.emit('ludo:invalid_move', { reason: 'هذه القطعة لا يمكن تحريكها' });
      return false;
    }

    this.clearTimers();
    this.applyMove(uid, pieceId, this.diceValue);
    return true;
  }

  onSkipTurn(uid: string): boolean {
    if (!this.isPlayerTurn(uid)) return false;
    this.clearTimers();
    this.advanceTurn();
    return true;
  }

  /**
   * Re-roll the dice once per turn at the cost of a Ludo gem. The caller
   * (socket handler) is responsible for deducting the gem after this returns
   * true — engine itself stays currency-agnostic. We DO clear the dice flag
   * and pick a fresh value so movablePieces is recomputed from the new roll.
   */
  onRerollDice(uid: string): { ok: boolean; value?: number } {
    if (!this.isPlayerTurn(uid)) return { ok: false };
    if (!this.diceRolled) return { ok: false };
    if (this.diceValue === null) return { ok: false };

    this.clearTimers();
    const value = Math.floor(Math.random() * 6) + 1;
    this.diceValue = value;
    // consecutiveSixes accounting: a re-roll shouldn't punish the player
    // with an extra six, but if both rolls are sixes we still bump the
    // counter so the 3-six forfeit rule still applies.
    if (value === 6) this.consecutiveSixes++;

    this.emit('ludo:dice_rolled', { uid, value, forfeit: false, reroll: true });

    const movable = this.getMovablePieces(uid, value);
    if (movable.length === 0) {
      // Re-rolled into a dead end too — give the bot/AFK timer the same
      // 1.5s window as the original onRollDice, then advance.
      setTimeout(() => this.advanceTurn(), 1500);
    } else {
      this.broadcastState();
      const timer = setTimeout(() => this.autoMoveBest(uid), TURN_DURATION_MS);
      this.timers.push(timer);
    }
    return { ok: true, value };
  }

  private applyMove(uid: string, pieceId: string, diceVal: number): void {
    const player = this.getPlayer(uid)!;
    const piece = player.pieces.find(p => p.id === pieceId)!;

    if (piece.relativePos === -1 && diceVal === 6) {
      piece.relativePos = 0;
      piece.status = 'active';
    } else {
      piece.relativePos += diceVal;
      if (piece.relativePos >= HOME_FINISH) {
        piece.relativePos = HOME_FINISH;
        piece.status = 'finished';
      }
    }

    const globalPos = this.getGlobalPos(player.color, piece.relativePos);

    // Check capture (only on main path, not home column or safe cells)
    if (piece.relativePos < HOME_COLUMN_START && piece.relativePos >= 0) {
      for (const other of this.players) {
        if (other.uid === uid) continue;
        for (const op of other.pieces) {
          if (op.status !== 'active' || op.relativePos < 0) continue;
          const opGlobal = this.getGlobalPos(other.color, op.relativePos);
          if (opGlobal === globalPos && !SAFE_GLOBAL.includes(globalPos)) {
            op.relativePos = -1;
            op.status = 'home_base';
            this.emit('ludo:piece_moved', {
              uid: other.uid, pieceId: op.id,
              fromCell: opGlobal, toCell: -1, captured: true,
            });
          }
        }
      }
    }

    this.emit('ludo:piece_moved', { uid, pieceId, toCell: globalPos, captured: false });

    // Check if player finished
    const allDone = player.pieces.every(p => p.status === 'finished');
    if (allDone && !this.winners.includes(uid)) {
      this.winners.push(uid);
      player.rank = this.rankCounter++;
      this.emit('ludo:piece_moved', { uid, finished: true });
    }

    const remaining = this.players.filter(p => p.rank === null);
    if (remaining.length <= 1) {
      if (remaining.length === 1) {
        remaining[0].rank = this.rankCounter;
      }
      this.endGame();
      return;
    }

    // Roll again on 6
    this.diceValue = null;
    this.diceRolled = false;
    this.broadcastState();

    if (diceVal === 6 && !allDone) {
      this.startTurn();
    } else {
      this.advanceTurn();
    }
  }

  private getMovablePieces(uid: string, diceVal: number): string[] {
    const player = this.getPlayer(uid)!;
    const movable: string[] = [];

    for (const piece of player.pieces) {
      if (piece.status === 'finished') continue;

      if (piece.relativePos === -1) {
        if (diceVal === 6) movable.push(piece.id);
        continue;
      }

      const newPos = piece.relativePos + diceVal;
      if (newPos > HOME_FINISH) continue; // overshot home

      movable.push(piece.id);
    }

    return movable;
  }

  private getGlobalPos(color: LudoColor, relativePos: number): number {
    if (relativePos < 0) return -1;
    if (relativePos >= HOME_COLUMN_START) return relativePos; // home column cells are 52-57
    return (LUDO_START_OFFSETS[color] + relativePos) % 52;
  }

  private autoMoveBest(uid: string): void {
    if (!this.diceValue) return;
    const movable = this.getMovablePieces(uid, this.diceValue);
    if (movable.length > 0) {
      this.applyMove(uid, movable[0], this.diceValue);
    } else {
      this.advanceTurn();
    }
  }

  private startTurn(): void {
    const active = this.activePlayers();
    if (!active.length) return;
    const player = active[this.currentTurnIndex % active.length];

    this.diceValue = null;
    this.diceRolled = false;
    this.turnEndAt = Date.now() + TURN_DURATION_MS;
    this.broadcastState();
    this.emit('ludo:turn_start', { uid: player.uid, timeoutMs: TURN_DURATION_MS });

    const timer = setTimeout(() => this.autoRollAndMove(player.uid), TURN_DURATION_MS);
    this.timers.push(timer);
  }

  private autoRollAndMove(uid: string): void {
    if (!this.diceRolled) {
      const value = Math.floor(Math.random() * 6) + 1;
      this.diceValue = value;
      this.diceRolled = true;
      this.emit('ludo:dice_rolled', { uid, value, forfeit: false });

      const movable = this.getMovablePieces(uid, value);
      if (movable.length > 0) {
        setTimeout(() => this.applyMove(uid, movable[0], value), 800);
      } else {
        setTimeout(() => this.advanceTurn(), 800);
      }
    }
  }

  private advanceTurn(): void {
    this.clearTimers();
    this.diceValue = null;
    this.diceRolled = false;
    this.turnEndAt = null;

    const active = this.activePlayers();
    this.currentTurnIndex = (this.currentTurnIndex + 1) % active.length;
    this.broadcastState();
    this.startTurn();
  }

  private endGame(): void {
    this.phase = 'GAME_OVER';
    const rankings = this.players.map(p => ({ uid: p.uid, rank: p.rank }));
    this.emit('ludo:game_over', { winnerId: this.winners[0] || null, rankings, gameId: this.gameId });
    this.broadcastState();
  }

  getPublicState(): LudoGameState {
    const active = this.activePlayers();
    const currentPlayer = active[this.currentTurnIndex % (active.length || 1)];

    return {
      gameId: this.gameId,
      roomId: this.roomId,
      phase: this.phase,
      players: this.players.map(p => ({
        uid: p.uid,
        displayName: p.displayName,
        avatarId: p.avatarId,
        color: p.color,
        pieces: p.pieces,
        finishedCount: p.pieces.filter(pc => pc.status === 'finished').length,
        isTurn: p.uid === currentPlayer?.uid,
        isEliminated: p.rank !== null && this.phase !== 'GAME_OVER',
        rank: p.rank,
      })),
      currentTurnUid: currentPlayer?.uid || '',
      diceValue: this.diceValue,
      diceRolled: this.diceRolled,
      movablePieces: this.diceRolled && this.diceValue
        ? this.getMovablePieces(currentPlayer?.uid || '', this.diceValue)
        : [],
      consecutiveSixes: this.consecutiveSixes,
      turnEndAt: this.turnEndAt,
      roundNumber: 1,
      winners: this.winners,
    };
  }

  private broadcastState(): void {
    this.emit('ludo:state', this.getPublicState());
  }

  private isPlayerTurn(uid: string): boolean {
    const active = this.activePlayers();
    return active[this.currentTurnIndex % active.length]?.uid === uid;
  }

  private getPlayer(uid: string): InternalPlayer | undefined {
    return this.players.find(p => p.uid === uid);
  }

  private activePlayers(): InternalPlayer[] {
    return this.players.filter(p => p.rank === null);
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
