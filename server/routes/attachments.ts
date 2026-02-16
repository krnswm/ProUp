import { RequestHandler } from "express";
import { prisma } from "../prisma";

const toInt = (v: unknown): number => {
  const n = parseInt(String(v));
  return Number.isNaN(n) ? 0 : n;
};

// GET /api/tasks/:taskId/attachments
export const getTaskAttachments: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const attachments = await (prisma as any).taskAttachment.findMany({
      where: { taskId },
      select: { id: true, taskId: true, filename: true, mimetype: true, size: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
};

// POST /api/tasks/:taskId/attachments
// Expects multipart/form-data with a "file" field — but since we want to keep it simple
// without multer, we accept base64-encoded JSON: { filename, mimetype, data (base64) }
export const uploadAttachment: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const { filename, mimetype, data } = req.body;

    if (!filename || !data) {
      res.status(400).json({ error: "filename and data (base64) are required" });
      return;
    }

    const buffer = Buffer.from(data, "base64");
    const size = buffer.length;

    // Limit to 5MB
    if (size > 5 * 1024 * 1024) {
      res.status(413).json({ error: "File too large. Maximum size is 5MB." });
      return;
    }

    const attachment = await (prisma as any).taskAttachment.create({
      data: {
        taskId,
        filename: String(filename),
        mimetype: String(mimetype || "application/octet-stream"),
        size,
        data: buffer,
      },
      select: { id: true, taskId: true, filename: true, mimetype: true, size: true, createdAt: true },
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
};

// GET /api/attachments/:attachmentId/download
export const downloadAttachment: RequestHandler = async (req, res) => {
  try {
    const attachmentId = toInt(req.params.attachmentId);
    const attachment = await (prisma as any).taskAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    res.setHeader("Content-Type", attachment.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.filename}"`);
    res.setHeader("Content-Length", attachment.size);
    res.send(Buffer.from(attachment.data));
  } catch (error) {
    console.error("Error downloading attachment:", error);
    res.status(500).json({ error: "Failed to download attachment" });
  }
};

// DELETE /api/attachments/:attachmentId
export const deleteAttachment: RequestHandler = async (req, res) => {
  try {
    const attachmentId = toInt(req.params.attachmentId);
    await (prisma as any).taskAttachment.delete({ where: { id: attachmentId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
};
