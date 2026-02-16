// Focus Journal — localStorage-based daily notes

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  body: string; // markdown
  mood?: number; // 1-5
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "journal:entries";

export function getEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getEntryByDate(date: string): JournalEntry | null {
  return getEntries().find((e) => e.date === date) || null;
}

export function saveEntry(entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">): JournalEntry {
  const entries = getEntries();
  const existing = entries.find((e) => e.date === entry.date);

  if (existing) {
    existing.body = entry.body;
    existing.mood = entry.mood;
    existing.tags = entry.tags;
    existing.updatedAt = new Date().toISOString();
    saveEntries(entries);
    return existing;
  }

  const newEntry: JournalEntry = {
    ...entry,
    id: `journal-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  // Keep last 365 entries
  if (entries.length > 365) entries.splice(0, entries.length - 365);
  entries.sort((a, b) => b.date.localeCompare(a.date));
  saveEntries(entries);
  return newEntry;
}

export function deleteEntry(date: string) {
  const entries = getEntries().filter((e) => e.date !== date);
  saveEntries(entries);
}

export function searchEntries(query: string): JournalEntry[] {
  const q = query.toLowerCase();
  return getEntries().filter(
    (e) =>
      e.body.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)) ||
      e.date.includes(q)
  );
}
