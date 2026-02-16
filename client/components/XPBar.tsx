import { useState, useEffect } from "react";
import { Star, Zap, TrendingUp, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getXPState, getXPToday, getRecentEvents, type XPState, type XPEvent } from "@/lib/xp";

export default function XPBar() {
  const [state, setState] = useState<XPState>(getXPState);
  const [todayXP, setTodayXP] = useState(getXPToday);
  const [showDetails, setShowDetails] = useState(false);
  const [recentEvents, setRecentEvents] = useState<XPEvent[]>([]);

  // Poll for XP changes every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setState(getXPState());
      setTodayXP(getXPToday());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showDetails) {
      setRecentEvents(getRecentEvents(15));
    }
  }, [showDetails]);

  const progress = state.xpToNextLevel > 0 ? (state.xpInCurrentLevel / state.xpToNextLevel) * 100 : 100;

  const getLevelColor = (level: number) => {
    if (level >= 10) return "from-amber-400 to-yellow-500";
    if (level >= 7) return "from-purple-500 to-pink-500";
    if (level >= 4) return "from-blue-500 to-cyan-500";
    return "from-green-500 to-emerald-500";
  };

  const getLevelBg = (level: number) => {
    if (level >= 10) return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    if (level >= 7) return "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400";
    if (level >= 4) return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
    return "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400";
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border transition-all group"
      >
        {/* Level badge */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${getLevelBg(state.level)}`}>
          <Star className="w-3 h-3" />
          {state.level}
        </div>

        {/* XP bar */}
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${getLevelColor(state.level)}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* XP text */}
        <span className="text-[10px] text-muted-foreground font-medium">
          {state.xpInCurrentLevel}/{state.xpToNextLevel}
        </span>

        <ChevronUp className={`w-3 h-3 text-muted-foreground transition-transform ${showDetails ? "" : "rotate-180"}`} />
      </button>

      {/* Details dropdown */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500" />
            <div className="p-4">
              {/* Level info */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold border ${getLevelBg(state.level)}`}>
                  {state.level}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{state.title}</p>
                  <p className="text-xs text-muted-foreground">{state.totalXP} total XP</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Level {state.level}</span>
                  <span>Level {state.level + 1}</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${getLevelColor(state.level)}`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  {state.xpToNextLevel - state.xpInCurrentLevel} XP to next level
                </p>
              </div>

              {/* Today stats */}
              <div className="flex items-center gap-2 mb-3 p-2 bg-secondary/30 rounded-lg">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-foreground">{todayXP} XP earned today</span>
              </div>

              {/* Recent events */}
              {recentEvents.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Recent</p>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {recentEvents.slice().reverse().map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-muted-foreground truncate">{e.type.replace(/_/g, " ").toLowerCase()}</span>
                        <span className="text-green-500 font-semibold flex-shrink-0">+{e.xp} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
