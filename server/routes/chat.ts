import { RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import { getIO } from "../realtime";

const prisma = new PrismaClient();

// GET /api/projects/:projectId/chat?cursor=&limit=
export const getChatMessages: RequestHandler = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId as string);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid projectId" });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Return in chronological order
    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// POST /api/projects/:projectId/chat
export const postChatMessage: RequestHandler = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId as string);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid projectId" });

    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { body } = req.body;
    if (!body || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "Message body is required" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        authorId: userId,
        body: body.trim(),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Broadcast via socket
    const io = getIO();
    if (io) {
      io.to(`project:${projectId}`).emit("chat:message", { message });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error posting chat message:", error);
    res.status(500).json({ error: "Failed to post message" });
  }
};
