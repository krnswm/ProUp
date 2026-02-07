import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import TaskCard, { Task } from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const projectName = "Website Redesign";
  const projectDescription = "Complete redesign of the company website with modern UI/UX";

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Design homepage layout",
      assignedUser: "Jane Smith",
      dueDate: "2024-02-15",
      status: "done",
    },
    {
      id: 2,
      title: "Create color palette",
      assignedUser: "John Doe",
      dueDate: "2024-02-10",
      status: "done",
    },
    {
      id: 3,
      title: "Design product pages",
      assignedUser: "Sarah Williams",
      dueDate: "2024-02-20",
      status: "inprogress",
    },
    {
      id: 4,
      title: "Implement responsive design",
      assignedUser: "Mike Johnson",
      dueDate: "2024-02-25",
      status: "inprogress",
    },
    {
      id: 5,
      title: "Setup analytics",
      assignedUser: "John Doe",
      dueDate: "2024-03-01",
      status: "todo",
    },
    {
      id: 6,
      title: "Performance optimization",
      assignedUser: "Mike Johnson",
      dueDate: "2024-03-05",
      status: "todo",
    },
    {
      id: 7,
      title: "Browser compatibility testing",
      assignedUser: "Sarah Williams",
      dueDate: "2024-03-10",
      status: "todo",
    },
  ]);

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (newTask: Omit<Task, "id">) => {
    if (editingTask) {
      setTasks(
        tasks.map((t) =>
          t.id === editingTask.id ? { ...newTask, id: t.id } : t
        )
      );
    } else {
      const id = Math.max(...tasks.map((t) => t.id), 0) + 1;
      setTasks([...tasks, { ...newTask, id }]);
    }
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
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

  const handleDrop = (status: "todo" | "inprogress" | "done") => {
    if (draggedTask && draggedTask.status !== status) {
      setTasks(
        tasks.map((t) =>
          t.id === draggedTask.id ? { ...t, status } : t
        )
      );
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
    </MainLayout>
  );
}
