import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/authMiddleware';
import { roomManager } from '../rooms/RoomManager';
import { getUserProfile } from '../services/firestoreService';
import { SOCKET_EVENTS, CreateRoomPayload } from '@check-game/shared';
import { startGameSession } from './gameEvents';

function findSocketByUid(io: Server, uid: string): AuthenticatedSocket | undefined {
  for (const s of io.sockets.sockets.values()) {
    if ((s as AuthenticatedSocket).uid === uid) return s as AuthenticatedSocket;
  }
  return undefined;
}

export function registerLobbyEvents(io: Server, socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.LOBBY_CREATE_ROOM, async (payload: CreateRoomPayload) => {
    if (!socket.uid) return;

    const profile = await getUserProfile(socket.uid);
    const displayName = profile?.displayName || socket.displayName || 'لاعب';
    const avatarId = profile?.avatarId || 'avatar_1';
    const equippedFrame = profile?.equippedItems?.avatarFrame || 'frame_default';

    // Online matchmaking: join existing public room if one exists with same settings
    if ((payload.type || 'public') === 'public' && (payload.botCount || 0) === 0) {
      const gameType = payload.gameType || 'check';
      const maxPlayers = payload.maxPlayers || 10;
      const existing = roomManager.findMatchableRoom(gameType, maxPlayers);
      if (existing) {
        const joined = roomManager.joinRoom(existing.roomId, socket.uid, displayName, avatarId, equippedFrame);
        if (joined) {
          socket.join(joined.roomId);
          roomManager.trackSocket(socket.id, joined.roomId);
          io.to(joined.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, joined.toState());
          io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
          if (joined.players.length >= joined.maxPlayers) {
            startGameSession(io, joined.roomId);
          }
          return;
        }
      }
    }

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
    if (!room || room.hostUid !== socket.uid) return;

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

  socket.on(SOCKET_EVENTS.LOBBY_INVITE_FRIEND, (payload: { roomId: string; targetUid: string }) => {
    if (!socket.uid) return;
    const room = roomManager.getRoom(payload.roomId);
    if (!room || !room.players.some(p => p.uid === socket.uid)) return;
    if (!room.code) return; // only private rooms can be invited to

    const inviter = room.players.find(p => p.uid === socket.uid);
    const targetSocket = findSocketByUid(io, payload.targetUid);
    if (targetSocket) {
      targetSocket.emit(SOCKET_EVENTS.LOBBY_INVITE_RECEIVED, {
        roomCode: room.code,
        inviterName: inviter?.displayName || 'لاعب',
        inviterAvatarId: inviter?.avatarId || 'avatar_1',
        roomName: room.name,
      });
    }
  });

  socket.on(SOCKET_EVENTS.LOBBY_KICK_PLAYER, (payload: { roomId: string; targetUid: string }) => {
    if (!socket.uid) return;
    const room = roomManager.getRoom(payload.roomId);
    if (!room || room.hostUid !== socket.uid) return;
    if (payload.targetUid === socket.uid) return;

    const target = room.players.find(p => p.uid === payload.targetUid && !p.isBot);
    if (!target) return;

    room.removePlayer(payload.targetUid);

    const kickedSocket = findSocketByUid(io, payload.targetUid);
    if (kickedSocket) {
      kickedSocket.leave(room.roomId);
      roomManager.removeSocket(kickedSocket.id);
      kickedSocket.emit(SOCKET_EVENTS.LOBBY_KICKED, { message: 'تم طردك من الغرفة' });
    }

    io.to(room.roomId).emit(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, room.toState());
    io.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
  });

  // Send room list on connect
  socket.emit(SOCKET_EVENTS.LOBBY_ROOM_LIST, roomManager.getPublicRooms().map(r => r.toState()));
}
