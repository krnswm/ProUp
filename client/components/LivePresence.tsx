import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRealtimeSocket } from "@/lib/realtimeSocket";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceUser {
  userId: number;
  name: string;
  color: string;
  viewingTaskId?: number;
  lastSeen: number;
}

interface LivePresenceProps {
  projectId: number;
}

const PRESENCE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
];

function getColorForUser(userId: number): string {
  return PRESENCE_COLORS[userId % PRESENCE_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LivePresence({ projectId }: LivePresenceProps) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<number, PresenceUser>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket || !user) return;

    const myPresence: PresenceUser = {
      userId: (user as any).id || 0,
      name: user.name || "Anonymous",
      color: getColorForUser((user as any).id || 0),
      lastSeen: Date.now(),
    };

    // Emit presence
    socket.emit("presence:join", { projectId, user: myPresence });

    // Heartbeat
    intervalRef.current = setInterval(() => {
      socket.emit("presence:heartbeat", { projectId, user: { ...myPresence, lastSeen: Date.now() } });
    }, 5000);

    // Listen for presence updates
    const onPresenceUpdate = (data: { users: PresenceUser[] }) => {
      const map = new Map<number, PresenceUser>();
      for (const u of data.users) {
        if (u.userId !== myPresence.userId) {
          map.set(u.userId, u);
        }
      }
      setOnlineUsers(map);
    };

    const onPresenceJoin = (data: { user: PresenceUser }) => {
      if (data.user.userId !== myPresence.userId) {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.set(data.user.userId, data.user);
          return next;
        });
      }
    };

    const onPresenceLeave = (data: { userId: number }) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on("presence:update", onPresenceUpdate);
    socket.on("presence:join", onPresenceJoin);
    socket.on("presence:leave", onPresenceLeave);

    return () => {
      socket.emit("presence:leave", { projectId, userId: myPresence.userId });
      socket.off("presence:update", onPresenceUpdate);
      socket.off("presence:join", onPresenceJoin);
      socket.off("presence:leave", onPresenceLeave);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [projectId, user]);

  const users = Array.from(onlineUsers.values());

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Online:</span>
      <div className="flex -space-x-2">
        <AnimatePresence>
          {users.slice(0, 5).map((u) => (
            <motion.div
              key={u.userId}
              className="relative w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: u.color }}
              title={u.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              {getInitials(u.name)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
            </motion.div>
          ))}
        </AnimatePresence>
        {users.length > 5 && (
          <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            +{users.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

// Small component to show who's viewing a specific task card
export function TaskPresenceIndicator({ taskId, projectId }: { taskId: number; projectId: number }) {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket || !user) return;

    const onPresenceUpdate = (data: { users: PresenceUser[] }) => {
      const myId = (user as any).id || 0;
      setViewers(data.users.filter((u) => u.viewingTaskId === taskId && u.userId !== myId));
    };

    socket.on("presence:update", onPresenceUpdate);
    return () => { socket.off("presence:update", onPresenceUpdate); };
  }, [taskId, user]);

  if (viewers.length === 0) return null;

  return (
    <div className="flex -space-x-1.5">
      {viewers.slice(0, 3).map((v) => (
        <div
          key={v.userId}
          className="w-5 h-5 rounded-full border border-card flex items-center justify-center text-[8px] font-bold text-white"
          style={{ backgroundColor: v.color }}
          title={`${v.name} is viewing`}
        >
          {getInitials(v.name)}
        </div>
      ))}
    </div>
  );
}
