import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { SOCKET_EVENTS, TournamentSize, GameMode, GameType, TournamentVisibility, TournamentKind, PrizeSplit } from '@check-game/shared';
import { tournamentManager } from '../rooms/TournamentManager';
import { getUserProfile } from '../services/firestoreService';

export function registerTournamentEvents(io: Server, socket: AuthenticatedSocket): void {

  // Push current public lists to the new socket on register — both worlds
  // get their own scoped event so a Check page never sees Ludo cups and
  // vice versa.
  socket.emit(SOCKET_EVENTS.TOURNAMENT_LIST,      tournamentManager.getPublicSummaries('check'));
  socket.emit(SOCKET_EVENTS.LUDO_TOURNAMENT_LIST, tournamentManager.getPublicSummaries('ludo'));

  socket.on(SOCKET_EVENTS.TOURNAMENT_LIST_REQUEST, () => {
    socket.emit(SOCKET_EVENTS.TOURNAMENT_LIST,      tournamentManager.getPublicSummaries('check'));
    socket.emit(SOCKET_EVENTS.LUDO_TOURNAMENT_LIST, tournamentManager.getPublicSummaries('ludo'));
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_CREATE, async (payload: {
    kind?: TournamentKind;
    visibility?: TournamentVisibility;
    name?: string;
    size?: TournamentSize;
    difficulty?: 'easy' | 'medium' | 'hard';
    matchLength?: GameMode;
    entryFee?: number;
    prizeSplit?: PrizeSplit;
    clanOnly?: boolean;
    /** Game world this cup runs in. 'ludo' uses LudoEngine matches. */
    gameType?: GameType;
  }) => {
    if (!socket.uid) return;
    const profile = await getUserProfile(socket.uid);
    if (!profile) return;

    const kind: TournamentKind = payload.kind === 'online' ? 'online' : 'solo';

    const active = tournamentManager.getActiveForPlayer(socket.uid)
      .find(t => t.state.hostUid === socket.uid);
    if (active) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, active.getStateFor(socket.uid));
      return;
    }

    const size: TournamentSize = (payload.size === 8 ? 8 : 4);
    const difficulty = payload.difficulty || 'medium';
    const matchLength: GameMode = payload.matchLength || (kind === 'online' ? 'standard' : 'quick');

    // Clan-only tournament requires the host to be in a clan. Ludo cups
    // read the player's Ludo clan slot, Check cups read the Check slot.
    const wantClanOnly = !!payload.clanOnly && kind === 'online';
    const isLudoCup = payload.gameType === 'ludo';
    const hostClanId  = isLudoCup
      ? ((profile as any).ludoClanId  || null)
      : ((profile as any).clanId      || null);
    const hostClanTag = isLudoCup
      ? ((profile as any).ludoClanTag || null)
      : ((profile as any).clanTag     || null);
    if (wantClanOnly && !hostClanId) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, {
        message: isLudoCup
          ? 'يجب أن تكون في قبيلة لودو لإنشاء بطولة قبائل'
          : 'يجب أن تكون في قبيلة لإنشاء بطولة قبلية',
      });
      return;
    }

    const r = await tournamentManager.create({
      io,
      hostUid:    socket.uid,
      hostName:   profile.displayName,
      hostAvatar: profile.avatarId,
      hostFrame:  profile.equippedItems?.avatarFrame,
      name:       payload.name,
      visibility: payload.visibility,
      kind, size, difficulty, matchLength,
      entryFee:   kind === 'online' ? Math.max(0, Math.floor(payload.entryFee || 0)) : 0,
      prizeSplit: payload.prizeSplit,
      clanOnlyId:   wantClanOnly ? hostClanId  : null,
      clanOnlyTag:  wantClanOnly ? hostClanTag : null,
      clanOnlyName: null,
      gameType:     payload.gameType === 'ludo' ? 'ludo' : 'check',
    });
    if (!r.ok || !r.tournament) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error || 'Could not create tournament' });
      return;
    }

    socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, r.tournament.getStateFor(socket.uid));
    tournamentManager.broadcastPublicList(io);
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_JOIN, async (payload: { tournamentId: string }) => {
    if (!socket.uid) return;
    const profile = await getUserProfile(socket.uid);
    if (!profile) return;
    const r = await tournamentManager.join(io, payload.tournamentId, {
      uid: socket.uid,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      equippedFrame: profile.equippedItems?.avatarFrame,
    });
    if (!r.ok) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
      return;
    }
    const t = tournamentManager.get(payload.tournamentId);
    if (t) socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t.getStateFor(socket.uid));
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_JOIN_CODE, async (payload: { code: string }) => {
    if (!socket.uid) return;
    const profile = await getUserProfile(socket.uid);
    if (!profile) return;
    const t = tournamentManager.findByCode(payload.code);
    if (!t) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: 'Invalid code' });
      return;
    }
    const r = await tournamentManager.join(io, t.state.id, {
      uid: socket.uid,
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      equippedFrame: profile.equippedItems?.avatarFrame,
    });
    if (!r.ok) socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
    else socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t.getStateFor(socket.uid));
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_START, (payload: { tournamentId: string }) => {
    if (!socket.uid) return;
    const r = tournamentManager.start(io, payload.tournamentId, socket.uid);
    if (!r.ok) socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_FILL_BOTS, (payload: { tournamentId: string }) => {
    if (!socket.uid) return;
    const r = tournamentManager.fillBots(io, payload.tournamentId, socket.uid);
    if (!r.ok) socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_SUBSCRIBE, () => {
    if (!socket.uid) return;
    // Send the most recent tournament the player is in (if any).
    const active = tournamentManager.getActiveForPlayer(socket.uid);
    if (active.length > 0) {
      // Prefer a tournament with an in-progress match for them
      const withInProgress = active.find(t => t.inProgressMatchForPlayer(socket.uid!));
      const t = withInProgress || active[0];
      socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t.getStateFor(socket.uid));
    }
    socket.emit(SOCKET_EVENTS.TOURNAMENT_LIST, tournamentManager.getPublicSummaries());
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_NEXT_MATCH, (payload: { tournamentId: string }) => {
    if (!socket.uid) return;
    const r = tournamentManager.startNextMatchForUser(io, payload.tournamentId, socket.uid);
    if (r.error) socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
    if (r.gameId) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_MATCH_START, {
        tournamentId: payload.tournamentId,
        gameId: r.gameId,
      });
    }
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_LEAVE, async (payload: { tournamentId: string }) => {
    if (!socket.uid) return;
    await tournamentManager.leave(io, payload.tournamentId, socket.uid);
  });
}
