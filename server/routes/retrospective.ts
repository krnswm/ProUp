import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';

/**
 * GET /api/retrospective/data?from=YYYY-MM-DD&to=YYYY-MM-DD&projectId=N
 * Gathers sprint data for the AI retrospective generator.
 * Returns tasks, activity logs, comments count, and member stats for the period.
 */
export const getRetrospectiveData: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { from, to, projectId } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);
    toDate.setHours(23, 59, 59, 999);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Build project filter
    const projectFilter = projectId
      ? { projectId: parseInt(projectId as string) }
      : {};

    // Get all accessible project IDs for this user
    const ownedProjects = await prisma.project.findMany({
      where: { ownerId: userId, ...( projectId ? { id: parseInt(projectId as string) } : {}) },
      select: { id: true, name: true },
    });
    const memberProjects = await prisma.project.findMany({
      where: {
        members: { some: { userId } },
        ...( projectId ? { id: parseInt(projectId as string) } : {}),
      },
      select: { id: true, name: true },
    });
    const projectMap = new Map<number, string>();
    [...ownedProjects, ...memberProjects].forEach((p) => projectMap.set(p.id, p.name));
    const accessibleProjectIds = Array.from(projectMap.keys());

    if (accessibleProjectIds.length === 0) {
      return res.json({ tasks: [], activityLogs: [], projects: [], summary: {} });
    }

    // Fetch tasks in those projects (all tasks, not just ones updated in range)
    const tasks = await prisma.task.findMany({
      where: { projectId: { in: accessibleProjectIds } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assignedUser: true,
        dueDate: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch activity logs in the date range
    const taskIds = tasks.map((t) => t.id);
    const activityLogs = taskIds.length > 0
      ? await prisma.activityLog.findMany({
          where: {
            taskId: { in: taskIds },
            timestamp: { gte: fromDate, lte: toDate },
          },
          select: {
            taskId: true,
            actionType: true,
            fieldName: true,
            oldValue: true,
            newValue: true,
            timestamp: true,
            userId: true,
          },
          orderBy: { timestamp: 'asc' },
        })
      : [];

    // Count comments in the date range
    const commentCount = taskIds.length > 0
      ? await prisma.comment.count({
          where: {
            taskId: { in: taskIds },
            createdAt: { gte: fromDate, lte: toDate },
          },
        })
      : 0;

    // Tasks created in the range
    const tasksCreated = tasks.filter(
      (t) => t.createdAt >= fromDate && t.createdAt <= toDate
    );

    // Tasks completed in the range (status changed to done)
    const completionLogs = activityLogs.filter(
      (l) => l.fieldName === 'status' && l.newValue === 'done'
    );
    const completedTaskIds = new Set(completionLogs.map((l) => l.taskId));

    // Tasks that went overdue (due date passed while not done)
    const overdueTaskIds = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate);
      return due <= toDate && due >= fromDate;
    }).map((t) => t.id);

    // Priority distribution of completed tasks
    const completedTasks = tasks.filter((t) => completedTaskIds.has(t.id));
    const priorityBreakdown = {
      high: completedTasks.filter((t) => t.priority === 'high').length,
      medium: completedTasks.filter((t) => t.priority === 'medium').length,
      low: completedTasks.filter((t) => t.priority === 'low').length,
    };

    // Status changes count (how many times tasks changed status)
    const statusChanges = activityLogs.filter((l) => l.fieldName === 'status').length;

    // Busiest day (most activity logs)
    const dayMap: Record<string, number> = {};
    for (const log of activityLogs) {
      const day = log.timestamp.toISOString().slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + 1;
    }
    const busiestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0] || null;

    // Per-project breakdown
    const projectBreakdown = accessibleProjectIds.map((pid) => {
      const projTasks = tasks.filter((t) => t.projectId === pid);
      const projCompleted = projTasks.filter((t) => completedTaskIds.has(t.id));
      return {
        id: pid,
        name: projectMap.get(pid) || 'Unknown',
        totalTasks: projTasks.length,
        completed: projCompleted.length,
        inProgress: projTasks.filter((t) => t.status === 'inprogress').length,
        todo: projTasks.filter((t) => t.status === 'todo').length,
      };
    });

    // Days in sprint
    const sprintDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      period: { from: from as string, to: to as string, days: sprintDays },
      summary: {
        tasksCreated: tasksCreated.length,
        tasksCompleted: completedTaskIds.size,
        totalTasks: tasks.length,
        overdueCount: overdueTaskIds.length,
        commentCount,
        statusChanges,
        completionRate: tasks.length > 0 ? Math.round((completedTaskIds.size / tasks.length) * 100) : 0,
        avgCompletedPerDay: sprintDays > 0 ? +(completedTaskIds.size / sprintDays).toFixed(1) : 0,
        priorityBreakdown,
        busiestDay: busiestDay ? { date: busiestDay[0], count: busiestDay[1] } : null,
      },
      projects: projectBreakdown,
      completedTaskTitles: completedTasks.slice(0, 20).map((t) => t.title),
      overdueTasks: tasks
        .filter((t) => overdueTaskIds.includes(t.id))
        .slice(0, 10)
        .map((t) => ({ title: t.title, dueDate: t.dueDate, priority: t.priority })),
    });
  } catch (error) {
    console.error('Error fetching retrospective data:', error);
    res.status(500).json({ error: 'Failed to fetch retrospective data' });
  }
};
