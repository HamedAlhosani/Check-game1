import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { SOCKET_EVENTS, ChatSendPayload } from '@check-game/shared';
import { roomManager } from '../rooms/RoomManager';
import { getUserProfile } from '../services/firestoreService';

export function registerChatEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.CHAT_SEND, async (payload: ChatSendPayload) => {
    if (!socket.uid) return;
    if (!payload.text && !payload.emoji) return;
    if (payload.text && payload.text.length > 200) return;

    const profile = await getUserProfile(socket.uid);
    const displayName = profile?.displayName || socket.displayName || 'لاعب';

    io.to(payload.roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      uid: socket.uid,
      displayName,
      avatarId: profile?.avatarId || 'avatar_1',
      text: payload.text || '',
      emoji: payload.emoji || '',
      timestamp: Date.now(),
    });
  });
}
