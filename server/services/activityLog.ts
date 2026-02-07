import { prisma } from '../prisma';

// Fields that should be tracked for changes
const TRACKED_FIELDS = ['priority', 'status', 'assignedUser', 'dueDate'] as const;
type TrackedField = typeof TRACKED_FIELDS[number];

interface TaskData {
  priority?: string;
  status?: string;
  assignedUser?: string;
  dueDate?: string;
}

/**
 * Creates activity log entries for changed fields
 */
export async function logTaskChanges(
  taskId: number,
  oldData: TaskData,
  newData: TaskData,
  userId: string = 'system'
) {
  const logs = [];

  for (const field of TRACKED_FIELDS) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Only log if the value actually changed
    if (oldValue !== newValue && newValue !== undefined) {
      const actionType = `UPDATED_${field.toUpperCase().replace('USER', 'ASSIGNEE')}`;
      
      logs.push({
        taskId,
        userId,
        actionType,
        fieldName: field,
        oldValue: oldValue || null,
        newValue: newValue,
      });
    }
  }

  // Bulk create all logs at once
  if (logs.length > 0) {
    await prisma.activityLog.createMany({
      data: logs,
    });
  }

  return logs.length;
}

/**
 * Logs task creation
 */
export async function logTaskCreation(
  taskId: number,
  taskData: TaskData,
  userId: string = 'system'
) {
  await prisma.activityLog.create({
    data: {
      taskId,
      userId,
      actionType: 'CREATED_TASK',
      fieldName: 'task',
      oldValue: null,
      newValue: 'Task created',
    },
  });
}

/**
 * Get activity logs for a specific task
 */
export async function getTaskActivityLogs(taskId: number) {
  return await prisma.activityLog.findMany({
    where: { taskId },
    orderBy: { timestamp: 'desc' },
  });
}

/**
 * Format log message for human-readable display
 */
export function formatLogMessage(log: {
  actionType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  userId: string;
}): string {
  const fieldLabels: Record<string, string> = {
    priority: 'priority',
    status: 'status',
    assignedUser: 'assignee',
    dueDate: 'due date',
  };

  const fieldLabel = fieldLabels[log.fieldName] || log.fieldName;

  if (log.actionType === 'CREATED_TASK') {
    return `created this task`;
  }

  if (log.oldValue === null || log.oldValue === '') {
    return `set ${fieldLabel} to ${formatValue(log.newValue, log.fieldName)}`;
  }

  return `changed ${fieldLabel} from ${formatValue(log.oldValue, log.fieldName)} to ${formatValue(log.newValue, log.fieldName)}`;
}

/**
 * Format values for display
 */
function formatValue(value: string, fieldName: string): string {
  if (fieldName === 'status') {
    const statusLabels: Record<string, string> = {
      todo: 'To Do',
      inprogress: 'In Progress',
      done: 'Done',
    };
    return statusLabels[value] || value;
  }

  if (fieldName === 'priority') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return value;
}
