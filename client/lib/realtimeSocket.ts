import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getRealtimeSocket = () => {
  if (socket) return socket;

  socket = io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  return socket;
};

export const disconnectRealtimeSocket = () => {
  socket?.disconnect();
  socket = null;
};
