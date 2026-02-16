import { useState, useMemo } from "react";
import { BarChart3, TrendingDown, TrendingUp, Users, Clock, CheckCircle, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Task } from "@/components/TaskCard";

interface ProjectAnalyticsProps {
  tasks: Task[];
  projectName: string;
}

export default function ProjectAnalytics({ tasks, projectName }: ProjectAnalyticsProps) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "inprogress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Overdue
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = tasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < now;
    }).length;

    // Priority breakdown
    const high = tasks.filter((t) => t.priority === "high").length;
    const medium = tasks.filter((t) => t.priority === "medium").length;
    const low = tasks.filter((t) => t.priority === "low").length;

    // Contributor breakdown
    const contributorMap = new Map<string, { total: number; done: number }>();
    for (const t of tasks) {
      const user = t.assignedUser || "Unassigned";
      if (!contributorMap.has(user)) contributorMap.set(user, { total: 0, done: 0 });
      const c = contributorMap.get(user)!;
      c.total++;
      if (t.status === "done") c.done++;
    }
    const contributors = Array.from(contributorMap.entries())
      .map(([name, data]) => ({ name, ...data, rate: data.total > 0 ? Math.round((data.done / data.total) * 100) : 0 }))
      .sort((a, b) => b.done - a.done);

    // Weekly velocity (tasks completed per week over last 4 weeks)
    const velocity: { week: string; count: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);

      const count = tasks.filter((t) => {
        if (t.status !== "done") return false;
        const updated = (t as any).updatedAt?.slice(0, 10);
        return updated && updated >= weekStartStr && updated < weekEndStr;
      }).length;

      velocity.push({
        week: `W${4 - w}`,
        count,
      });
    }

    const avgVelocity = velocity.length > 0 ? velocity.reduce((s, v) => s + v.count, 0) / velocity.length : 0;
    const maxVelocity = Math.max(...velocity.map((v) => v.count), 1);

    // Burndown: remaining tasks over time (simulated from created/done dates)
    const remaining = total - done;
    const estimatedDaysLeft = avgVelocity > 0 ? Math.ceil((remaining / avgVelocity) * 7) : 0;

    // Bottleneck: status with most tasks stuck
    const bottleneck = inProgress > todo ? "In Progress" : todo > 0 ? "To Do" : "None";

    return {
      total, done, inProgress, todo, completionRate, overdue,
      high, medium, low,
      contributors, velocity, avgVelocity, maxVelocity,
      remaining, estimatedDaysLeft, bottleneck,
    };
  }, [tasks]);

  const CONTRIBUTOR_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        Analytics
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
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

        <motion.div
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-foreground">Project Analytics</h2>
                </div>
                <p className="text-xs text-muted-foreground">{projectName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Completion", value: `${stats.completionRate}%`, color: "text-green-500", bg: "bg-green-500/10" },
                { label: "Velocity", value: `${stats.avgVelocity.toFixed(1)}/wk`, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Overdue", value: String(stats.overdue), color: stats.overdue > 0 ? "text-red-500" : "text-green-500", bg: stats.overdue > 0 ? "bg-red-500/10" : "bg-green-500/10" },
                { label: "ETA", value: stats.estimatedDaysLeft > 0 ? `${stats.estimatedDaysLeft}d` : "—", color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  className={`${card.bg} rounded-xl p-3 text-center`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Status breakdown bar */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Breakdown</p>
              <div className="flex h-4 rounded-full overflow-hidden bg-secondary">
                {stats.done > 0 && (
                  <motion.div
                    className="bg-green-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.done / stats.total) * 100}%` }}
                    transition={{ duration: 0.6 }}
                  />
                )}
                {stats.inProgress > 0 && (
                  <motion.div
                    className="bg-blue-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                )}
                {stats.todo > 0 && (
                  <motion.div
                    className="bg-gray-400 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.todo / stats.total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Done ({stats.done})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress ({stats.inProgress})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> To Do ({stats.todo})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Velocity chart */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Weekly Velocity</p>
                <div className="flex items-end gap-2 h-24">
                  {stats.velocity.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        className="w-full bg-blue-500 rounded-t-sm"
                        initial={{ height: 0 }}
                        animate={{ height: `${(v.count / stats.maxVelocity) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                      />
                      <span className="text-[10px] text-muted-foreground">{v.week}</span>
                      <span className="text-[10px] font-semibold text-foreground">{v.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority breakdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Priority Mix</p>
                <div className="space-y-2">
                  {[
                    { label: "High", count: stats.high, color: "bg-red-500", total: stats.total },
                    { label: "Medium", count: stats.medium, color: "bg-yellow-500", total: stats.total },
                    { label: "Low", count: stats.low, color: "bg-green-500", total: stats.total },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-12">{p.label}</span>
                      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`${p.color} h-full rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${p.total > 0 ? (p.count / p.total) * 100 : 0}%` }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground w-6 text-right">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contributors */}
            {stats.contributors.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contributors</p>
                <div className="space-y-2">
                  {stats.contributors.map((c, i) => (
                    <motion.div
                      key={c.name}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length] }}
                      >
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.done}/{c.total} ({c.rate}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.rate}%`,
                              backgroundColor: CONTRIBUTOR_COLORS[i % CONTRIBUTOR_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottleneck */}
            {stats.bottleneck !== "None" && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Bottleneck detected in <span className="font-semibold">{stats.bottleneck}</span> — {stats.bottleneck === "In Progress" ? `${stats.inProgress} tasks stuck` : `${stats.todo} tasks waiting`}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
