import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  SOCKET_EVENTS, TournamentSize, GameMode, ELIMINATION_SCORE,
  TournamentState, TournamentSummary, TournamentVisibility, TournamentKind,
  TournamentMatch,
} from '@check-game/shared';
import { TournamentEngine } from '../game/Tournament';
import { GameEngine } from '../game/GameEngine';
import { BotPlayer } from '../game/BotPlayer';
import { roomManager } from './RoomManager';
import { Room } from './Room';
import { createEmitter, scheduleCheckBotTurns } from '../socket/gameEvents';
import { grantCoins } from '../services/firestoreService';

interface ActiveMatch {
  tournamentId: string;
  matchNum: number;
}

class TournamentManager {
  private tournaments = new Map<string, TournamentEngine>();
  private gameToTournament = new Map<string, ActiveMatch>();

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  create(opts: {
    io: Server;
    hostUid: string;
    hostName: string;
    hostAvatar: string;
    hostFrame?: string;
    name?: string;
    visibility?: TournamentVisibility;
    kind: TournamentKind;
    size: TournamentSize;
    difficulty: 'easy' | 'medium' | 'hard';
    matchLength: GameMode;
  }): TournamentEngine {
    const t = new TournamentEngine({
      hostUid: opts.hostUid,
      hostName: opts.hostName,
      hostAvatar: opts.hostAvatar,
      hostFrame: opts.hostFrame,
      name: opts.name,
      visibility: opts.visibility,
      kind: opts.kind,
      size: opts.size,
      difficulty: opts.difficulty,
      matchLength: opts.matchLength,
    });
    this.tournaments.set(t.state.id, t);
    // Solo auto-starts in the engine ctor — kick off match 1.
    if (opts.kind === 'solo' && t.state.status === 'in_progress') {
      // Defer slightly so the caller can emit STATE first.
      setTimeout(() => this.startReadyMatches(opts.io, t.state.id), 0);
    }
    return t;
  }

  get(id: string): TournamentEngine | undefined {
    return this.tournaments.get(id);
  }

  destroy(id: string): void {
    const t = this.tournaments.get(id);
    if (!t) return;
    for (const [gid, m] of this.gameToTournament.entries()) {
      if (m.tournamentId === id) this.gameToTournament.delete(gid);
    }
    this.tournaments.delete(id);
  }

  // ── Join / leave ───────────────────────────────────────────────────────────
  join(io: Server, id: string, player: { uid: string; displayName: string; avatarId: string; equippedFrame?: string }): { ok: boolean; error?: string } {
    const t = this.tournaments.get(id);
    if (!t) return { ok: false, error: 'Tournament not found' };
    const r = t.join(player);
    if (!r.ok) return r;
    this.broadcastState(io, id);
    this.broadcastPublicList(io);
    return { ok: true };
  }

  leave(io: Server, id: string, uid: string): void {
    const t = this.tournaments.get(id);
    if (!t) return;
    t.leave(uid);
    if (t.state.status === 'waiting' && t.state.players.length === 0) {
      this.destroy(id);
    } else {
      this.broadcastState(io, id);
    }
    this.broadcastPublicList(io);
  }

  fillBots(io: Server, id: string, hostUid: string): { ok: boolean; error?: string } {
    const t = this.tournaments.get(id);
    if (!t) return { ok: false, error: 'Not found' };
    if (t.state.hostUid !== hostUid) return { ok: false, error: 'Only host can fill bots' };
    if (t.state.status !== 'waiting') return { ok: false, error: 'Already started' };
    t.fillBots();
    this.broadcastState(io, id);
    this.broadcastPublicList(io);
    return { ok: true };
  }

  start(io: Server, id: string, hostUid: string): { ok: boolean; error?: string } {
    const t = this.tournaments.get(id);
    if (!t) return { ok: false, error: 'Not found' };
    if (t.state.hostUid !== hostUid) return { ok: false, error: 'Only host can start' };
    const r = t.start();
    if (!r.ok) return r;
    this.broadcastState(io, id);
    this.broadcastPublicList(io);
    this.startReadyMatches(io, id);
    return { ok: true };
  }

  // ── Match orchestration ─────────────────────────────────────────────────────
  /** For each ready match in the bracket, create a Room+GameEngine and notify
   *  the participants so they navigate to the game. */
  startReadyMatches(io: Server, tournamentId: string): void {
    const t = this.tournaments.get(tournamentId);
    if (!t) return;

    for (const m of t.pendingReadyMatches()) {
      this.startSingleMatch(io, t, m);
    }
  }

  private startSingleMatch(io: Server, t: TournamentEngine, m: TournamentMatch): void {
    if (!m.p1Uid || !m.p2Uid) return;
    const p1 = t.player(m.p1Uid);
    const p2 = t.player(m.p2Uid);
    if (!p1 || !p2) return;

    // Build the room. We don't go through the standard add-bots flow
    // because we want each player to keep their bracket uid (so the
    // game-over winner aligns with the bracket).
    const roomId = uuidv4();
    const room = new Room(
      roomId, '🏆 بطولة', 'private',
      // Treat the alphabetically-first player as the "host" of the
      // underlying room — it's a Room-internal concept and doesn't
      // affect tournament logic.
      p1.uid, p1.displayName, p1.avatarId,
      'check', p1.equippedFrame || 'frame_default',
      2, t.state.matchLength,
    );
    room.addPlayer({
      uid: p2.uid,
      displayName: p2.displayName,
      avatarId: p2.avatarId,
      isBot: p2.isBot,
      botDifficulty: p2.botDifficulty || t.state.difficulty,
      isReady: true,
      isHost: false,
      equippedFrame: p2.equippedFrame || 'frame_default',
    });
    // The Room ctor already added p1 — but with isBot=false. If p1 is a
    // bot, fix that flag so the bot scheduler picks it up.
    if (p1.isBot) {
      const idx = room.players.findIndex(x => x.uid === p1.uid);
      if (idx >= 0) {
        room.players[idx].isBot = true;
        room.players[idx].botDifficulty = p1.botDifficulty || t.state.difficulty;
      }
    }

    (roomManager as any).rooms.set(roomId, room);
    room.status = 'in_progress';

    const playerList = room.players.map(p => ({
      uid: p.uid, displayName: p.displayName, avatarId: p.avatarId,
      isBot: p.isBot, equippedFrame: p.equippedFrame || 'frame_default',
    }));
    const eliminationScore = ELIMINATION_SCORE[t.state.matchLength];
    const engine = new GameEngine(
      roomId, playerList, createEmitter(io, roomId),
      { eliminationScore, gameMode: t.state.matchLength },
    );

    (roomManager as any).games.set(engine.gameId, engine);
    (roomManager as any).games.set(roomId, engine);
    const bots: BotPlayer[] = room.players.filter(p => p.isBot)
      .map(p => new BotPlayer(p.uid, p.botDifficulty || t.state.difficulty));
    (roomManager as any).checkBots.set(roomId, bots);
    room.gameId = engine.gameId;

    this.gameToTournament.set(engine.gameId, { tournamentId: t.state.id, matchNum: m.matchNum });
    t.markMatchStarted(m.matchNum, engine.gameId);

    // Make every human participant join the socket.io room channel so they
    // get the game's broadcasts (state, turn, etc.) and tell them to go to
    // the game page.
    const sockets = Array.from(io.sockets.sockets.values()) as any[];
    for (const playerObj of [p1, p2]) {
      if (playerObj.isBot) continue;
      const s = sockets.find(x => x.uid === playerObj.uid);
      if (s) {
        s.join(roomId);
        (roomManager as any).socketToRoom.set(s.id, roomId);
        s.emit(SOCKET_EVENTS.TOURNAMENT_MATCH_START, {
          tournamentId: t.state.id,
          gameId: engine.gameId,
          matchNum: m.matchNum,
        });
      }
    }

    // Push the updated bracket to everyone subscribed
    this.broadcastState(io, t.state.id);

    setTimeout(() => {
      engine.start();
      scheduleCheckBotTurns(io, roomId, engine);
    }, 400);
  }

  /** Manually start the host's next pending match (used by solo + by
   *  online players who navigated back to the bracket). */
  startNextMatchForUser(io: Server, tournamentId: string, uid: string): { gameId?: string; error?: string } {
    const t = this.tournaments.get(tournamentId);
    if (!t) return { error: 'Not found' };
    if (t.state.status !== 'in_progress') return { error: 'Not active' };

    // First check: are they already in a match?
    const inProgress = t.inProgressMatchForPlayer(uid);
    if (inProgress?.gameId) return { gameId: inProgress.gameId };

    // Otherwise find the next pending match and start it (only if both
    // players are known). For online tournaments this rarely needs to
    // explicitly fire because matches auto-start when both players from
    // the previous round have a winner.
    const pending = t.pendingMatchForPlayer(uid);
    if (!pending) return { error: 'No pending match' };
    if (!pending.p1Uid || !pending.p2Uid) return { error: 'Waiting for opponent' };

    if (pending.status === 'pending') {
      this.startSingleMatch(io, t, pending);
    }
    const m = t.getMatch(pending.matchNum);
    return { gameId: m?.gameId || undefined };
  }

  // ── Game-over hook ────────────────────────────────────────────────────────
  async onGameOver(io: Server, gameId: string, winnerUid: string | null): Promise<void> {
    const link = this.gameToTournament.get(gameId);
    if (!link) return;
    this.gameToTournament.delete(gameId);

    const t = this.tournaments.get(link.tournamentId);
    if (!t) return;

    if (winnerUid) {
      const r = t.reportMatchResult(link.matchNum, winnerUid);
      this.broadcastState(io, link.tournamentId);
      this.broadcastPublicList(io);

      if (t.state.status === 'finished') {
        const champion = t.state.championUid;
        let prize = 0;
        if (champion && !champion.startsWith('bot-')) {
          const grant = await grantCoins(champion, t.state.prizeCoins);
          if (grant.ok) prize = t.state.prizeCoins;
        }
        // Notify every human player about the result
        const sockets = Array.from(io.sockets.sockets.values()) as any[];
        for (const p of t.state.players) {
          if (p.isBot) continue;
          const s = sockets.find(x => x.uid === p.uid);
          s?.emit(SOCKET_EVENTS.TOURNAMENT_FINISHED, {
            tournamentId: t.state.id,
            championUid: champion,
            isHostChampion: champion === p.uid,
            prizeCoins: champion === p.uid ? prize : 0,
          });
        }
        setTimeout(() => this.destroy(t.state.id), 60_000);
        return;
      }

      // If the round just completed, kick off the next round's matches.
      if (r.newlyReady.length > 0) {
        this.startReadyMatches(io, link.tournamentId);
      }
    }
  }

  // ── Broadcasts ─────────────────────────────────────────────────────────────
  /** Send the latest tournament state to every (human) participant. */
  broadcastState(io: Server, id: string): void {
    const t = this.tournaments.get(id);
    if (!t) return;
    const sockets = Array.from(io.sockets.sockets.values()) as any[];
    for (const p of t.state.players) {
      if (p.isBot) continue;
      const s = sockets.find(x => x.uid === p.uid);
      s?.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t.getStateFor(p.uid));
    }
  }

  /** Send current public list to all connected clients. */
  broadcastPublicList(io: Server): void {
    const list = this.getPublicSummaries();
    io.emit(SOCKET_EVENTS.TOURNAMENT_LIST, list);
  }

  getPublicSummaries(): TournamentSummary[] {
    return Array.from(this.tournaments.values())
      .filter(t => t.state.visibility === 'public' && t.state.kind === 'online')
      .filter(t => t.state.status !== 'finished')
      .sort((a, b) => b.state.createdAt - a.state.createdAt)
      .map(t => t.toSummary());
  }

  /** All tournaments containing a given uid that are still active. */
  getActiveForPlayer(uid: string): TournamentEngine[] {
    return Array.from(this.tournaments.values())
      .filter(t => t.state.status !== 'finished')
      .filter(t => t.state.players.some(p => p.uid === uid));
  }

  /** Look up by join code. */
  findByCode(code: string): TournamentEngine | undefined {
    const c = code.toUpperCase();
    for (const t of this.tournaments.values()) {
      if (t.state.code === c && t.state.status === 'waiting') return t;
    }
    return undefined;
  }
}

export const tournamentManager = new TournamentManager();
