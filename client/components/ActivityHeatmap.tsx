import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface ActivityHeatmapProps {
  /** Array of ISO date strings when tasks were completed */
  completionDates: string[];
}

export default function ActivityHeatmap({ completionDates }: ActivityHeatmapProps) {
  const { weeks, months, maxCount, totalCompletions, currentStreak, longestStreak } = useMemo(() => {
    // Build a map of date -> count
    const countMap = new Map<string, number>();
    for (const d of completionDates) {
      const key = d.slice(0, 10); // YYYY-MM-DD
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    // Generate last 20 weeks (140 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const numWeeks = 20;
    const totalDays = numWeeks * 7;

    // Find the start: go back totalDays from today, then align to Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - totalDays + 1);
    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const weeks: { date: Date; count: number; dateStr: string }[][] = [];
    let currentWeek: { date: Date; count: number; dateStr: string }[] = [];
    let max = 0;
    let total = 0;

    const cursor = new Date(start);
    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const count = countMap.get(dateStr) || 0;
      if (count > max) max = count;
      total += count;

      currentWeek.push({ date: new Date(cursor), count, dateStr });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Calculate streaks
    let currentStreakVal = 0;
    let longestStreakVal = 0;
    let tempStreak = 0;
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = checkDate.toISOString().slice(0, 10);
      if (countMap.has(key) && countMap.get(key)! > 0) {
        tempStreak++;
        if (i === 0 || currentStreakVal > 0) currentStreakVal = tempStreak;
      } else {
        if (i === 0) currentStreakVal = 0;
        if (tempStreak > longestStreakVal) longestStreakVal = tempStreak;
        tempStreak = 0;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    if (tempStreak > longestStreakVal) longestStreakVal = tempStreak;

    // Month labels
    const monthSet = new Map<number, string>();
    for (const week of weeks) {
      const first = week[0];
      if (first) {
        const m = first.date.getMonth();
        const weekIdx = weeks.indexOf(week);
        if (!monthSet.has(m)) {
          monthSet.set(m, first.date.toLocaleDateString(undefined, { month: "short" }));
        }
      }
    }

    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      const m = week[0]?.date.getMonth();
      if (m !== undefined && m !== lastMonth) {
        months.push({ label: week[0].date.toLocaleDateString(undefined, { month: "short" }), weekIndex: idx });
        lastMonth = m;
      }
    });

    return { weeks, months, maxCount: max, totalCompletions: total, currentStreak: currentStreakVal, longestStreak: longestStreakVal };
  }, [completionDates]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-secondary/60 dark:bg-secondary/40";
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio <= 0.25) return "bg-green-200 dark:bg-green-900/60";
    if (ratio <= 0.5) return "bg-green-400 dark:bg-green-700/80";
    if (ratio <= 0.75) return "bg-green-500 dark:bg-green-600";
    return "bg-green-600 dark:bg-green-500";
  };

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <motion.div
      className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-6 shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-foreground">Activity</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">{totalCompletions}</span> completions</span>
            <span><span className="font-semibold text-orange-500">{currentStreak}</span> day streak</span>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-0.5 min-w-0">
            {/* Month labels */}
            <div className="flex gap-0.5 ml-8 mb-1">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground"
                  style={{ marginLeft: i === 0 ? `${m.weekIndex * 13}px` : undefined, width: "auto", whiteSpace: "nowrap" }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Grid rows (7 days) */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-0.5">
                <span className="w-7 text-[10px] text-muted-foreground text-right pr-1">{dayLabels[dayIdx]}</span>
                {weeks.map((week, weekIdx) => {
                  const day = week[dayIdx];
                  if (!day) return <div key={weekIdx} className="w-[11px] h-[11px]" />;
                  const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={weekIdx}
                      className={`w-[11px] h-[11px] rounded-sm ${getColor(day.count)} ${isToday ? "ring-1 ring-primary" : ""} transition-colors`}
                      title={`${day.dateStr}: ${day.count} task${day.count !== 1 ? "s" : ""} completed`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Longest streak: <span className="font-semibold text-foreground">{longestStreak} days</span></span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="w-[11px] h-[11px] rounded-sm bg-secondary/60 dark:bg-secondary/40" />
            <div className="w-[11px] h-[11px] rounded-sm bg-green-200 dark:bg-green-900/60" />
            <div className="w-[11px] h-[11px] rounded-sm bg-green-400 dark:bg-green-700/80" />
            <div className="w-[11px] h-[11px] rounded-sm bg-green-500 dark:bg-green-600" />
            <div className="w-[11px] h-[11px] rounded-sm bg-green-600 dark:bg-green-500" />
            <span>More</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
