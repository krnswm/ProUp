import { X, Calendar, User, Flag, CheckCircle, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * CalendarEvent interface - matches the format returned from /api/calendar/tasks
 * This is the data structure used by FullCalendar
 */
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    description: string | null;
    assignedUser: string;
    status: string;
    priority: string;
    taskId: number;
    projectId?: number;
    projectName?: string;
  };
}

interface TaskQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CalendarEvent;
}

/**
 * TaskQuickViewModal - Displays task details when clicking on a calendar event
 * Shows: title, description, due date, assignee, status, priority
 * Includes a link to navigate to the project containing the task
 */
export default function TaskQuickViewModal({
  isOpen,
  onClose,
  task,
}: TaskQuickViewModalProps) {
  if (!isOpen) return null;

  // Helper function to get priority styling
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Helper function to get status styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "done":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "inprogress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "todo":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Format the status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done":
        return "Done";
      case "inprogress":
        return "In Progress";
      case "todo":
        return "To Do";
      default:
        return status;
    }
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header with colored accent bar */}
        <div
          className="h-2"
          style={{ backgroundColor: task.backgroundColor }}
        />

        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Task Title */}
          <h2 className="text-xl font-bold text-foreground mb-4 pr-8">
            {task.title}
          </h2>

          {/* Description */}
          {task.extendedProps.description && (
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {task.extendedProps.description}
            </p>
          )}

          {/* Task Details Grid */}
          <div className="space-y-4">
            {/* Due Date */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(task.start)}
                </p>
              </div>
            </div>

            {/* Assigned User */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm font-medium text-foreground">
                  {task.extendedProps.assignedUser}
                </p>
              </div>
            </div>

            {/* Status & Priority Row */}
            <div className="flex items-center gap-4">
              {/* Status */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusStyles(
                      task.extendedProps.status
                    )}`}
                  >
                    {getStatusLabel(task.extendedProps.status)}
                  </span>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Flag className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded border capitalize ${getPriorityStyles(
                      task.extendedProps.priority
                    )}`}
                  >
                    {task.extendedProps.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Project Link */}
            {task.extendedProps.projectId && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="text-sm font-medium text-foreground">
                    {task.extendedProps.projectName || "Unknown Project"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            {/* View in Project Button - links to the project containing this task */}
            <Link
              to={`/project/${task.extendedProps.projectId || 1}`}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              onClick={onClose}
            >
              <LinkIcon className="w-4 h-4" />
              View in Project
            </Link>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-muted transition-colors border border-border text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
