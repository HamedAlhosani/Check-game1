import { Socket } from 'socket.io';
import { verifyToken } from '../services/localAuth';

export interface AuthenticatedSocket extends Socket {
  uid: string;
  displayName: string;
}

export async function verifySocketToken(socket: AuthenticatedSocket, token: string): Promise<boolean> {
  const payload = verifyToken(token);
  if (!payload) return false;
  socket.uid = payload.uid;
  socket.displayName = '';
  return true;
}
