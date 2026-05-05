import type { Server } from 'socket.io';

let ioRef: Server | null = null;

export function setIO(io: Server): void {
  ioRef = io;
}

export function notifyUser(uid: string, event: string, data: unknown): void {
  if (!ioRef) return;
  ioRef.to(`user:${uid}`).emit(event, data);
}
