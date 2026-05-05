import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { getUserProfile } from '../services/firestoreService';
import { SOCKET_EVENTS, CreateRoomPayload } from '@check-game/shared';
import { startGameSession } from './gameEvents';

export function registerLobbyEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.LOBBY_CREATE_ROOM, async (payload: CreateRoomPayload) => {
    if (!socket.uid) return;

    const profile = await getUserProfile(socket.uid);
    const displayName = profile?.displayName || socket.displayName || 'لاعب';
    const avatarId = profile?.avatarId || 'avatar_1';
    const equippedFrame = profile?.equippedItems?.avatarFrame || 'frame_default';

    const room = roomManager.createRoom(
      socket.uid,
      displayName,
      avatarId,
      payload.name || 'غرفة جديدة',
      payload.type || 'public',
      payload.botCount || 0,
      payload.botDifficulty || 'medium',
      payload.gameType || 'check',
      equippedFrame,
      payload.maxPlayers || 10
    );

    socket.join(room.roomId);
    roomManager.trackSocket(socket.id, room.roomId);
    socket.emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, room.toState());
    io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
  });

  socket.on(SOCKET_EVENTS.LOBBY_JOIN_ROOM, async (payload: { roomId: string }) => {
    if (!socket.uid) return;

    const profile = await getUserProfile(socket.uid);
    const displayName = profile?.displayName || socket.displayName || 'لاعب';
    const avatarId = profile?.avatarId || 'avatar_1';
    const equippedFrame = profile?.equippedItems?.avatarFrame || 'frame_default';

    const room = roomManager.joinRoom(payload.roomId, socket.uid, displayName, avatarId, equippedFrame);
    if (!room) {
      socket.emit(SOCKET_EVENTS.LOBBY_ERROR, { message: 'تعذر الانضمام للغرفة' });
      return;
    }

    socket.join(room.roomId);
    roomManager.trackSocket(socket.id, room.roomId);
    io.to(room.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, room.toState());
    io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
  });

  socket.on(SOCKET_EVENTS.LOBBY_JOIN_PRIVATE, async (payload: { code: string }) => {
    if (!socket.uid) return;

    const room = roomManager.getRoomByCode(payload.code);
    if (!room) {
      socket.emit(SOCKET_EVENTS.LOBBY_ERROR, { message: 'كود الغرفة غير صحيح' });
      return;
    }

    const profile = await getUserProfile(socket.uid);
    const displayName = profile?.displayName || socket.displayName || 'لاعب';
    const avatarId = profile?.avatarId || 'avatar_1';
    const equippedFrame = profile?.equippedItems?.avatarFrame || 'frame_default';

    const joined = roomManager.joinRoom(room.roomId, socket.uid, displayName, avatarId, equippedFrame);
    if (!joined) {
      socket.emit(SOCKET_EVENTS.LOBBY_ERROR, { message: 'الغرفة ممتلئة' });
      return;
    }

    socket.join(room.roomId);
    roomManager.trackSocket(socket.id, room.roomId);
    io.to(room.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, joined.toState());
  });

  socket.on(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, (payload: { roomId: string }) => {
    if (!socket.uid) return;
    const updated = roomManager.leaveRoom(socket.uid, payload.roomId);
    socket.leave(payload.roomId);
    roomManager.removeSocket(socket.id);
    if (updated) {
      io.to(payload.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, updated.toState());
    }
    io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
  });

  socket.on(SOCKET_EVENTS.LOBBY_PLAYER_READY, (payload: { roomId: string; ready: boolean }) => {
    if (!socket.uid) return;
    const room = roomManager.getRoom(payload.roomId);
    if (!room) return;
    room.setReady(socket.uid, payload.ready !== false);
    io.to(room.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, room.toState());
  });

  socket.on(SOCKET_EVENTS.LOBBY_START_GAME, (payload: { roomId: string }) => {
    if (!socket.uid) return;
    const room = roomManager.getRoom(payload.roomId);
    if (!room) return;
    if (!room.players.some(p => p.uid === socket.uid)) return;

    startGameSession(io, payload.roomId);
  });

  socket.on(SOCKET_EVENTS.LOBBY_ADD_BOT, (payload: { roomId: string; difficulty?: 'easy' | 'medium' | 'hard' }) => {
    if (!socket.uid) return;
    const room = roomManager.getRoom(payload.roomId);
    if (!room) return;
    if (!room.players.some(p => p.uid === socket.uid)) return;
    if (room.status !== 'waiting') return;

    const ok = room.addOneBot(payload.difficulty || 'medium');
    if (!ok) {
      socket.emit(SOCKET_EVENTS.LOBBY_ERROR, { message: 'الغرفة ممتلئة' });
      return;
    }
    io.to(room.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, room.toState());
    io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
  });

  socket.on(SOCKET_EVENTS.LOBBY_REMOVE_BOT, (payload: { roomId: string; botUid: string }) => {
    if (!socket.uid) return;
    const room = roomManager.getRoom(payload.roomId);
    if (!room) return;
    if (!room.players.some(p => p.uid === socket.uid)) return;
    if (room.status !== 'waiting') return;

    room.removeBot(payload.botUid);
    io.to(room.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, room.toState());
    io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
  });

  // Send room list on connect
  socket.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
}
