import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
}

export default function TaskDrawer({ open, onOpenChange, onSave, task }: TaskDrawerProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"todo" | "inprogress" | "done">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

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
    if (task) return;

    setTitle("");
    setDescription("");
    setAssignedUser("");
    setDueDate("");
    setStatus("todo");
    setPriority("medium");
  }, [open, task]);

  const handleSave = () => {
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Assignee</label>
                <Input
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  placeholder="Type a name (e.g. your name)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Due date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
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
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
