import { Edit2, Trash2, Calendar, History } from "lucide-react";

export interface Task {
  id: number;
  title: string;
  description?: string;
  assignedUser: string;
  dueDate: string;
  status: "todo" | "inprogress" | "done";
  priority: "low" | "medium" | "high";
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
    <div className="bg-card border border-border rounded-lg p-4 card-shadow hover:shadow-md transition-shadow select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Title */}
      <h3 className="font-semibold text-foreground mb-3 line-clamp-2">
        {task.title}
      </h3>

      {/* Assigned User */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
        <p className="text-sm font-medium text-foreground">{task.assignedUser}</p>
      </div>

      {/* Due Date */}
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
      </div>

      {/* Priority Badge */}
      <div className="mb-4">
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${getPriorityBadgeColor(
            task.priority
          )}`}
        >
          {getPriorityLabel(task.priority)}
        </span>
      </div>

      {/* Status Badge and Actions */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusBadgeColor(
            task.status
          )}`}
        >
          {getStatusLabel(task.status)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onHistory(task)}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="View history"
          >
            <History className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="Edit task"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}
