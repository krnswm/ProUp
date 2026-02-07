import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { logTaskChanges, logTaskCreation } from '../services/activityLog';
import { AuthRequest } from '../middleware/authorize';

// GET /api/tasks - Get tasks for the authenticated user's projects
export const getTasks: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get tasks from projects where user is owner or member
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId: userId } } },
          ],
        },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// GET /api/tasks/:id - Get a single task
export const getTask: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// POST /api/tasks - Create a new task
export const createTask: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { title, description, assignedUser, dueDate, status, priority, projectId } = req.body;
    const userId = req.user?.id?.toString() || 'system';

    // Create the task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedUser,
        dueDate,
        status: status || 'todo',
        priority: priority || 'medium',
        projectId: projectId || null,
      },
    });

    // Log task creation
    await logTaskCreation(task.id, task, userId);

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// PUT /api/tasks/:id - Update a task
export const updateTask: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;
    const { title, description, assignedUser, dueDate, status, priority, projectId } = req.body;
    const userId = req.user?.id?.toString() || 'system';

    // Fetch old task data
    const oldTask = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
    });

    if (!oldTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        title,
        description,
        assignedUser,
        dueDate,
        status,
        priority,
        projectId: projectId !== undefined ? projectId : undefined,
      },
    });

    // Log changes
    await logTaskChanges(
      updatedTask.id,
      {
        priority: oldTask.priority,
        status: oldTask.status,
        assignedUser: oldTask.assignedUser,
        dueDate: oldTask.dueDate,
      },
      {
        priority: updatedTask.priority,
        status: updatedTask.status,
        assignedUser: updatedTask.assignedUser,
        dueDate: updatedTask.dueDate,
      },
      userId
    );

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// DELETE /api/tasks/:id - Delete a task
export const deleteTask: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;

    await prisma.task.delete({
      where: { id: parseInt(taskId) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
