import { RequestHandler } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authorize";

const parseIdParam = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const id = parseInt(String(raw));
  return Number.isNaN(id) ? null : id;
};

// GET /api/tasks/:taskId/dependencies
// Returns both directions: blockedBy (deps) and blocks (dependents)
export const getTaskDependencies: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const taskId = parseIdParam((req.params as any).taskId);
    if (!taskId) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const blockedBy = await prisma.taskDependency.findMany({
      where: { blockedTaskId: taskId },
      include: {
        blockingTask: {
          select: { id: true, title: true, status: true, projectId: true },
        },
      },
      orderBy: { id: "asc" },
    });

    const blocks = await prisma.taskDependency.findMany({
      where: { blockingTaskId: taskId },
      include: {
        blockedTask: {
          select: { id: true, title: true, status: true, projectId: true },
        },
      },
      orderBy: { id: "asc" },
    });

    res.json({ blockedBy, blocks });
  } catch (error) {
    console.error("Error fetching task dependencies:", error);
    res.status(500).json({ error: "Failed to fetch dependencies" });
  }
};

// POST /api/tasks/:taskId/dependencies { dependsOnTaskId }
export const addTaskDependency: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const taskId = parseIdParam((req.params as any).taskId);
    if (!taskId) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const dependsOnTaskIdRaw = (req.body as any)?.dependsOnTaskId;
    const dependsOnTaskId = parseIdParam(dependsOnTaskIdRaw);
    if (!dependsOnTaskId) {
      return res.status(400).json({ error: "dependsOnTaskId is required" });
    }

    if (dependsOnTaskId === taskId) {
      return res.status(400).json({ error: "A task cannot depend on itself" });
    }

    const [blocked, blocking] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true } }),
      prisma.task.findUnique({ where: { id: dependsOnTaskId }, select: { id: true, projectId: true } }),
    ]);

    if (!blocked || !blocking) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (!blocked.projectId || blocked.projectId !== blocking.projectId) {
      return res.status(400).json({ error: "Dependencies must be within the same project" });
    }

    const dep = await prisma.taskDependency.create({
      data: {
        blockedTaskId: taskId,
        blockingTaskId: dependsOnTaskId,
      },
      include: {
        blockingTask: { select: { id: true, title: true, status: true } },
      },
    });

    res.status(201).json(dep);
  } catch (error) {
    console.error("Error adding dependency:", error);
    res.status(500).json({ error: "Failed to add dependency" });
  }
};

// DELETE /api/tasks/:taskId/dependencies/:dependsOnTaskId
export const removeTaskDependency: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const taskId = parseIdParam((req.params as any).taskId);
    const dependsOnTaskId = parseIdParam((req.params as any).dependsOnTaskId);

    if (!taskId || !dependsOnTaskId) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await prisma.taskDependency.deleteMany({
      where: { blockedTaskId: taskId, blockingTaskId: dependsOnTaskId },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error removing dependency:", error);
    res.status(500).json({ error: "Failed to remove dependency" });
  }
};
