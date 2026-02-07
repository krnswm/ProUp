import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/authorize';

/**
 * GET /api/dashboard/analytics
 * Fetches dashboard analytics for the current user
 * Includes projects they own or are members of, and all associated tasks
 */
export const getDashboardAnalytics: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch projects where user is the owner
    const ownedProjects = await prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        tasks: true,
      },
    });

    // Fetch projects where user is a member
    const memberProjects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        tasks: true,
      },
    });

    // Combine and deduplicate projects
    const projectMap = new Map();
    [...ownedProjects, ...memberProjects].forEach(project => {
      projectMap.set(project.id, project);
    });
    const allProjects = Array.from(projectMap.values());

    // Aggregate all tasks from accessible projects
    const allTasks = allProjects.flatMap(project => project.tasks);

    // Calculate statistics
    const totalProjects = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'active').length;
    const pausedProjects = allProjects.filter(p => p.status === 'paused').length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'done').length;
    const inProgressTasks = allTasks.filter(task => task.status === 'inprogress').length;
    const pendingTasks = allTasks.filter(task => task.status === 'todo').length;

    // Calculate additional metrics
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Get recent tasks (last 5)
    const recentTasks = allTasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        updatedAt: task.updatedAt,
      }));

    // Calculate tasks per project
    const tasksByProject = allProjects.map(project => ({
      projectId: project.id,
      projectName: project.name,
      taskCount: project.tasks.length,
    }));

    // Calculate average tasks per project
    const avgTasksPerProject = totalProjects > 0 
      ? (totalTasks / totalProjects).toFixed(1) 
      : '0';

    // Return analytics
    res.json({
      totalProjects,
      activeProjects,
      pausedProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      completionRate,
      avgTasksPerProject: parseFloat(avgTasksPerProject),
      recentTasks,
      tasksByProject,
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
};
