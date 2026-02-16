import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, User, Flag, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TaskCard, { Task } from "./TaskCard";

type GroupBy = "assignee" | "priority" | "label";

interface KanbanSwimlanesProps {
  tasks: Task[];
  groupBy: GroupBy;
  onOpen?: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onHistory: (task: Task) => void;
}

const STATUS_ORDER = ["todo", "inprogress", "done"];
const STATUS_LABELS: Record<string, string> = { todo: "To Do", inprogress: "In Progress", done: "Done" };
const PRIORITY_ORDER = ["high", "medium", "low"];
const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export default function KanbanSwimlanes({ tasks, groupBy, onOpen, onEdit, onDelete, onHistory }: KanbanSwimlanesProps) {
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  const toggleLane = (key: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const lanes = useMemo(() => {
    const map = new Map<string, { label: string; color?: string; tasks: Task[] }>();

    if (groupBy === "assignee") {
      for (const t of tasks) {
        const key = t.assignedUser || "Unassigned";
        if (!map.has(key)) map.set(key, { label: key, tasks: [] });
        map.get(key)!.tasks.push(t);
      }
    } else if (groupBy === "priority") {
      for (const p of PRIORITY_ORDER) {
        map.set(p, { label: p.charAt(0).toUpperCase() + p.slice(1), tasks: [] });
      }
      for (const t of tasks) {
        const key = t.priority || "medium";
        if (!map.has(key)) map.set(key, { label: key, tasks: [] });
        map.get(key)!.tasks.push(t);
      }
    } else if (groupBy === "label") {
      const noLabel = "No Label";
      for (const t of tasks) {
        if (!t.labels || t.labels.length === 0) {
          if (!map.has(noLabel)) map.set(noLabel, { label: noLabel, tasks: [] });
          map.get(noLabel)!.tasks.push(t);
        } else {
          for (const l of t.labels) {
            const key = l.name;
            if (!map.has(key)) map.set(key, { label: key, color: l.color, tasks: [] });
            map.get(key)!.tasks.push(t);
          }
        }
      }
    }

    return Array.from(map.entries());
  }, [tasks, groupBy]);

  const GroupIcon = groupBy === "assignee" ? User : groupBy === "priority" ? Flag : Tag;

  return (
    <div className="space-y-4">
      {lanes.map(([key, lane]) => {
        const isCollapsed = collapsedLanes.has(key);
        const todoTasks = lane.tasks.filter((t) => t.status === "todo");
        const inProgressTasks = lane.tasks.filter((t) => t.status === "inprogress");
        const doneTasks = lane.tasks.filter((t) => t.status === "done");

        return (
          <motion.div
            key={key}
            className="bg-card/50 border border-border rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Lane header */}
            <button
              type="button"
              onClick={() => toggleLane(key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
              <GroupIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{lane.label}</span>
              {lane.color && (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lane.color }} />
              )}
              {groupBy === "priority" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_COLORS[key] || ""}`}>
                  {lane.label}
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {lane.tasks.length} task{lane.tasks.length !== 1 ? "s" : ""}
              </span>
              {/* Mini status dots */}
              <div className="flex items-center gap-0.5">
                {doneTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-green-500" title={`${doneTasks.length} done`} />}
                {inProgressTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" title={`${inProgressTasks.length} in progress`} />}
                {todoTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-gray-400" title={`${todoTasks.length} todo`} />}
              </div>
            </button>

            {/* Lane content */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  className="px-4 pb-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-3 gap-4">
                    {STATUS_ORDER.map((status) => {
                      const statusTasks = lane.tasks.filter((t) => t.status === status);
                      return (
                        <div key={status}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {STATUS_LABELS[status]} ({statusTasks.length})
                          </p>
                          <div className="space-y-2">
                            {statusTasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                onOpen={onOpen}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onHistory={onHistory}
                              />
                            ))}
                            {statusTasks.length === 0 && (
                              <p className="text-[10px] text-muted-foreground italic py-4 text-center">Empty</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {lanes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No tasks to display</p>
      )}
    </div>
  );
}
