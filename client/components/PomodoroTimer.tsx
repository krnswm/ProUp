import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Settings, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  addSession,
  getSettings,
  saveSettings,
  getTotalFocusMinutes,
  DEFAULT_SETTINGS,
  type PomodoroSettings,
} from "@/lib/pomodoro";

interface PomodoroTimerProps {
  taskId: number;
  taskTitle: string;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

type TimerPhase = "focus" | "shortBreak" | "longBreak";

export default function PomodoroTimer({ taskId, taskTitle, minimized, onToggleMinimize }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(getSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalFocus, setTotalFocus] = useState(() => getTotalFocusMinutes(taskId));

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phaseDuration = useCallback(
    (p: TimerPhase) => {
      switch (p) {
        case "focus":
          return settings.focusMinutes * 60;
        case "shortBreak":
          return settings.shortBreakMinutes * 60;
        case "longBreak":
          return settings.longBreakMinutes * 60;
      }
    },
    [settings]
  );

  // Tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Phase complete
  useEffect(() => {
    if (secondsLeft > 0 || isRunning === false) return;

    setIsRunning(false);

    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : phaseDuration(phase);

    // Log session
    addSession({
      taskId,
      taskTitle,
      startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
      duration: elapsed,
      type: phase === "focus" ? "focus" : "break",
    });

    if (phase === "focus") {
      setTotalFocus(getTotalFocusMinutes(taskId));
    }

    // Browser notification
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const msg = phase === "focus" ? "Focus session complete! Time for a break." : "Break over! Ready to focus?";
      new Notification("Pomodoro", { body: msg, icon: "/favicon.ico" });
    }

    // Play sound
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = phase === "focus" ? 880 : 660;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }

    // Advance phase
    if (phase === "focus") {
      const next = sessionCount + 1;
      setSessionCount(next);
      if (next % settings.sessionsBeforeLongBreak === 0) {
        setPhase("longBreak");
        setSecondsLeft(settings.longBreakMinutes * 60);
      } else {
        setPhase("shortBreak");
        setSecondsLeft(settings.shortBreakMinutes * 60);
      }
    } else {
      setPhase("focus");
      setSecondsLeft(settings.focusMinutes * 60);
    }

    startTimeRef.current = null;
  }, [secondsLeft, isRunning, phase, sessionCount, settings, taskId, taskTitle, phaseDuration]);

  const toggleRunning = () => {
    if (!isRunning) {
      // Request notification permission
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
      startTimeRef.current = Date.now();
    }
    setIsRunning((r) => !r);
  };

  const reset = () => {
    setIsRunning(false);
    startTimeRef.current = null;
    setPhase("focus");
    setSecondsLeft(settings.focusMinutes * 60);
    setSessionCount(0);
  };

  const applySettings = (s: PomodoroSettings) => {
    setSettings(s);
    saveSettings(s);
    if (!isRunning) {
      setSecondsLeft(s.focusMinutes * 60);
      setPhase("focus");
    }
    setShowSettings(false);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / phaseDuration(phase);

  const phaseColor = phase === "focus" ? "text-primary" : phase === "shortBreak" ? "text-green-500" : "text-purple-500";
  const phaseBg = phase === "focus" ? "from-primary/10 to-blue-500/5" : phase === "shortBreak" ? "from-green-500/10 to-emerald-500/5" : "from-purple-500/10 to-pink-500/5";
  const phaseLabel = phase === "focus" ? "Focus" : phase === "shortBreak" ? "Short Break" : "Long Break";
  const PhaseIcon = phase === "focus" ? Brain : Coffee;

  if (minimized) {
    return (
      <motion.button
        onClick={onToggleMinimize}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border border-border bg-card/95 backdrop-blur-sm hover:shadow-xl transition-shadow ${isRunning ? "animate-pulse" : ""}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <PhaseIcon className={`w-4 h-4 ${phaseColor}`} />
        <span className={`text-sm font-bold tabular-nums ${phaseColor}`}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        {isRunning && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </motion.button>
    );
  }

  return (
    <motion.div
      className={`relative bg-gradient-to-br ${phaseBg} border border-border rounded-xl p-5 overflow-hidden`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${phaseColor}`} />
          <span className="text-sm font-semibold text-foreground">Pomodoro Timer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="mb-4 p-3 bg-card border border-border rounded-lg space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-semibold text-foreground mb-2">Timer Settings</p>
            {[
              { label: "Focus (min)", key: "focusMinutes" as const, min: 1, max: 90 },
              { label: "Short break (min)", key: "shortBreakMinutes" as const, min: 1, max: 30 },
              { label: "Long break (min)", key: "longBreakMinutes" as const, min: 1, max: 60 },
              { label: "Sessions before long break", key: "sessionsBeforeLongBreak" as const, min: 2, max: 10 },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <input
                  type="number"
                  min={item.min}
                  max={item.max}
                  value={settings[item.key]}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!Number.isNaN(v) && v >= item.min && v <= item.max) {
                      applySettings({ ...settings, [item.key]: v });
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs text-center border border-border rounded bg-input text-foreground"
                />
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => applySettings(DEFAULT_SETTINGS)} className="w-full mt-1">
              Reset to defaults
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <PhaseIcon className={`w-5 h-5 ${phaseColor}`} />
        <span className={`text-sm font-bold ${phaseColor}`}>{phaseLabel}</span>
        <span className="text-xs text-muted-foreground">#{sessionCount + 1}</span>
      </div>

      {/* Timer display */}
      <div className="relative flex items-center justify-center mb-4">
        {/* Circular progress */}
        <svg className="w-32 h-32" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            className={phaseColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${phaseColor}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <Button type="button" size="sm" variant="outline" onClick={reset} disabled={!isRunning && secondsLeft === phaseDuration(phase)}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button type="button" size="sm" onClick={toggleRunning} className="px-6">
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      {/* Stats */}
      <div className="text-center text-xs text-muted-foreground">
        Total focus on this task: <span className="font-semibold text-foreground">{Math.round(totalFocus)} min</span>
      </div>
    </motion.div>
  );
}
