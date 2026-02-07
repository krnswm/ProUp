import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import TaskCard, { Task } from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import ActivityLogModal from "@/components/ActivityLogModal";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | undefined>();

  const projectName = "Website Redesign";
  const projectDescription = "Complete redesign of the company website with modern UI/UX";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from backend
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleViewHistory = (task: Task) => {
    setHistoryTask(task);
    setIsHistoryModalOpen(true);
  };

  const handleSaveTask = async (newTask: Omit<Task, "id">) => {
    try {
      if (editingTask) {
        // Update existing task
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newTask, userId: 'Current User' }),
        });
        
        if (response.ok) {
          const updatedTask = await response.json();
          setTasks(tasks.map((t) => (t.id === editingTask.id ? updatedTask : t)));
        }
      } else {
        // Create new task
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newTask, userId: 'Current User' }),
        });
        
        if (response.ok) {
          const createdTask = await response.json();
          setTasks([...tasks, createdTask]);
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
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
        const updatedTask = { ...draggedTask, status };
        const response = await fetch(`/api/tasks/${draggedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updatedTask, userId: 'Current User' }),
        });
        
        if (response.ok) {
          const savedTask = await response.json();
          setTasks(tasks.map((t) => (t.id === draggedTask.id ? savedTask : t)));
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
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onHistory={handleViewHistory}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="p-8">
        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{projectName}</h1>
          <p className="text-muted-foreground mt-2">{projectDescription}</p>
        </div>

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
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(undefined);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
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
