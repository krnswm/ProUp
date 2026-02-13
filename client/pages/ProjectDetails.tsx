import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, CheckCircle, Clock, ListTodo, TrendingUp, Users, LayoutGrid, PenTool, FileText, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import MainLayout from "@/components/MainLayout";
import TaskCard, { Task } from "@/components/TaskCard";
import TaskDrawer from "@/components/TaskDrawer";
import ActivityLogModal from "@/components/ActivityLogModal";
import ProjectMembersTab from "@/components/ProjectMembersTab";
import DocumentsList from "@/components/DocumentsList";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getRealtimeSocket } from "@/lib/realtimeSocket";
import { bumpCompletionStreak, confettiBurst, readCompletionStreak } from "@/lib/confetti";

interface Project {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  status: string;
}

type LeaderboardRow = {
  userId: string;
  name: string;
  email: string | null;
  completedToday: number;
  completedLast7Days: number;
  streak: number;
};

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [drawerReadOnly, setDrawerReadOnly] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | undefined>();
  const [activeTab, setActiveTab] = useState<"tasks" | "team" | "documents">("tasks");

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [streak, setStreak] = useState(() => readCompletionStreak().streak);

  // Fetch project and tasks from backend
  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchLeaderboard();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchTasks, 10000);

    const leaderInterval = setInterval(fetchLeaderboard, 30000);
    
    return () => {
      clearInterval(interval);
      clearInterval(leaderInterval);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const socket = getRealtimeSocket();
    socket.emit("join-project", { projectId });

    const onTaskCreated = ({ task }: { task: Task }) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === task.id)) return prev;
        return [...prev, task];
      });
      fetchLeaderboard();
    };

    const onTaskUpdated = ({ task }: { task: Task }) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id);
        if (idx === -1) return [...prev, task];
        const next = [...prev];
        next[idx] = task;
        return next;
      });
    };

    const onTaskDeleted = ({ taskId }: { taskId: number }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      fetchLeaderboard();
    };

    const onTaskReordered = ({ tasks: moved }: { tasks: Array<{ id: number; status?: any; position?: number }> }) => {
      setTasks((prev) =>
        prev.map((t) => {
          const hit = moved.find((m) => m.id === t.id);
          if (!hit) return t;
          return {
            ...t,
            status: (hit.status ?? t.status) as any,
            position: typeof hit.position === "number" ? (hit.position as any) : (t as any).position,
          } as any;
        })
      );
      fetchLeaderboard();
    };

    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("task:reordered", onTaskReordered);

    return () => {
      socket.emit("leave-project", { projectId });
      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("task:reordered", onTaskReordered);
    };
  }, [projectId]);

  const fetchLeaderboard = async () => {
    if (!projectId) return;
    try {
      setLeaderboardLoading(true);
      const response = await api(`/api/projects/${projectId}/leaderboard`);
      if (!response.ok) return;
      const data = await response.json();
      setLeaderboard(Array.isArray(data?.leaderboard) ? (data.leaderboard as LeaderboardRow[]) : []);
    } catch {
      // ignore
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchProject = async () => {
    if (!projectId) return;
    try {
      const response = await api(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      if (!projectId) return;
      const response = await api(`/api/projects/${projectId}/board`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskParam = params.get("task");
    if (!taskParam) return;

    const taskId = parseInt(taskParam);
    if (Number.isNaN(taskId)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setEditingTask(task);
    setDrawerReadOnly(true);
    setIsDrawerOpen(true);
  }, [location.search, tasks]);

  const handleAddTask = () => {
    setEditingTask(undefined);
    setDrawerReadOnly(false);
    setIsDrawerOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDrawerReadOnly(false);
    setIsDrawerOpen(true);
  };

  const handleOpenTask = (task: Task) => {
    setEditingTask(task);
    setDrawerReadOnly(true);
    setIsDrawerOpen(true);
  };

  const handleViewHistory = (task: Task) => {
    setHistoryTask(task);
    setIsHistoryModalOpen(true);
  };

  const handleSaveTask = async (newTask: Omit<Task, "id">) => {
    try {
      if (editingTask) {
        // Update existing task
        const beforeStatus = editingTask.status;
        const response = await api(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...newTask, projectId: projectId ? parseInt(projectId) : null }),
        });
        
        if (response.ok) {
          const updatedTask = await response.json();
          setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updatedTask : t)));

          if (beforeStatus !== "done" && updatedTask?.status === "done") {
            confettiBurst();
            setStreak(bumpCompletionStreak().streak);
            fetchLeaderboard();
          }
        }
      } else {
        // Create new task with projectId
        const response = await api('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({ ...newTask, projectId: projectId ? parseInt(projectId) : null }),
        });
        
        if (response.ok) {
          const createdTask = await response.json();
          setTasks((prev) => [...prev, createdTask]);
          fetchLeaderboard();
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await api(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleDragStart = (task: Task, e: React.DragEvent) => {
    setDraggedTask(task);
    // Set drag image opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (status: "todo" | "inprogress" | "done") => {
    if (draggedTask && draggedTask.status !== status) {
      try {
        const beforeStatus = draggedTask.status;
        const updatedTask = { ...draggedTask, status };
        const response = await api(`/api/tasks/${draggedTask.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedTask),
        });
        
        if (response.ok) {
          const savedTask = await response.json();
          setTasks(tasks.map((t) => (t.id === draggedTask.id ? savedTask : t)));

          if (beforeStatus !== "done" && savedTask?.status === "done") {
            confettiBurst();
            setStreak(bumpCompletionStreak().streak);
            fetchLeaderboard();
          }
        }
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getTodoTasks = () => tasks.filter((t) => t.status === "todo");
  const getInProgressTasks = () => tasks.filter((t) => t.status === "inprogress");
  const getDoneTasks = () => tasks.filter((t) => t.status === "done");

  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = getDoneTasks().length;
  const inProgressTasks = getInProgressTasks().length;
  const todoTasks = getTodoTasks().length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const KanbanColumn = ({
    title,
    tasks,
    status,
  }: {
    title: string;
    tasks: Task[];
    status: "todo" | "inprogress" | "done";
  }) => (
    <div
      className={`flex-1 min-h-[600px] rounded-lg p-4 transition-all duration-150 ${
        dragOverColumn === status
          ? "bg-secondary border-2 border-border shadow-inner"
          : "bg-secondary border-2 border-transparent"
      }`}
      onDragOver={(e) => handleDragOver(e, status)}
      onDragLeave={handleDragLeave}
      onDrop={() => handleDrop(status)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable={true}
            onDragStart={(e) => {
              // Prevent drag if clicking on buttons
              const target = e.target as HTMLElement;
              if (target.closest('button')) {
                e.preventDefault();
                return;
              }
              handleDragStart(task, e);
            }}
            onDragEnd={(e) => {
              handleDragEnd(e);
            }}
            className="transition-opacity duration-100 cursor-grab active:cursor-grabbing"
          >
            <TaskCard
              task={task}
              onOpen={handleOpenTask}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onHistory={handleViewHistory}
            />
          </div>
        ))}
      </div>
    </div>
  );

  // Determine user's role in the project
  const currentUserRole = project?.ownerId === user?.id ? "Owner" : "Member";

  return (
    <MainLayout>
      <div className="p-8">
        {/* Project Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{project?.name || "Loading..."}</h1>
          <p className="text-muted-foreground mt-2">{project?.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
              activeTab === "tasks"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
              activeTab === "team"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Team
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px ${
              activeTab === "documents"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </button>
          <Link
            to={`/project/${projectId}/whiteboard`}
            className="flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 -mb-px text-muted-foreground border-transparent hover:text-foreground"
          >
            <PenTool className="w-4 h-4" />
            Whiteboard
          </Link>
        </div>

        {activeTab === "tasks" ? (
          <>
        {/* Task Analytics */}
        <motion.div 
          className="mb-8 bg-card rounded-2xl p-6 shadow-lg border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Task Analytics</h2>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Tasks */}
            <motion.div 
              className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-900"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Tasks</p>
                <ListTodo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{totalTasks}</p>
            </motion.div>

        {/* Fun: streak + leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            className="lg:col-span-1 bg-gradient-to-br from-primary/10 via-card to-purple-500/10 rounded-2xl p-6 border border-border shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion streak</p>
                <p className="text-3xl font-bold text-foreground mt-1">{streak} day{streak === 1 ? "" : "s"}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Complete at least one task per day to keep the streak alive.
            </p>
          </motion.div>

          <motion.div
            className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-lg overflow-hidden relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Project Leaderboard</h3>
                  <p className="text-xs text-muted-foreground">Last 7 days (based on completed tasks)</p>
                </div>
                <button
                  type="button"
                  onClick={fetchLeaderboard}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  Refresh
                </button>
              </div>

              {leaderboardLoading ? (
                <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-sm text-muted-foreground">No completions yet.</div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((row, idx) => (
                    <div
                      key={row.userId}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          #{idx + 1} {row.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.completedToday} today 
                          {" · "}
                          {row.streak} day streak
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{row.completedLast7Days}</p>
                        <p className="text-[11px] text-muted-foreground">last 7d</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

            {/* Completed */}
            <motion.div 
              className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-900"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Completed</p>
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{completedTasks}</p>
            </motion.div>

            {/* In Progress */}
            <motion.div 
              className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-900"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">In Progress</p>
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{inProgressTasks}</p>
            </motion.div>

            {/* To Do */}
            <motion.div 
              className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-200 dark:border-orange-900"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">To Do</p>
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{todoTasks}</p>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Overall Completion</span>
              <span className="font-bold text-primary">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Add Task Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6">
          <KanbanColumn title="To Do" tasks={getTodoTasks()} status="todo" />
          <KanbanColumn title="In Progress" tasks={getInProgressTasks()} status="inprogress" />
          <KanbanColumn title="Done" tasks={getDoneTasks()} status="done" />
        </div>
          </>
        ) : activeTab === "team" ? (
          <ProjectMembersTab
            projectId={projectId ? parseInt(projectId) : 0}
            projectName={project?.name ?? ""}
            currentUserRole={currentUserRole}
          />
        ) : (
          <DocumentsList projectId={projectId ? parseInt(projectId) : 0} />
        )}
      </div>

      {/* Task Modal */}
      <TaskDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) {
            setEditingTask(undefined);
            setDrawerReadOnly(false);
            const params = new URLSearchParams(location.search);
            if (params.has("task")) {
              params.delete("task");
              const next = params.toString();
              navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true });
            }
          }
        }}
        onSave={handleSaveTask}
        task={editingTask}
        readOnly={drawerReadOnly}
      />

      {/* Activity Log Modal */}
      {historyTask && (
        <ActivityLogModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryTask(undefined);
          }}
          taskId={historyTask.id}
          taskTitle={historyTask.title}
        />
      )}
    </MainLayout>
  );
}
