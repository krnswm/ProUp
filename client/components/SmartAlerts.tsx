import { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, BellRing, X, Clock, AlertTriangle, Flame, Star, Settings, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { getXPState } from "@/lib/xp";
import { readCompletionStreak } from "@/lib/confetti";

interface Alert {
  id: string;
  type: "due_soon" | "overdue" | "streak_warning" | "level_up" | "reminder";
  title: string;
  message: string;
  icon: React.ReactNode;
  color: string;
  timestamp: string;
  read: boolean;
}

interface AlertPrefs {
  dueSoon: boolean;
  overdue: boolean;
  streakWarning: boolean;
  levelUp: boolean;
}

const PREFS_KEY = "alerts:prefs";
const DISMISSED_KEY = "alerts:dismissed";
const LAST_LEVEL_KEY = "alerts:lastLevel";

function getPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { dueSoon: true, overdue: true, streakWarning: true, levelUp: true };
  } catch {
    return { dueSoon: true, overdue: true, streakWarning: true, levelUp: true };
  }
}

function savePrefs(prefs: AlertPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function dismissAlert(id: string) {
  const dismissed = getDismissed();
  dismissed.add(id);
  // Keep last 200
  const arr = Array.from(dismissed);
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

export default function SmartAlerts() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [prefs, setPrefs] = useState<AlertPrefs>(getPrefs);
  const [showPrefs, setShowPrefs] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // Fetch user tasks periodically
  const fetchTasks = useCallback(async () => {
    try {
      const res = await api("/api/tasks/my");
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000); // every minute
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Generate alerts from tasks and state
  useEffect(() => {
    const dismissed = getDismissed();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const newAlerts: Alert[] = [];

    // Due soon alerts (due within 24 hours)
    if (prefs.dueSoon) {
      for (const t of tasks) {
        if (t.status === "done" || !t.dueDate) continue;
        const due = new Date(t.dueDate);
        const hoursUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntil > 0 && hoursUntil <= 24) {
          const id = `due-soon-${t.id}-${today}`;
          if (!dismissed.has(id)) {
            newAlerts.push({
              id,
              type: "due_soon",
              title: "Due Soon",
              message: `"${t.title}" is due in ${Math.round(hoursUntil)} hours`,
              icon: <Clock className="w-4 h-4" />,
              color: "text-amber-500",
              timestamp: now.toISOString(),
              read: false,
            });
          }
        }
      }
    }

    // Overdue alerts
    if (prefs.overdue) {
      for (const t of tasks) {
        if (t.status === "done" || !t.dueDate) continue;
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59);
        if (due < now) {
          const id = `overdue-${t.id}-${today}`;
          if (!dismissed.has(id)) {
            const daysOverdue = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            newAlerts.push({
              id,
              type: "overdue",
              title: "Overdue",
              message: `"${t.title}" is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
              icon: <AlertTriangle className="w-4 h-4" />,
              color: "text-red-500",
              timestamp: now.toISOString(),
              read: false,
            });
          }
        }
      }
    }

    // Streak warning
    if (prefs.streakWarning) {
      const { streak, lastDate } = readCompletionStreak();
      if (streak > 0 && lastDate) {
        const last = new Date(lastDate);
        const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 18 && hoursSince < 48) {
          const id = `streak-warn-${today}`;
          if (!dismissed.has(id)) {
            newAlerts.push({
              id,
              type: "streak_warning",
              title: "Streak at Risk!",
              message: `Your ${streak}-day streak will break if you don't complete a task today`,
              icon: <Flame className="w-4 h-4" />,
              color: "text-orange-500",
              timestamp: now.toISOString(),
              read: false,
            });
          }
        }
      }
    }

    // Level up check
    if (prefs.levelUp) {
      const xpState = getXPState();
      const lastLevel = parseInt(localStorage.getItem(LAST_LEVEL_KEY) || "0") || 0;
      if (xpState.level > lastLevel && lastLevel > 0) {
        const id = `level-up-${xpState.level}`;
        if (!dismissed.has(id)) {
          newAlerts.push({
            id,
            type: "level_up",
            title: "Level Up!",
            message: `You reached Level ${xpState.level} — ${xpState.title}!`,
            icon: <Star className="w-4 h-4" />,
            color: "text-purple-500",
            timestamp: now.toISOString(),
            read: false,
          });
        }
      }
      localStorage.setItem(LAST_LEVEL_KEY, String(xpState.level));
    }

    // Sort: unread first, then by type priority
    const typePriority: Record<string, number> = { overdue: 0, due_soon: 1, streak_warning: 2, level_up: 3, reminder: 4 };
    newAlerts.sort((a, b) => (typePriority[a.type] ?? 5) - (typePriority[b.type] ?? 5));

    setAlerts(newAlerts);
  }, [tasks, prefs]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const handleDismiss = (id: string) => {
    dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDismissAll = () => {
    for (const a of alerts) dismissAlert(a.id);
    setAlerts([]);
  };

  const handleTogglePref = (key: keyof AlertPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    savePrefs(next);
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case "overdue": return "bg-red-500/5 border-red-500/15";
      case "due_soon": return "bg-amber-500/5 border-amber-500/15";
      case "streak_warning": return "bg-orange-500/5 border-orange-500/15";
      case "level_up": return "bg-purple-500/5 border-purple-500/15";
      default: return "bg-secondary/30 border-border";
    }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl bg-secondary/80 border border-border/50 hover:bg-primary/10 transition-colors"
        title="Smart Alerts"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-foreground animate-pulse" />
        ) : (
          <Bell className="w-5 h-5 text-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="h-1 bg-gradient-to-r from-red-500 via-amber-500 to-purple-500" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">Alerts</span>
              <div className="flex items-center gap-1">
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDismissAll}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPrefs((v) => !v)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Preferences */}
            <AnimatePresence>
              {showPrefs && (
                <motion.div
                  className="px-4 py-3 border-b border-border bg-secondary/20 space-y-2"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notification Preferences</p>
                  {([
                    { key: "dueSoon" as const, label: "Due soon (within 24h)" },
                    { key: "overdue" as const, label: "Overdue tasks" },
                    { key: "streakWarning" as const, label: "Streak at risk" },
                    { key: "levelUp" as const, label: "Level up celebrations" },
                  ]).map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs[item.key]}
                        onChange={() => handleTogglePref(item.key)}
                        className="rounded border-border accent-primary"
                      />
                      <span className="text-xs text-foreground">{item.label}</span>
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Alert list */}
            <div className="max-h-[320px] overflow-auto">
              {alerts.length === 0 ? (
                <div className="py-8 text-center">
                  <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">All clear! No alerts right now.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 ${getAlertBg(alert.type)} transition-colors`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className={`mt-0.5 flex-shrink-0 ${alert.color}`}>{alert.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
