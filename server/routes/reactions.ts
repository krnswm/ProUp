import { RequestHandler } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authorize";

const toInt = (v: unknown): number => {
  const n = parseInt(String(v));
  return Number.isNaN(n) ? 0 : n;
};

// GET /api/tasks/:taskId/reactions
export const getTaskReactions: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const reactions = await (prisma as any).taskReaction.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true } } },
    });

    // Group by emoji
    const grouped: Record<string, { emoji: string; count: number; users: { id: number; name: string }[] }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user);
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("Error fetching reactions:", error);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
};

// POST /api/tasks/:taskId/reactions
export const toggleReaction: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const userId = req.user?.id;
    const { emoji } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!emoji || typeof emoji !== "string") {
      res.status(400).json({ error: "emoji is required" });
      return;
    }

    // Check if already reacted
    const existing = await (prisma as any).taskReaction.findFirst({
      where: { taskId, userId, emoji },
    });

    if (existing) {
      // Remove reaction
      await (prisma as any).taskReaction.delete({ where: { id: existing.id } });
      res.json({ action: "removed", emoji });
    } else {
      // Add reaction
      await (prisma as any).taskReaction.create({
        data: { taskId, userId, emoji },
      });
      res.json({ action: "added", emoji });
    }
  } catch (error: any) {
    if (error?.code === "P2002") {
      // Race condition — already exists, try removing
      try {
        const taskId = toInt(req.params.taskId);
        const userId = (req as AuthRequest).user?.id;
        const { emoji } = req.body;
        const existing = await (prisma as any).taskReaction.findFirst({
          where: { taskId, userId, emoji },
        });
        if (existing) {
          await (prisma as any).taskReaction.delete({ where: { id: existing.id } });
        }
        res.json({ action: "removed", emoji });
        return;
      } catch { /* fall through */ }
    }
    console.error("Error toggling reaction:", error);
    res.status(500).json({ error: "Failed to toggle reaction" });
  }
};

// PATCH /api/tasks/:taskId/cover
export const updateTaskCover: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const { coverColor } = req.body;

    await prisma.task.update({
      where: { id: taskId },
      data: { coverColor: coverColor || null } as any,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating task cover:", error);
    res.status(500).json({ error: "Failed to update cover" });
  }
};
