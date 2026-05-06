import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  SOCKET_EVENTS, TournamentSize, GameMode, ELIMINATION_SCORE,
  TournamentState,
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

  /** Create a tournament for a host and immediately spin up their first match. */
  create(opts: {
    io: Server;
    hostUid: string;
    hostName: string;
    hostAvatar: string;
    hostFrame?: string;
    size: TournamentSize;
    difficulty: 'easy' | 'medium' | 'hard';
    matchLength: GameMode;
  }): TournamentEngine {
    const t = new TournamentEngine({
      hostUid:     opts.hostUid,
      hostName:    opts.hostName,
      hostAvatar:  opts.hostAvatar,
      hostFrame:   opts.hostFrame,
      size:        opts.size,
      difficulty:  opts.difficulty,
      matchLength: opts.matchLength,
    });
    this.tournaments.set(t.state.id, t);
    return t;
  }

  get(tournamentId: string): TournamentEngine | undefined {
    return this.tournaments.get(tournamentId);
  }

  /** Cleanly delete a tournament and any active match mappings. */
  destroy(tournamentId: string): void {
    const t = this.tournaments.get(tournamentId);
    if (!t) return;
    for (const [gid, m] of this.gameToTournament.entries()) {
      if (m.tournamentId === tournamentId) this.gameToTournament.delete(gid);
    }
    this.tournaments.delete(tournamentId);
  }

  /** Set up a Room + GameEngine for the host's next match and return the
   *  gameId so the client can navigate to it. */
  startNextHostMatch(io: Server, tournamentId: string): { gameId: string } | { error: string } {
    const t = this.tournaments.get(tournamentId);
    if (!t) return { error: 'Tournament not found' };
    if (t.state.status !== 'in_progress') return { error: 'Tournament not active' };

    const matchNum = t.state.nextHostMatchNum;
    if (matchNum == null) return { error: 'No host match pending' };
    const match = t.getMatch(matchNum);
    if (!match || !match.p1Uid || !match.p2Uid) return { error: 'Match not ready' };

    const players = t.getMatchPlayers(matchNum);
    if (players.length !== 2) return { error: 'Bracket players missing' };

    // Build a room with the two players (host + bot). We bypass the
    // standard add-bot flow so the bot keeps its bracket uid (otherwise
    // the game-over handler can't tell which bracket player won).
    const roomId = uuidv4();
    const host = players.find(p => p.uid === t.state.hostUid)!;
    const bot  = players.find(p => p.uid !== t.state.hostUid)!;
    const room = new Room(
      roomId, '🏆 بطولة', 'private',
      host.uid, host.displayName, host.avatarId,
      'check', host.equippedFrame || 'frame_default',
      2, t.state.matchLength,
    );
    // Replace the host placeholder (added by Room ctor) with the bot too.
    // Room ctor already added host as player 0 — push the bot as player 1.
    room.addPlayer({
      uid: bot.uid,
      displayName: bot.displayName,
      avatarId: bot.avatarId,
      isBot: true,
      botDifficulty: bot.botDifficulty || t.state.difficulty,
      isReady: true,
      isHost: false,
      equippedFrame: 'frame_default',
    });

    // Register the room so the rest of the system sees it.
    (roomManager as any).rooms.set(roomId, room);

    // Wire up socket: caller's socket already exists; we need the host
    // to actually join the socket.io room channel for this gameId.
    const sockets = Array.from(io.sockets.sockets.values()) as any[];
    const hostSocket = sockets.find(s => s.uid === t.state.hostUid);
    if (hostSocket) {
      hostSocket.join(roomId);
      (roomManager as any).socketToRoom.set(hostSocket.id, roomId);
    }

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

    // Register engine with roomManager so the game page can find it
    (roomManager as any).games.set(engine.gameId, engine);
    (roomManager as any).games.set(roomId, engine);
    (roomManager as any).checkBots.set(roomId, [
      new BotPlayer(bot.uid, bot.botDifficulty || t.state.difficulty),
    ]);
    room.gameId = engine.gameId;

    // Track the mapping so the game-over handler can advance the bracket.
    this.gameToTournament.set(engine.gameId, { tournamentId, matchNum });
    t.markMatchStarted(matchNum, engine.gameId);

    // Tell the client to navigate to the game.
    io.to(roomId).emit(SOCKET_EVENTS.LOBBY_GAME_STARTING, {
      gameId: engine.gameId, countdown: 0, gameType: 'check',
    });

    // Start play after the same 400ms delay used by lobbyEvents.
    setTimeout(() => {
      engine.start();
      // Reuse the standard bot scheduler — it polls the engine, drives
      // the bot's plays, and emits the same events as a normal Check
      // match. The game-over hook in gameEvents.ts is what advances the
      // bracket once the engine reports GAME_OVER.
      scheduleCheckBotTurns(io, roomId, engine);
    }, 400);

    // Push the updated tournament state.
    this.broadcastState(io, tournamentId);

    return { gameId: engine.gameId };
  }

  /** Called when any GameEngine finishes — checks if it was a tournament
   *  match and, if so, advances the bracket. */
  async onGameOver(io: Server, gameId: string, winnerUid: string | null): Promise<void> {
    const link = this.gameToTournament.get(gameId);
    if (!link) return;
    this.gameToTournament.delete(gameId);

    const t = this.tournaments.get(link.tournamentId);
    if (!t) return;

    if (winnerUid) t.reportHostMatchResult(link.matchNum, winnerUid);

    this.broadcastState(io, link.tournamentId);

    if (t.state.status === 'finished') {
      const isHostChampion = t.state.championUid === t.state.hostUid;
      let prizeGranted = 0;
      if (isHostChampion) {
        const r = await grantCoins(t.state.hostUid, t.state.prizeCoins);
        if (r.ok) prizeGranted = t.state.prizeCoins;
      }
      const sockets = Array.from(io.sockets.sockets.values()) as any[];
      const hostSocket = sockets.find(s => s.uid === t.state.hostUid);
      hostSocket?.emit(SOCKET_EVENTS.TOURNAMENT_FINISHED, {
        tournamentId: t.state.id,
        championUid: t.state.championUid,
        isHostChampion,
        prizeCoins: prizeGranted,
      });
      // Tournament is done — keep state around for a minute then drop
      setTimeout(() => this.destroy(t.state.id), 60_000);
    }
  }

  /** Push the latest tournament state to the host. */
  broadcastState(io: Server, tournamentId: string): void {
    const t = this.tournaments.get(tournamentId);
    if (!t) return;
    const sockets = Array.from(io.sockets.sockets.values()) as any[];
    const hostSocket = sockets.find(s => s.uid === t.state.hostUid);
    hostSocket?.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t.getState());
  }

  /** Returns the active tournament whose host is this uid, if any. */
  getActiveForHost(uid: string): TournamentState | null {
    for (const t of this.tournaments.values()) {
      if (t.state.hostUid === uid && t.state.status !== 'finished') return t.getState();
    }
    return null;
  }
}

export const tournamentManager = new TournamentManager();
