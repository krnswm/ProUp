import { X } from 'lucide-react';
import ActivityLogTimeline from './ActivityLogTimeline';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
}

export default function ActivityLogModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
}: ActivityLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Activity History
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{taskTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityLogTimeline taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
