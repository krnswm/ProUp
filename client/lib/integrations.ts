// Integration Hub — localStorage-based connection state

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or URL
  category: "design" | "communication" | "storage" | "crm" | "development" | "productivity";
  color: string;
  connected: boolean;
  connectedAt?: string;
  accountLabel?: string; // e.g. "john@gmail.com" or "My Workspace"
  features: string[];
}

const STORAGE_KEY = "integrations:state";

export const DEFAULT_INTEGRATIONS: Omit<Integration, "connected" | "connectedAt" | "accountLabel">[] = [
  {
    id: "figma",
    name: "Figma",
    description: "Import design files, link frames to tasks, get notified on design updates",
    icon: "🎨",
    category: "design",
    color: "#a259ff",
    features: ["Link designs to tasks", "Preview embeds", "Comment sync", "Version tracking"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Attach Drive files to tasks, auto-sync documents, share folders with team",
    icon: "📁",
    category: "storage",
    color: "#4285f4",
    features: ["Attach files to tasks", "Auto-sync docs", "Shared folders", "File previews"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get task notifications in Slack, create tasks from messages, daily standup posts",
    icon: "💬",
    category: "communication",
    color: "#4a154b",
    features: ["Task notifications", "Create tasks from messages", "Standup posts", "Channel sync"],
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Create tasks from emails, send task updates via email, email notifications",
    icon: "📧",
    category: "communication",
    color: "#ea4335",
    features: ["Create tasks from emails", "Email notifications", "Thread linking", "Auto-forward"],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync CRM data, link deals to projects, track customer-related tasks",
    icon: "☁️",
    category: "crm",
    color: "#00a1e0",
    features: ["Sync contacts & deals", "Link to projects", "Pipeline tracking", "Activity logging"],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link PRs to tasks, auto-update task status on merge, commit references",
    icon: "🐙",
    category: "development",
    color: "#24292e",
    features: ["Link PRs to tasks", "Auto-close on merge", "Commit references", "Branch tracking"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync pages and databases, embed Notion docs in tasks, two-way updates",
    icon: "📝",
    category: "productivity",
    color: "#000000",
    features: ["Sync databases", "Embed pages", "Two-way sync", "Template import"],
  },
  {
    id: "trello",
    name: "Trello",
    description: "Import boards and cards, migrate projects, sync task status bidirectionally",
    icon: "📋",
    category: "productivity",
    color: "#0079bf",
    features: ["Import boards", "Migrate projects", "Bidirectional sync", "Label mapping"],
  },
  {
    id: "jira",
    name: "Jira",
    description: "Sync issues and sprints, import backlogs, map statuses between systems",
    icon: "🔷",
    category: "development",
    color: "#0052cc",
    features: ["Sync issues", "Sprint import", "Status mapping", "Epic linking"],
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Task notifications in Teams channels, create tasks from chats, meeting integration",
    icon: "🟣",
    category: "communication",
    color: "#6264a7",
    features: ["Channel notifications", "Chat-to-task", "Meeting notes", "Tab integration"],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Attach Dropbox files to tasks, sync shared folders, file version history",
    icon: "📦",
    category: "storage",
    color: "#0061ff",
    features: ["File attachments", "Folder sync", "Version history", "Team sharing"],
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Schedule meetings from tasks, auto-attach recordings, meeting summaries",
    icon: "📹",
    category: "communication",
    color: "#2d8cff",
    features: ["Schedule from tasks", "Recording attachments", "Meeting summaries", "Calendar sync"],
  },
];

function getSavedState(): Record<string, { connected: boolean; connectedAt?: string; accountLabel?: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: Record<string, { connected: boolean; connectedAt?: string; accountLabel?: string }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getIntegrations(): Integration[] {
  const saved = getSavedState();
  return DEFAULT_INTEGRATIONS.map((def) => {
    const s = saved[def.id];
    return {
      ...def,
      connected: s?.connected ?? false,
      connectedAt: s?.connectedAt,
      accountLabel: s?.accountLabel,
    };
  });
}

export function connectIntegration(id: string, accountLabel: string): Integration[] {
  const state = getSavedState();
  state[id] = { connected: true, connectedAt: new Date().toISOString(), accountLabel };
  saveState(state);
  return getIntegrations();
}

export function disconnectIntegration(id: string): Integration[] {
  const state = getSavedState();
  state[id] = { connected: false };
  saveState(state);
  return getIntegrations();
}

export function getConnectedCount(): number {
  return getIntegrations().filter((i) => i.connected).length;
}

export const CATEGORIES: { key: Integration["category"]; label: string; emoji: string }[] = [
  { key: "communication", label: "Communication", emoji: "💬" },
  { key: "storage", label: "Cloud Storage", emoji: "☁️" },
  { key: "design", label: "Design", emoji: "🎨" },
  { key: "development", label: "Development", emoji: "💻" },
  { key: "crm", label: "CRM", emoji: "📊" },
  { key: "productivity", label: "Productivity", emoji: "⚡" },
];
