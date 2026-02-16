import { useState } from "react";
import { LayoutTemplate, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  type TaskTemplate,
} from "@/lib/taskTemplates";

interface TaskTemplatesProps {
  onUseTemplate: (template: TaskTemplate) => void;
}

export default function TaskTemplates({ onUseTemplate }: TaskTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState(() => getAllTemplates());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📋");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDays, setNewDays] = useState(3);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const t = saveCustomTemplate({
      name: newName.trim(),
      icon: newIcon,
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      estimatedDays: newDays,
    });
    setTemplates(getAllTemplates());
    setShowCreate(false);
    setNewName("");
    setNewIcon("📋");
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setNewDays(3);
  };

  const handleDelete = (id: string) => {
    deleteCustomTemplate(id);
    setTemplates(getAllTemplates());
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="flex items-center gap-2">
        <LayoutTemplate className="w-4 h-4 text-indigo-500" />
        Templates
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

        <motion.div
          className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-foreground">Task Templates</h2>
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
              Click a template to create a task with pre-filled fields.
            </p>

            {/* Template grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-auto mb-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="group relative bg-secondary/30 border border-border rounded-xl p-3 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => { onUseTemplate(t); setOpen(false); }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                      t.priority === "high" ? "bg-red-100 text-red-700 border-red-200" :
                      t.priority === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                      "bg-green-100 text-green-700 border-green-200"
                    }`}>
                      {t.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground">~{t.estimatedDays}d</span>
                  </div>
                  {!t.isBuiltIn && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Create custom template */}
            {!showCreate ? (
              <Button type="button" variant="outline" onClick={() => setShowCreate(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Create Custom Template
              </Button>
            ) : (
              <motion.div
                className="space-y-3 p-4 bg-secondary/20 border border-border rounded-xl"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-12 h-9 text-center text-lg"
                    maxLength={2}
                  />
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Template name"
                    className="flex-1 h-9"
                  />
                </div>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Default title prefix (e.g. 'Bug: ')"
                  className="h-9"
                />
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Default description template"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg bg-input text-foreground"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <Input
                    type="number"
                    value={newDays}
                    onChange={(e) => setNewDays(parseInt(e.target.value) || 1)}
                    min={1}
                    max={90}
                    className="w-20 h-9"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                  <div className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="button" size="sm" onClick={handleCreate} disabled={!newName.trim()}>Save</Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
