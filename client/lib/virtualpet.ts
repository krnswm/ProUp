// Virtual Pet / Tamagotchi System — localStorage-based
// Pet grows healthier when you're productive and gets sad when you procrastinate

export type PetMood = "ecstatic" | "happy" | "content" | "neutral" | "sad" | "sick";
export type PetStage = "egg" | "baby" | "teen" | "adult" | "legendary";

export interface PetState {
  name: string;
  stage: PetStage;
  mood: PetMood;
  hunger: number;      // 0-100 (0 = starving, 100 = full)
  happiness: number;   // 0-100
  energy: number;      // 0-100
  xp: number;          // total pet XP (drives evolution)
  createdAt: string;
  lastFedAt: string;
  lastPlayedAt: string;
  lastCheckedAt: string;
  totalFeedings: number;
  totalPlays: number;
  streak: number;       // consecutive days interacted
  accessories: string[];
}

export interface FeedResult {
  hungerGain: number;
  happinessGain: number;
  xpGain: number;
  evolved: boolean;
  newStage?: PetStage;
}

// ── Constants ──────────────────────────────────────────────────

const STORAGE_KEY = "virtualpet:state";

export const STAGE_THRESHOLDS: { stage: PetStage; minXP: number; emoji: string }[] = [
  { stage: "egg", minXP: 0, emoji: "🥚" },
  { stage: "baby", minXP: 50, emoji: "🐣" },
  { stage: "teen", minXP: 200, emoji: "🐥" },
  { stage: "adult", minXP: 500, emoji: "🐔" },
  { stage: "legendary", minXP: 1200, emoji: "🦅" },
];

const MOOD_THRESHOLDS: { mood: PetMood; minAvg: number }[] = [
  { mood: "ecstatic", minAvg: 90 },
  { mood: "happy", minAvg: 70 },
  { mood: "content", minAvg: 50 },
  { mood: "neutral", minAvg: 30 },
  { mood: "sad", minAvg: 15 },
  { mood: "sick", minAvg: 0 },
];

// Food items the pet can eat (earned by productivity)
export const FOOD_ITEMS = [
  { id: "task_snack", name: "Task Snack", emoji: "🍎", hunger: 15, happiness: 5, xp: 10, source: "Complete a task" },
  { id: "focus_meal", name: "Focus Meal", emoji: "🍕", hunger: 25, happiness: 10, xp: 20, source: "Pomodoro session" },
  { id: "journal_treat", name: "Journal Treat", emoji: "🍰", hunger: 10, happiness: 20, xp: 15, source: "Write a journal entry" },
  { id: "streak_feast", name: "Streak Feast", emoji: "🎂", hunger: 30, happiness: 25, xp: 30, source: "Maintain a streak" },
  { id: "collab_candy", name: "Collab Candy", emoji: "🍬", hunger: 10, happiness: 15, xp: 12, source: "Add a comment" },
] as const;

export type FoodId = typeof FOOD_ITEMS[number]["id"];

// Activities to play with pet
export const PLAY_ACTIVITIES = [
  { id: "pet", name: "Pet", emoji: "🤗", happiness: 10, energy: -5 },
  { id: "walk", name: "Walk", emoji: "🚶", happiness: 15, energy: -10 },
  { id: "nap", name: "Nap", emoji: "😴", happiness: 5, energy: 30 },
  { id: "dance", name: "Dance", emoji: "💃", happiness: 20, energy: -15 },
] as const;

export type PlayId = typeof PLAY_ACTIVITIES[number]["id"];

// Pet appearance per stage + mood
export const PET_SPRITES: Record<PetStage, Record<PetMood, string>> = {
  egg: {
    ecstatic: "🥚✨", happy: "🥚", content: "🥚", neutral: "🥚", sad: "🥚💧", sick: "🥚💀",
  },
  baby: {
    ecstatic: "🐣✨", happy: "🐣😊", content: "🐣", neutral: "🐣😐", sad: "🐣😢", sick: "🐣🤒",
  },
  teen: {
    ecstatic: "🐥🌟", happy: "🐥😄", content: "🐥", neutral: "🐥😑", sad: "🐥😿", sick: "🐥🤕",
  },
  adult: {
    ecstatic: "🐔👑", happy: "🐔😁", content: "🐔", neutral: "🐔😶", sad: "🐔😞", sick: "🐔🤒",
  },
  legendary: {
    ecstatic: "🦅👑✨", happy: "🦅🌟", content: "🦅", neutral: "🦅😐", sad: "🦅😢", sick: "🦅💀",
  },
};

// ── Core Functions ─────────────────────────────────────────────

export function getPetState(): PetState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePetState(state: PetState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createPet(name: string): PetState {
  const now = new Date().toISOString();
  const state: PetState = {
    name,
    stage: "egg",
    mood: "content",
    hunger: 70,
    happiness: 70,
    energy: 100,
    xp: 0,
    createdAt: now,
    lastFedAt: now,
    lastPlayedAt: now,
    lastCheckedAt: now,
    totalFeedings: 0,
    totalPlays: 0,
    streak: 0,
    accessories: [],
  };
  savePetState(state);
  return state;
}

export function renamePet(newName: string): PetState | null {
  const state = getPetState();
  if (!state) return null;
  state.name = newName;
  savePetState(state);
  return state;
}

// ── Decay (simulates time passing) ────────────────────────────

export function applyDecay(state: PetState): PetState {
  const now = Date.now();
  const lastChecked = new Date(state.lastCheckedAt).getTime();
  const hoursPassed = (now - lastChecked) / (1000 * 60 * 60);

  if (hoursPassed < 0.5) return state; // no decay within 30 min

  // Decay rates per hour
  const hungerDecay = Math.min(hoursPassed * 3, 50);  // lose 3 hunger/hr, max 50
  const happinessDecay = Math.min(hoursPassed * 2, 40); // lose 2 happiness/hr, max 40
  const energyGain = Math.min(hoursPassed * 5, 50);    // gain 5 energy/hr (resting), max 50

  state.hunger = Math.max(0, state.hunger - hungerDecay);
  state.happiness = Math.max(0, state.happiness - happinessDecay);
  state.energy = Math.min(100, state.energy + energyGain);
  state.lastCheckedAt = new Date().toISOString();

  // Update mood based on average stats
  state.mood = calculateMood(state);

  savePetState(state);
  return state;
}

// ── Feeding ────────────────────────────────────────────────────

export function feedPet(foodId: FoodId): FeedResult | null {
  const state = getPetState();
  if (!state) return null;

  const food = FOOD_ITEMS.find((f) => f.id === foodId);
  if (!food) return null;

  state.hunger = Math.min(100, state.hunger + food.hunger);
  state.happiness = Math.min(100, state.happiness + food.happiness);
  state.xp += food.xp;
  state.totalFeedings++;
  state.lastFedAt = new Date().toISOString();

  // Check evolution
  const oldStage = state.stage;
  state.stage = calculateStage(state.xp);
  const evolved = state.stage !== oldStage;

  state.mood = calculateMood(state);
  savePetState(state);

  return {
    hungerGain: food.hunger,
    happinessGain: food.happiness,
    xpGain: food.xp,
    evolved,
    newStage: evolved ? state.stage : undefined,
  };
}

// ── Playing ────────────────────────────────────────────────────

export function playWithPet(activityId: PlayId): { happinessGain: number; energyCost: number } | null {
  const state = getPetState();
  if (!state) return null;

  const activity = PLAY_ACTIVITIES.find((a) => a.id === activityId);
  if (!activity) return null;

  if (state.energy + activity.energy < 0) return null; // not enough energy

  state.happiness = Math.min(100, Math.max(0, state.happiness + activity.happiness));
  state.energy = Math.min(100, Math.max(0, state.energy + activity.energy));
  state.totalPlays++;
  state.lastPlayedAt = new Date().toISOString();
  state.xp += 5; // small XP for playing

  // Check evolution
  state.stage = calculateStage(state.xp);
  state.mood = calculateMood(state);
  savePetState(state);

  return { happinessGain: activity.happiness, energyCost: Math.abs(activity.energy) };
}

// ── Productivity Rewards (call from task completion etc.) ──────

export function rewardPet(type: "task" | "focus" | "journal" | "streak" | "comment"): FeedResult | null {
  const foodMap: Record<string, FoodId> = {
    task: "task_snack",
    focus: "focus_meal",
    journal: "journal_treat",
    streak: "streak_feast",
    comment: "collab_candy",
  };
  return feedPet(foodMap[type]);
}

// ── Helpers ────────────────────────────────────────────────────

function calculateStage(xp: number): PetStage {
  let stage: PetStage = "egg";
  for (const t of STAGE_THRESHOLDS) {
    if (xp >= t.minXP) stage = t.stage;
  }
  return stage;
}

function calculateMood(state: PetState): PetMood {
  const avg = (state.hunger + state.happiness + state.energy) / 3;
  for (const t of MOOD_THRESHOLDS) {
    if (avg >= t.minAvg) return t.mood;
  }
  return "sick";
}

export function getStageInfo(stage: PetStage) {
  return STAGE_THRESHOLDS.find((t) => t.stage === stage) || STAGE_THRESHOLDS[0];
}

export function getNextStageInfo(xp: number): { stage: PetStage; xpNeeded: number; emoji: string } | null {
  for (const t of STAGE_THRESHOLDS) {
    if (xp < t.minXP) return { stage: t.stage, xpNeeded: t.minXP - xp, emoji: t.emoji };
  }
  return null; // max stage
}

export function getPetAge(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Born today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

export function getPetSprite(stage: PetStage, mood: PetMood): string {
  return PET_SPRITES[stage]?.[mood] || PET_SPRITES.egg.content;
}

export function deletePet(): void {
  localStorage.removeItem(STORAGE_KEY);
}
