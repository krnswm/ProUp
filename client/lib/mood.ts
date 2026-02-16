// Mood / Energy check-in tracking via localStorage

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  energy: number; // 1-5
  emoji: string;
  note?: string;
}

const STORAGE_KEY = "mood:entries";

export const MOOD_EMOJIS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😫", label: "Exhausted" },
  { value: 2, emoji: "😔", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🔥", label: "Great" },
];

export const ENERGY_LEVELS: { value: number; label: string; color: string }[] = [
  { value: 1, label: "Very Low", color: "#ef4444" },
  { value: 2, label: "Low", color: "#f97316" },
  { value: 3, label: "Medium", color: "#eab308" },
  { value: 4, label: "High", color: "#22c55e" },
  { value: 5, label: "Very High", color: "#10b981" },
];

export function getEntries(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MoodEntry[]) : [];
  } catch {
    return [];
  }
}

export function getTodayEntry(): MoodEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return getEntries().find((e) => e.date === today) || null;
}

export function saveEntry(entry: MoodEntry) {
  const entries = getEntries().filter((e) => e.date !== entry.date);
  entries.push(entry);
  // Keep last 365 entries
  if (entries.length > 365) entries.splice(0, entries.length - 365);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getRecentEntries(days: number = 14): MoodEntry[] {
  const entries = getEntries();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter((e) => e.date >= cutoffStr);
}

export function getAverageMood(days: number = 7): number {
  const recent = getRecentEntries(days);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, e) => sum + e.mood, 0) / recent.length;
}

export function getAverageEnergy(days: number = 7): number {
  const recent = getRecentEntries(days);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, e) => sum + e.energy, 0) / recent.length;
}

export function isLowEnergyDay(): boolean {
  const today = getTodayEntry();
  if (!today) return false;
  return today.energy <= 2;
}
