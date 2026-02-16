import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Calendar, User, Flag, CheckCircle, Pencil, Trash2, Tag, Paperclip, Download, Upload, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { getRealtimeSocket } from "@/lib/realtimeSocket";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, TaskLabel } from "./TaskCard";
import PomodoroTimer from "./PomodoroTimer";

interface TaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Omit<Task, "id">) => void;
  task?: Task;
  readOnly?: boolean;
}

export default function TaskDrawer({ open, onOpenChange, onSave, task, readOnly = false }: TaskDrawerProps) {
  const isEdit = !!task;

  type DependencyTask = {
    id: number;
    title: string;
    status: string;
    projectId: number | null;
  };

  type BlockedByItem = {
    id: number;
    blockedTaskId: number;
    blockingTaskId: number;
    blockingTask: DependencyTask;
  };

  type BlocksItem = {
    id: number;
    blockedTaskId: number;
    blockingTaskId: number;
    blockedTask: DependencyTask;
  };

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

  const handleUpdateComment = async (commentId: number) => {
    if (!task?.id) return;
    const body = editingBody.trim();
    if (!body) return;

    try {
      setCommentError(null);
      const response = await api(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Failed to update comment");
      }

      const updated = (await response.json()) as CommentItem;
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingBody("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!task?.id) return;

    try {
      setCommentError(null);
      const response = await api(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Failed to delete comment");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingBody("");
      }
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Failed to delete comment");
    }
  };

  const meId = useMemo(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;
    const id = raw ? parseInt(raw) : NaN;
    return Number.isNaN(id) ? null : id;
  }, []);

  const renderMentionText = (text: string) => {
    const parts: Array<{ type: "text" | "mention"; value: string }> = [];
    const regex = /@"([^"]+)"|@([a-zA-Z0-9._-]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, start) });
      }
      parts.push({ type: "mention", value: match[0] });
      lastIndex = end;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }

    return (
      <>
        {parts.map((p, idx) =>
          p.type === "mention" ? (
            <span key={idx} className="text-primary font-medium">
              {p.value}
            </span>
          ) : (
            <span key={idx}>{p.value}</span>
          )
        )}
      </>
    );
  };

  const computeMentionState = (value: string, cursor: number) => {
    const left = value.slice(0, cursor);
    const atIndex = left.lastIndexOf("@");
    if (atIndex < 0) return null;
    if (atIndex > 0 && /\S/.test(left[atIndex - 1])) return null;

    const query = left.slice(atIndex + 1);
    if (query.includes("\n") || query.includes("\r") || query.includes("\t") || query.includes(" ")) return null;
    if (query.startsWith('"')) return null;

    return {
      query,
      range: { start: atIndex, end: cursor },
    };
  };

  const insertMention = (user: UserItem) => {
    if (!mentionRange) return;
    const mentionText = `@"${user.name}" `;
    const next = commentBody.slice(0, mentionRange.start) + mentionText + commentBody.slice(mentionRange.end);
    setCommentBody(next);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionRange(null);
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

  const [blockedBy, setBlockedBy] = useState<BlockedByItem[]>([]);
  const [blocks, setBlocks] = useState<BlocksItem[]>([]);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedDependsOnId, setSelectedDependsOnId] = useState<string>("");

  type CommentItem = {
    id: number;
    taskId: number;
    authorId: number;
    body: string;
    createdAt: string;
    author?: { id: number; name: string; email: string };
  };

  type UserItem = {
    id: number;
    name: string;
    email: string;
  };

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");

  // Labels state
  const [taskLabels, setTaskLabels] = useState<TaskLabel[]>([]);
  const [projectLabels, setProjectLabels] = useState<TaskLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");

  // Attachments state
  type AttachmentItem = {
    id: number;
    taskId: number;
    filename: string;
    mimetype: string;
    size: number;
    createdAt: string;
  };
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

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

  const isBlocked = useMemo(() => {
    return blockedBy.some((d) => String(d.blockingTask?.status) !== "done");
  }, [blockedBy]);

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
    if (!task?.id) return;

    const fetchDependencies = async () => {
      try {
        setDependencyError(null);
        const response = await api(`/api/tasks/${task.id}/dependencies`);
        if (!response.ok) {
          const txt = await response.text();
          throw new Error(txt || "Failed to load dependencies");
        }

        const data = await response.json();
        setBlockedBy(Array.isArray(data?.blockedBy) ? data.blockedBy : []);
        setBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
      } catch (e) {
        setDependencyError(e instanceof Error ? e.message : "Failed to load dependencies");
      }
    };

    fetchDependencies();
  }, [open, task?.id]);

  useEffect(() => {
    if (!open) return;
    if (!task?.projectId) return;

    const fetchProjectTasks = async () => {
      try {
        const response = await api(`/api/projects/${task.projectId}/board`);
        if (!response.ok) return;
        const data = await response.json();
        const tasks = Array.isArray(data?.tasks) ? (data.tasks as Task[]) : [];
        setProjectTasks(tasks);
      } catch {
        // ignore
      }
    };

    fetchProjectTasks();
  }, [open, task?.projectId]);

  useEffect(() => {
    if (!open) return;
    if (!task?.id) return;

    const socket = getRealtimeSocket();
    socket.emit("join-task", { taskId: task.id });

    const onCreated = ({ comment }: { comment: CommentItem }) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };

    const onUpdated = ({ comment }: { comment: CommentItem }) => {
      setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
    };

    const onDeleted = ({ commentId }: { commentId: number }) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    socket.on("comment:created", onCreated);
    socket.on("comment:updated", onUpdated);
    socket.on("comment:deleted", onDeleted);

    return () => {
      socket.emit("leave-task", { taskId: task.id });
      socket.off("comment:created", onCreated);
      socket.off("comment:updated", onUpdated);
      socket.off("comment:deleted", onDeleted);
    };
  }, [open, task?.id]);

  useEffect(() => {
    if (!open) return;
    if (usersLoaded) return;

    const loadUsers = async () => {
      try {
        const response = await api("/api/auth/users");
        if (!response.ok) return;
        const data = (await response.json()) as UserItem[];
        setUsers(Array.isArray(data) ? data : []);
        setUsersLoaded(true);
      } catch {
        // ignore
      }
    };

    loadUsers();
  }, [open, usersLoaded]);

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

  // Fetch labels for this task and project
  useEffect(() => {
    if (!open || !task?.id) { setTaskLabels([]); setAttachments([]); return; }

    const fetchTaskLabels = async () => {
      try {
        const res = await api(`/api/tasks/${task.id}/labels`);
        if (res.ok) setTaskLabels(await res.json());
      } catch { /* ignore */ }
    };

    const fetchAttachments = async () => {
      try {
        const res = await api(`/api/tasks/${task.id}/attachments`);
        if (res.ok) setAttachments(await res.json());
      } catch { /* ignore */ }
    };

    fetchTaskLabels();
    fetchAttachments();
  }, [open, task?.id]);

  useEffect(() => {
    if (!open || !task?.projectId) { setProjectLabels([]); return; }
    const fetchProjectLabels = async () => {
      try {
        const res = await api(`/api/projects/${task.projectId}/labels`);
        if (res.ok) setProjectLabels(await res.json());
      } catch { /* ignore */ }
    };
    fetchProjectLabels();
  }, [open, task?.projectId]);

  const handleAddLabel = async (labelId: number) => {
    if (!task?.id) return;
    try {
      const res = await api(`/api/tasks/${task.id}/labels`, {
        method: "POST",
        body: JSON.stringify({ labelId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.label) {
          setTaskLabels((prev) => prev.some((l) => l.id === data.label.id) ? prev : [...prev, data.label]);
        }
      }
    } catch { /* ignore */ }
  };

  const handleRemoveLabel = async (labelId: number) => {
    if (!task?.id) return;
    try {
      await api(`/api/tasks/${task.id}/labels/${labelId}`, { method: "DELETE" });
      setTaskLabels((prev) => prev.filter((l) => l.id !== labelId));
    } catch { /* ignore */ }
  };

  const handleCreateLabel = async () => {
    if (!task?.projectId || !newLabelName.trim()) return;
    try {
      const res = await api(`/api/projects/${task.projectId}/labels`, {
        method: "POST",
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      });
      if (res.ok) {
        const label = await res.json();
        setProjectLabels((prev) => [...prev, label]);
        setNewLabelName("");
        setNewLabelColor("#3b82f6");
        // Auto-assign to task
        await handleAddLabel(label.id);
      }
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (file: File) => {
    if (!task?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }
    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await api(`/api/tasks/${task!.id}/attachments`, {
          method: "POST",
          body: JSON.stringify({ filename: file.name, mimetype: file.type, data: base64 }),
        });
        if (res.ok) {
          const att = await res.json();
          setAttachments((prev) => [att, ...prev]);
        }
        setUploadingFile(false);
      };
      reader.onerror = () => setUploadingFile(false);
      reader.readAsDataURL(file);
    } catch {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await api(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch { /* ignore */ }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSave = () => {
    if (readOnly) return;
    if (!canSave) return;

    if (status === "done" && isBlocked) {
      setDependencyError("This task is blocked by incomplete dependencies. Complete them before marking as Done.");
      return;
    }

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

  const handleAddDependency = async () => {
    if (!task?.id) return;
    if (!task.projectId) return;
    const id = parseInt(selectedDependsOnId);
    if (Number.isNaN(id)) return;

    try {
      setDependencyError(null);
      const response = await api(`/api/tasks/${task.id}/dependencies`, {
        method: "POST",
        body: JSON.stringify({ dependsOnTaskId: id }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Failed to add dependency");
      }

      const created = await response.json();
      if (created?.blockingTask) {
        setBlockedBy((prev) => {
          if (prev.some((p) => p.blockingTaskId === created.blockingTaskId)) return prev;
          return [...prev, created];
        });
      }

      setSelectedDependsOnId("");
    } catch (e) {
      setDependencyError(e instanceof Error ? e.message : "Failed to add dependency");
    }
  };

  const handleRemoveDependency = async (dependsOnTaskId: number) => {
    if (!task?.id) return;

    try {
      setDependencyError(null);
      const response = await api(`/api/tasks/${task.id}/dependencies/${dependsOnTaskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Failed to remove dependency");
      }

      setBlockedBy((prev) => prev.filter((p) => p.blockingTaskId !== dependsOnTaskId));
    } catch (e) {
      setDependencyError(e instanceof Error ? e.message : "Failed to remove dependency");
    }
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
      addXP("COMMENT_ADDED", XP_REWARDS.COMMENT_ADDED);
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

                  {meId !== null && c.authorId === meId && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(c.id);
                          setEditingBody(c.body);
                        }}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Edit comment"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {editingCommentId === c.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={3} />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingBody("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => handleUpdateComment(c.id)} disabled={!editingBody.trim()}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{renderMentionText(c.body)}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Add a comment</label>

          <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
            <PopoverTrigger asChild>
              <Textarea
                value={commentBody}
                onChange={(e) => {
                  const next = e.target.value;
                  setCommentBody(next);
                  const cursor = e.target.selectionStart ?? next.length;
                  const state = computeMentionState(next, cursor);
                  if (!state) {
                    setMentionOpen(false);
                    setMentionQuery("");
                    setMentionRange(null);
                    return;
                  }

                  setMentionQuery(state.query);
                  setMentionRange(state.range);
                  setMentionOpen(true);
                }}
                onKeyDown={(e) => {
                  if (mentionOpen && e.key === "Escape") {
                    e.preventDefault();
                    setMentionOpen(false);
                  }
                }}
                placeholder='Type a comment. Mention with @ then pick a user (inserts @"Full Name")'
                rows={3}
              />
            </PopoverTrigger>

            <PopoverContent align="start" sideOffset={8} className="p-0 w-80">
              <Command>
                <CommandInput placeholder="Search people..." value={mentionQuery} onValueChange={setMentionQuery} />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {users
                      .filter((u) => {
                        const q = mentionQuery.trim().toLowerCase();
                        if (!q) return true;
                        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                      })
                      .slice(0, 8)
                      .map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.name}
                          onSelect={() => {
                            insertMention(u);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{u.name}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

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
                <Select
                  value={status}
                  onValueChange={(v) => {
                    const next = v as any;
                    if (next === "done" && isBlocked) {
                      setDependencyError("This task is blocked by incomplete dependencies. Complete them before marking as Done.");
                      return;
                    }
                    setStatus(next);
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger disabled={readOnly}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="done" disabled={isBlocked}>
                      Done
                    </SelectItem>
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

            {isEdit && task?.projectId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Dependencies</label>
                  {isBlocked && (
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                      Blocked
                    </span>
                  )}
                </div>

                {dependencyError && <div className="text-sm text-red-500">{dependencyError}</div>}

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Blocked by</p>
                  {blockedBy.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No dependencies.</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedBy.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-3 bg-secondary/30 border border-border rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{d.blockingTask.title}</p>
                            <p className="text-xs text-muted-foreground">Status: {getStatusLabel(String(d.blockingTask.status))}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleRemoveDependency(d.blockingTaskId)}
                            disabled={readOnly}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Add dependency</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedDependsOnId}
                        onChange={(e) => setSelectedDependsOnId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-input text-foreground"
                      >
                        <option value="">Select a task…</option>
                        {projectTasks
                          .filter((t) => t.id !== task.id)
                          .filter((t) => !blockedBy.some((d) => d.blockingTaskId === t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} ({getStatusLabel(t.status)})
                            </option>
                          ))}
                      </select>
                      <Button type="button" onClick={handleAddDependency} disabled={!selectedDependsOnId}>
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You won’t be able to mark this task as Done until all dependencies are Done.
                    </p>
                  </div>
                )}

                {blocks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">This task blocks</p>
                    <div className="space-y-2">
                      {blocks.map((d) => (
                        <div key={d.id} className="bg-secondary/30 border border-border rounded-lg px-3 py-2">
                          <p className="text-sm font-medium text-foreground truncate">{d.blockedTask.title}</p>
                          <p className="text-xs text-muted-foreground">Status: {getStatusLabel(String(d.blockedTask.status))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Labels Section */}
            {isEdit && task?.projectId && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">Labels</label>
                </div>

                {/* Current labels */}
                {taskLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {taskLabels.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(l.id)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Add existing label */}
                {!readOnly && (
                  <div className="space-y-2">
                    {projectLabels.filter((pl) => !taskLabels.some((tl) => tl.id === pl.id)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {projectLabels
                          .filter((pl) => !taskLabels.some((tl) => tl.id === pl.id))
                          .map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => handleAddLabel(l.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                              {l.name}
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Create new label */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="w-7 h-7 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="New label name"
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateLabel(); } }}
                      />
                      <Button type="button" size="sm" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pomodoro Timer */}
            {isEdit && task?.id && (
              <PomodoroTimer taskId={task.id} taskTitle={task.title} />
            )}

            {/* Attachments Section */}
            {isEdit && task?.id && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">Attachments</label>
                </div>

                {/* Upload area */}
                {!readOnly && (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) handleFileUpload(files[0]);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.onchange = () => {
                        if (input.files && input.files.length > 0) handleFileUpload(input.files[0]);
                      };
                      input.click();
                    }}
                  >
                    {uploadingFile ? (
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drop a file here or <span className="text-primary font-medium">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Max 5MB</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment list */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between gap-3 bg-secondary/30 border border-border rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/attachments/${att.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
