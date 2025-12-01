import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface SocketUser {
  id: string;
  name: string;
}

interface SocketMessage {
  id: string;
  conversationId: string;
  messageText: string;
  direction: 'RECEIVED' | 'SENT';
  timestamp: string;
}

interface SocketState {
  socket: Socket | null;
  onlineUsers: SocketUser[];
  isConnected: boolean;
  conversations: any[];
}

export function useSocket() {
  const { token, user } = useAuth();
  const [state, setState] = useState<SocketState>({
    socket: null,
    onlineUsers: [],
    isConnected: false,
    conversations: [],
  });

  useEffect(() => {
    if (!token || !user) return;

    // In development, always use localhost:3001 for Socket.IO
    // In production, use window.location.origin (which will be proxied by Vite)
    const base = (import.meta as any).env?.VITE_API_URL || 
      (import.meta.env.DEV 
        ? 'http://localhost:3001' 
        : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'))
    
    console.log(`🔌 [Socket] Connecting to: ${base}`)
    const socket = io(base, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      setState(prev => ({ ...prev, isConnected: true, socket }));
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setState(prev => ({ ...prev, isConnected: false }));
      console.log('Socket disconnected');
    });

    socket.on('users_online', (users: SocketUser[]) => {
      setState(prev => ({ ...prev, onlineUsers: users }));
    });

    socket.on('conversation_updated', (conversation: any) => {
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.id === conversation.id ? conversation : conv
        ),
      }));
    });

    socket.on('new_message', (message: SocketMessage) => {
      // Handle new message notification
      console.log('New message received:', message);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  const joinConversation = (conversationId: string) => {
    if (state.socket) {
      state.socket.emit('join_conversation', conversationId);
    }
  };

  const sendMessage = (conversationId: string, message: string) => {
    if (state.socket) {
      state.socket.emit('send_message', { conversationId, message });
    }
  };

  return {
    ...state,
    joinConversation,
    sendMessage,
  };
}
