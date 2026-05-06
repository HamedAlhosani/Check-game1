import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@check-game/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

class SocketService {
  private socket: Socket | null = null;
  private authenticated = false;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    if (this.socket) {
      // Existing socket but not connected — let socket.io's reconnection handle it
      this.socket.connect();
      return this.socket;
    }

    this.socket = io(SOCKET_URL, { autoConnect: true, reconnection: true });

    this.socket.on('connect', () => {
      this.authenticated = false;
      const token = localStorage.getItem('auth_token');
      if (token) this.socket!.emit(SOCKET_EVENTS.AUTH_TOKEN, { token });
    });

    this.socket.on('auth:ok', () => { this.authenticated = true; });
    this.socket.on('auth:error', () => {
      this.authenticated = false;
      this.socket?.disconnect();
    });
    this.socket.on('disconnect', () => { this.authenticated = false; });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isReady(): boolean {
    return !!this.socket?.connected && this.authenticated;
  }

  /** Resolves once the socket is connected AND authenticated. Auto-reconnects if needed. */
  async ensureReady(timeoutMs = 5000): Promise<Socket> {
    const sock = this.connect();
    if (this.isReady()) return sock;

    return new Promise<Socket>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('socket connect timeout'));
      }, timeoutMs);

      const onAuthOk = () => {
        cleanup();
        resolve(sock);
      };
      const onAuthError = () => {
        cleanup();
        reject(new Error('socket auth failed'));
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        sock.off('auth:ok', onAuthOk);
        sock.off('auth:error', onAuthError);
      };

      sock.on('auth:ok', onAuthOk);
      sock.on('auth:error', onAuthError);
    });
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
    this.authenticated = false;
  }
}

export const socketService = new SocketService();
