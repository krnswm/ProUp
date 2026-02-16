// Gamification & XP System — localStorage-based

export interface XPState {
  totalXP: number;
  level: number;
  title: string;
  xpToNextLevel: number;
  xpInCurrentLevel: number;
}

export interface XPEvent {
  type: string;
  xp: number;
  timestamp: string;
}

const STORAGE_KEY = "gamification:xp";
const EVENTS_KEY = "gamification:events";

// XP rewards
export const XP_REWARDS = {
  TASK_COMPLETED: 25,
  TASK_CREATED: 5,
  STREAK_DAY: 15,
  FOCUS_SESSION: 20,
  COMMENT_ADDED: 3,
  JOURNAL_ENTRY: 10,
  DAILY_CHECKIN: 8,
} as const;

// Level thresholds and titles
const LEVELS: { minXP: number; title: string }[] = [
  { minXP: 0, title: "Rookie" },
  { minXP: 100, title: "Apprentice" },
  { minXP: 300, title: "Contributor" },
  { minXP: 600, title: "Achiever" },
  { minXP: 1000, title: "Pro" },
  { minXP: 1500, title: "Expert" },
  { minXP: 2200, title: "Veteran" },
  { minXP: 3000, title: "Master" },
  { minXP: 4000, title: "Grandmaster" },
  { minXP: 5500, title: "Legend" },
  { minXP: 7500, title: "Mythic" },
  { minXP: 10000, title: "Transcendent" },
];

function getLevelInfo(totalXP: number): { level: number; title: string; xpToNextLevel: number; xpInCurrentLevel: number } {
  let level = 0;
  let title = LEVELS[0].title;
  let currentThreshold = 0;
  let nextThreshold = LEVELS.length > 1 ? LEVELS[1].minXP : Infinity;

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXP >= LEVELS[i].minXP) {
      level = i + 1;
      title = LEVELS[i].title;
      currentThreshold = LEVELS[i].minXP;
      nextThreshold = i + 1 < LEVELS.length ? LEVELS[i + 1].minXP : LEVELS[i].minXP + 5000;
    }
  }

  const xpInCurrentLevel = totalXP - currentThreshold;
  const xpToNextLevel = nextThreshold - currentThreshold;

  return { level, title, xpToNextLevel, xpInCurrentLevel };
}

export function getTotalXP(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0") || 0;
  } catch {
    return 0;
  }
}

export function getXPState(): XPState {
  const totalXP = getTotalXP();
  const { level, title, xpToNextLevel, xpInCurrentLevel } = getLevelInfo(totalXP);
  return { totalXP, level, title, xpToNextLevel, xpInCurrentLevel };
}

export function addXP(type: string, xp: number): { newState: XPState; leveledUp: boolean; previousLevel: number } {
  const previousState = getXPState();
  const newTotal = previousState.totalXP + xp;
  localStorage.setItem(STORAGE_KEY, String(newTotal));

  // Log event
  const events = getRecentEvents();
  events.push({ type, xp, timestamp: new Date().toISOString() });
  // Keep last 200 events
  if (events.length > 200) events.splice(0, events.length - 200);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

  const newState = getXPState();
  const leveledUp = newState.level > previousState.level;

  return { newState, leveledUp, previousLevel: previousState.level };
}

export function getRecentEvents(limit: number = 50): XPEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const events = raw ? (JSON.parse(raw) as XPEvent[]) : [];
    return events.slice(-limit);
  } catch {
    return [];
  }
}

export function getXPToday(): number {
  const today = new Date().toISOString().slice(0, 10);
  return getRecentEvents(200)
    .filter((e) => e.timestamp.slice(0, 10) === today)
    .reduce((sum, e) => sum + e.xp, 0);
}

export function getAllLevels() {
  return LEVELS;
}
