import { useState, useEffect, useMemo } from "react";
import { Clock, Rewind, FastForward, Play, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface ActivityEntry {
  id: number;
  taskId: number;
  userId: string;
  actionType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  timestamp: string;
}

interface TaskSnapshot {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignedUser: string;
}

interface TimeMachineProps {
  projectId: number;
  tasks: { id: number; title: string; status: string; priority: string; assignedUser: string; createdAt?: string }[];
}

export default function TimeMachine({ projectId, tasks }: TimeMachineProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sliderValue, setSliderValue] = useState(100);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const taskIds = tasks.map((t) => t.id);
        const allLogs: ActivityEntry[] = [];
        // Fetch logs for each task (batch)
        for (const tid of taskIds) {
          try {
            const res = await api(`/api/tasks/${tid}/activity`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) allLogs.push(...data);
            }
          } catch { /* skip */ }
        }
        allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setLogs(allLogs);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchLogs();
  }, [open, tasks]);

  // Build date range
  const { dates, dateLabels } = useMemo(() => {
    if (logs.length === 0 && tasks.length === 0) return { dates: [], dateLabels: [] };

    const allDates = new Set<string>();
    for (const l of logs) {
      allDates.add(l.timestamp.slice(0, 10));
    }
    for (const t of tasks) {
      if (t.createdAt) allDates.add(t.createdAt.slice(0, 10));
    }
    // Add today
    allDates.add(new Date().toISOString().slice(0, 10));

    const sorted = Array.from(allDates).sort();
    const labels = sorted.map((d) => {
      const dt = new Date(d);
      return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    });
    return { dates: sorted, dateLabels: labels };
  }, [logs, tasks]);

  // Compute task snapshots at the current slider position
  const { snapshots, currentDate, eventCount } = useMemo(() => {
    if (dates.length === 0) {
      return { snapshots: tasks.map((t) => ({ ...t })), currentDate: "Now", eventCount: 0 };
    }

    const idx = Math.round((sliderValue / 100) * (dates.length - 1));
    const targetDate = dates[idx] || dates[dates.length - 1];
    const targetTime = new Date(targetDate + "T23:59:59").getTime();

    // Start with initial state (all tasks as "todo" before any logs)
    const taskMap = new Map<number, TaskSnapshot>();
    for (const t of tasks) {
      taskMap.set(t.id, {
        id: t.id,
        title: t.title,
        status: "todo",
        priority: "medium",
        assignedUser: t.assignedUser || "Unassigned",
      });
    }

    // Apply logs up to targetTime
    let count = 0;
    for (const log of logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime > targetTime) break;
      count++;

      const existing = taskMap.get(log.taskId);
      if (!existing) continue;

      if (log.fieldName === "status") existing.status = log.newValue;
      else if (log.fieldName === "priority") existing.priority = log.newValue;
      else if (log.fieldName === "assignedUser") existing.assignedUser = log.newValue;
    }

    const label = new Date(targetDate).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { snapshots: Array.from(taskMap.values()), currentDate: label, eventCount: count };
  }, [dates, sliderValue, logs, tasks]);

  // Auto-play
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setSliderValue((v) => {
        if (v >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(v + 2, 100);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [playing]);

  const statusCounts = useMemo(() => {
    const counts = { todo: 0, inprogress: 0, done: 0 };
    for (const s of snapshots) {
      if (s.status === "todo") counts.todo++;
      else if (s.status === "inprogress") counts.inprogress++;
      else if (s.status === "done") counts.done++;
    }
    return counts;
  }, [snapshots]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "bg-green-500";
      case "inprogress": return "bg-blue-500";
      case "todo": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done": return "Done";
      case "inprogress": return "In Progress";
      case "todo": return "To Do";
      default: return status;
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-purple-500" />
        Time Machine
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setPlaying(false); }} />

        <motion.div
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25 }}
        >
          {/* Header gradient */}
          <div className="h-1.5 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-bold text-foreground">Project Time Machine</h2>
              </div>
              <button
                type="button"
                onClick={() => { setOpen(false); setPlaying(false); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {/* Current date display */}
                <div className="text-center mb-4">
                  <motion.p
                    key={currentDate}
                    className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {currentDate}
                  </motion.p>
                  <p className="text-xs text-muted-foreground mt-1">{eventCount} changes applied</p>
                </div>

                {/* Timeline slider */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setSliderValue(Math.max(0, sliderValue - 5))}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className={`p-2 rounded-full transition-colors ${playing ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-primary/10 text-foreground"}`}
                  >
                    <Play className={`w-4 h-4 ${playing ? "animate-pulse" : ""}`} />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderValue}
                      onChange={(e) => { setSliderValue(parseInt(e.target.value)); setPlaying(false); }}
                      className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    {/* Date markers */}
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{dateLabels[0] || ""}</span>
                      <span className="text-[10px] text-muted-foreground">{dateLabels[dateLabels.length - 1] || "Now"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSliderValue(Math.min(100, sliderValue + 5))}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Status summary bar */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-secondary">
                    {snapshots.length > 0 && (
                      <>
                        <motion.div
                          className="bg-green-500 h-full"
                          animate={{ width: `${(statusCounts.done / snapshots.length) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                        <motion.div
                          className="bg-blue-500 h-full"
                          animate={{ width: `${(statusCounts.inprogress / snapshots.length) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                        <motion.div
                          className="bg-gray-400 h-full"
                          animate={{ width: `${(statusCounts.todo / snapshots.length) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{statusCounts.done}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{statusCounts.inprogress}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />{statusCounts.todo}</span>
                  </div>
                </div>

                {/* Task grid */}
                <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-auto">
                  {["todo", "inprogress", "done"].map((status) => (
                    <div key={status} className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {getStatusLabel(status)}
                      </p>
                      {snapshots
                        .filter((s) => s.status === status)
                        .map((s) => (
                          <motion.div
                            key={s.id}
                            layout
                            className="px-2.5 py-2 bg-secondary/50 border border-border rounded-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(s.status)}`} />
                              <span className="text-[10px] text-muted-foreground truncate">{s.assignedUser}</span>
                            </div>
                          </motion.div>
                        ))}
                      {snapshots.filter((s) => s.status === status).length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">No tasks</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
