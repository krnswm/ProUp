import { useState, useEffect } from "react";
import { Heart, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import {
  MOOD_EMOJIS,
  ENERGY_LEVELS,
  getTodayEntry,
  saveEntry,
  getRecentEntries,
  getAverageMood,
  getAverageEnergy,
  type MoodEntry,
} from "@/lib/mood";

export default function MoodCheckin() {
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [selectedMood, setSelectedMood] = useState(3);
  const [selectedEnergy, setSelectedEnergy] = useState(3);
  const [saved, setSaved] = useState(false);
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);

  useEffect(() => {
    const entry = getTodayEntry();
    if (entry) {
      setTodayEntry(entry);
      setSelectedMood(entry.mood);
      setSelectedEnergy(entry.energy);
      setSaved(true);
    }
    setRecentEntries(getRecentEntries(14));
  }, []);

  const handleSave = () => {
    const emoji = MOOD_EMOJIS.find((m) => m.value === selectedMood)?.emoji || "😐";
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      mood: selectedMood,
      energy: selectedEnergy,
      emoji,
    };
    saveEntry(entry);
    setTodayEntry(entry);
    setSaved(true);
    setRecentEntries(getRecentEntries(14));
  };

  const avgMood = getAverageMood(7);
  const avgEnergy = getAverageEnergy(7);

  const moodTrend = (() => {
    if (recentEntries.length < 3) return "neutral";
    const recent3 = recentEntries.slice(-3);
    const older3 = recentEntries.slice(-6, -3);
    if (older3.length === 0) return "neutral";
    const recentAvg = recent3.reduce((s, e) => s + e.mood, 0) / recent3.length;
    const olderAvg = older3.reduce((s, e) => s + e.mood, 0) / older3.length;
    if (recentAvg > olderAvg + 0.3) return "up";
    if (recentAvg < olderAvg - 0.3) return "down";
    return "neutral";
  })();

  const TrendIcon = moodTrend === "up" ? TrendingUp : moodTrend === "down" ? TrendingDown : Minus;
  const trendColor = moodTrend === "up" ? "text-green-500" : moodTrend === "down" ? "text-red-500" : "text-muted-foreground";

  const suggestion = (() => {
    if (!todayEntry) return null;
    if (todayEntry.energy <= 2) return "Low energy today — consider tackling smaller, easier tasks first.";
    if (todayEntry.energy >= 4 && todayEntry.mood >= 4) return "Great energy! Perfect time to tackle challenging tasks.";
    if (todayEntry.mood <= 2) return "Tough day — be kind to yourself. Focus on what matters most.";
    return null;
  })();

  return (
    <motion.div
      className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-6 shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h3 className="text-lg font-bold text-foreground">Daily Check-in</h3>
          </div>
          {saved && todayEntry && (
            <span className="text-2xl">{todayEntry.emoji}</span>
          )}
        </div>

        {/* Mood selector */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">How are you feeling?</p>
          <div className="flex items-center justify-between gap-1">
            {MOOD_EMOJIS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => { setSelectedMood(m.value); setSaved(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  selectedMood === m.value
                    ? "bg-primary/10 border-2 border-primary scale-110"
                    : "border-2 border-transparent hover:bg-secondary"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Energy selector */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-medium text-muted-foreground">Energy level</p>
          </div>
          <div className="flex items-center gap-1.5">
            {ENERGY_LEVELS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => { setSelectedEnergy(e.value); setSaved(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-2 ${
                  selectedEnergy === e.value
                    ? "text-white scale-105 shadow-md"
                    : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
                }`}
                style={selectedEnergy === e.value ? { backgroundColor: e.color, borderColor: e.color } : undefined}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        {!saved && (
          <motion.button
            type="button"
            onClick={handleSave}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity mb-4"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Save Check-in
          </motion.button>
        )}

        {/* Suggestion */}
        {suggestion && (
          <motion.div
            className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-amber-800 dark:text-amber-300">💡 {suggestion}</p>
          </motion.div>
        )}

        {/* Trend mini-chart */}
        {recentEntries.length > 1 && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Last 14 days</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Trend</span>
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              </div>
            </div>

            {/* Mini bar chart */}
            <div className="flex items-end gap-0.5 h-12">
              {recentEntries.map((e, i) => {
                const moodHeight = (e.mood / 5) * 100;
                const moodEmoji = MOOD_EMOJIS.find((m) => m.value === e.mood);
                const energyColor = ENERGY_LEVELS.find((l) => l.value === e.energy)?.color || "#888";
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                    style={{ height: `${moodHeight}%`, backgroundColor: energyColor }}
                    title={`${e.date}: ${moodEmoji?.label || ""} mood, ${ENERGY_LEVELS.find((l) => l.value === e.energy)?.label || ""} energy`}
                  />
                );
              })}
            </div>

            {/* Averages */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Avg mood: <span className="font-semibold text-foreground">{avgMood.toFixed(1)}/5</span></span>
              <span>Avg energy: <span className="font-semibold text-foreground">{avgEnergy.toFixed(1)}/5</span></span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
