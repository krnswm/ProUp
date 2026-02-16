import { useState, useEffect, useMemo } from "react";
import { BarChart3, CheckCircle, Clock, Flame, Heart, Trophy, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { api } from "@/lib/api";
import { getSessions, type PomodoroSession } from "@/lib/pomodoro";
import { getRecentEntries, MOOD_EMOJIS, ENERGY_LEVELS, type MoodEntry } from "@/lib/mood";

interface WeeklyStats {
  tasksCompleted: number;
  tasksCreated: number;
  focusMinutes: number;
  focusSessions: number;
  avgMood: number;
  avgEnergy: number;
  moodEntries: MoodEntry[];
  pomodoroSessions: PomodoroSession[];
  topDay: string;
  topDayCount: number;
  productivityScore: number;
}

export default function WeeklyRecap() {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api("/api/tasks/my");
        if (res.ok) {
          const data = await res.json();
          setAllTasks(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchTasks();
  }, []);

  const stats: WeeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    // Tasks completed this week
    const completedThisWeek = allTasks.filter((t) => {
      if (t.status !== "done") return false;
      const updated = t.updatedAt?.slice(0, 10);
      return updated && updated >= weekAgoStr;
    });

    // Tasks created this week
    const createdThisWeek = allTasks.filter((t) => {
      const created = t.createdAt?.slice(0, 10);
      return created && created >= weekAgoStr;
    });

    // Pomodoro sessions this week
    const allSessions = getSessions();
    const weekSessions = allSessions.filter((s) => s.startedAt.slice(0, 10) >= weekAgoStr && s.type === "focus");
    const focusMinutes = Math.round(weekSessions.reduce((sum, s) => sum + s.duration, 0) / 60);

    // Mood entries this week
    const moodEntries = getRecentEntries(7);
    const avgMood = moodEntries.length > 0 ? moodEntries.reduce((s, e) => s + e.mood, 0) / moodEntries.length : 0;
    const avgEnergy = moodEntries.length > 0 ? moodEntries.reduce((s, e) => s + e.energy, 0) / moodEntries.length : 0;

    // Top day (most completions)
    const dayMap = new Map<string, number>();
    for (const t of completedThisWeek) {
      const day = t.updatedAt?.slice(0, 10) || "";
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    let topDay = "";
    let topDayCount = 0;
    for (const [day, count] of dayMap) {
      if (count > topDayCount) { topDay = day; topDayCount = count; }
    }

    // Productivity score (0-100)
    const taskScore = Math.min(completedThisWeek.length * 10, 40);
    const focusScore = Math.min(focusMinutes / 3, 30);
    const moodScore = avgMood > 0 ? (avgMood / 5) * 15 : 0;
    const consistencyScore = moodEntries.length >= 5 ? 15 : (moodEntries.length / 5) * 15;
    const productivityScore = Math.round(Math.min(taskScore + focusScore + moodScore + consistencyScore, 100));

    return {
      tasksCompleted: completedThisWeek.length,
      tasksCreated: createdThisWeek.length,
      focusMinutes,
      focusSessions: weekSessions.length,
      avgMood,
      avgEnergy,
      moodEntries,
      pomodoroSessions: weekSessions,
      topDay,
      topDayCount,
      productivityScore,
    };
  }, [allTasks]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-blue-500 to-cyan-500";
    if (score >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Outstanding!";
    if (score >= 60) return "Great work!";
    if (score >= 40) return "Good progress";
    if (score >= 20) return "Keep going";
    return "Getting started";
  };

  // Daily breakdown for the bar chart
  const dailyBreakdown = useMemo(() => {
    const days: { label: string; date: string; completed: number; focus: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });

      const completed = allTasks.filter((t) => t.status === "done" && t.updatedAt?.slice(0, 10) === dateStr).length;
      const focusSecs = getSessions()
        .filter((s) => s.startedAt.slice(0, 10) === dateStr && s.type === "focus")
        .reduce((sum, s) => sum + s.duration, 0);

      days.push({ label, date: dateStr, completed, focus: Math.round(focusSecs / 60) });
    }
    return days;
  }, [allTasks]);

  const maxCompleted = Math.max(...dailyBreakdown.map((d) => d.completed), 1);
  const maxFocus = Math.max(...dailyBreakdown.map((d) => d.focus), 1);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/20 dark:via-purple-950/10 to-blue-50/20 dark:to-blue-950/10">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
              />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                Weekly Recap
              </h1>
            </div>
            <p className="text-muted-foreground">Your productivity summary for the past 7 days</p>
          </motion.div>

          {/* Productivity Score */}
          <motion.div
            className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 mb-6 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
              {/* Score circle */}
              <div className="relative">
                <svg className="w-36 h-36" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - stats.productivityScore / 100) }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className="text-4xl font-bold text-foreground"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                  >
                    {stats.productivityScore}
                  </motion.span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className={`text-2xl font-bold bg-gradient-to-r ${getScoreColor(stats.productivityScore)} bg-clip-text text-transparent mb-1`}>
                  {getScoreLabel(stats.productivityScore)}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">Productivity Score</p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">{stats.tasksCompleted}</span>
                    <span className="text-muted-foreground">completed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold">{stats.focusMinutes}</span>
                    <span className="text-muted-foreground">min focused</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold">{stats.focusSessions}</span>
                    <span className="text-muted-foreground">sessions</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Tasks Completed", value: stats.tasksCompleted, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Tasks Created", value: stats.tasksCreated, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
              { label: "Focus Time", value: `${stats.focusMinutes}m`, icon: Clock, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
              { label: "Best Day", value: stats.topDayCount > 0 ? `${stats.topDayCount} tasks` : "—", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  className={`${card.bg} border border-border rounded-xl p-4 text-center`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <Icon className={`w-5 h-5 ${card.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Daily breakdown chart */}
          <motion.div
            className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Daily Breakdown
            </h3>
            <div className="flex items-end gap-3 h-40">
              {dailyBreakdown.map((day, i) => {
                const isToday = day.date === new Date().toISOString().slice(0, 10);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5 flex-1 justify-end">
                      {/* Focus bar */}
                      <motion.div
                        className="w-full max-w-[28px] bg-purple-400/60 dark:bg-purple-500/40 rounded-t-sm"
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.focus / maxFocus) * 60}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                        title={`${day.focus} min focus`}
                      />
                      {/* Completed bar */}
                      <motion.div
                        className="w-full max-w-[28px] bg-green-500 dark:bg-green-400 rounded-t-sm"
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.completed / maxCompleted) * 60}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                        title={`${day.completed} completed`}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{day.completed}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-500" /> Tasks completed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-purple-400/60" /> Focus time</span>
            </div>
          </motion.div>

          {/* Mood trend */}
          {stats.moodEntries.length > 0 && (
            <motion.div
              className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Mood & Energy This Week
              </h3>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <span className="text-3xl">{MOOD_EMOJIS[Math.round(stats.avgMood) - 1]?.emoji || "😐"}</span>
                  <p className="text-xs text-muted-foreground mt-1">Avg Mood: {stats.avgMood.toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto"
                    style={{ backgroundColor: ENERGY_LEVELS[Math.round(stats.avgEnergy) - 1]?.color || "#888" }}
                  >
                    {stats.avgEnergy.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg Energy</p>
                </div>
              </div>
              <div className="flex items-end gap-1 h-16">
                {stats.moodEntries.map((entry, i) => {
                  const moodHeight = (entry.mood / 5) * 100;
                  const energyColor = ENERGY_LEVELS[entry.energy - 1]?.color || "#888";
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{ height: `${moodHeight}%`, backgroundColor: energyColor }}
                      title={`${entry.date}: ${MOOD_EMOJIS[entry.mood - 1]?.label} mood, ${ENERGY_LEVELS[entry.energy - 1]?.label} energy`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>{stats.moodEntries[0]?.date.slice(5)}</span>
                <span>{stats.moodEntries[stats.moodEntries.length - 1]?.date.slice(5)}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
