import { useState, useMemo } from "react";
import { CalendarClock, Sparkles, X, Clock, Flag, Zap, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { isLowEnergyDay } from "@/lib/mood";

interface PlanTask {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  status: string;
  dueDate?: string;
  assignedUser?: string;
}

interface TimeBlock {
  startTime: string;
  endTime: string;
  task: PlanTask;
  duration: number; // minutes
  reason: string;
}

interface AutoPlanDayProps {
  tasks: PlanTask[];
  userName?: string;
}

const TIME_SLOTS = [
  { start: "09:00", label: "Morning Focus" },
  { start: "10:30", label: "Mid-Morning" },
  { start: "11:30", label: "Late Morning" },
  { start: "13:00", label: "After Lunch" },
  { start: "14:30", label: "Afternoon Focus" },
  { start: "16:00", label: "Late Afternoon" },
  { start: "17:00", label: "Wrap Up" },
];

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function getDurationForTask(task: PlanTask, isLowEnergy: boolean): number {
  if (task.priority === "high") return isLowEnergy ? 45 : 60;
  if (task.priority === "medium") return isLowEnergy ? 30 : 45;
  return isLowEnergy ? 20 : 30;
}

function scorePriority(task: PlanTask): number {
  let score = 0;
  if (task.priority === "high") score += 30;
  else if (task.priority === "medium") score += 15;
  else score += 5;

  // Due date urgency
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const now = new Date();
    const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 0) score += 50; // overdue
    else if (daysUntil < 1) score += 40;
    else if (daysUntil < 3) score += 25;
    else if (daysUntil < 7) score += 10;
  }

  return score;
}

export default function AutoPlanDay({ tasks, userName }: AutoPlanDayProps) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<TimeBlock[]>([]);
  const [generated, setGenerated] = useState(false);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => scorePriority(b) - scorePriority(a));
  }, [tasks]);

  const generatePlan = () => {
    const lowEnergy = isLowEnergyDay();
    const blocks: TimeBlock[] = [];
    let slotIdx = 0;

    // If low energy, put easy tasks first, hard tasks in the middle
    let sorted: PlanTask[];
    if (lowEnergy) {
      const easy = pendingTasks.filter((t) => t.priority === "low");
      const medium = pendingTasks.filter((t) => t.priority === "medium");
      const hard = pendingTasks.filter((t) => t.priority === "high");
      sorted = [...easy.slice(0, 1), ...hard, ...medium, ...easy.slice(1)];
    } else {
      // High energy: tackle hardest first
      sorted = [...pendingTasks];
    }

    for (const task of sorted) {
      if (slotIdx >= TIME_SLOTS.length) break;

      const duration = getDurationForTask(task, lowEnergy);
      const slot = TIME_SLOTS[slotIdx];
      const endTime = addMinutes(slot.start, duration);

      let reason = "";
      if (task.priority === "high") reason = "High priority — tackle with fresh energy";
      else if (task.priority === "medium") reason = "Medium priority — steady progress";
      else reason = "Low priority — quick win";

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        const now = new Date();
        const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) reason = "⚠️ Overdue — needs immediate attention";
        else if (daysUntil <= 1) reason = "Due today — urgent";
        else if (daysUntil <= 3) reason = `Due in ${daysUntil} days — don't delay`;
      }

      blocks.push({
        startTime: slot.start,
        endTime,
        task,
        duration,
        reason,
      });

      slotIdx++;
    }

    setPlan(blocks);
    setGenerated(true);
  };

  const getPriorityColor = (p: string) => {
    if (p === "high") return "text-red-500 bg-red-500/10 border-red-500/20";
    if (p === "medium") return "text-yellow-600 bg-yellow-500/10 border-yellow-500/20";
    return "text-green-600 bg-green-500/10 border-green-500/20";
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => { setOpen(true); generatePlan(); }} className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        Auto-Plan
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
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-foreground">Today's Plan</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLowEnergyDay() && (
              <div className="flex items-center gap-2 p-2.5 mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <Zap className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-800 dark:text-amber-300">Low energy detected — plan adjusted with easier tasks first and shorter blocks.</p>
              </div>
            )}

            {plan.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending tasks to schedule!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {plan.map((block, i) => (
                  <motion.div
                    key={block.task.id}
                    className="flex gap-3 p-3 bg-secondary/20 border border-border rounded-xl hover:bg-secondary/40 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    {/* Time column */}
                    <div className="flex flex-col items-center flex-shrink-0 w-14">
                      <span className="text-xs font-bold text-foreground">{block.startTime}</span>
                      <div className="w-px h-3 bg-border my-0.5" />
                      <span className="text-[10px] text-muted-foreground">{block.endTime}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">{block.duration}m</span>
                    </div>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{block.task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getPriorityColor(block.task.priority)}`}>
                          {block.task.priority}
                        </span>
                        {block.task.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(block.task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{block.reason}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                {plan.length} tasks · {plan.reduce((s, b) => s + b.duration, 0)} min total
              </span>
              <Button type="button" variant="outline" size="sm" onClick={generatePlan}>
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
