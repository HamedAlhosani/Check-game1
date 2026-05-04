import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@check-game/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, { autoConnect: true, reconnection: true });

    this.socket.on('connect', () => {
      const token = localStorage.getItem('auth_token');
      if (token) this.socket!.emit(SOCKET_EVENTS.AUTH_TOKEN, { token });
    });

    this.socket.on('auth:error', () => this.socket?.disconnect());

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  async refreshAuth(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (token && this.socket?.connected) {
      this.socket.emit(SOCKET_EVENTS.AUTH_TOKEN, { token });
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
