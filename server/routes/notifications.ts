import { RequestHandler } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authorize";
import { getIO } from "../realtime";

// GET /api/notifications - list notifications for current user
export const getNotifications: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const count = await prisma.notification.count({
      where: { userId, readAt: null },
    });

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
};

// POST /api/notifications/:id/read
export const markNotificationRead: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const notificationId = parseInt(Array.isArray(id) ? id[0] : id);

    if (Number.isNaN(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    const io = getIO();
    io?.to(`user:${userId}`).emit("notification:read", { id: updated.id });

    res.json(updated);
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ error: "Failed to mark notification read" });
  }
};

// POST /api/notifications/read-all
export const markAllRead: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    const io = getIO();
    io?.to(`user:${userId}`).emit("notification:readAll", { ok: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ error: "Failed to mark all read" });
  }
};
