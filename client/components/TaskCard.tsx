import { Edit2, Trash2, Calendar, History, AlertTriangle, SmilePlus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@/lib/api";

export interface TaskLabel {
  id: number;
  name: string;
  color: string;
  projectId: number;
}

export interface TaskReactionGroup {
  emoji: string;
  count: number;
  userIds: number[];
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignedUser: string;
  dueDate?: string;
  status: "todo" | "inprogress" | "done";
  priority: "low" | "medium" | "high";
  projectId?: number | null;
  position?: number;
  labels?: TaskLabel[];
  reactions?: TaskReactionGroup[];
  coverColor?: string | null;
  createdAt?: string;
}

interface TaskCardProps {
  task: Task;
  onOpen?: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onHistory: (task: Task) => void;
}

const REACTION_EMOJIS = ["👍", "🔥", "🎉", "❤️", "👀", "🚀"];

export default function TaskCard({ task, onOpen, onEdit, onDelete, onHistory }: TaskCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState(task.reactions || []);

  const handleReaction = async (emoji: string) => {
    try {
      const res = await api(`/api/tasks/${task.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        const meId = parseInt(localStorage.getItem("userId") || "0");
        setLocalReactions((prev) => {
          const existing = prev.find((r) => r.emoji === emoji);
          if (data.action === "added") {
            if (existing) {
              return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, userIds: [...r.userIds, meId] } : r);
            }
            return [...prev, { emoji, count: 1, userIds: [meId] }];
          } else {
            if (existing && existing.count <= 1) {
              return prev.filter((r) => r.emoji !== emoji);
            }
            return prev.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== meId) } : r);
          }
        });
      }
    } catch { /* ignore */ }
    setShowEmojiPicker(false);
  };

  const isOverdue = (() => {
    if (task.status === "done" || !task.dueDate) return false;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  })();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-muted text-muted-foreground";
      case "inprogress":
        return "bg-primary/10 text-primary";
      case "done":
        return "bg-green-100 text-green-700";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "inprogress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-100 text-blue-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "high":
        return "bg-red-100 text-red-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <motion.div 
      className={`group relative bg-card/80 backdrop-blur-sm border rounded-xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 select-none overflow-hidden ${isOverdue ? "border-red-400 bg-red-50/30 dark:bg-red-950/10" : "border-border"}`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={() => onOpen?.(task)}
    >
      {/* Cover color strip */}
      {task.coverColor && (
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" style={{ background: task.coverColor }} />
      )}

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        {/* Overdue banner */}
        {isOverdue && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue
          </div>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {task.title}
        </h3>

        {/* Assigned User */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
          <p className="text-sm font-medium text-foreground">{task.assignedUser}</p>
        </div>

        {/* Due Date */}
        <div className="mb-3 flex items-center gap-2">
          <Calendar className={`w-4 h-4 transition-colors ${isOverdue ? "text-red-500" : "text-muted-foreground group-hover:text-primary"}`} />
          <span className={`text-xs ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground"}`}>{task.dueDate || "—"}</span>
        </div>

        {/* Priority Badge */}
        <div className="mb-4">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm ${getPriorityBadgeColor(
              task.priority
            )}`}
          >
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        {/* Status Badge and Actions */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-full shadow-sm ${getStatusBadgeColor(
              task.status
            )}`}
          >
            {getStatusLabel(task.status)}
          </span>
          <div className="flex gap-1">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onHistory(task);
              }}
              className="p-1.5 hover:bg-primary/10 rounded-lg transition-all"
              title="View history"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <History className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1.5 hover:bg-primary/10 rounded-lg transition-all"
              title="Edit task"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
              title="Delete task"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
            </motion.button>
          </div>
        </div>

        {/* Reactions bar */}
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          {localReactions.map((r) => {
            const meId = parseInt(localStorage.getItem("userId") || "0");
            const iMeReacted = r.userIds.includes(meId);
            return (
              <button
                key={r.emoji}
                type="button"
                onClick={(e) => { e.stopPropagation(); handleReaction(r.emoji); }}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  iMeReacted
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            );
          })}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker((v) => !v); }}
              className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Add reaction"
            >
              <SmilePlus className="w-3.5 h-3.5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1.5 bg-card border border-border rounded-lg shadow-lg z-20">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                    className="text-lg hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
