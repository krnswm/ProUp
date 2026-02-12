import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Calendar, User, Flag, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task } from "./TaskCard";

interface TaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Omit<Task, "id">) => void;
  task?: Task;
  readOnly?: boolean;
}

export default function TaskDrawer({ open, onOpenChange, onSave, task, readOnly = false }: TaskDrawerProps) {
  const isEdit = !!task;

  const getPriorityStyles = (value: string) => {
    switch (value) {
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

  const getStatusStyles = (value: string) => {
    switch (value) {
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

  const getStatusLabel = (value: string) => {
    switch (value) {
      case "done":
        return "Done";
      case "inprogress":
        return "In Progress";
      case "todo":
        return "To Do";
      default:
        return value;
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"todo" | "inprogress" | "done">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  type CommentItem = {
    id: number;
    taskId: number;
    authorId: number;
    body: string;
    createdAt: string;
    author?: { id: number; name: string; email: string };
  };

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && assignedUser.trim().length > 0 && dueDate.trim().length > 0;
  }, [title, assignedUser, dueDate]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAssignedUser(task.assignedUser);
      setDueDate(task.dueDate || "");
      setStatus(task.status);
      setPriority(task.priority);
      return;
    }
  }, [task]);

  useEffect(() => {
    if (!open) return;
    if (!task?.id) return;

    const fetchComments = async () => {
      try {
        setCommentsLoading(true);
        setCommentError(null);
        const response = await api(`/api/tasks/${task.id}/comments`);
        if (!response.ok) {
          const txt = await response.text();
          throw new Error(txt || "Failed to fetch comments");
        }
        const data = (await response.json()) as CommentItem[];
        setComments(Array.isArray(data) ? data : []);
      } catch (e) {
        setCommentError(e instanceof Error ? e.message : "Failed to fetch comments");
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchComments();
  }, [open, task?.id]);

  useEffect(() => {
    if (!open) return;
    if (task) return;

    setTitle("");
    setDescription("");
    setAssignedUser("");
    setDueDate("");
    setStatus("todo");
    setPriority("medium");
  }, [open, task]);

  const handleSave = () => {
    if (readOnly) return;
    if (!canSave) return;

    onSave({
      title: title.trim(),
      description: description.trim() ? description.trim() : undefined,
      assignedUser: assignedUser.trim(),
      dueDate: dueDate.trim(),
      status,
      priority,
    });

    onOpenChange(false);
  };

  const handleAddComment = async () => {
    if (!task?.id) return;
    const body = commentBody.trim();
    if (!body) return;

    try {
      setCommentError(null);
      const response = await api(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Failed to create comment");
      }

      const created = (await response.json()) as CommentItem;
      setComments((prev) => [...prev, created]);
      setCommentBody("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to create comment");
    }
  };

  const renderComments = () => {
    if (!task?.id) return null;

    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Comments</h3>

        {commentsLoading ? (
          <div className="text-sm text-muted-foreground">Loading comments...</div>
        ) : commentError ? (
          <div className="text-sm text-red-500">{commentError}</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comments yet.</div>
        ) : (
          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="bg-secondary/30 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {c.author?.name || `User ${c.authorId}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Add a comment</label>
          <Textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder='Type a comment. Mention someone with @"Full Name" or @email'
            rows={3}
          />
          <div className="flex items-center justify-end">
            <Button type="button" onClick={handleAddComment} disabled={!commentBody.trim()}>
              Post
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (readOnly) {
    if (!open) return null;

    const accentColor =
      priority === "high" ? "#ef4444" : priority === "medium" ? "#f97316" : priority === "low" ? "#22c55e" : "#3b82f6";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

        <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div className="h-2" style={{ backgroundColor: accentColor }} />
          <div className="p-6">
            <button
              onClick={() => onOpenChange(false)}
              type="button"
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-foreground mb-4 pr-8">{title || "Task"}</h2>

            {description && (
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed whitespace-pre-wrap">{description}</p>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium text-foreground">{dueDate ? formatDate(dueDate) : "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm font-medium text-foreground">{assignedUser || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${getStatusStyles(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Flag className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border capitalize ${getPriorityStyles(priority)}`}>
                      {priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">{renderComments()}</div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => onOpenChange(false)}
                type="button"
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent key={task?.id ?? "new"} side="right" className="w-full sm:max-w-xl p-0">
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border">
            <SheetHeader>
              <SheetTitle>{isEdit ? "Task Details" : "New Task"}</SheetTitle>
              <SheetDescription>
                {isEdit ? "View and edit task information." : "Create a task for this project."}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" disabled={readOnly} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={5}
                disabled={readOnly}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Assignee</label>
                <Input
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  placeholder="Type a name (e.g. your name)"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Due date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={readOnly} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)} disabled={readOnly}>
                  <SelectTrigger disabled={readOnly}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)} disabled={readOnly}>
                  <SelectTrigger disabled={readOnly}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSave}>
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
