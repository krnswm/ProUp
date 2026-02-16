import { RequestHandler } from 'express';
import { prisma } from '../prisma';
import { logTaskChanges, logTaskCreation } from '../services/activityLog';
import { AuthRequest } from '../middleware/authorize';
import { getIO } from '../realtime';

type TaskStatus = 'todo' | 'inprogress' | 'done';

const parseStatus = (value: unknown): TaskStatus | null => {
  if (value === 'todo' || value === 'inprogress' || value === 'done') return value;
  return null;
};

const isUnknownPositionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Unknown argument `position`') || message.includes('Unknown argument \'position\'');
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const resolveUserFromAssignee = async (assignedUser: unknown) => {
  const raw = String(assignedUser ?? '').trim();
  if (!raw) return null;

  // Prefer exact email match, fallback to name (case-insensitive)
  const maybeEmail = raw.includes('@') ? raw : null;

  // NOTE: SQLite does not support Prisma's `mode: 'insensitive'` string filter.
  // Keep the query strict, then fall back to an in-memory case-insensitive match.
  const strictUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(maybeEmail ? [{ email: maybeEmail }] : []),
        { name: raw },
      ],
    },
    select: { id: true, email: true, name: true },
  });

  if (strictUser) return strictUser;

  if (!maybeEmail) {
    const normalized = normalize(raw);
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });
    const found = users.find((u) => normalize(u.name) === normalized);
    return found ?? null;
  }

  return null;
};

const createNotificationSafe = async (input: {
  userId: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) => {
  try {
    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });

    const io = getIO();
    io?.to(`user:${input.userId}`).emit('notification:created', created);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

const emitToProject = (projectId: number | null | undefined, event: string, payload: any) => {
  if (!projectId) return;
  const io = getIO();
  io?.to(`project:${projectId}`).emit(event, payload);
};

const assertNotBlockedForDone = async (taskId: number) => {
  const deps = await prisma.taskDependency.findMany({
    where: { blockedTaskId: taskId },
    include: { blockingTask: { select: { id: true, status: true, title: true } } },
  });

  const blocking = deps
    .map((d) => d.blockingTask)
    .filter((t) => String(t.status) !== 'done');

  if (blocking.length > 0) {
    const titles = blocking.map((t) => t.title).slice(0, 5).join(', ');
    const message = `Task is blocked by ${blocking.length} dependency(ies): ${titles}`;
    const error = new Error(message);
    (error as any).code = 'TASK_BLOCKED';
    throw error;
  }
};

// GET /api/tasks - Get tasks for the authenticated user's projects
export const getTasks: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get tasks from projects where user is owner or member
    const query = {
      where: {
        project: {
          is: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId: userId } } },
            ],
          },
        },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    } as const;

    let tasks;
    try {
      tasks = await prisma.task.findMany({
        ...query,
        orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
      } as any);
    } catch (error) {
      if (!isUnknownPositionError(error)) throw error;
      tasks = await prisma.task.findMany({
        ...query,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      } as any);
    }
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// GET /api/tasks/my - Get tasks assigned to the current user (across their projects)
export const getMyTasks: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.name;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!userName) {
      return res.status(400).json({ error: 'User profile incomplete' });
    }

    const query = {
      where: {
        project: {
          is: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId: userId } } },
            ],
          },
        },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    } as const;

    let tasks;
    try {
      tasks = await prisma.task.findMany({
        ...query,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
      } as any);
    } catch (error) {
      if (!isUnknownPositionError(error)) throw error;
      tasks = await prisma.task.findMany({
        ...query,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      } as any);
    }

    const meName = normalize(userName);
    const meEmail = normalize(userEmail);

    const myTasks = (tasks as any[]).filter((t) => {
      const assignee = normalize(t.assignedUser);
      if (!assignee) return false;
      if (assignee === meName) return true;
      if (meEmail && assignee === meEmail) return true;
      return false;
    });

    res.json(myTasks);
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    const details = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to fetch my tasks', details });
  }
};

// GET /api/projects/:projectId/board - Get a Kanban board view for a project
export const getProjectBoard: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const projectIdRaw = (req.params as unknown as { projectId?: string | string[] }).projectId;
    const projectIdValue = Array.isArray(projectIdRaw) ? projectIdRaw[0] : projectIdRaw;
    const projectIdInt = parseInt(projectIdValue || '');

    if (Number.isNaN(projectIdInt)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectIdInt,
        OR: [
          { ownerId: userId },
          { members: { some: { userId: userId } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const includeLabels = { labels: { include: { label: true } }, reactions: { include: { user: { select: { id: true, name: true } } } } };
    let tasks;
    try {
      tasks = await prisma.task.findMany({
        where: { project: { is: { id: projectIdInt } } },
        include: includeLabels,
        orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
      } as any);
    } catch (error) {
      if (!isUnknownPositionError(error)) throw error;
      tasks = await prisma.task.findMany({
        where: { project: { is: { id: projectIdInt } } },
        include: includeLabels,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      } as any);
    }

    // Flatten labels and group reactions for the frontend
    const tasksWithLabels = (tasks as any[]).map((t: any) => {
      // Group reactions by emoji
      const reactionMap: Record<string, { emoji: string; count: number; userIds: number[] }> = {};
      if (Array.isArray(t.reactions)) {
        for (const r of t.reactions) {
          if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
          reactionMap[r.emoji].count++;
          reactionMap[r.emoji].userIds.push(r.userId);
        }
      }
      return {
        ...t,
        labels: Array.isArray(t.labels) ? t.labels.map((tl: any) => tl.label) : [],
        reactions: Object.values(reactionMap),
      };
    });

    res.json({ projectId: projectIdInt, tasks: tasksWithLabels });
  } catch (error) {
    console.error('Error fetching project board:', error);
    res.status(500).json({ error: 'Failed to fetch project board' });
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

    const statusValue = parseStatus(status) ?? 'todo';
    const projectIdValue: number | null = projectId ? parseInt(projectId) : null;

    let nextPosition = 0;
    try {
      const last = await prisma.task.findFirst({
        where: {
          project: projectIdValue ? { is: { id: projectIdValue } } : undefined,
          status: statusValue,
        },
        orderBy: { position: 'desc' },
        select: { position: true },
      } as any);

      nextPosition = (last?.position ?? 0) + 1;
    } catch (error) {
      if (!isUnknownPositionError(error)) throw error;
      nextPosition = 0;
    }

    // Create the task
    let task;
    try {
      task = await prisma.task.create({
        data: {
          title,
          description,
          assignedUser,
          dueDate,
          status: statusValue,
          priority: priority || 'medium',
          project: projectIdValue ? { connect: { id: projectIdValue } } : undefined,
          position: nextPosition,
        },
      } as any);
    } catch (error) {
      if (!isUnknownPositionError(error)) throw error;
      task = await prisma.task.create({
        data: {
          title,
          description,
          assignedUser,
          dueDate,
          status: statusValue,
          priority: priority || 'medium',
          project: projectIdValue ? { connect: { id: projectIdValue } } : undefined,
        },
      } as any);
    }

    // Log task creation
    await logTaskCreation(task.id, task, userId);

    // Notification: if assignedUser matches a user, notify them
    const assignedTo = await resolveUserFromAssignee(assignedUser);
    if (assignedTo) {
      await createNotificationSafe({
        userId: assignedTo.id,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned',
        body: title,
        link: projectIdValue ? `/project/${projectIdValue}?task=${task.id}` : `/my-tasks?task=${task.id}`,
      });
    }

    emitToProject(projectIdValue, 'task:created', { task });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    const details = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to create task', details });
  }
};

// PUT /api/tasks/:id - Update a task
export const updateTask: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;
    const { title, description, assignedUser, dueDate, status, priority, projectId, position } = req.body;
    const userId = req.user?.id?.toString() || 'system';

    // Fetch old task data
    const oldTask = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
      include: { project: { select: { id: true } } },
    });

    if (!oldTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newStatus = status ? parseStatus(status) : null;
    const isStatusChanged = newStatus !== null && newStatus !== oldTask.status;

    if (isStatusChanged && newStatus === 'done') {
      try {
        await assertNotBlockedForDone(oldTask.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Task is blocked';
        return res.status(400).json({ error: message, code: (error as any)?.code ?? 'TASK_BLOCKED' });
      }
    }

    const projectIdValue: number | null = projectId === null ? null : projectId !== undefined ? parseInt(projectId) : undefined;
    const isProjectChanged = projectIdValue !== undefined;

    const oldProjectId = oldTask.project?.id ?? null;
    const targetProjectId = isProjectChanged ? projectIdValue : oldProjectId;

    let nextPosition: number | undefined = undefined;
    if (typeof position === 'number') {
      nextPosition = position;
    } else if (isStatusChanged) {
      try {
        const last = await prisma.task.findFirst({
          where: {
            project: targetProjectId ? { is: { id: targetProjectId } } : undefined,
            status: newStatus as TaskStatus,
          },
          orderBy: { position: 'desc' },
          select: { position: true },
        } as any);
        nextPosition = (last?.position ?? 0) + 1;
      } catch (error) {
        // If the schema/client doesn't support project relation filters or position ordering yet,
        // don't block status updates.
        console.error('Skipping position calculation due to error:', error);
        nextPosition = undefined;
      }
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: {
        title,
        description,
        assignedUser,
        dueDate,
        status: newStatus ?? undefined,
        priority,
        project:
          projectIdValue === undefined
            ? undefined
            : projectIdValue === null
              ? { disconnect: true }
              : { connect: { id: projectIdValue } },
        position: nextPosition,
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

    // Notification: if assignee changed, notify new assignee
    const oldAssignee = normalize(oldTask.assignedUser);
    const newAssignee = normalize(assignedUser);
    if (newAssignee && newAssignee !== oldAssignee) {
      const assignedTo = await resolveUserFromAssignee(assignedUser);
      if (assignedTo) {
        await createNotificationSafe({
          userId: assignedTo.id,
          type: 'TASK_ASSIGNED',
          title: 'Task assigned to you',
          body: updatedTask.title,
          link: oldTask.project?.id ? `/project/${oldTask.project.id}?task=${updatedTask.id}` : `/my-tasks?task=${updatedTask.id}`,
        });
      }
    }

    const currentProjectId = updatedTask.projectId ?? oldTask.project?.id ?? null;
    emitToProject(currentProjectId, 'task:updated', { task: updatedTask });
    if (oldTask.project?.id && currentProjectId !== oldTask.project.id) {
      emitToProject(oldTask.project.id, 'task:updated', { task: updatedTask });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// PATCH /api/tasks/reorder - Bulk update task ordering and/or status
export const reorderTasks: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { moves } = req.body as {
      moves?: Array<{ id: number; status?: TaskStatus; position: number }>;
    };

    if (!Array.isArray(moves) || moves.length === 0) {
      return res.status(400).json({ error: 'moves is required' });
    }

    // Hard-block: prevent moving to done if blocked
    const movingToDone = moves.filter((m) => m.status === 'done').map((m) => m.id);
    if (movingToDone.length > 0) {
      try {
        for (const id of movingToDone) {
          await assertNotBlockedForDone(id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Task is blocked';
        return res.status(400).json({ error: message, code: (error as any)?.code ?? 'TASK_BLOCKED' });
      }
    }

    await prisma.$transaction(
      moves.map((m) =>
        prisma.task.update({
          where: { id: m.id },
          data: {
            status: m.status,
            position: m.position,
          },
        })
      )
    );

    const updated = await prisma.task.findMany({
      where: { id: { in: moves.map((m) => m.id) } },
      select: { id: true, projectId: true, status: true, position: true },
    });

    const byProject = new Map<number, typeof updated>();
    for (const t of updated) {
      if (!t.projectId) continue;
      const arr = byProject.get(t.projectId) ?? [];
      arr.push(t);
      byProject.set(t.projectId, arr);
    }

    for (const [projectId, items] of byProject.entries()) {
      emitToProject(projectId, 'task:reordered', { tasks: items });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
};

// DELETE /api/tasks/:id - Delete a task
export const deleteTask: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const taskId = Array.isArray(id) ? id[0] : id;

    const existing = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
      select: { id: true, projectId: true },
    });

    await prisma.task.delete({
      where: { id: parseInt(taskId) },
    });

    if (existing?.projectId) {
      emitToProject(existing.projectId, 'task:deleted', { taskId: existing.id });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
