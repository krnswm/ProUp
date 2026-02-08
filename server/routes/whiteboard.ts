import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';

/**
 * GET /api/whiteboard/:projectId
 * Fetch whiteboard state for a project
 */
export const getWhiteboard: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectIdInt = parseInt(Array.isArray(projectId) ? projectId[0] : projectId);

    // Find or create whiteboard for this project
    let whiteboard = await prisma.whiteboard.findUnique({
      where: { projectId: projectIdInt },
    });

    if (!whiteboard) {
      // Create a new whiteboard with empty state
      whiteboard = await prisma.whiteboard.create({
        data: {
          projectId: projectIdInt,
          data: '{}',
        },
      });
    }

    res.json({
      projectId: whiteboard.projectId,
      data: whiteboard.data,
      updatedAt: whiteboard.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching whiteboard:', error);
    res.status(500).json({ error: 'Failed to fetch whiteboard' });
  }
};

/**
 * POST /api/whiteboard/:projectId
 * Save whiteboard state for a project
 */
export const saveWhiteboard: RequestHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data } = req.body;
    const projectIdInt = parseInt(Array.isArray(projectId) ? projectId[0] : projectId);

    if (!data) {
      return res.status(400).json({ error: 'Whiteboard data is required' });
    }

    // Validate that data is valid JSON string
    let jsonData: string;
    if (typeof data === 'string') {
      jsonData = data;
    } else {
      jsonData = JSON.stringify(data);
    }

    // Upsert whiteboard (create if doesn't exist, update if exists)
    const whiteboard = await prisma.whiteboard.upsert({
      where: { projectId: projectIdInt },
      update: {
        data: jsonData,
      },
      create: {
        projectId: projectIdInt,
        data: jsonData,
      },
    });

    res.json({
      message: 'Whiteboard saved successfully',
      projectId: whiteboard.projectId,
      updatedAt: whiteboard.updatedAt,
    });
  } catch (error) {
    console.error('Error saving whiteboard:', error);
    res.status(500).json({ error: 'Failed to save whiteboard' });
  }
};
