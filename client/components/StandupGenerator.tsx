import { useState, useEffect, useMemo } from "react";
import { ClipboardCopy, MessageSquareText, X, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface StandupTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
  dueDate?: string;
}

interface StandupGeneratorProps {
  projectId: number;
  projectName: string;
}

export default function StandupGenerator({ projectId, projectName }: StandupGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<StandupTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const res = await api(`/api/projects/${projectId}/board`);
        if (res.ok) {
          const data = await res.json();
          const allTasks: StandupTask[] = (data.tasks || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            updatedAt: t.updatedAt,
            dueDate: t.dueDate,
          }));
          setTasks(allTasks);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchTasks();
  }, [open, projectId]);

  const standup = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // What I did yesterday: tasks completed or updated yesterday
    const doneYesterday = tasks.filter((t) => {
      const updated = t.updatedAt?.slice(0, 10);
      return t.status === "done" && updated === yesterdayStr;
    });

    const workedYesterday = tasks.filter((t) => {
      const updated = t.updatedAt?.slice(0, 10);
      return t.status === "inprogress" && updated === yesterdayStr;
    });

    // What I'm doing today: in-progress tasks or high priority todos
    const inProgress = tasks.filter((t) => t.status === "inprogress");
    const urgentTodo = tasks.filter((t) => {
      if (t.status !== "todo") return false;
      if (t.priority === "high") return true;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil <= 2;
      }
      return false;
    });

    // Blockers: overdue tasks
    const overdue = tasks.filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    // Build sections
    const yesterdayItems = [
      ...doneYesterday.map((t) => `- Completed: ${t.title}`),
      ...workedYesterday.map((t) => `- Worked on: ${t.title}`),
    ];
    if (yesterdayItems.length === 0) yesterdayItems.push("- No tracked activity");

    const todayItems = [
      ...inProgress.map((t) => `- Continue: ${t.title}`),
      ...urgentTodo.map((t) => `- Start: ${t.title} (${t.priority} priority)`),
    ];
    if (todayItems.length === 0) todayItems.push("- No tasks planned");

    const blockerItems = overdue.map((t) => `- ⚠️ ${t.title} (overdue since ${new Date(t.dueDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })})`);
    if (blockerItems.length === 0) blockerItems.push("- No blockers");

    const text = `📋 Daily Standup — ${projectName}
📅 ${now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

✅ What I did yesterday:
${yesterdayItems.join("\n")}

🎯 What I'm doing today:
${todayItems.join("\n")}

🚧 Blockers:
${blockerItems.join("\n")}`;

    return {
      text,
      doneYesterday: doneYesterday.length + workedYesterday.length,
      todayPlanned: inProgress.length + urgentTodo.length,
      blockers: overdue.length,
    };
  }, [tasks, projectName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(standup.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="flex items-center gap-2">
        <MessageSquareText className="w-4 h-4 text-teal-500" />
        Standup
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
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500" />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-teal-500" />
                <h2 className="text-lg font-bold text-foreground">Daily Standup</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary pills */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-lg">
                {standup.doneYesterday} done yesterday
              </span>
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg">
                {standup.todayPlanned} planned today
              </span>
              {standup.blockers > 0 && (
                <span className="text-xs px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg">
                  {standup.blockers} blocker{standup.blockers !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Standup text */}
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Generating standup...</div>
            ) : (
              <pre className="text-xs text-foreground bg-secondary/30 border border-border rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-[350px] overflow-auto">
                {standup.text}
              </pre>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">Auto-generated from task activity</p>
              <Button type="button" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <ClipboardCopy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
