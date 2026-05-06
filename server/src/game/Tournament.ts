import { v4 as uuidv4 } from 'uuid';
import {
  TournamentState, TournamentMatch, TournamentPlayer, TournamentSize,
  GameMode, matchesInBracket, tournamentPrize,
} from '@check-game/shared';

const BOT_NAMES = [
  'بوت البدوي', 'بوت الصقار', 'بوت التاجر', 'بوت الصحراء',
  'بوت النخلة', 'بوت الرمال', 'بوت الواحة', 'بوت الفارس', 'بوت القمر',
];

/**
 * Single-elimination tournament engine. Owns the bracket, handles host
 * matches via the regular GameEngine, and simulates bot-vs-bot matches
 * off-screen with a skill-weighted random winner.
 *
 * V1 — solo only: there's exactly one human (the host) and the rest are
 * bots, so we never need to coordinate matches for multiple humans.
 */
export class TournamentEngine {
  readonly state: TournamentState;

  constructor(opts: {
    hostUid: string;
    hostName: string;
    hostAvatar: string;
    hostFrame?: string;
    size: TournamentSize;
    difficulty: 'easy' | 'medium' | 'hard';
    matchLength: GameMode;
  }) {
    const id = uuidv4();
    const players: TournamentPlayer[] = [{
      uid: opts.hostUid,
      displayName: opts.hostName,
      avatarId: opts.hostAvatar,
      equippedFrame: opts.hostFrame || 'frame_default',
      isBot: false,
      isEliminated: false,
    }];
    for (let i = 0; i < opts.size - 1; i++) {
      players.push({
        uid: `bot-${id}-${i}`,
        displayName: BOT_NAMES[i % BOT_NAMES.length],
        avatarId: `avatar_${(i % 8) + 1}`,
        isBot: true,
        botDifficulty: opts.difficulty,
        isEliminated: false,
      });
    }

    this.state = {
      id,
      hostUid: opts.hostUid,
      size: opts.size,
      difficulty: opts.difficulty,
      matchLength: opts.matchLength,
      status: 'in_progress',
      players,
      bracket: this.buildBracket(players, opts.size),
      championUid: null,
      prizeCoins: tournamentPrize(opts.size, opts.difficulty),
      // For now no item prize — coins only. Easy to add later.
      prizeItemId: undefined,
      prizeItemNameAr: undefined,
      prizeItemNameEn: undefined,
      createdAt: Date.now(),
      nextHostMatchNum: null,
    };

    // Mark which match the host plays first.
    this.state.nextHostMatchNum = this.findNextHostPendingMatch();
  }

  /** Build a single-elimination bracket. Round 1 is the only round with
   *  pre-filled players; later rounds have null slots that fill in as
   *  matches complete. */
  private buildBracket(players: TournamentPlayer[], size: TournamentSize): TournamentMatch[] {
    // Shuffle non-host players for random matchups; keep host in slot 0
    // so they end up in match 1 — gives a clean "your match starts now" UX.
    const host = players.find(p => !p.isBot)!;
    const bots = players.filter(p => p.isBot);
    shuffle(bots);
    const seeded = [host, ...bots];

    const bracket: TournamentMatch[] = [];
    let matchNum = 0;

    // Round 1: pair every two players
    const round1Matches = size / 2;
    for (let slot = 0; slot < round1Matches; slot++) {
      const p1 = seeded[slot * 2];
      const p2 = seeded[slot * 2 + 1];
      bracket.push({
        matchNum: matchNum++,
        round: 1, slot,
        p1Uid: p1.uid, p2Uid: p2.uid,
        winnerUid: null,
        status: 'pending',
        gameId: null,
        isHostMatch: !p1.isBot || !p2.isBot,
      });
    }

    // Subsequent rounds: empty placeholders
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
          isHostMatch: false, // recalculated when filled
        });
      }
      prev = cur;
      round++;
    }

    return bracket;
  }

  /** First pending host match by order — that's the next one to play. */
  private findNextHostPendingMatch(): number | null {
    for (const m of this.state.bracket) {
      if (m.status === 'pending' && m.isHostMatch && m.p1Uid && m.p2Uid) return m.matchNum;
    }
    return null;
  }

  /** Mark a match as in-progress and attach the GameEngine's game id. */
  markMatchStarted(matchNum: number, gameId: string): TournamentMatch | null {
    const m = this.state.bracket.find(x => x.matchNum === matchNum);
    if (!m || m.status !== 'pending') return null;
    m.status = 'in_progress';
    m.gameId = gameId;
    return m;
  }

  /** Apply a match result (host's match) and advance the bracket. */
  reportHostMatchResult(matchNum: number, winnerUid: string): void {
    const m = this.state.bracket.find(x => x.matchNum === matchNum);
    if (!m || m.status === 'completed') return;
    m.winnerUid = winnerUid;
    m.status = 'completed';
    this.markEliminated(m.p1Uid === winnerUid ? m.p2Uid : m.p1Uid);

    // Simulate any other pending matches in the same round (these would
    // have been bot-vs-bot quarterfinals when the host's was a quarter).
    this.simulateRound(m.round);

    // Advance winners into the next round's slots.
    this.advanceRound(m.round);

    // If the final is now done, crown the champion.
    const final = this.state.bracket[this.state.bracket.length - 1];
    if (final.status === 'completed') {
      this.state.status = 'finished';
      this.state.championUid = final.winnerUid;
      this.state.nextHostMatchNum = null;
    } else {
      // Host either advances to the next round or got eliminated. Either
      // way recompute their next match (will be null if eliminated).
      const hostStillIn = !this.player(this.state.hostUid)?.isEliminated;
      this.state.nextHostMatchNum = hostStillIn ? this.findNextHostPendingMatch() : null;
    }
  }

  /** Run any same-round bot-vs-bot matches (which the host doesn't play). */
  private simulateRound(round: number): void {
    for (const m of this.state.bracket) {
      if (m.round !== round) continue;
      if (m.status !== 'pending') continue;
      if (!m.p1Uid || !m.p2Uid) continue;
      // Pick a winner weighted by difficulty (no actual difficulty
      // difference between bots in v1 — they share the host's setting —
      // so this is just a coin flip with light variance).
      const winner = Math.random() < 0.5 ? m.p1Uid : m.p2Uid;
      m.winnerUid = winner;
      m.status = 'completed';
      this.markEliminated(m.p1Uid === winner ? m.p2Uid : m.p1Uid);
    }
  }

  /** After a round finishes, populate the next round's player slots. */
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
      next[i].isHostMatch = (next[i].p1Uid === this.state.hostUid)
                         || (next[i].p2Uid === this.state.hostUid);
    }
  }

  private markEliminated(uid: string | null) {
    if (!uid) return;
    const p = this.state.players.find(x => x.uid === uid);
    if (p) p.isEliminated = true;
  }

  private player(uid: string) {
    return this.state.players.find(p => p.uid === uid);
  }

  getState(): TournamentState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Look up a match descriptor — used by the lobby when starting the
   *  underlying Check game for the host's next match. */
  getMatch(matchNum: number): TournamentMatch | null {
    return this.state.bracket.find(m => m.matchNum === matchNum) || null;
  }

  /** Players in a match, used to seed the GameEngine. */
  getMatchPlayers(matchNum: number): TournamentPlayer[] {
    const m = this.getMatch(matchNum);
    if (!m || !m.p1Uid || !m.p2Uid) return [];
    return [this.player(m.p1Uid), this.player(m.p2Uid)].filter(Boolean) as TournamentPlayer[];
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
