// Task Templates stored in localStorage

export interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedDays: number;
  isBuiltIn?: boolean;
}

const STORAGE_KEY = "task:templates";

export const BUILT_IN_TEMPLATES: TaskTemplate[] = [
  {
    id: "builtin-bug",
    name: "Bug Report",
    icon: "🐛",
    title: "Bug: ",
    description: "**Steps to reproduce:**\n1. \n\n**Expected behavior:**\n\n**Actual behavior:**\n\n**Environment:**\n",
    priority: "high",
    estimatedDays: 3,
    isBuiltIn: true,
  },
  {
    id: "builtin-feature",
    name: "Feature Request",
    icon: "✨",
    title: "Feature: ",
    description: "**User story:**\nAs a [user], I want [feature] so that [benefit].\n\n**Acceptance criteria:**\n- [ ] \n",
    priority: "medium",
    estimatedDays: 7,
    isBuiltIn: true,
  },
  {
    id: "builtin-chore",
    name: "Chore / Maintenance",
    icon: "🔧",
    title: "Chore: ",
    description: "**What needs to be done:**\n\n**Why:**\n",
    priority: "low",
    estimatedDays: 2,
    isBuiltIn: true,
  },
  {
    id: "builtin-spike",
    name: "Research Spike",
    icon: "🔍",
    title: "Spike: ",
    description: "**Goal:**\n\n**Questions to answer:**\n- \n\n**Time-box:** 1 day\n",
    priority: "medium",
    estimatedDays: 1,
    isBuiltIn: true,
  },
  {
    id: "builtin-design",
    name: "Design Task",
    icon: "🎨",
    title: "Design: ",
    description: "**Scope:**\n\n**Deliverables:**\n- [ ] Wireframes\n- [ ] Mockups\n- [ ] Prototype\n",
    priority: "medium",
    estimatedDays: 5,
    isBuiltIn: true,
  },
  {
    id: "builtin-review",
    name: "Code Review",
    icon: "👀",
    title: "Review: ",
    description: "**PR/Branch:**\n\n**Focus areas:**\n- \n",
    priority: "medium",
    estimatedDays: 1,
    isBuiltIn: true,
  },
];

export function getCustomTemplates(): TaskTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TaskTemplate[]) : [];
  } catch {
    return [];
  }
}

export function getAllTemplates(): TaskTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...getCustomTemplates()];
}

export function saveCustomTemplate(template: Omit<TaskTemplate, "id" | "isBuiltIn">) {
  const templates = getCustomTemplates();
  const newTemplate: TaskTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isBuiltIn: false,
  };
  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function deleteCustomTemplate(id: string) {
  const templates = getCustomTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
