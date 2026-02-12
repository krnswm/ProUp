import MainLayout from "@/components/MainLayout";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import TaskDrawer from "@/components/TaskDrawer";
import type { Task } from "@/components/TaskCard";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function Inbox() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<Task | undefined>();
  const [drawerReadOnly, setDrawerReadOnly] = useState(true);

  const notifyUnreadRefresh = () => {
    window.dispatchEvent(new CustomEvent("notifications:refresh"));
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api("/api/notifications");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Not authenticated. Please log out and log back in.");
        }
        const txt = await response.text();
        throw new Error(txt || "Failed to fetch notifications");
      }
      const data = await response.json();
      setItems(data);
      setError(null);
      notifyUnreadRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: number) => {
    try {
      const response = await api(`/api/notifications/${id}/read`, { method: "POST" });
      if (response.ok) {
        const updated = await response.json();
        setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
        notifyUnreadRefresh();
      }
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const extractTaskIdFromLink = (link: string | null) => {
    if (!link) return null;
    const match = link.match(/[?&]task=(\d+)/);
    if (!match) return null;
    const id = parseInt(match[1]);
    return Number.isNaN(id) ? null : id;
  };

  const extractProjectIdFromLink = (link: string | null) => {
    if (!link) return null;
    const match = link.match(/^\/project\/(\d+)(?:\?|$)/);
    if (!match) return null;
    const id = parseInt(match[1]);
    return Number.isNaN(id) ? null : id;
  };

  const resolveTaskFromNotification = async (n: Notification): Promise<Task | null> => {
    const taskId = extractTaskIdFromLink(n.link);
    if (taskId) {
      const response = await api(`/api/tasks/${taskId}`);
      if (!response.ok) return null;
      return (await response.json()) as Task;
    }

    const title = (n.body ?? "").trim();
    if (!title) return null;

    const projectId = extractProjectIdFromLink(n.link);
    if (projectId) {
      const response = await api(`/api/projects/${projectId}/board`);
      if (!response.ok) return null;
      const data = await response.json();
      const tasks = Array.isArray(data?.tasks) ? (data.tasks as Task[]) : [];
      const found = tasks.find((t) => String(t.title).trim() === title);
      return found ?? null;
    }

    if (n.link?.startsWith("/my-tasks")) {
      const response = await api("/api/tasks/my");
      if (!response.ok) return null;
      const tasks = (await response.json()) as Task[];
      const found = tasks.find((t) => String(t.title).trim() === title);
      return found ?? null;
    }

    return null;
  };

  const openTaskFromNotification = async (n: Notification) => {
    try {
      const task = await resolveTaskFromNotification(n);
      if (!task) {
        if (n.link) navigate(n.link);
        return;
      }

      setDrawerTask(task);
      setDrawerReadOnly(true);
      setIsDrawerOpen(true);

      if (!n.readAt) {
        await markRead(n.id);
      }
    } catch (e) {
      console.error("Failed to open task from notification", e);
    }
  };

  const markAllRead = async () => {
    try {
      const response = await api("/api/notifications/read-all", { method: "POST" });
      if (response.ok) {
        await fetchNotifications();
        notifyUnreadRefresh();
      }
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <MainLayout>
      <div className="p-8">
        <motion.div
          className="mb-8 flex items-start justify-between gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
              <p className="text-muted-foreground">Your latest notifications</p>
            </div>
          </div>

          <button
            onClick={markAllRead}
            className="px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-2"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Loading notifications...</div>
        ) : error ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-red-500 font-medium mb-2">Failed to load inbox</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div
                key={n.id}
                className={`bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4 ${
                  n.readAt ? "opacity-80" : "shadow-sm"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{n.title}</p>
                    {!n.readAt && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.readAt && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Mark read
                    </button>
                  )}
                  {n.link && (
                    <button
                      onClick={() => openTaskFromNotification(n)}
                      className="px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) {
            setDrawerTask(undefined);
            setDrawerReadOnly(true);
          }
        }}
        onSave={async (newTask) => {
          if (!drawerTask) return;
          if (drawerReadOnly) return;
          try {
            const response = await api(`/api/tasks/${drawerTask.id}`, {
              method: "PUT",
              body: JSON.stringify(newTask),
            });
            if (response.ok) {
              const updated = (await response.json()) as Task;
              setDrawerTask(updated);
            }
          } catch (e) {
            console.error("Failed to save task", e);
          }
        }}
        task={drawerTask}
        readOnly={drawerReadOnly}
      />
    </MainLayout>
  );
}
