import { v4 as uuidv4 } from 'uuid';
import {
  TournamentState, TournamentMatch, TournamentPlayer, TournamentSize,
  TournamentSummary, TournamentVisibility, TournamentKind,
  GameMode, tournamentPrize,
} from '@check-game/shared';

const BOT_NAMES = [
  'بوت البدوي', 'بوت الصقار', 'بوت التاجر', 'بوت الصحراء',
  'بوت النخلة', 'بوت الرمال', 'بوت الواحة', 'بوت الفارس', 'بوت القمر',
];

/**
 * Single-elimination tournament engine.
 *
 * Supports two flavours via TournamentKind:
 *   'solo'   — one human (host) + N-1 bots auto-filled. Same as v1.
 *   'online' — players join from a public/private list; host clicks
 *              "Start" to lock the bracket. Empty seats can be filled
 *              with bots before starting.
 *
 * Bracket runs in three phases:
 *   waiting     — players are joining, no matches yet
 *   in_progress — bracket built; matches advance round-by-round
 *   finished    — final completed; champion set
 */
export class TournamentEngine {
  readonly state: TournamentState;

  constructor(opts: {
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
  }) {
    const id = uuidv4();
    const isSolo = opts.kind === 'solo';
    const visibility: TournamentVisibility = opts.visibility || (isSolo ? 'private' : 'public');

    const players: TournamentPlayer[] = [{
      uid: opts.hostUid,
      displayName: opts.hostName,
      avatarId: opts.hostAvatar,
      equippedFrame: opts.hostFrame || 'frame_default',
      isBot: false,
      isEliminated: false,
    }];

    this.state = {
      id,
      hostUid: opts.hostUid,
      name: opts.name || `بطولة ${opts.hostName}`,
      visibility,
      kind: opts.kind,
      code: visibility === 'private' && opts.kind === 'online'
        ? Math.random().toString(36).substring(2, 8).toUpperCase()
        : null,
      size: opts.size,
      difficulty: opts.difficulty,
      matchLength: opts.matchLength,
      status: 'waiting',
      players,
      bracket: [],
      championUid: null,
      prizeCoins: tournamentPrize(opts.size, opts.difficulty),
      createdAt: Date.now(),
      nextHostMatchNum: null,
    };

    // Solo: fill all remaining seats with bots immediately and start.
    if (isSolo) {
      this.fillBots();
      this.start();
    }
  }

  /** Add a real player to the bracket while still waiting. */
  join(player: { uid: string; displayName: string; avatarId: string; equippedFrame?: string }): { ok: boolean; error?: string } {
    if (this.state.status !== 'waiting') return { ok: false, error: 'Tournament already started' };
    if (this.state.players.find(p => p.uid === player.uid)) return { ok: false, error: 'Already joined' };
    if (this.state.players.length >= this.state.size) return { ok: false, error: 'Tournament full' };
    this.state.players.push({
      uid: player.uid,
      displayName: player.displayName,
      avatarId: player.avatarId,
      equippedFrame: player.equippedFrame || 'frame_default',
      isBot: false,
      isEliminated: false,
    });
    return { ok: true };
  }

  /** Remove a player who hasn't started yet (or replace them with a bot if started). */
  leave(uid: string): void {
    if (this.state.status === 'waiting') {
      this.state.players = this.state.players.filter(p => p.uid !== uid);
    } else {
      // Mark as eliminated so they don't get further matches; their current
      // match will play out (server-side bot takeover handles it).
      const p = this.state.players.find(x => x.uid === uid);
      if (p) p.isEliminated = true;
    }
  }

  /** Fill remaining seats with bots — host can call this before Start. */
  fillBots(): void {
    if (this.state.status !== 'waiting') return;
    let i = this.state.players.filter(p => p.isBot).length;
    while (this.state.players.length < this.state.size) {
      this.state.players.push({
        uid: `bot-${this.state.id}-${i}`,
        displayName: BOT_NAMES[i % BOT_NAMES.length],
        avatarId: `avatar_${(i % 8) + 1}`,
        isBot: true,
        botDifficulty: this.state.difficulty,
        isEliminated: false,
      });
      i++;
    }
  }

  /** Lock the player list and build the bracket. */
  start(): { ok: boolean; error?: string } {
    if (this.state.status !== 'waiting') return { ok: false, error: 'Already started' };
    if (this.state.players.length < this.state.size) {
      return { ok: false, error: `Need ${this.state.size} players (have ${this.state.players.length})` };
    }
    this.state.status = 'in_progress';
    this.state.bracket = this.buildBracket();
    this.recomputeNextMatchForHost();
    return { ok: true };
  }

  /** Build a single-elimination bracket of pre-shuffled players. */
  private buildBracket(): TournamentMatch[] {
    const players = this.state.players.slice();
    shuffle(players);

    const bracket: TournamentMatch[] = [];
    let matchNum = 0;
    const round1Matches = this.state.size / 2;
    for (let slot = 0; slot < round1Matches; slot++) {
      const p1 = players[slot * 2];
      const p2 = players[slot * 2 + 1];
      bracket.push({
        matchNum: matchNum++,
        round: 1, slot,
        p1Uid: p1.uid, p2Uid: p2.uid,
        winnerUid: null,
        status: 'pending',
        gameId: null,
        // For online tournaments any human-involved match needs the player(s)
        // to actively start it. We mark every match as "host" here in the
        // engine but the manager treats it differently per kind.
        isHostMatch: true,
      });
    }

    let prev = round1Matches;
    let round = 2;
    while (prev > 1) {
      const cur = prev / 2;
      for (let slot = 0; slot < cur; slot++) {
        bracket.push({
          matchNum: matchNum++,
          round, slot,
          p1Uid: null, p2Uid: null,
          winnerUid: null,
          status: 'pending',
          gameId: null,
          isHostMatch: false,
        });
      }
      prev = cur;
      round++;
    }
    return bracket;
  }

  /** Returns matches that are ready to start: both players known, status 'pending'. */
  pendingReadyMatches(): TournamentMatch[] {
    return this.state.bracket.filter(m =>
      m.status === 'pending' && m.p1Uid && m.p2Uid
    );
  }

  /** Mark a match as in-progress and attach the GameEngine's game id. */
  markMatchStarted(matchNum: number, gameId: string): TournamentMatch | null {
    const m = this.state.bracket.find(x => x.matchNum === matchNum);
    if (!m || m.status !== 'pending') return null;
    m.status = 'in_progress';
    m.gameId = gameId;
    return m;
  }

  /** Apply a finished match's result and advance the bracket. Returns whether
   *  more matches become ready as a result. */
  reportMatchResult(matchNum: number, winnerUid: string): { tournamentFinished: boolean; newlyReady: TournamentMatch[] } {
    const m = this.state.bracket.find(x => x.matchNum === matchNum);
    if (!m || m.status === 'completed') return { tournamentFinished: false, newlyReady: [] };
    m.winnerUid = winnerUid;
    m.status = 'completed';
    this.markEliminated(m.p1Uid === winnerUid ? m.p2Uid : m.p1Uid);

    // Check if this round is fully done.
    const sameRound = this.state.bracket.filter(x => x.round === m.round);
    const allDone = sameRound.every(x => x.status === 'completed');

    let newlyReady: TournamentMatch[] = [];
    if (allDone) {
      this.advanceRound(m.round);
      const next = this.state.bracket.filter(x => x.round === m.round + 1);
      newlyReady = next.filter(x => x.status === 'pending' && x.p1Uid && x.p2Uid);
    }

    // Final done?
    const final = this.state.bracket[this.state.bracket.length - 1];
    if (final.status === 'completed') {
      this.state.status = 'finished';
      this.state.championUid = final.winnerUid;
      this.state.nextHostMatchNum = null;
      return { tournamentFinished: true, newlyReady };
    }

    this.recomputeNextMatchForHost();
    return { tournamentFinished: false, newlyReady };
  }

  /** Promote round-N winners into round-N+1 player slots. */
  private advanceRound(finishedRound: number): void {
    const next = this.state.bracket.filter(m => m.round === finishedRound + 1);
    if (next.length === 0) return;
    const winners = this.state.bracket
      .filter(m => m.round === finishedRound)
      .sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < next.length; i++) {
      const left  = winners[i * 2];
      const right = winners[i * 2 + 1];
      next[i].p1Uid = left?.winnerUid  ?? null;
      next[i].p2Uid = right?.winnerUid ?? null;
      next[i].isHostMatch = next[i].p1Uid === this.state.hostUid
                         || next[i].p2Uid === this.state.hostUid;
    }
  }

  /** Find the next pending match the host (if still in) needs to play. */
  private recomputeNextMatchForHost(): void {
    const hostStillIn = !this.state.players.find(p => p.uid === this.state.hostUid)?.isEliminated;
    if (!hostStillIn) {
      this.state.nextHostMatchNum = null;
      return;
    }
    for (const m of this.state.bracket) {
      if (m.status === 'pending' && (m.p1Uid === this.state.hostUid || m.p2Uid === this.state.hostUid)) {
        this.state.nextHostMatchNum = m.matchNum;
        return;
      }
    }
    this.state.nextHostMatchNum = null;
  }

  /** Find the next pending match for ANY player. */
  pendingMatchForPlayer(uid: string): TournamentMatch | null {
    for (const m of this.state.bracket) {
      if (m.status === 'pending' && (m.p1Uid === uid || m.p2Uid === uid)) return m;
    }
    return null;
  }

  /** Find the in-progress match for ANY player (so they can rejoin). */
  inProgressMatchForPlayer(uid: string): TournamentMatch | null {
    for (const m of this.state.bracket) {
      if (m.status === 'in_progress' && (m.p1Uid === uid || m.p2Uid === uid)) return m;
    }
    return null;
  }

  private markEliminated(uid: string | null) {
    if (!uid) return;
    const p = this.state.players.find(x => x.uid === uid);
    if (p) p.isEliminated = true;
  }

  player(uid: string): TournamentPlayer | undefined {
    return this.state.players.find(p => p.uid === uid);
  }

  getState(): TournamentState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Personalised state — adjusts nextHostMatchNum for the viewing player. */
  getStateFor(uid: string): TournamentState {
    const s = this.getState();
    const p = this.pendingMatchForPlayer(uid);
    s.nextHostMatchNum = p ? p.matchNum : null;
    return s;
  }

  getMatch(matchNum: number): TournamentMatch | null {
    return this.state.bracket.find(m => m.matchNum === matchNum) || null;
  }

  /** Player objects in a match. */
  getMatchPlayers(matchNum: number): TournamentPlayer[] {
    const m = this.getMatch(matchNum);
    if (!m || !m.p1Uid || !m.p2Uid) return [];
    return [this.player(m.p1Uid), this.player(m.p2Uid)].filter(Boolean) as TournamentPlayer[];
  }

  toSummary(): TournamentSummary {
    const host = this.player(this.state.hostUid);
    return {
      id: this.state.id,
      hostUid: this.state.hostUid,
      hostName: host?.displayName || '—',
      hostAvatarId: host?.avatarId || 'avatar_1',
      name: this.state.name,
      size: this.state.size,
      difficulty: this.state.difficulty,
      matchLength: this.state.matchLength,
      status: this.state.status,
      players: this.state.players.length,
      prizeCoins: this.state.prizeCoins,
      createdAt: this.state.createdAt,
    };
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
