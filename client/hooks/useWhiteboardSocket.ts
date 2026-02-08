import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RemoteCursor {
  socketId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export interface WhiteboardUser {
  socketId: string;
  userName: string;
  color: string;
}

interface UseWhiteboardSocketOptions {
  projectId: string;
  userName: string;
  onCanvasChange?: (change: any) => void;
  onCursorUpdate?: (cursor: RemoteCursor) => void;
  onUserJoined?: (user: WhiteboardUser) => void;
  onUserLeft?: (socketId: string) => void;
}

export function useWhiteboardSocket({
  projectId,
  userName,
  onCanvasChange,
  onCursorUpdate,
  onUserJoined,
  onUserLeft,
}: UseWhiteboardSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<WhiteboardUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());

  useEffect(() => {
    // Connect to the whiteboard namespace
    const socket = io('/whiteboard', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to whiteboard socket');
      setIsConnected(true);
      
      // Join the room for this project
      socket.emit('join-room', { projectId, userName });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from whiteboard socket');
      setIsConnected(false);
    });

    // Handle room users list
    socket.on('room-users', (roomUsers: WhiteboardUser[]) => {
      setUsers(roomUsers);
    });

    // Handle new user joining
    socket.on('user-joined', (user: WhiteboardUser) => {
      setUsers(prev => [...prev, user]);
      onUserJoined?.(user);
    });

    // Handle user leaving
    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      setUsers(prev => prev.filter(u => u.socketId !== socketId));
      setRemoteCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(socketId);
        return newCursors;
      });
      onUserLeft?.(socketId);
    });

    // Handle canvas changes from other users
    socket.on('canvas-change', ({ change, userId }: { change: any; userId: string }) => {
      onCanvasChange?.(change);
    });

    // Handle cursor updates from other users
    socket.on('cursor-update', (cursor: RemoteCursor) => {
      setRemoteCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(cursor.socketId, cursor);
        return newCursors;
      });
      onCursorUpdate?.(cursor);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [projectId, userName]);

  // Emit canvas change
  const emitCanvasChange = useCallback((change: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('canvas-change', { change, projectId });
    }
  }, [projectId]);

  // Emit cursor movement
  const emitCursorMove = useCallback((x: number, y: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-move', { x, y });
    }
  }, []);

  return {
    isConnected,
    users,
    remoteCursors: Array.from(remoteCursors.values()),
    emitCanvasChange,
    emitCursorMove,
  };
}
