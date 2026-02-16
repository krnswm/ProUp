import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, ArrowRight, Layout, CheckSquare, FolderOpen, Calendar, BarChart3, Sun, Moon, Plus, Inbox, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "navigation" | "action" | "task" | "project";
  action: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Fetch data when opened
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          api("/api/tasks/my"),
          api("/api/projects"),
        ]);
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(Array.isArray(data) ? data : []);
        }
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
    };
    fetchData();
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const current = root.classList.contains("dark") ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    root.classList.remove(current);
    root.classList.add(next);
    localStorage.setItem("theme", next);
    close();
  }, [close]);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // Navigation
      { id: "nav-dashboard", label: "Go to Dashboard", icon: <Layout className="w-4 h-4" />, category: "navigation", action: () => { navigate("/dashboard"); close(); } },
      { id: "nav-tasks", label: "Go to My Tasks", icon: <CheckSquare className="w-4 h-4" />, category: "navigation", action: () => { navigate("/my-tasks"); close(); } },
      { id: "nav-projects", label: "Go to Projects", icon: <FolderOpen className="w-4 h-4" />, category: "navigation", action: () => { navigate("/projects"); close(); } },
      { id: "nav-calendar", label: "Go to Calendar", icon: <Calendar className="w-4 h-4" />, category: "navigation", action: () => { navigate("/calendar"); close(); } },
      { id: "nav-inbox", label: "Go to Inbox", icon: <Inbox className="w-4 h-4" />, category: "navigation", action: () => { navigate("/inbox"); close(); } },
      { id: "nav-recap", label: "Go to Weekly Recap", icon: <BarChart3 className="w-4 h-4" />, category: "navigation", action: () => { navigate("/weekly-recap"); close(); } },
      // Actions
      { id: "action-theme", label: "Toggle Dark/Light Theme", icon: document.documentElement.classList.contains("dark") ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, category: "action", action: toggleTheme },
    ];

    // Projects
    for (const p of projects) {
      items.push({
        id: `project-${p.id}`,
        label: p.name,
        description: "Open project",
        icon: <FolderOpen className="w-4 h-4" />,
        category: "project",
        action: () => { navigate(`/project/${p.id}`); close(); },
      });
    }

    // Tasks (limit to 20 for performance)
    for (const t of tasks.slice(0, 20)) {
      items.push({
        id: `task-${t.id}`,
        label: t.title,
        description: `${t.status} · ${t.assignedUser}`,
        icon: <CheckSquare className="w-4 h-4" />,
        category: "task",
        action: () => {
          if (t.projectId) {
            navigate(`/project/${t.projectId}?task=${t.id}`);
          } else {
            navigate("/my-tasks");
          }
          close();
        },
      });
    }

    return items;
  }, [projects, tasks, navigate, close, toggleTheme]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.category.includes(q)
    );
  }, [commands, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "navigation": return "Navigation";
      case "action": return "Actions";
      case "project": return "Projects";
      case "task": return "Tasks";
      default: return cat;
    }
  };

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [filtered]);

  // Flat index mapping for keyboard nav
  let flatIndex = 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

        <motion.div
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects, or type a command..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : (
              Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {getCategoryLabel(category)}
                  </p>
                  {items.map((item) => {
                    const idx = flatIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className={`flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                          {item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">↵</kbd> select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">esc</kbd> close
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{filtered.length} results</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
