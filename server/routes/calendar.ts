import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';

/**
 * GET /api/calendar/tasks
 * Fetches tasks with due dates for calendar display (user's projects only)
 * Returns tasks formatted for FullCalendar library
 */
export const getCalendarTasks: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch tasks that have a dueDate from user's projects
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: {
          not: null,
        },
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId: userId } } },
          ],
        },
      },
      include: {
        project: true, // Include project data for filtering and display
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Format tasks for FullCalendar
    // FullCalendar expects: { id, title, start, backgroundColor, extendedProps }
    const calendarEvents = tasks.map((task) => {
      // Use project color if available, otherwise use priority-based color
      let backgroundColor = task.project?.color || '#3b82f6'; // Default blue
      
      // If no project color, fall back to priority-based coloring
      if (!task.project?.color) {
        switch (task.priority) {
          case 'high':
            backgroundColor = '#ef4444'; // Red
            break;
          case 'medium':
            backgroundColor = '#f59e0b'; // Orange
            break;
          case 'low':
            backgroundColor = '#10b981'; // Green
            break;
        }
      }

      // Override color based on status
      if (task.status === 'done') {
        backgroundColor = '#6b7280'; // Gray for completed tasks
      }

      return {
        id: task.id.toString(),
        title: task.title,
        start: task.dueDate,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          description: task.description,
          assignedUser: task.assignedUser,
          status: task.status,
          priority: task.priority,
          taskId: task.id,
          projectId: task.projectId,
          projectName: task.project?.name || null,
          projectColor: task.project?.color || null,
        },
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Error fetching calendar tasks:', error);
    res.status(500).json({ error: 'Failed to fetch calendar tasks' });
  }
};

/**
 * GET /api/calendar/tasks/filter
 * Fetches tasks filtered by assignee for calendar display
 */
export const getFilteredCalendarTasks: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { assignee, status, priority } = req.query;

    // Build filter conditions - only from user's projects
    const whereConditions: any = {
      dueDate: {
        not: null,
      },
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } },
        ],
      },
    };

    if (assignee && assignee !== 'all') {
      whereConditions.assignedUser = assignee as string;
    }

    if (status && status !== 'all') {
      whereConditions.status = status as string;
    }

    if (priority && priority !== 'all') {
      whereConditions.priority = priority as string;
    }

    const tasks = await prisma.task.findMany({
      where: whereConditions,
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Format for FullCalendar (same as above)
    const calendarEvents = tasks.map((task) => {
      let backgroundColor = '#3b82f6';
      switch (task.priority) {
        case 'high':
          backgroundColor = '#ef4444';
          break;
        case 'medium':
          backgroundColor = '#f59e0b';
          break;
        case 'low':
          backgroundColor = '#10b981';
          break;
      }

      if (task.status === 'done') {
        backgroundColor = '#6b7280';
      }

      return {
        id: task.id.toString(),
        title: task.title,
        start: task.dueDate,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          description: task.description,
          assignedUser: task.assignedUser,
          status: task.status,
          priority: task.priority,
          taskId: task.id,
        },
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Error fetching filtered calendar tasks:', error);
    res.status(500).json({ error: 'Failed to fetch filtered calendar tasks' });
  }
};
