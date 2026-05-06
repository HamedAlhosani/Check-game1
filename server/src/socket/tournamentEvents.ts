import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { SOCKET_EVENTS, TournamentSize, GameMode } from '@check-game/shared';
import { tournamentManager } from '../rooms/TournamentManager';
import { getUserProfile } from '../services/firestoreService';

export function registerTournamentEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.TOURNAMENT_CREATE, async (payload: {
    size?: TournamentSize;
    difficulty?: 'easy' | 'medium' | 'hard';
    matchLength?: GameMode;
  }) => {
    if (!socket.uid) return;
    const profile = await getUserProfile(socket.uid);
    if (!profile) return;

    // Block multiple tournaments for the same host.
    const existing = tournamentManager.getActiveForHost(socket.uid);
    if (existing) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, existing);
      return;
    }

    const size: TournamentSize = (payload.size === 8 ? 8 : 4);
    const difficulty = payload.difficulty || 'medium';
    const matchLength: GameMode = payload.matchLength || 'standard';

    const t = tournamentManager.create({
      io,
      hostUid: socket.uid,
      hostName: profile.displayName,
      hostAvatar: profile.avatarId,
      hostFrame: profile.equippedItems?.avatarFrame,
      size, difficulty, matchLength,
    });

    socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t.getState());

    // Immediately spin up the host's first match.
    const r = tournamentManager.startNextHostMatch(io, t.state.id);
    if ('error' in r) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
      return;
    }
    socket.emit(SOCKET_EVENTS.TOURNAMENT_MATCH_START, {
      tournamentId: t.state.id,
      gameId: r.gameId,
    });
  });

  // Re-resolve the host's current tournament — used by the bracket page
  // when the player navigates back to it after a match.
  socket.on(SOCKET_EVENTS.TOURNAMENT_SUBSCRIBE, () => {
    if (!socket.uid) return;
    const t = tournamentManager.getActiveForHost(socket.uid);
    if (t) socket.emit(SOCKET_EVENTS.TOURNAMENT_STATE, t);
  });

  // Trigger the host's next match (called from the bracket page when the
  // player taps "ابدأ الدور التالي" after winning a match).
  socket.on(SOCKET_EVENTS.TOURNAMENT_NEXT_MATCH, () => {
    if (!socket.uid) return;
    const t = tournamentManager.getActiveForHost(socket.uid);
    if (!t) return;
    const r = tournamentManager.startNextHostMatch(io, t.id);
    if ('error' in r) {
      socket.emit(SOCKET_EVENTS.TOURNAMENT_ERROR, { message: r.error });
      return;
    }
    socket.emit(SOCKET_EVENTS.TOURNAMENT_MATCH_START, {
      tournamentId: t.id,
      gameId: r.gameId,
    });
  });

  socket.on(SOCKET_EVENTS.TOURNAMENT_LEAVE, () => {
    if (!socket.uid) return;
    const t = tournamentManager.getActiveForHost(socket.uid);
    if (t) tournamentManager.destroy(t.id);
  });
}
