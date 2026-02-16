import { RequestHandler } from "express";
import { prisma } from "../prisma";

const toInt = (v: unknown): number => {
  const n = parseInt(String(v));
  return Number.isNaN(n) ? 0 : n;
};

// GET /api/projects/:projectId/labels
export const getProjectLabels: RequestHandler = async (req, res) => {
  try {
    const projectId = toInt(req.params.projectId);
    const labels = await (prisma as any).label.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    });
    res.json(labels);
  } catch (error) {
    console.error("Error fetching labels:", error);
    res.status(500).json({ error: "Failed to fetch labels" });
  }
};

// POST /api/projects/:projectId/labels
export const createLabel: RequestHandler = async (req, res) => {
  try {
    const projectId = toInt(req.params.projectId);
    const { name, color } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Label name is required" });
      return;
    }

    const label = await (prisma as any).label.create({
      data: {
        projectId,
        name: name.trim(),
        color: typeof color === "string" && color.trim() ? color.trim() : "#3b82f6",
      },
    });

    res.status(201).json(label);
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "A label with that name already exists in this project" });
      return;
    }
    console.error("Error creating label:", error);
    res.status(500).json({ error: "Failed to create label" });
  }
};

// PUT /api/projects/:projectId/labels/:labelId
export const updateLabel: RequestHandler = async (req, res) => {
  try {
    const labelId = toInt(req.params.labelId);
    const { name, color } = req.body;

    const data: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof color === "string" && color.trim()) data.color = color.trim();

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    const label = await (prisma as any).label.update({
      where: { id: labelId },
      data,
    });

    res.json(label);
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "A label with that name already exists" });
      return;
    }
    console.error("Error updating label:", error);
    res.status(500).json({ error: "Failed to update label" });
  }
};

// DELETE /api/projects/:projectId/labels/:labelId
export const deleteLabel: RequestHandler = async (req, res) => {
  try {
    const labelId = toInt(req.params.labelId);
    await (prisma as any).label.delete({ where: { id: labelId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting label:", error);
    res.status(500).json({ error: "Failed to delete label" });
  }
};

// POST /api/tasks/:taskId/labels
export const addLabelToTask: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const { labelId } = req.body;

    if (!labelId) {
      res.status(400).json({ error: "labelId is required" });
      return;
    }

    const taskLabel = await (prisma as any).taskLabel.create({
      data: { taskId, labelId: toInt(labelId) },
      include: { label: true },
    });

    res.status(201).json(taskLabel);
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Label already assigned to this task" });
      return;
    }
    console.error("Error adding label to task:", error);
    res.status(500).json({ error: "Failed to add label" });
  }
};

// DELETE /api/tasks/:taskId/labels/:labelId
export const removeLabelFromTask: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const labelId = toInt(req.params.labelId);

    await (prisma as any).taskLabel.deleteMany({
      where: { taskId, labelId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing label from task:", error);
    res.status(500).json({ error: "Failed to remove label" });
  }
};

// GET /api/tasks/:taskId/labels
export const getTaskLabels: RequestHandler = async (req, res) => {
  try {
    const taskId = toInt(req.params.taskId);
    const taskLabels = await (prisma as any).taskLabel.findMany({
      where: { taskId },
      include: { label: true },
    });
    res.json(taskLabels.map((tl) => tl.label));
  } catch (error) {
    console.error("Error fetching task labels:", error);
    res.status(500).json({ error: "Failed to fetch task labels" });
  }
};
