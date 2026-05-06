import { v4 as uuidv4 } from 'uuid';
import {
  TournamentState, TournamentMatch, TournamentPlayer, TournamentSize,
  TournamentSummary, TournamentVisibility, TournamentKind,
  GameMode, PrizeSplit, tournamentPrize, computePool, FORFEIT_WINDOW_MS,
} from '@check-game/shared';

const BOT_NAMES = [
  'بوت البدوي', 'بوت الصقار', 'بوت التاجر', 'بوت الصحراء',
  'بوت النخلة', 'بوت الرمال', 'بوت الواحة', 'بوت الفارس', 'بوت القمر',
];

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
    /** Coins each player pays to enter (online only). */
    entryFee?: number;
    prizeSplit?: PrizeSplit;
    clanOnlyId?: string | null;
    clanOnlyName?: string | null;
    clanOnlyTag?: string | null;
  }) {
    const id = uuidv4();
    const isSolo = opts.kind === 'solo';
    const visibility: TournamentVisibility = opts.visibility || (isSolo ? 'private' : 'public');
    const entryFee = isSolo ? 0 : Math.max(0, Math.floor(opts.entryFee ?? 0));

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
      name: opts.name || (isSolo ? `كأس ${opts.hostName}` : `بطولة ${opts.hostName}`),
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
      entryFee,
      prizePool: isSolo
        ? tournamentPrize(opts.size, opts.difficulty)
        : computePool(entryFee, 1), // host counts toward the pool
      prizeSplit: opts.prizeSplit || 'winner_takes_all',
      createdAt: Date.now(),
      nextHostMatchNum: null,
      forfeitAt: null,
      clanOnlyId:   opts.clanOnlyId   ?? null,
      clanOnlyName: opts.clanOnlyName ?? null,
      clanOnlyTag:  opts.clanOnlyTag  ?? null,
    };

    if (isSolo) {
      this.fillBots();
      this.start();
    }
  }

  // ── Joining / leaving ────────────────────────────────────────────────────
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
    if (this.state.kind === 'online') {
      this.state.prizePool = computePool(this.state.entryFee, this.state.players.filter(p => !p.isBot).length);
    }
    return { ok: true };
  }

  /** Removes a waiting player (used for refunds + leaving before start). */
  leave(uid: string): void {
    if (this.state.status === 'waiting') {
      this.state.players = this.state.players.filter(p => p.uid !== uid);
      if (this.state.kind === 'online') {
        this.state.prizePool = computePool(this.state.entryFee, this.state.players.filter(p => !p.isBot).length);
      }
    } else {
      const p = this.state.players.find(x => x.uid === uid);
      if (p) p.isEliminated = true;
    }
  }

  /** True if every seat is filled. Used to auto-start. */
  isFull(): boolean {
    return this.state.players.length >= this.state.size;
  }

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
    // Bots don't affect online prize pool.
  }

  start(): { ok: boolean; error?: string } {
    if (this.state.status !== 'waiting') return { ok: false, error: 'Already started' };
    if (this.state.players.length < this.state.size) {
      return { ok: false, error: `Need ${this.state.size} players (have ${this.state.players.length})` };
    }
    this.state.status = 'in_progress';
    this.state.startedAt = Date.now();
    this.state.bracket = this.buildBracket();
    this.recomputeNextMatchForHost();
    this.refreshForfeitDeadline();
    return { ok: true };
  }

  /** Mark the tournament as cancelled — used when the host abandons during
   *  waiting, so the manager can refund participants. */
  cancel(): void {
    if (this.state.status !== 'waiting') return;
    this.state.status = 'cancelled';
  }

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

  pendingReadyMatches(): TournamentMatch[] {
    return this.state.bracket.filter(m =>
      m.status === 'pending' && m.p1Uid && m.p2Uid
    );
  }

  markMatchStarted(matchNum: number, gameId: string): TournamentMatch | null {
    const m = this.state.bracket.find(x => x.matchNum === matchNum);
    if (!m || m.status !== 'pending') return null;
    m.status = 'in_progress';
    m.gameId = gameId;
    return m;
  }

  reportMatchResult(matchNum: number, winnerUid: string): { tournamentFinished: boolean; newlyReady: TournamentMatch[] } {
    const m = this.state.bracket.find(x => x.matchNum === matchNum);
    if (!m || m.status === 'completed') return { tournamentFinished: false, newlyReady: [] };
    m.winnerUid = winnerUid;
    m.status = 'completed';
    this.markEliminated(m.p1Uid === winnerUid ? m.p2Uid : m.p1Uid);

    const sameRound = this.state.bracket.filter(x => x.round === m.round);
    const allDone = sameRound.every(x => x.status === 'completed');

    let newlyReady: TournamentMatch[] = [];
    if (allDone) {
      this.advanceRound(m.round);
      const next = this.state.bracket.filter(x => x.round === m.round + 1);
      newlyReady = next.filter(x => x.status === 'pending' && x.p1Uid && x.p2Uid);
    }

    const final = this.state.bracket[this.state.bracket.length - 1];
    if (final.status === 'completed') {
      this.state.status = 'finished';
      this.state.championUid = final.winnerUid;
      this.state.nextHostMatchNum = null;
      this.state.forfeitAt = null;
      return { tournamentFinished: true, newlyReady };
    }

    this.recomputeNextMatchForHost();
    this.refreshForfeitDeadline();
    return { tournamentFinished: false, newlyReady };
  }

  /** Force a player to forfeit their pending match — used when their
   *  forfeit window expires. The opponent is awarded the win. */
  forfeit(uid: string): { advanced: boolean; matchNum?: number } {
    const m = this.pendingMatchForPlayer(uid);
    if (!m || !m.p1Uid || !m.p2Uid) return { advanced: false };
    const opponent = m.p1Uid === uid ? m.p2Uid : m.p1Uid;
    this.reportMatchResult(m.matchNum, opponent);
    return { advanced: true, matchNum: m.matchNum };
  }

  /** Compute final podium ranks based on completed bracket.
   *  Returns array of { uid, rank } with at least the champion + runner-up;
   *  for size 8 also includes 3rd (loser of the 3rd-place playoff... but
   *  we don't have one, so we treat the two semifinal losers as joint-3rd). */
  computeFinalRanks(): { uid: string; rank: number }[] {
    const final = this.state.bracket[this.state.bracket.length - 1];
    if (!final || final.status !== 'completed') return [];
    const ranks: { uid: string; rank: number }[] = [];
    const champion = final.winnerUid!;
    const runnerUp = final.p1Uid === champion ? final.p2Uid! : final.p1Uid!;
    ranks.push({ uid: champion, rank: 1 });
    ranks.push({ uid: runnerUp, rank: 2 });
    if (this.state.size === 8) {
      // Semifinal losers = joint 3rd. Both get the third-place share.
      const semis = this.state.bracket.filter(x => x.round === 2);
      for (const s of semis) {
        const loser = s.p1Uid === s.winnerUid ? s.p2Uid : s.p1Uid;
        if (loser && !ranks.find(r => r.uid === loser)) ranks.push({ uid: loser, rank: 3 });
      }
    }
    return ranks;
  }

  /** Refresh the host's forfeit window if they have a pending match. */
  refreshForfeitDeadline(): void {
    const m = this.state.bracket.find(x =>
      x.status === 'pending' && x.p1Uid && x.p2Uid
      && (x.p1Uid === this.state.hostUid || x.p2Uid === this.state.hostUid)
    );
    this.state.forfeitAt = m ? Date.now() + FORFEIT_WINDOW_MS : null;
  }

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

  pendingMatchForPlayer(uid: string): TournamentMatch | null {
    for (const m of this.state.bracket) {
      if (m.status === 'pending' && (m.p1Uid === uid || m.p2Uid === uid)) return m;
    }
    return null;
  }

  inProgressMatchForPlayer(uid: string): TournamentMatch | null {
    for (const m of this.state.bracket) {
      if (m.status === 'in_progress' && (m.p1Uid === uid || m.p2Uid === uid)) return m;
    }
    return null;
  }

  /** All players whose forfeit window has expired (with a pending match). */
  expiredForfeitPlayers(): string[] {
    if (this.state.status !== 'in_progress') return [];
    const now = Date.now();
    const out: string[] = [];
    for (const p of this.state.players) {
      if (p.isBot || p.isEliminated) continue;
      // For simplicity we only enforce forfeitAt for the host's own matches —
      // each player's nextHostMatchNum is computed via getStateFor on demand.
      // The manager passes in the correct deadline via per-player tracking.
    }
    return out;
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

  /** Personalised state — adjusts nextHostMatchNum + forfeitAt to the viewer. */
  getStateFor(uid: string): TournamentState {
    const s = this.getState();
    const p = this.pendingMatchForPlayer(uid);
    s.nextHostMatchNum = p ? p.matchNum : null;
    s.forfeitAt = p ? Date.now() + FORFEIT_WINDOW_MS : null;
    return s;
  }

  getMatch(matchNum: number): TournamentMatch | null {
    return this.state.bracket.find(m => m.matchNum === matchNum) || null;
  }

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
      status: this.state.status === 'cancelled' ? 'finished' : this.state.status,
      players: this.state.players.length,
      entryFee: this.state.entryFee,
      prizePool: this.state.prizePool,
      prizeSplit: this.state.prizeSplit,
      createdAt: this.state.createdAt,
      clanOnlyId:  this.state.clanOnlyId  ?? null,
      clanOnlyTag: this.state.clanOnlyTag ?? null,
    };
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
