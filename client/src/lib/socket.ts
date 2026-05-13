import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { useNotificationStore } from '../store/auth';
import toast from 'react-hot-toast';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const { incrementUnread } = useNotificationStore();

  useEffect(() => {
    if (!accessToken) return;

    // Prefer VITE_SOCKET_URL, fall back to VITE_API_URL, then same-origin.
    // Previously this was hard-coded to '/' which meant cross-origin
    // deployments (Railway pattern) silently failed to connect.
    const socketUrl =
      (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
      (import.meta.env.VITE_API_URL as string | undefined) ||
      '/';

    socketRef.current = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.log('Socket connected');
      }
    });

    socket.on('notification', (data) => {
      incrementUnread();
      toast.success(`${data.title}: ${data.message}`);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, incrementUnread]);

  return socketRef.current;
};

export const joinMatchRoom = (socket: Socket | null, matchId: string) => {
  if (socket) {
    socket.emit('join_match', matchId);
  }
};

export const leaveMatchRoom = (socket: Socket | null, matchId: string) => {
  if (socket) {
    socket.emit('leave_match', matchId);
  }
};

export const sendSocketMessage = (socket: Socket | null, matchId: string, content: string) => {
  if (socket) {
    socket.emit('send_message', { matchId, content });
  }
};