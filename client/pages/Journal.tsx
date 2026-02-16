import { useState, useEffect, useMemo } from "react";
import { BookOpen, Search, Plus, Trash2, ArrowLeft, Hash, Calendar, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getEntries,
  getEntryByDate,
  saveEntry,
  deleteEntry,
  searchEntries,
  type JournalEntry,
} from "@/lib/journal";
import { MOOD_EMOJIS } from "@/lib/mood";
import { addXP, XP_REWARDS } from "@/lib/xp";
import { toast } from "sonner";

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Load entries
  useEffect(() => {
    setEntries(getEntries());
  }, []);

  // Load selected entry
  useEffect(() => {
    const entry = getEntryByDate(selectedDate);
    if (entry) {
      setBody(entry.body);
      setMood(entry.mood);
      setTags(entry.tags);
    } else {
      setBody("");
      setMood(undefined);
      setTags([]);
    }
  }, [selectedDate]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    return searchEntries(searchQuery);
  }, [entries, searchQuery]);

  const handleSave = () => {
    if (!body.trim()) return;
    setSaving(true);

    const isNew = !getEntryByDate(selectedDate);
    saveEntry({ date: selectedDate, body, mood, tags });
    setEntries(getEntries());

    if (isNew) {
      addXP("JOURNAL_ENTRY", XP_REWARDS.JOURNAL_ENTRY);
    }

    toast.success("Journal entry saved");
    setSaving(false);
  };

  const handleDelete = (date: string) => {
    deleteEntry(date);
    setEntries(getEntries());
    if (date === selectedDate) {
      setBody("");
      setMood(undefined);
      setTags([]);
    }
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const formatDate = (d: string) => {
    return new Date(d + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/20 dark:via-orange-950/10 to-amber-50/20 dark:to-amber-950/10">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div className="mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <motion.div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                Focus Journal
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">Daily reflections, blockers, and accomplishments</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar — entry list */}
            <motion.div
              className="lg:col-span-1 bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="pl-9 h-9"
                />
              </div>

              {/* New entry button */}
              <Button
                type="button"
                variant="outline"
                className="w-full mb-3"
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              >
                <Plus className="w-4 h-4 mr-2" />
                Today's Entry
              </Button>

              {/* Entry list */}
              <div className="space-y-1 max-h-[500px] overflow-auto">
                {filteredEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No entries yet. Start writing!</p>
                ) : (
                  filteredEntries.map((entry) => {
                    const isSelected = entry.date === selectedDate;
                    return (
                      <button
                        key={entry.date}
                        type="button"
                        onClick={() => setSelectedDate(entry.date)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-secondary/60 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {formatDate(entry.date)}
                          </span>
                          <div className="flex items-center gap-1">
                            {entry.mood && <span className="text-sm">{MOOD_EMOJIS[entry.mood - 1]?.emoji}</span>}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.date); }}
                              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {entry.body.slice(0, 80)}
                        </p>
                        {entry.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {entry.tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Editor */}
            <motion.div
              className="lg:col-span-2 bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-6 shadow-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Date and mood */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-semibold text-foreground bg-transparent border-none outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {MOOD_EMOJIS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(mood === m.value ? undefined : m.value)}
                      className={`text-lg p-1 rounded-lg transition-all ${
                        mood === m.value ? "bg-primary/10 scale-110 ring-2 ring-primary/30" : "opacity-50 hover:opacity-100"
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What did you accomplish today? Any blockers? Reflections?&#10;&#10;Supports markdown: **bold**, *italic*, - lists, ## headings"
                className="min-h-[280px] text-sm leading-relaxed resize-none mb-4 font-mono"
              />

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Hash className="w-4 h-4 text-muted-foreground" />
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-secondary rounded-lg text-foreground cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => handleRemoveTag(t)}
                  >
                    #{t} ×
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Add tag..."
                  className="text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground w-24"
                />
              </div>

              {/* Save */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[10px] text-muted-foreground">
                  {body.length} characters · {body.split(/\s+/).filter(Boolean).length} words
                </span>
                <Button type="button" onClick={handleSave} disabled={!body.trim() || saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
