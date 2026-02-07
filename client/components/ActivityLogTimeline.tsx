import { useEffect, useState } from 'react';
import { Clock, User } from 'lucide-react';

interface ActivityLogEntry {
  id: number;
  taskId: number;
  userId: string;
  actionType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  timestamp: string;
  message: string; // Pre-formatted message from backend
}

interface ActivityLogTimelineProps {
  taskId: number;
}

export default function ActivityLogTimeline({ taskId }: ActivityLogTimelineProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityLogs();
  }, [taskId]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/tasks/${taskId}/activity-logs?_t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading activity history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive py-4">
        Error loading activity logs: {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        No activity history yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Activity History</h3>
      
      <div className="relative border-l-2 border-border pl-6 space-y-6">
        {logs.map((log, index) => (
          <div key={log.id} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[1.6rem] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
            
            <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Header with user and timestamp */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{log.userId}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>
              
              {/* Activity message */}
              <div className="text-sm text-foreground">
                {log.message}
              </div>
              
              {/* Action type badge */}
              <div className="mt-2">
                <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                  {log.fieldName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
