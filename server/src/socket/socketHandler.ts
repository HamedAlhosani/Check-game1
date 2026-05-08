import { Server } from 'socket.io';
import { AuthenticatedSocket, verifySocketToken } from '../middleware/authMiddleware';
import { registerLobbyEvents } from './lobbyEvents';
import { registerGameEvents, scheduleAbandon } from './gameEvents';
import { registerChatEvents } from './chatEvents';
import { registerTournamentEvents } from './tournamentEvents';
import { SOCKET_EVENTS } from '@check-game/shared';
import { roomManager } from '../rooms/RoomManager';
import { GameEngine } from '../game/GameEngine';
import { BotPlayer } from '../game/BotPlayer';
import { notifyFriendsOfStatusChange } from './notifications';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    let authenticated = false;

    socket.on(SOCKET_EVENTS.AUTH_TOKEN, async (payload: { token: string }) => {
      if (authenticated) return;

      const ok = await verifySocketToken(socket, payload.token);
      if (!ok) {
        socket.emit('auth:error', { message: 'Token invalid' });
        socket.disconnect();
        return;
      }

      authenticated = true;
      // Per-user room used to deliver targeted notifications (friend requests, etc.)
      if (socket.uid) {
        const wasOnline = io.sockets.adapter.rooms.get(`user:${socket.uid}`)?.size ?? 0;
        socket.join(`user:${socket.uid}`);
        // First socket for this uid → tell friends to refresh online dot
        if (wasOnline === 0) notifyFriendsOfStatusChange(socket.uid);
      }
      socket.emit('auth:ok', { uid: socket.uid });

      registerLobbyEvents(io, socket);
      registerGameEvents(io, socket);
      registerChatEvents(io, socket);
      registerTournamentEvents(io, socket);
    });

    socket.on('disconnect', () => {
      if (!socket.uid) return;
      // After this socket leaves, if no other socket holds the user-room
      // open, the uid just went offline → tell friends.
      const room = io.sockets.adapter.rooms.get(`user:${socket.uid}`);
      const remaining = (room?.size ?? 0) - (room?.has(socket.id) ? 1 : 0);
      if (remaining <= 0) notifyFriendsOfStatusChange(socket.uid);

      const roomId = roomManager.getRoomForSocket(socket.id);
      roomManager.removeSocket(socket.id);
      if (!roomId) return;

      const engine = roomManager.getGame(roomId) as GameEngine | undefined;
      if (!engine) return;

      const state = engine.getPublicState();
      if (state.phase === 'GAME_OVER') return;

      const player = state.players.find(p => p.uid === socket.uid);
      if (!player || player.isEliminated) return;

      // Replace the disconnected player with a bot so the game continues
      engine.replaceWithBot(socket.uid);
      const bot = new BotPlayer(socket.uid, 'medium');
      roomManager.addBotPlayer(roomId, bot);
      // 60s grace: if they don't reconnect by then, the seat is fully
      // abandoned and they won't be auto-resumed on the next page load.
      scheduleAbandon(roomId, socket.uid);
    });
  });
}
