import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { logTaskChanges, logTaskCreation } from '../services/activityLog';

// GET /api/tasks - Get all tasks
export const getTasks: RequestHandler = async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
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
export const createTask: RequestHandler = async (req, res) => {
  try {
    const { title, description, assignedUser, dueDate, status, priority } = req.body;
    const userId = req.body.userId || 'system'; // In a real app, get this from auth

    // Create the task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedUser,
        dueDate,
        status: status || 'todo',
        priority: priority || 'medium',
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
export const updateTask: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;
    const { title, description, assignedUser, dueDate, status, priority } = req.body;
    const userId = req.body.userId || 'system'; // In a real app, get this from auth

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
