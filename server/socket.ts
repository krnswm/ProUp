import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { Http2Server, Http2SecureServer } from 'http2';
import { Server, Socket } from 'socket.io';
import { getIO, setIO } from './realtime';

interface UserCursor {
  socketId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

interface WhiteboardUser {
  socketId: string;
  userName: string;
  color: string;
}

// Store active users in each room
const roomUsers = new Map<string, Map<string, WhiteboardUser>>();

// Generate a random color for cursor
const generateColor = () => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

type AnyHttpServer = HttpServer | HttpsServer | Http2Server | Http2SecureServer;

export function setupSocketServer(httpServer: AnyHttpServer) {
  const existing = getIO();
  if (existing) return existing;

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  setIO(io);

  // Default namespace: realtime tasks/comments/notifications
  io.on('connection', (socket: Socket) => {
    socket.on('join-project', ({ projectId }: { projectId: string | number }) => {
      if (projectId === undefined || projectId === null) return;
      socket.join(`project:${projectId}`);
    });

    socket.on('join-task', ({ taskId }: { taskId: string | number }) => {
      if (taskId === undefined || taskId === null) return;
      socket.join(`task:${taskId}`);
    });

    socket.on('join-user', ({ userId }: { userId: string | number }) => {
      if (userId === undefined || userId === null) return;
      socket.join(`user:${userId}`);
    });

    socket.on('leave-project', ({ projectId }: { projectId: string | number }) => {
      if (projectId === undefined || projectId === null) return;
      socket.leave(`project:${projectId}`);
    });

    socket.on('leave-task', ({ taskId }: { taskId: string | number }) => {
      if (taskId === undefined || taskId === null) return;
      socket.leave(`task:${taskId}`);
    });

    socket.on('leave-user', ({ userId }: { userId: string | number }) => {
      if (userId === undefined || userId === null) return;
      socket.leave(`user:${userId}`);
    });
  });

  // Whiteboard namespace
  const whiteboardNamespace = io.of('/whiteboard');

  whiteboardNamespace.on('connection', (socket: Socket) => {
    console.log('User connected to whiteboard:', socket.id);

    let currentRoom: string | null = null;
    let userData: WhiteboardUser | null = null;

    // Join a whiteboard room (by projectId)
    socket.on('join-room', ({ projectId, userName }: { projectId: string; userName: string }) => {
      const roomId = `whiteboard-${projectId}`;
      
      // Leave previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        const users = roomUsers.get(currentRoom);
        if (users) {
          users.delete(socket.id);
          // Notify others that user left
          socket.to(currentRoom).emit('user-left', { socketId: socket.id });
        }
      }

      // Join new room
      socket.join(roomId);
      currentRoom = roomId;

      // Store user data
      userData = {
        socketId: socket.id,
        userName: userName || 'Anonymous',
        color: generateColor(),
      };

      // Add user to room
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      roomUsers.get(roomId)!.set(socket.id, userData);

      // Send current users in room to the newly joined user
      const usersInRoom = Array.from(roomUsers.get(roomId)!.values());
      socket.emit('room-users', usersInRoom);

      // Notify others about new user
      socket.to(roomId).emit('user-joined', userData);

      console.log(`User ${userName} joined room ${roomId}`);
    });

    // Handle canvas changes (shapes, drawings, etc.)
    socket.on('canvas-change', (data: { change: any; projectId: string }) => {
      if (currentRoom) {
        // Broadcast to all other users in the room
        socket.to(currentRoom).emit('canvas-change', {
          change: data.change,
          userId: socket.id,
        });
      }
    });

    // Handle cursor movement
    socket.on('cursor-move', (data: { x: number; y: number }) => {
      if (currentRoom && userData) {
        socket.to(currentRoom).emit('cursor-update', {
          socketId: socket.id,
          userName: userData.userName,
          color: userData.color,
          x: data.x,
          y: data.y,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected from whiteboard:', socket.id);
      
      if (currentRoom) {
        const users = roomUsers.get(currentRoom);
        if (users) {
          users.delete(socket.id);
          // Notify others that user left
          socket.to(currentRoom).emit('user-left', { socketId: socket.id });
        }
      }
    });
  });

  return io;
}
