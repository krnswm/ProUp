import { Edit2, Trash2, Calendar, History } from "lucide-react";
import { motion } from "framer-motion";

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignedUser: string;
  dueDate: string;
  status: "todo" | "inprogress" | "done";
  priority: "low" | "medium" | "high";
  projectId?: number | null;
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onHistory: (task: Task) => void;
}

export default function TaskCard({ task, onEdit, onDelete, onHistory }: TaskCardProps) {
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
      className="group relative bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 select-none overflow-hidden"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
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
          <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-xs text-muted-foreground">{task.dueDate}</span>
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
              onClick={() => onHistory(task)}
              className="p-1.5 hover:bg-primary/10 rounded-lg transition-all"
              title="View history"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <History className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </motion.button>
            <motion.button
              onClick={() => onEdit(task)}
              className="p-1.5 hover:bg-primary/10 rounded-lg transition-all"
              title="Edit task"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </motion.button>
            <motion.button
              onClick={() => onDelete(task.id)}
              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
              title="Delete task"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
