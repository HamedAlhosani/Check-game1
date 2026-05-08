import type { Server } from 'socket.io';
import { users } from '../data/store';
import { SOCKET_EVENTS } from '@check-game/shared';

let ioRef: Server | null = null;

export function setIO(io: Server): void {
  ioRef = io;
}

export function notifyUser(uid: string, event: string, data: unknown): void {
  if (!ioRef) return;
  ioRef.to(`user:${uid}`).emit(event, data);
}

/** True if `uid` currently has at least one live socket bound to its user-room. */
export function isUidOnline(uid: string): boolean {
  if (!ioRef) return false;
  const room = ioRef.sockets.adapter.rooms.get(`user:${uid}`);
  return !!room && room.size > 0;
}

/**
 * Tell every friend of `uid` that this user's friend-list-relevant state
 * changed (currently: started or finished a game). Friends pages re-fetch
 * on FRIEND_LIST_CHANGED so the green "👁 شاهد" pill flips on/off live.
 */
export function notifyFriendsOfStatusChange(uid: string): void {
  if (!ioRef) return;
  const me = users.get(uid) as any;
  if (!me?.friends) return;
  for (const fUid of me.friends as string[]) {
    notifyUser(fUid, SOCKET_EVENTS.FRIEND_LIST_CHANGED, {});
  }
}
