import { RoomPlayer, RoomState, GameType, GameMode } from '@check-game/shared';

const MAX_PLAYERS = 10;
// Big pool of names so a 10-player table doesn't repeat. We pick uniquely
// per-room so each bot feels like its own person.
const BOT_NAMES = [
  'سالم', 'علي', 'خالد', 'أحمد', 'محمد', 'يوسف', 'حمد', 'راشد',
  'سلطان', 'فيصل', 'منصور', 'بدر', 'طلال', 'ناصر', 'فارس', 'عمر',
  'زايد', 'حمدان', 'عبدالله', 'مبارك', 'سعيد', 'جاسم', 'ماجد', 'سيف',
];
// Avatar pool — every avatar id we have art for. Picks uniquely too.
const BOT_AVATARS = [
  'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5', 'avatar_6', 'avatar_7',
  'avatar_9', 'avatar_10', 'avatar_11', 'avatar_12', 'avatar_13', 'avatar_14',
  'avatar_15', 'avatar_19', 'avatar_20', 'avatar_22',
];

function pickUnique<T>(pool: T[], used: Set<T>): T {
  // Returns a random unused item — falls back to a random item if exhausted.
  const free = pool.filter(x => !used.has(x));
  const choice = free.length > 0
    ? free[Math.floor(Math.random() * free.length)]
    : pool[Math.floor(Math.random() * pool.length)];
  used.add(choice);
  return choice;
}

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
  /** When true the GameEngine skips its auto-timers (peek/turn/burn/special)
   *  so a tutorial player can read coach bubbles at their own pace. */
  tutorial: boolean = false;

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

  /** Names + avatars currently in use in this room — humans + bots. Used to
   *  pick distinct bot identities so the table never has duplicates. */
  private usedIdentities() {
    const usedNames = new Set<string>();
    const usedAvatars = new Set<string>();
    for (const p of this.players) {
      usedNames.add(p.displayName);
      usedAvatars.add(p.avatarId);
    }
    return { usedNames, usedAvatars };
  }

  addBots(count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): void {
    const { usedNames, usedAvatars } = this.usedIdentities();
    const existingBots = this.players.filter(p => p.isBot).length;
    for (let i = 0; i < count && this.players.length < this.maxPlayers; i++) {
      const idx = existingBots + i;
      const botId = `bot-${this.roomId}-${idx}`;
      this.players.push({
        uid: botId,
        displayName: pickUnique(BOT_NAMES, usedNames),
        avatarId:    pickUnique(BOT_AVATARS, usedAvatars),
        isBot: true,
        botDifficulty: difficulty,
        isReady: true,
        isHost: false,
      });
    }
  }

  addOneBot(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): boolean {
    if (this.players.length >= this.maxPlayers) return false;
    const { usedNames, usedAvatars } = this.usedIdentities();
    const botId = `bot-${this.roomId}-${Date.now()}`;
    this.players.push({
      uid: botId,
      displayName: pickUnique(BOT_NAMES, usedNames),
      avatarId:    pickUnique(BOT_AVATARS, usedAvatars),
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
