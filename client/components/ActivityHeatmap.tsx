import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Zap, Trophy, CalendarDays } from "lucide-react";

interface ActivityHeatmapProps {
  /** Array of ISO date strings when tasks were completed */
  completionDates: string[];
}

const CELL = 14;
const GAP = 3;

export default function ActivityHeatmap({ completionDates }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; count: number; x: number; y: number } | null>(null);

  const { weeks, months, maxCount, totalCompletions, currentStreak, longestStreak, todayCount } = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const d of completionDates) {
      const key = d.slice(0, 10);
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const numWeeks = 20;

    const start = new Date(today);
    start.setDate(start.getDate() - numWeeks * 7 + 1);
    start.setDate(start.getDate() - start.getDay());

    const weeks: { date: Date; count: number; dateStr: string; future: boolean }[][] = [];
    let currentWeek: typeof weeks[0] = [];
    let max = 0;
    let total = 0;

    const cursor = new Date(start);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const isFuture = cursor > today;
      const count = isFuture ? 0 : (countMap.get(dateStr) || 0);
      if (count > max) max = count;
      if (!isFuture) total += count;

      currentWeek.push({ date: new Date(cursor), count, dateStr, future: isFuture });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Streaks
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

    // Month labels positioned by week index
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      const m = week[0]?.date.getMonth();
      if (m !== undefined && m !== lastMonth) {
        months.push({ label: week[0].date.toLocaleDateString(undefined, { month: "short" }), weekIndex: idx });
        lastMonth = m;
      }
    });

    const todayStr = today.toISOString().slice(0, 10);
    const todayCount = countMap.get(todayStr) || 0;

    return { weeks, months, maxCount: max, totalCompletions: total, currentStreak: currentStreakVal, longestStreak: longestStreakVal, todayCount };
  }, [completionDates]);

  const getColor = (count: number, future: boolean) => {
    if (future) return "rgba(128,128,128,0.06)";
    if (count === 0) return "var(--heatmap-empty, rgba(128,128,128,0.12))";
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio <= 0.25) return "#86efac";
    if (ratio <= 0.5) return "#4ade80";
    if (ratio <= 0.75) return "#22c55e";
    return "#16a34a";
  };

  const getDarkColor = (count: number, future: boolean) => {
    if (future) return "rgba(128,128,128,0.04)";
    if (count === 0) return "rgba(255,255,255,0.06)";
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio <= 0.25) return "#14532d";
    if (ratio <= 0.5) return "#166534";
    if (ratio <= 0.75) return "#15803d";
    return "#22c55e";
  };

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const showDayLabels = [1, 3, 5]; // Mon, Wed, Fri

  const gridWidth = weeks.length * (CELL + GAP) - GAP;
  const gridHeight = 7 * (CELL + GAP) - GAP;
  const labelWidth = 28;
  const svgWidth = labelWidth + gridWidth;
  const monthBarHeight = 18;
  const svgHeight = monthBarHeight + gridHeight;

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
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CalendarDays className="w-4.5 h-4.5 text-green-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">Activity</h3>
              <p className="text-[11px] text-muted-foreground">Task completions over the last 20 weeks</p>
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">{totalCompletions}</span>
            <span className="text-[11px] text-muted-foreground">total</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{currentStreak}</span>
            <span className="text-[11px] text-muted-foreground">day streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <Trophy className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{longestStreak}</span>
            <span className="text-[11px] text-muted-foreground">best</span>
          </div>
          {todayCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{todayCount}</span>
              <span className="text-[11px] text-muted-foreground">today</span>
            </div>
          )}
        </div>

        {/* SVG Heatmap */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="relative" style={{ minWidth: svgWidth + 8 }}>
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="block"
            >
              {/* Month labels */}
              {months.map((m, i) => (
                <text
                  key={i}
                  x={labelWidth + m.weekIndex * (CELL + GAP)}
                  y={12}
                  className="fill-muted-foreground"
                  fontSize={10}
                  fontWeight={500}
                >
                  {m.label}
                </text>
              ))}

              {/* Day labels */}
              {showDayLabels.map((dayIdx) => (
                <text
                  key={dayIdx}
                  x={labelWidth - 5}
                  y={monthBarHeight + dayIdx * (CELL + GAP) + CELL - 2}
                  className="fill-muted-foreground"
                  fontSize={9}
                  textAnchor="end"
                  fontWeight={400}
                >
                  {dayLabels[dayIdx]}
                </text>
              ))}

              {/* Grid cells */}
              {weeks.map((week, weekIdx) =>
                week.map((day, dayIdx) => {
                  const x = labelWidth + weekIdx * (CELL + GAP);
                  const y = monthBarHeight + dayIdx * (CELL + GAP);
                  const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
                  const color = isDark ? getDarkColor(day.count, day.future) : getColor(day.count, day.future);

                  return (
                    <g key={`${weekIdx}-${dayIdx}`}>
                      <rect
                        x={x}
                        y={y}
                        width={CELL}
                        height={CELL}
                        rx={3}
                        ry={3}
                        fill={color}
                        stroke={isToday ? (isDark ? "#22c55e" : "#16a34a") : "transparent"}
                        strokeWidth={isToday ? 1.5 : 0}
                        className="transition-all duration-150"
                        style={{ cursor: day.future ? "default" : "pointer" }}
                        onMouseEnter={(e) => {
                          if (day.future) return;
                          const rect = (e.target as SVGRectElement).getBoundingClientRect();
                          setHoveredDay({ dateStr: day.dateStr, count: day.count, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    </g>
                  );
                })
              )}
            </svg>

            {/* Tooltip */}
            {hoveredDay && (
              <div
                className="fixed z-50 pointer-events-none px-2.5 py-1.5 bg-popover border border-border rounded-lg shadow-xl text-xs"
                style={{ left: hoveredDay.x, top: hoveredDay.y - 40, transform: "translateX(-50%)" }}
              >
                <span className="font-semibold text-foreground">{hoveredDay.count}</span>
                <span className="text-muted-foreground"> completion{hoveredDay.count !== 1 ? "s" : ""} on </span>
                <span className="font-medium text-foreground">
                  {new Date(hoveredDay.dateStr + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end mt-3 gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-0.5">Less</span>
          {[
            isDark ? "rgba(255,255,255,0.06)" : "rgba(128,128,128,0.12)",
            isDark ? "#14532d" : "#86efac",
            isDark ? "#166534" : "#4ade80",
            isDark ? "#15803d" : "#22c55e",
            isDark ? "#22c55e" : "#16a34a",
          ].map((color, i) => (
            <div
              key={i}
              className="rounded-[3px]"
              style={{ width: CELL, height: CELL, backgroundColor: color }}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-0.5">More</span>
        </div>
      </div>
    </motion.div>
  );
}
