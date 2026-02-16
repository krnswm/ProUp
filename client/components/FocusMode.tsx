import { useState, useEffect, useCallback } from "react";
import { Maximize2, Minimize2, X, Brain, Clock, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PomodoroTimer from "@/components/PomodoroTimer";

interface FocusModeTask {
  id: number;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
}

interface FocusModeProps {
  task: FocusModeTask | null;
  onClose: () => void;
  onMarkDone?: (taskId: number) => void;
}

export default function FocusMode({ task, onClose, onMarkDone }: FocusModeProps) {
  const [pomodoroMinimized, setPomodoroMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Keyboard shortcut to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Track elapsed time in focus mode
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Hide scrollbar on body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!task) return null;

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const priorityColor = task.priority === "high" ? "text-red-500" : task.priority === "medium" ? "text-yellow-500" : "text-green-500";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] bg-background flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-purple-500/3" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Focus Mode</span>
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary/50 rounded-full">
              {formatElapsed(elapsed)} elapsed
            </span>
          </div>
          <div className="flex items-center gap-2">
            {task.status !== "done" && onMarkDone && (
              <button
                type="button"
                onClick={() => onMarkDone(task.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Done
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Exit Focus
            </button>
          </div>
        </div>

        {/* Main content — centered task + pomodoro */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-2xl">
            {/* Task info */}
            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {task.priority && (
                <span className={`text-xs font-semibold uppercase tracking-wider ${priorityColor} mb-2 block`}>
                  {task.priority} priority
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 leading-tight">
                {task.title}
              </h1>
              {task.description && (
                <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  {task.description.slice(0, 200)}
                  {task.description.length > 200 ? "..." : ""}
                </p>
              )}
              {task.dueDate && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </motion.div>

            {/* Pomodoro Timer */}
            <motion.div
              className="max-w-sm mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <PomodoroTimer
                taskId={task.id}
                taskTitle={task.title}
                minimized={pomodoroMinimized}
                onToggleMinimize={() => setPomodoroMinimized((v) => !v)}
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="relative z-10 text-center py-3 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px] font-mono mx-0.5">ESC</kbd> to exit focus mode
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Trigger button for use in task cards or drawers
export function FocusModeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
      title="Enter Focus Mode (Ctrl+Shift+F)"
    >
      <Maximize2 className="w-3.5 h-3.5" />
      Focus
    </button>
  );
}
