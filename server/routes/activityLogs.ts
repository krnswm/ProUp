import { RequestHandler } from 'express';
import { getTaskActivityLogs, formatLogMessage } from '../services/activityLog';

// GET /api/tasks/:taskId/activity-logs - Get activity logs for a task
export const getActivityLogs: RequestHandler = async (req, res) => {
  try {
    const { taskId } = req.params;
    const id = Array.isArray(taskId) ? taskId[0] : taskId;
    const logs = await getTaskActivityLogs(parseInt(id));

    // Format logs for frontend display
    const formattedLogs = logs.map(log => ({
      ...log,
      message: formatLogMessage(log),
    }));

    // Prevent caching to always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(formattedLogs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};
