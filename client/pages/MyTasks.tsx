import MainLayout from "@/components/MainLayout";
import TaskCard, { Task } from "@/components/TaskCard";
import TaskDrawer from "@/components/TaskDrawer";
import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListTodo } from "lucide-react";

export default function MyTasks() {
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const response = await api("/api/tasks/my");
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Failed to fetch my tasks");
      }
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch my tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await api("/api/auth/me");
        if (!response.ok) return;
        const data = await response.json();
        if (data?.user?.name && data?.user?.email) {
          setMe({ name: data.user.name, email: data.user.email });
        }
      } catch {
        // ignore
      }
    };

    fetchMe();
    fetchMyTasks();
    const interval = setInterval(fetchMyTasks, 10000);

    const handleFocus = () => {
      fetchMyTasks();
    };
    window.addEventListener("focus", handleFocus);

    return () => clearInterval(interval);
  }, []);

  const grouped = useMemo(() => {
    const todo = tasks.filter((t) => t.status === "todo");
    const inprogress = tasks.filter((t) => t.status === "inprogress");
    const done = tasks.filter((t) => t.status === "done");
    return { todo, inprogress, done };
  }, [tasks]);

  const handleOpenTask = (task: Task) => {
    setEditingTask(task);
    setIsDrawerOpen(true);
  };

  const handleSaveTask = async (newTask: Omit<Task, "id">) => {
    if (!editingTask) return;
    try {
      const response = await api(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        const updated = await response.json();
        setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await api(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const renderSection = (title: string, sectionTasks: Task[]) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">
            {sectionTasks.length}
          </span>
        </div>
        {sectionTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            No tasks here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sectionTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={handleOpenTask}
                onEdit={handleOpenTask}
                onDelete={handleDeleteTask}
                onHistory={handleOpenTask}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading your tasks...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-red-500 font-medium mb-2">Failed to load tasks</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
              <p className="text-muted-foreground">
                Tasks assigned to you across all projects
                {me?.name ? ` (matching assignee: ${me.name})` : ""}
              </p>
            </div>
            </div>
            <button
              onClick={fetchMyTasks}
              className="px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Refresh
            </button>
          </div>
        </motion.div>

        <div className="space-y-10">
          {renderSection("To Do", grouped.todo)}
          {renderSection("In Progress", grouped.inprogress)}
          {renderSection("Done", grouped.done)}
        </div>
      </div>

      <TaskDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </MainLayout>
  );
}
