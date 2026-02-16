import { useState } from "react";
import { Sparkles, Plus, Loader2, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedTask {
  title: string;
  priority: "low" | "medium" | "high";
  estimatedDays: number;
}

interface AiTaskSuggestionsProps {
  onAddTask: (task: { title: string; priority: "low" | "medium" | "high"; dueDate: string }) => void;
}

function generateSubtasks(goal: string): SuggestedTask[] {
  const text = goal.trim().toLowerCase();
  const results: SuggestedTask[] = [];

  // Common patterns and keyword-based heuristics
  const patterns: { keywords: string[]; tasks: SuggestedTask[] }[] = [
    {
      keywords: ["website", "web app", "landing page", "site"],
      tasks: [
        { title: "Define requirements and scope", priority: "high", estimatedDays: 2 },
        { title: "Create wireframes and mockups", priority: "high", estimatedDays: 3 },
        { title: "Set up project structure and tooling", priority: "high", estimatedDays: 1 },
        { title: "Build responsive layout and navigation", priority: "high", estimatedDays: 3 },
        { title: "Implement core pages and components", priority: "high", estimatedDays: 5 },
        { title: "Add styling and animations", priority: "medium", estimatedDays: 2 },
        { title: "Test across browsers and devices", priority: "medium", estimatedDays: 2 },
        { title: "Deploy and configure hosting", priority: "medium", estimatedDays: 1 },
      ],
    },
    {
      keywords: ["api", "backend", "server", "endpoint"],
      tasks: [
        { title: "Design API schema and endpoints", priority: "high", estimatedDays: 2 },
        { title: "Set up database models and migrations", priority: "high", estimatedDays: 2 },
        { title: "Implement authentication and authorization", priority: "high", estimatedDays: 3 },
        { title: "Build CRUD endpoints", priority: "high", estimatedDays: 4 },
        { title: "Add input validation and error handling", priority: "medium", estimatedDays: 2 },
        { title: "Write API tests", priority: "medium", estimatedDays: 3 },
        { title: "Set up logging and monitoring", priority: "low", estimatedDays: 1 },
      ],
    },
    {
      keywords: ["mobile", "app", "ios", "android", "react native", "flutter"],
      tasks: [
        { title: "Define app features and user flows", priority: "high", estimatedDays: 2 },
        { title: "Create UI/UX designs", priority: "high", estimatedDays: 4 },
        { title: "Set up mobile project and dependencies", priority: "high", estimatedDays: 1 },
        { title: "Build navigation and screen structure", priority: "high", estimatedDays: 3 },
        { title: "Implement core features", priority: "high", estimatedDays: 7 },
        { title: "Integrate with backend API", priority: "medium", estimatedDays: 3 },
        { title: "Add offline support and caching", priority: "medium", estimatedDays: 2 },
        { title: "Test on physical devices", priority: "medium", estimatedDays: 2 },
        { title: "Prepare for app store submission", priority: "low", estimatedDays: 2 },
      ],
    },
    {
      keywords: ["design", "redesign", "ui", "ux", "branding"],
      tasks: [
        { title: "Research competitors and inspiration", priority: "high", estimatedDays: 2 },
        { title: "Define design system and color palette", priority: "high", estimatedDays: 2 },
        { title: "Create low-fidelity wireframes", priority: "high", estimatedDays: 2 },
        { title: "Design high-fidelity mockups", priority: "high", estimatedDays: 4 },
        { title: "Create interactive prototype", priority: "medium", estimatedDays: 3 },
        { title: "Gather feedback and iterate", priority: "medium", estimatedDays: 2 },
        { title: "Prepare design handoff assets", priority: "low", estimatedDays: 1 },
      ],
    },
    {
      keywords: ["marketing", "campaign", "launch", "promotion"],
      tasks: [
        { title: "Define target audience and goals", priority: "high", estimatedDays: 1 },
        { title: "Create content strategy", priority: "high", estimatedDays: 2 },
        { title: "Design marketing materials", priority: "high", estimatedDays: 3 },
        { title: "Set up analytics and tracking", priority: "medium", estimatedDays: 1 },
        { title: "Schedule and publish content", priority: "medium", estimatedDays: 2 },
        { title: "Monitor performance and adjust", priority: "medium", estimatedDays: 3 },
        { title: "Write post-campaign report", priority: "low", estimatedDays: 1 },
      ],
    },
    {
      keywords: ["test", "testing", "qa", "quality"],
      tasks: [
        { title: "Define test plan and test cases", priority: "high", estimatedDays: 2 },
        { title: "Set up testing environment", priority: "high", estimatedDays: 1 },
        { title: "Write unit tests", priority: "high", estimatedDays: 4 },
        { title: "Write integration tests", priority: "medium", estimatedDays: 3 },
        { title: "Perform manual exploratory testing", priority: "medium", estimatedDays: 2 },
        { title: "Fix identified bugs", priority: "high", estimatedDays: 3 },
        { title: "Write test report", priority: "low", estimatedDays: 1 },
      ],
    },
    {
      keywords: ["learn", "study", "course", "tutorial"],
      tasks: [
        { title: "Research available resources", priority: "high", estimatedDays: 1 },
        { title: "Create a study schedule", priority: "high", estimatedDays: 1 },
        { title: "Complete introductory material", priority: "high", estimatedDays: 3 },
        { title: "Practice with hands-on exercises", priority: "high", estimatedDays: 5 },
        { title: "Build a small practice project", priority: "medium", estimatedDays: 4 },
        { title: "Review and take notes", priority: "medium", estimatedDays: 2 },
        { title: "Share learnings or write a summary", priority: "low", estimatedDays: 1 },
      ],
    },
    {
      keywords: ["event", "conference", "meetup", "workshop"],
      tasks: [
        { title: "Define event goals and format", priority: "high", estimatedDays: 1 },
        { title: "Book venue and set date", priority: "high", estimatedDays: 3 },
        { title: "Create event page and invitations", priority: "high", estimatedDays: 2 },
        { title: "Arrange speakers or facilitators", priority: "high", estimatedDays: 5 },
        { title: "Plan logistics (catering, AV, etc.)", priority: "medium", estimatedDays: 3 },
        { title: "Promote the event", priority: "medium", estimatedDays: 4 },
        { title: "Run the event", priority: "high", estimatedDays: 1 },
        { title: "Send follow-up and collect feedback", priority: "low", estimatedDays: 1 },
      ],
    },
  ];

  // Match patterns
  for (const p of patterns) {
    if (p.keywords.some((kw) => text.includes(kw))) {
      results.push(...p.tasks);
    }
  }

  // If no pattern matched, generate generic subtasks from the goal text
  if (results.length === 0) {
    // Split by sentences, bullets, or newlines
    const lines = goal
      .split(/[\n\r]+|[.!?]+|[-•]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    if (lines.length > 1) {
      // Use the lines as individual tasks
      for (const line of lines.slice(0, 10)) {
        results.push({
          title: line.charAt(0).toUpperCase() + line.slice(1),
          priority: "medium",
          estimatedDays: 2,
        });
      }
    } else {
      // Generic breakdown
      const goalTitle = goal.trim().length > 50 ? goal.trim().slice(0, 50) + "..." : goal.trim();
      results.push(
        { title: `Research and plan: ${goalTitle}`, priority: "high", estimatedDays: 2 },
        { title: `Define requirements and scope`, priority: "high", estimatedDays: 2 },
        { title: `Create initial implementation`, priority: "high", estimatedDays: 5 },
        { title: `Review and gather feedback`, priority: "medium", estimatedDays: 2 },
        { title: `Iterate and refine`, priority: "medium", estimatedDays: 3 },
        { title: `Final review and completion`, priority: "medium", estimatedDays: 1 },
      );
    }
  }

  return results;
}

export default function AiTaskSuggestions({ onAddTask }: AiTaskSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());

  const handleGenerate = () => {
    if (!goal.trim()) return;
    setGenerating(true);
    setSuggestions([]);
    setAddedIndices(new Set());

    // Simulate a brief "thinking" delay for UX
    setTimeout(() => {
      const tasks = generateSubtasks(goal);
      setSuggestions(tasks);
      setGenerating(false);
    }, 800);
  };

  const handleAdd = (idx: number) => {
    const s = suggestions[idx];
    const due = new Date();
    due.setDate(due.getDate() + s.estimatedDays);
    const dueDate = due.toISOString().slice(0, 10);

    onAddTask({ title: s.title, priority: s.priority, dueDate });
    setAddedIndices((prev) => new Set(prev).add(idx));
  };

  const handleAddAll = () => {
    suggestions.forEach((s, idx) => {
      if (addedIndices.has(idx)) return;
      const due = new Date();
      due.setDate(due.getDate() + s.estimatedDays);
      const dueDate = due.toISOString().slice(0, 10);
      onAddTask({ title: s.title, priority: s.priority, dueDate });
    });
    setAddedIndices(new Set(suggestions.map((_, i) => i)));
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4 text-amber-500" />
        AI Suggest Tasks
      </Button>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <motion.div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25 }}
      >
        {/* Header gradient */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-foreground">AI Task Breakdown</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Describe your goal or project idea and get smart task suggestions.
          </p>

          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Build a mobile app for tracking fitness goals..."
            rows={3}
            className="mb-3"
          />

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!goal.trim() || generating}
            className="w-full mb-4"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Tasks</>
            )}
          </Button>

          {/* Suggestions */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                className="space-y-2 max-h-[300px] overflow-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{suggestions.length} tasks suggested</span>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddAll} disabled={addedIndices.size === suggestions.length}>
                    Add All
                  </Button>
                </div>

                {suggestions.map((s, idx) => {
                  const added = addedIndices.has(idx);
                  return (
                    <motion.div
                      key={idx}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                        added ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "bg-secondary/30 border-border"
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getPriorityColor(s.priority)}`}>
                            {s.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground">~{s.estimatedDays}d</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={added ? "outline" : "default"}
                        onClick={() => handleAdd(idx)}
                        disabled={added}
                        className="flex-shrink-0"
                      >
                        {added ? "Added" : <><Plus className="w-3 h-3 mr-1" /> Add</>}
                      </Button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
