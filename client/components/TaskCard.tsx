import { Edit2, Trash2, Calendar } from "lucide-react";

export interface Task {
  id: number;
  title: string;
  assignedUser: string;
  dueDate: string;
  status: "todo" | "inprogress" | "done";
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
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
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
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
