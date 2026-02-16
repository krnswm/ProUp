// Pomodoro session tracking via localStorage

export interface PomodoroSession {
  taskId: number;
  taskTitle: string;
  startedAt: string; // ISO
  duration: number; // seconds actually focused
  type: "focus" | "break";
}

const STORAGE_KEY = "pomodoro:sessions";

export function getSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PomodoroSession[]) : [];
  } catch {
    return [];
  }
}

export function addSession(session: PomodoroSession) {
  const sessions = getSessions();
  sessions.push(session);
  // Keep last 500 sessions
  if (sessions.length > 500) sessions.splice(0, sessions.length - 500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getTaskSessions(taskId: number): PomodoroSession[] {
  return getSessions().filter((s) => s.taskId === taskId);
}

export function getTotalFocusMinutes(taskId: number): number {
  return getTaskSessions(taskId)
    .filter((s) => s.type === "focus")
    .reduce((sum, s) => sum + s.duration, 0) / 60;
}

// Pomodoro settings
export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

const SETTINGS_KEY = "pomodoro:settings";

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

export function getSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PomodoroSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PomodoroSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
