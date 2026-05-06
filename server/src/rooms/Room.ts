import { RoomPlayer, RoomState, GameType, GameMode } from '@check-game/shared';

const MAX_PLAYERS = 10;
const BOT_NAMES = [
  'بوت البدوي', 'بوت الصقار', 'بوت التاجر', 'بوت الصحراء',
  'بوت النخلة', 'بوت الرمال', 'بوت الواحة', 'بوت الفارس',
  'بوت القمر',
];

export class Room {
  readonly roomId: string;
  name: string;
  type: 'public' | 'private';
  code: string | null;
  hostUid: string;
  status: 'waiting' | 'in_progress' | 'finished';
  players: RoomPlayer[];
  createdAt: number;
  gameId: string | null = null;
  gameType: GameType;
  gameMode: GameMode;
  maxPlayers: number;

  constructor(
    roomId: string,
    name: string,
    type: 'public' | 'private',
    hostUid: string,
    hostName: string,
    hostAvatar: string,
    gameType: GameType = 'check',
    hostEquippedFrame = 'frame_default',
    maxPlayers = 10,
    gameMode: GameMode = 'standard'
  ) {
    this.roomId = roomId;
    this.name = name;
    this.type = type;
    this.code = type === 'private' ? this.generateCode() : null;
    this.hostUid = hostUid;
    this.status = 'waiting';
    this.gameType = gameType;
    this.gameMode = gameMode;
    this.createdAt = Date.now();
    this.maxPlayers = Math.min(Math.max(maxPlayers, 2), 10);
    this.players = [{
      uid: hostUid,
      displayName: hostName,
      avatarId: hostAvatar,
      isBot: false,
      isReady: false,
      isHost: true,
      equippedFrame: hostEquippedFrame,
    }];
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addPlayer(player: RoomPlayer): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    if (this.players.find(p => p.uid === player.uid)) return false;
    this.players.push(player);
    return true;
  }

  removePlayer(uid: string): void {
    this.players = this.players.filter(p => p.uid !== uid);
    if (this.players.length > 0 && this.hostUid === uid) {
      this.hostUid = this.players[0].uid;
      this.players[0].isHost = true;
    }
  }

  setReady(uid: string, ready: boolean): void {
    const p = this.players.find(pl => pl.uid === uid);
    if (p) p.isReady = ready;
  }

  canStart(): boolean {
    return (
      this.status === 'waiting' &&
      this.players.length >= 2 &&
      this.players.length <= this.maxPlayers
    );
  }

  addBots(count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): void {
    const existingBots = this.players.filter(p => p.isBot).length;
    for (let i = 0; i < count && this.players.length < this.maxPlayers; i++) {
      const idx = existingBots + i;
      const botId = `bot-${this.roomId}-${idx}`;
      this.players.push({
        uid: botId,
        displayName: BOT_NAMES[idx % BOT_NAMES.length],
        avatarId: `avatar_${(idx % 8) + 1}`,
        isBot: true,
        botDifficulty: difficulty,
        isReady: true,
        isHost: false,
      });
    }
  }

  addOneBot(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    const idx = this.players.filter(p => p.isBot).length;
    const botId = `bot-${this.roomId}-${Date.now()}`;
    this.players.push({
      uid: botId,
      displayName: BOT_NAMES[idx % BOT_NAMES.length],
      avatarId: `avatar_${(idx % 8) + 1}`,
      isBot: true,
      botDifficulty: difficulty,
      isReady: true,
      isHost: false,
    });
    return true;
  }

  removeBot(botUid: string): boolean {
    const idx = this.players.findIndex(p => p.uid === botUid && p.isBot);
    if (idx === -1) return false;
    this.players.splice(idx, 1);
    return true;
  }

  toState(): RoomState {
    return {
      roomId: this.roomId,
      name: this.name,
      type: this.type,
      code: this.code,
      hostUid: this.hostUid,
      status: this.status,
      players: this.players,
      createdAt: this.createdAt,
      gameId: this.gameId,
      gameType: this.gameType,
      maxPlayers: this.maxPlayers,
      gameMode: this.gameMode,
    };
  }
}
