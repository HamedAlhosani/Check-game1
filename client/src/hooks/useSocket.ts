import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';
import { useAuthStore } from '../store/authStore';

export function useSocket(): Socket | null {
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user) {
      socketRef.current = socketService.connect();
    } else {
      socketService.disconnect();
      socketRef.current = null;
    }
  }, [user]);

  return socketRef.current;
}
