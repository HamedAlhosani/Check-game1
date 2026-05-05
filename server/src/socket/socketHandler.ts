import { Server } from 'socket.io';
import { AuthenticatedSocket, verifySocketToken } from '../middleware/authMiddleware';
import { registerLobbyEvents } from './lobbyEvents';
import { registerGameEvents } from './gameEvents';
import { registerChatEvents } from './chatEvents';
import { SOCKET_EVENTS } from '@check-game/shared';
import { roomManager } from '../rooms/RoomManager';
import { GameEngine } from '../game/GameEngine';
import { BotPlayer } from '../game/BotPlayer';

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
      if (socket.uid) socket.join(`user:${socket.uid}`);
      socket.emit('auth:ok', { uid: socket.uid });

      registerLobbyEvents(io, socket);
      registerGameEvents(io, socket);
      registerChatEvents(io, socket);
    });

    socket.on('disconnect', () => {
      if (!socket.uid) return;
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
    });
  });
}
