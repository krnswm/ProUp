import { cn } from '@/lib/utils';
import { formatDate, isSameDay } from '@/utils/calendarUtils';

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  status?: string;
}

interface CalendarDayCellProps {
  date: Date | null;
  tasks: Task[];
  onDateClick?: (date: Date) => void;
  isToday?: boolean;
}

export function CalendarDayCell({
  date,
  tasks,
  onDateClick,
  isToday = false,
}: CalendarDayCellProps) {
  if (!date) {
    return <div className="min-h-24 border rounded-lg bg-muted/20" />;
  }
  
  const dateString = formatDate(date);
  const tasksForDay = tasks.filter(task => task.dueDate === dateString);
  const today = new Date();
  const isTodayDate = isSameDay(date, today);
  
  return (
    <div
      className={cn(
        'min-h-24 border rounded-lg p-2 cursor-pointer transition-colors hover:bg-accent',
        isTodayDate && 'border-primary border-2 bg-accent/50'
      )}
      onClick={() => onDateClick?.(date)}
    >
      <div
        className={cn(
          'text-sm font-medium mb-1',
          isTodayDate && 'text-primary font-bold'
        )}
      >
        {date.getDate()}
      </div>
      
      {tasksForDay.length > 0 && (
        <div className="space-y-1">
          {tasksForDay.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="text-xs truncate bg-primary/10 text-primary px-1 py-0.5 rounded"
              title={task.title}
            >
              {task.title}
            </div>
          ))}
          {tasksForDay.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{tasksForDay.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
