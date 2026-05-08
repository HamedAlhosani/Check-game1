import { v4 as uuidv4 } from 'uuid';
import { GameType, GameMode, ELIMINATION_SCORE } from '@check-game/shared';
import { Room } from './Room';
import { GameEngine, GameEventEmitter } from '../game/GameEngine';
import { BotPlayer } from '../game/BotPlayer';
import { LudoEngine } from '../game/ludo/LudoEngine';
import { LudoBotPlayer } from '../game/ludo/LudoBotPlayer';
import { DominoEngine } from '../game/domino/DominoEngine';
import { DominoBotPlayer } from '../game/domino/DominoBotPlayer';
import { JacaroEngine } from '../game/jackaro/JacaroEngine';
import { JacaroBotPlayer } from '../game/jackaro/JacaroBotPlayer';

type AnyEngine = GameEngine | LudoEngine | DominoEngine | JacaroEngine;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private games: Map<string, AnyEngine> = new Map();
  private checkBots: Map<string, BotPlayer[]> = new Map();
  private ludoBots: Map<string, LudoBotPlayer[]> = new Map();
  private dominoBots: Map<string, DominoBotPlayer[]> = new Map();
  private jacaroBots: Map<string, JacaroBotPlayer[]> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  createRoom(
    hostUid: string,
    hostName: string,
    hostAvatar: string,
    name: string,
    type: 'public' | 'private',
    botCount: number,
    botDifficulty: 'easy' | 'medium' | 'hard',
    gameType: GameType = 'check',
    equippedFrame = 'frame_default',
    maxPlayers = 10,
    gameMode: GameMode = 'standard',
    tutorial = false
  ): Room {
    const roomId = uuidv4();
    const room = new Room(roomId, name, type, hostUid, hostName, hostAvatar, gameType, equippedFrame, maxPlayers, gameMode);
    room.tutorial = tutorial;

    if (botCount > 0) {
      room.addBots(Math.min(botCount, 10), botDifficulty);
    }

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.code === code && room.status === 'waiting') return room;
    }
    return undefined;
  }

  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(
      r => r.type === 'public' && r.status === 'waiting'
    );
  }

  joinRoom(roomId: string, uid: string, displayName: string, avatarId: string, equippedFrame = 'frame_default'): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const added = room.addPlayer({ uid, displayName, avatarId, isBot: false, isReady: false, isHost: false, equippedFrame });
    return added ? room : null;
  }

  leaveRoom(uid: string, roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.removePlayer(uid);

    if (room.players.filter(p => !p.isBot).length === 0) {
      this.rooms.delete(roomId);
      return null;
    }
    return room;
  }

  trackSocket(socketId: string, roomId: string): void {
    this.socketToRoom.set(socketId, roomId);
  }

  getRoomForSocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  getRoomForUid(uid: string): string | undefined {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.status === 'in_progress' && room.players.some(p => p.uid === uid && !p.isBot)) {
        return roomId;
      }
    }
    return undefined;
  }

  /**
   * Returns the live game a uid is seated in, suitable for presenting a
   * "spectate" handle to a friend. Surfaces every in-progress game the uid
   * is in — public matchmaking, private invite-code rooms, vs-bots games,
   * and tournament matches — so a friend's friends list always shows the
   * green Watch pill while they're in a game.
   */
  getCurrentGameForUid(uid: string): { gameId: string; gameType: GameType } | null {
    for (const room of this.rooms.values()) {
      if (
        room.status === 'in_progress' &&
        room.gameId &&
        room.players.some(p => p.uid === uid && !p.isBot)
      ) {
        return { gameId: room.gameId, gameType: room.gameType };
      }
    }
    return null;
  }

  removeSocket(socketId: string): void {
    this.socketToRoom.delete(socketId);
  }

  startGame(roomId: string, emit: GameEventEmitter): AnyEngine | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.canStart()) return null;

    room.status = 'in_progress';

    const players = room.players.map(p => ({
      uid: p.uid,
      displayName: p.displayName,
      avatarId: p.avatarId,
      isBot: p.isBot,
      equippedFrame: p.equippedFrame || 'frame_default',
    }));

    let engine: AnyEngine;

    switch (room.gameType) {
      case 'ludo': {
        const e = new LudoEngine(roomId, players, emit);
        engine = e;
        const bots = room.players.filter(p => p.isBot)
          .map(p => new LudoBotPlayer(p.uid, p.botDifficulty || 'medium'));
        this.ludoBots.set(roomId, bots);
        break;
      }
      case 'domino': {
        const e = new DominoEngine(roomId, players, emit);
        engine = e;
        const bots = room.players.filter(p => p.isBot)
          .map(p => new DominoBotPlayer(p.uid, p.botDifficulty || 'medium'));
        this.dominoBots.set(roomId, bots);
        break;
      }
      case 'jackaro': {
        const e = new JacaroEngine(roomId, players, emit);
        engine = e;
        const bots = room.players.filter(p => p.isBot)
          .map(p => new JacaroBotPlayer(p.uid, p.botDifficulty || 'medium'));
        this.jacaroBots.set(roomId, bots);
        break;
      }
      default: {
        const eliminationScore = ELIMINATION_SCORE[room.gameMode];
        const e = new GameEngine(roomId, players, emit, { eliminationScore, gameMode: room.gameMode, tutorial: room.tutorial });
        engine = e;
        const bots = room.players.filter(p => p.isBot)
          .map(p => new BotPlayer(p.uid, p.botDifficulty || 'medium'));
        this.checkBots.set(roomId, bots);
        break;
      }
    }

    room.gameId = (engine as any).gameId;
    this.games.set((engine as any).gameId, engine);
    this.games.set(roomId, engine);

    return engine;
  }

  getGame(idOrRoomId: string): AnyEngine | undefined {
    return this.games.get(idOrRoomId);
  }

  getCheckBots(roomId: string): BotPlayer[] { return this.checkBots.get(roomId) || []; }

  addBotPlayer(roomId: string, bot: BotPlayer): void {
    const bots = this.checkBots.get(roomId);
    if (!bots) return;
    if (!bots.find(b => b.uid === bot.uid)) bots.push(bot);
  }
  getLudoBots(roomId: string): LudoBotPlayer[] { return this.ludoBots.get(roomId) || []; }
  getDominoBots(roomId: string): DominoBotPlayer[] { return this.dominoBots.get(roomId) || []; }
  getJacaroBots(roomId: string): JacaroBotPlayer[] { return this.jacaroBots.get(roomId) || []; }

  findMatchableRoom(gameType: GameType, maxPlayers: number, gameMode: GameMode = 'standard'): Room | undefined {
    for (const room of this.rooms.values()) {
      if (
        room.type === 'public' &&
        room.status === 'waiting' &&
        room.gameType === gameType &&
        room.gameMode === gameMode &&
        room.maxPlayers === maxPlayers &&
        room.players.length < room.maxPlayers
      ) {
        return room;
      }
    }
    return undefined;
  }

  getRoomGameType(roomId: string): GameType {
    return this.rooms.get(roomId)?.gameType || 'check';
  }

  endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const engine = this.games.get(roomId);
      if (engine) (engine as any).destroy();
      this.games.delete(roomId);
      this.games.delete(room.gameId || '');
      this.checkBots.delete(roomId);
      this.ludoBots.delete(roomId);
      this.dominoBots.delete(roomId);
      this.jacaroBots.delete(roomId);
      room.status = 'finished';
    }
  }
}

export const roomManager = new RoomManager();
