import { Server } from 'socket.io';
import { AuthenticatedSocket, verifySocketToken } from '../middleware/authMiddleware';
import { registerLobbyEvents } from './lobbyEvents';
import { registerGameEvents } from './gameEvents';
import { registerChatEvents } from './chatEvents';
import { SOCKET_EVENTS } from '@check-game/shared';

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
      socket.emit('auth:ok', { uid: socket.uid });

      registerLobbyEvents(io, socket);
      registerGameEvents(io, socket);
      registerChatEvents(io, socket);
    });

    socket.on('disconnect', () => {
      // Will be handled by reconnect logic
    });
  });
}
