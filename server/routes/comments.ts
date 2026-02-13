import { RequestHandler } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authorize";
import { getIO } from "../realtime";

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

const extractMentions = (text: string) => {
  const results: string[] = [];

  // Supports: @username or @email or @"Full Name"
  const regex = /@"([^"]+)"|@([a-zA-Z0-9._-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    const value = (match[1] || match[2] || "").trim();
    if (value) results.push(value);
  }

  return Array.from(new Set(results));
};

const getTaskLink = (task: { id: number; projectId: number | null }) =>
  task.projectId ? `/project/${task.projectId}?task=${task.id}` : `/my-tasks?task=${task.id}`;

const resolveUsersFromMentions = async (mentions: string[]) => {
  if (mentions.length === 0) return [];

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  const byEmail = new Map(users.map((u) => [normalize(u.email), u]));
  const byName = new Map(users.map((u) => [normalize(u.name), u]));

  const byNameTokens = users.map((u) => ({
    user: u,
    normalized: normalize(u.name),
  }));

  const resolved = mentions
    .map((m) => {
      const key = normalize(m);
      if (key.includes("@")) return byEmail.get(key) ?? null;

      const exact = byName.get(key);
      if (exact) return exact;

      // Partial match (e.g. @mahak -> 'Mahak Kankaria')
      const hit = byNameTokens.find((entry) => {
        if (!key) return false;
        if (entry.normalized === key) return true;
        if (entry.normalized.startsWith(key)) return true;
        if (entry.normalized.includes(key)) return true;
        return false;
      });

      return hit?.user ?? null;
    })
    .filter((u): u is { id: number; email: string; name: string } => !!u);

  // de-dupe by user id
  const seen = new Set<number>();
  return resolved.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
};

const createNotificationSafe = async (input: {
  userId: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) => {
  try {
    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });

    const io = getIO();
    io?.to(`user:${input.userId}`).emit("notification:created", created);
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

const emitToTask = (taskId: number, event: string, payload: any) => {
  const io = getIO();
  io?.to(`task:${taskId}`).emit(event, payload);
};

// GET /api/tasks/:taskId/comments
export const getTaskComments: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { taskId } = req.params;
    const id = parseInt(Array.isArray(taskId) ? taskId[0] : taskId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

// POST /api/tasks/:taskId/comments { body }
export const createTaskComment: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { taskId } = req.params;
    const id = parseInt(Array.isArray(taskId) ? taskId[0] : taskId);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    const bodyRaw = String((req.body as any)?.body ?? "").trim();
    if (!bodyRaw) {
      return res.status(400).json({ error: "body is required" });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, title: true, projectId: true },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        authorId: userId,
        body: bodyRaw,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Mentions -> notifications
    const mentions = extractMentions(bodyRaw);
    const mentionedUsers = await resolveUsersFromMentions(mentions);
    const link = getTaskLink({ id: task.id, projectId: task.projectId ?? null });

    await Promise.all(
      mentionedUsers
        .filter((u) => u.id !== userId)
        .map((u) =>
          createNotificationSafe({
            userId: u.id,
            type: "COMMENT_MENTION",
            title: "Mentioned in a comment",
            body: task.title,
            link,
          })
        )
    );

    emitToTask(id, "comment:created", { comment });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
};

// PATCH /api/tasks/:taskId/comments/:commentId { body }
export const updateTaskComment: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { taskId, commentId } = req.params as any;
    const taskIdInt = parseInt(Array.isArray(taskId) ? taskId[0] : taskId);
    const commentIdInt = parseInt(Array.isArray(commentId) ? commentId[0] : commentId);

    if (Number.isNaN(taskIdInt) || Number.isNaN(commentIdInt)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const bodyRaw = String((req.body as any)?.body ?? "").trim();
    if (!bodyRaw) {
      return res.status(400).json({ error: "body is required" });
    }

    const existing = await prisma.comment.findFirst({
      where: { id: commentIdInt, taskId: taskIdInt },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (existing.authorId !== userId) {
      return res.status(403).json({ error: "You can only edit your own comments" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskIdInt },
      select: { id: true, title: true, projectId: true },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updated = await prisma.comment.update({
      where: { id: commentIdInt },
      data: { body: bodyRaw },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Mentions -> notifications (for updated content)
    const mentions = extractMentions(bodyRaw);
    const mentionedUsers = await resolveUsersFromMentions(mentions);
    const link = getTaskLink({ id: task.id, projectId: task.projectId ?? null });

    await Promise.all(
      mentionedUsers
        .filter((u) => u.id !== userId)
        .map((u) =>
          createNotificationSafe({
            userId: u.id,
            type: "COMMENT_MENTION",
            title: "Mentioned in a comment",
            body: task.title,
            link,
          })
        )
    );

    emitToTask(taskIdInt, "comment:updated", { comment: updated });

    res.json(updated);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
};

// DELETE /api/tasks/:taskId/comments/:commentId
export const deleteTaskComment: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { taskId, commentId } = req.params as any;
    const taskIdInt = parseInt(Array.isArray(taskId) ? taskId[0] : taskId);
    const commentIdInt = parseInt(Array.isArray(commentId) ? commentId[0] : commentId);

    if (Number.isNaN(taskIdInt) || Number.isNaN(commentIdInt)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const existing = await prisma.comment.findFirst({
      where: { id: commentIdInt, taskId: taskIdInt },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (existing.authorId !== userId) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    await prisma.comment.delete({ where: { id: commentIdInt } });

    emitToTask(taskIdInt, "comment:deleted", { commentId: commentIdInt });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};
