import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/components/MainLayout";
import { api } from "@/lib/api";
import {
  Sparkles, Calendar, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, MessageSquare, Loader2, ChevronRight,
  ThumbsUp, ThumbsDown, Lightbulb, BarChart3, Flame, Target,
} from "lucide-react";
import { getRecentEntries, MOOD_EMOJIS, type MoodEntry } from "@/lib/mood";
import { getSessions, type PomodoroSession } from "@/lib/pomodoro";

interface RetroData {
  period: { from: string; to: string; days: number };
  summary: {
    tasksCreated: number;
    tasksCompleted: number;
    totalTasks: number;
    overdueCount: number;
    commentCount: number;
    statusChanges: number;
    completionRate: number;
    avgCompletedPerDay: number;
    priorityBreakdown: { high: number; medium: number; low: number };
    busiestDay: { date: string; count: number } | null;
  };
  projects: { id: number; name: string; totalTasks: number; completed: number; inProgress: number; todo: number }[];
  completedTaskTitles: string[];
  overdueTasks: { title: string; dueDate: string; priority: string }[];
}

interface RetroInsight {
  type: "positive" | "negative" | "action";
  icon: React.ReactNode;
  title: string;
  detail: string;
}

function generateInsights(
  data: RetroData,
  moodEntries: MoodEntry[],
  focusSessions: PomodoroSession[]
): { positive: RetroInsight[]; negative: RetroInsight[]; actions: RetroInsight[] } {
  const positive: RetroInsight[] = [];
  const negative: RetroInsight[] = [];
  const actions: RetroInsight[] = [];
  const s = data.summary;

  // ── What Went Well ──────────────────────────────────────────
  if (s.completionRate >= 70) {
    positive.push({
      type: "positive", icon: <TrendingUp className="w-4 h-4" />,
      title: "Strong completion rate",
      detail: `${s.completionRate}% of tasks were completed — great momentum this sprint.`,
    });
  } else if (s.completionRate >= 40) {
    positive.push({
      type: "positive", icon: <CheckCircle className="w-4 h-4" />,
      title: "Steady progress",
      detail: `${s.tasksCompleted} tasks completed with a ${s.completionRate}% completion rate.`,
    });
  }

  if (s.tasksCompleted > 0 && s.avgCompletedPerDay >= 2) {
    positive.push({
      type: "positive", icon: <Flame className="w-4 h-4" />,
      title: "High velocity",
      detail: `Averaging ${s.avgCompletedPerDay} tasks/day — above typical pace.`,
    });
  }

  if (s.priorityBreakdown.high > 0 && s.priorityBreakdown.high >= s.priorityBreakdown.low) {
    positive.push({
      type: "positive", icon: <Target className="w-4 h-4" />,
      title: "Prioritized high-impact work",
      detail: `${s.priorityBreakdown.high} high-priority tasks completed vs ${s.priorityBreakdown.low} low-priority.`,
    });
  }

  if (s.commentCount >= 10) {
    positive.push({
      type: "positive", icon: <MessageSquare className="w-4 h-4" />,
      title: "Active collaboration",
      detail: `${s.commentCount} comments exchanged — strong team communication.`,
    });
  }

  if (s.busiestDay) {
    positive.push({
      type: "positive", icon: <Flame className="w-4 h-4" />,
      title: "Peak productivity day",
      detail: `${formatDate(s.busiestDay.date)} was the busiest day with ${s.busiestDay.count} activities.`,
    });
  }

  if (focusSessions.length >= 5) {
    const totalMin = focusSessions.reduce((sum, s) => sum + s.duration, 0);
    positive.push({
      type: "positive", icon: <Clock className="w-4 h-4" />,
      title: "Deep focus time",
      detail: `${focusSessions.length} focus sessions totaling ${Math.round(totalMin / 60)} hours of concentrated work.`,
    });
  }

  const avgMood = moodEntries.length > 0
    ? moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length
    : -1;
  if (avgMood >= 4) {
    positive.push({
      type: "positive", icon: <ThumbsUp className="w-4 h-4" />,
      title: "Great team morale",
      detail: `Average mood was ${MOOD_EMOJIS[Math.round(avgMood) - 1] || "😊"} (${avgMood.toFixed(1)}/5) — the team is feeling good.`,
    });
  }

  // ── What Didn't Go Well ─────────────────────────────────────
  if (s.overdueCount > 0) {
    negative.push({
      type: "negative", icon: <AlertTriangle className="w-4 h-4" />,
      title: `${s.overdueCount} overdue task${s.overdueCount > 1 ? "s" : ""}`,
      detail: data.overdueTasks.slice(0, 3).map((t) => `"${t.title}"`).join(", ") +
        (data.overdueTasks.length > 3 ? ` and ${data.overdueTasks.length - 3} more` : ""),
    });
  }

  if (s.completionRate < 40 && s.totalTasks > 0) {
    negative.push({
      type: "negative", icon: <TrendingDown className="w-4 h-4" />,
      title: "Low completion rate",
      detail: `Only ${s.completionRate}% of tasks completed. Consider reducing sprint scope or breaking tasks smaller.`,
    });
  }

  if (s.tasksCreated > s.tasksCompleted * 1.5 && s.tasksCreated > 5) {
    negative.push({
      type: "negative", icon: <TrendingDown className="w-4 h-4" />,
      title: "Scope creep detected",
      detail: `${s.tasksCreated} tasks created vs ${s.tasksCompleted} completed — more work added than finished.`,
    });
  }

  if (s.priorityBreakdown.low > s.priorityBreakdown.high && s.priorityBreakdown.low > 3) {
    negative.push({
      type: "negative", icon: <AlertTriangle className="w-4 h-4" />,
      title: "Low-priority focus",
      detail: `${s.priorityBreakdown.low} low-priority tasks completed vs ${s.priorityBreakdown.high} high-priority. Consider reprioritizing.`,
    });
  }

  if (avgMood > 0 && avgMood < 3) {
    negative.push({
      type: "negative", icon: <ThumbsDown className="w-4 h-4" />,
      title: "Low team morale",
      detail: `Average mood was ${MOOD_EMOJIS[Math.round(avgMood) - 1] || "😐"} (${avgMood.toFixed(1)}/5). Consider a team check-in.`,
    });
  }

  if (focusSessions.length < 2 && data.period.days >= 5) {
    negative.push({
      type: "negative", icon: <Clock className="w-4 h-4" />,
      title: "Limited focus time",
      detail: `Only ${focusSessions.length} focus sessions this sprint. Try scheduling dedicated deep work blocks.`,
    });
  }

  // ── Action Items ────────────────────────────────────────────
  if (s.overdueCount > 2) {
    actions.push({
      type: "action", icon: <Lightbulb className="w-4 h-4" />,
      title: "Review overdue tasks",
      detail: "Reassign, re-estimate, or break down the overdue tasks. Set realistic due dates.",
    });
  }

  if (s.completionRate < 50 && s.totalTasks > 5) {
    actions.push({
      type: "action", icon: <Lightbulb className="w-4 h-4" />,
      title: "Reduce next sprint scope",
      detail: `Consider planning ${Math.max(3, Math.round(s.tasksCompleted * 1.2))} tasks for next sprint based on actual velocity.`,
    });
  }

  if (s.commentCount < 5 && data.period.days >= 5) {
    actions.push({
      type: "action", icon: <Lightbulb className="w-4 h-4" />,
      title: "Increase team communication",
      detail: "Schedule daily standups or async check-ins. Use task comments for context sharing.",
    });
  }

  if (s.priorityBreakdown.high === 0 && s.tasksCompleted > 0) {
    actions.push({
      type: "action", icon: <Lightbulb className="w-4 h-4" />,
      title: "Prioritize high-impact work",
      detail: "No high-priority tasks were completed. Review backlog and identify critical items for next sprint.",
    });
  }

  if (data.projects.some((p) => p.todo > p.completed * 2 && p.todo > 5)) {
    actions.push({
      type: "action", icon: <Lightbulb className="w-4 h-4" />,
      title: "Address backlog buildup",
      detail: "Some projects have growing backlogs. Consider a backlog grooming session.",
    });
  }

  actions.push({
    type: "action", icon: <Lightbulb className="w-4 h-4" />,
    title: "Celebrate wins",
    detail: s.tasksCompleted > 0
      ? `The team completed ${s.tasksCompleted} tasks! Acknowledge the effort and share highlights.`
      : "Even small progress counts. Recognize effort and identify what can be improved.",
  });

  // Ensure at least one item in each category
  if (positive.length === 0) {
    positive.push({
      type: "positive", icon: <CheckCircle className="w-4 h-4" />,
      title: "Sprint completed",
      detail: "The team made it through the sprint. Every sprint is a learning opportunity.",
    });
  }
  if (negative.length === 0) {
    negative.push({
      type: "negative", icon: <ThumbsUp className="w-4 h-4" />,
      title: "No major issues",
      detail: "No significant blockers or problems detected this sprint. Keep it up!",
    });
  }

  return { positive, negative, actions };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function InsightCard({ insight, index }: { insight: RetroInsight; index: number }) {
  const colors = {
    positive: "border-green-500/30 bg-green-500/5",
    negative: "border-red-500/30 bg-red-500/5",
    action: "border-amber-500/30 bg-amber-500/5",
  };
  const iconColors = {
    positive: "text-green-500",
    negative: "text-red-500",
    action: "text-amber-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`p-4 rounded-xl border ${colors[insight.type]}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColors[insight.type]}`}>{insight.icon}</div>
        <div>
          <p className="font-medium text-sm">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{insight.detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="p-4 rounded-xl border bg-card/50">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SprintRetro() {
  const [data, setData] = useState<RetroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  // Default to last 7 days
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [fromDate, setFromDate] = useState(weekAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  // Quick presets
  const presets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 14 days", days: 14 },
    { label: "Last 30 days", days: 30 },
  ];

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(from.toISOString().slice(0, 10));
    setToDate(to.toISOString().slice(0, 10));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGenerated(false);
    try {
      const res = await api(`/api/retrospective/data?from=${fromDate}&to=${toDate}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Get mood and focus data from localStorage
  const moodEntries = useMemo(() => {
    const entries = getRecentEntries(60);
    return entries.filter((e) => {
      const d = e.date;
      return d >= fromDate && d <= toDate;
    });
  }, [fromDate, toDate, generated]);

  const focusSessions = useMemo(() => {
    const sessions = getSessions();
    return sessions.filter((s) => {
      const d = new Date(s.startedAt).toISOString().slice(0, 10);
      return d >= fromDate && d <= toDate;
    });
  }, [fromDate, toDate, generated]);

  const insights = useMemo(() => {
    if (!data) return null;
    return generateInsights(data, moodEntries, focusSessions);
  }, [data, moodEntries, focusSessions]);

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              AI Sprint Retrospective
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze your sprint performance and get AI-generated insights
            </p>
          </div>

          {/* Date Range Picker */}
          <div className="rounded-2xl border bg-card/50 backdrop-blur p-5 space-y-4">
            <h3 className="font-semibold text-sm">Sprint Period</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2">
                {presets.map((p) => (
                  <button
                    key={p.days}
                    onClick={() => applyPreset(p.days)}
                    className="px-3 py-2 rounded-lg border text-xs hover:bg-secondary/50 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-shadow disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Retro</>
                )}
              </motion.button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {generated && data && insights && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <StatCard label="Tasks Completed" value={data.summary.tasksCompleted} icon={<CheckCircle className="w-5 h-5" />} color="text-green-500" />
                  <StatCard label="Tasks Created" value={data.summary.tasksCreated} icon={<TrendingUp className="w-5 h-5" />} color="text-blue-500" />
                  <StatCard label="Completion Rate" value={`${data.summary.completionRate}%`} icon={<BarChart3 className="w-5 h-5" />} color="text-purple-500" />
                  <StatCard label="Overdue" value={data.summary.overdueCount} icon={<AlertTriangle className="w-5 h-5" />} color="text-red-500" />
                  <StatCard label="Comments" value={data.summary.commentCount} icon={<MessageSquare className="w-5 h-5" />} color="text-cyan-500" />
                  <StatCard label="Avg/Day" value={data.summary.avgCompletedPerDay} icon={<Flame className="w-5 h-5" />} color="text-orange-500" />
                </div>

                {/* Three Column Retro */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* What Went Well */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-green-500">
                      <ThumbsUp className="w-4 h-4" /> What Went Well
                    </h3>
                    {insights.positive.map((insight, i) => (
                      <InsightCard key={i} insight={insight} index={i} />
                    ))}
                  </div>

                  {/* What Didn't Go Well */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-red-500">
                      <ThumbsDown className="w-4 h-4" /> What Didn't Go Well
                    </h3>
                    {insights.negative.map((insight, i) => (
                      <InsightCard key={i} insight={insight} index={i} />
                    ))}
                  </div>

                  {/* Action Items */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-amber-500">
                      <Lightbulb className="w-4 h-4" /> Action Items
                    </h3>
                    {insights.actions.map((insight, i) => (
                      <InsightCard key={i} insight={insight} index={i} />
                    ))}
                  </div>
                </div>

                {/* Project Breakdown */}
                {data.projects.length > 0 && (
                  <div className="rounded-2xl border bg-card/50 backdrop-blur p-5 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" /> Project Breakdown
                    </h3>
                    <div className="space-y-3">
                      {data.projects.map((proj) => {
                        const pct = proj.totalTasks > 0 ? Math.round((proj.completed / proj.totalTasks) * 100) : 0;
                        return (
                          <div key={proj.id} className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium truncate">{proj.name}</p>
                                <span className="text-xs text-muted-foreground">{proj.completed}/{proj.totalTasks} done</span>
                              </div>
                              <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-mono font-medium w-12 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Completed Tasks List */}
                {data.completedTaskTitles.length > 0 && (
                  <div className="rounded-2xl border bg-card/50 backdrop-blur p-5 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Completed This Sprint
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.completedTaskTitles.map((title, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20"
                        >
                          <ChevronRight className="w-3 h-3 text-green-500 shrink-0" />
                          <span className="truncate">{title}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!generated && !loading && (
            <div className="text-center py-16 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a date range and generate your retro</p>
              <p className="text-sm mt-1">The AI will analyze your tasks, mood, focus sessions, and team activity</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
