export type AchievementId =
  | "FIRST_DONE"
  | "DONE_10"
  | "DONE_50"
  | "STREAK_3"
  | "STREAK_7"
  | "STREAK_14";

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "FIRST_DONE", title: "First Win", description: "Complete your first task." },
  { id: "DONE_10", title: "Getting Things Done", description: "Complete 10 tasks." },
  { id: "DONE_50", title: "Momentum", description: "Complete 50 tasks." },
  { id: "STREAK_3", title: "3‑Day Streak", description: "Complete tasks 3 days in a row." },
  { id: "STREAK_7", title: "7‑Day Streak", description: "Complete tasks 7 days in a row." },
  { id: "STREAK_14", title: "14‑Day Streak", description: "Complete tasks 14 days in a row." },
];

const KEY_UNLOCKED = "achievements:unlocked";
const KEY_DONE_COUNT = "achievements:doneCount";

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const listAchievements = () => ACHIEVEMENTS;

export const getUnlockedAchievements = (): AchievementId[] => {
  return readJson<AchievementId[]>(KEY_UNLOCKED, []);
};

export const getDoneCount = (): number => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(KEY_DONE_COUNT);
  const n = raw ? parseInt(raw) : 0;
  return Number.isNaN(n) ? 0 : n;
};

export const incrementDoneCount = (): number => {
  const next = getDoneCount() + 1;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_DONE_COUNT, String(next));
  }
  return next;
};

export const unlockAchievements = (input: { streak: number; doneCount: number }) => {
  const unlocked = new Set(getUnlockedAchievements());
  const newlyUnlocked: Achievement[] = [];

  const shouldUnlock = (id: AchievementId) => {
    if (unlocked.has(id)) return false;
    unlocked.add(id);
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) newlyUnlocked.push(a);
    return true;
  };

  if (input.doneCount >= 1) shouldUnlock("FIRST_DONE");
  if (input.doneCount >= 10) shouldUnlock("DONE_10");
  if (input.doneCount >= 50) shouldUnlock("DONE_50");

  if (input.streak >= 3) shouldUnlock("STREAK_3");
  if (input.streak >= 7) shouldUnlock("STREAK_7");
  if (input.streak >= 14) shouldUnlock("STREAK_14");

  writeJson(KEY_UNLOCKED, Array.from(unlocked));

  return newlyUnlocked;
};
