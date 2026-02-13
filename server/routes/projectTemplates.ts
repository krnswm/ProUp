import { RequestHandler } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authorize";

type TemplateSeed = {
  name: string;
  description?: string;
  tasks: Array<{
    title: string;
    description?: string;
    status: "todo" | "inprogress" | "done";
    priority: "low" | "medium" | "high";
    dueOffsetDays?: number;
  }>;
};

const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    name: "Website Launch",
    description: "A simple checklist to launch a website.",
    tasks: [
      { title: "Define pages & content", status: "todo", priority: "high", dueOffsetDays: 0 },
      { title: "Design UI", status: "todo", priority: "high", dueOffsetDays: 2 },
      { title: "Implement pages", status: "inprogress", priority: "high", dueOffsetDays: 4 },
      { title: "QA & Fix bugs", status: "todo", priority: "medium", dueOffsetDays: 6 },
      { title: "Deploy", status: "todo", priority: "high", dueOffsetDays: 7 },
    ],
  },
  {
    name: "Hackathon",
    description: "Fast execution template for a 24–48h hackathon.",
    tasks: [
      { title: "Pick idea & scope", status: "todo", priority: "high", dueOffsetDays: 0 },
      { title: "Define MVP features", status: "todo", priority: "high", dueOffsetDays: 0 },
      { title: "Build core flow", status: "inprogress", priority: "high", dueOffsetDays: 1 },
      { title: "Prepare demo", status: "todo", priority: "high", dueOffsetDays: 1 },
      { title: "Pitch deck", status: "todo", priority: "medium", dueOffsetDays: 1 },
    ],
  },
  {
    name: "Client Onboarding",
    description: "A quick onboarding checklist for new clients.",
    tasks: [
      { title: "Kickoff call", status: "todo", priority: "high", dueOffsetDays: 0 },
      { title: "Gather requirements", status: "todo", priority: "high", dueOffsetDays: 1 },
      { title: "Define milestones", status: "todo", priority: "medium", dueOffsetDays: 2 },
      { title: "Share timeline", status: "todo", priority: "medium", dueOffsetDays: 2 },
    ],
  },
];

const ensureSeeded = async (ownerId: number) => {
  const count = await prisma.projectTemplate.count({ where: { ownerId } });
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_TEMPLATES.map((t) =>
      prisma.projectTemplate.create({
        data: {
          name: t.name,
          description: t.description,
          ownerId,
          tasks: {
            create: t.tasks.map((task, idx) => ({
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueOffsetDays: task.dueOffsetDays,
              position: idx,
            })),
          },
        },
      })
    )
  );
};

// GET /api/project-templates
export const getProjectTemplates: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    await ensureSeeded(userId);

    const templates = await prisma.projectTemplate.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: {
          orderBy: [{ status: "asc" }, { position: "asc" }],
        },
      },
    });

    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};
