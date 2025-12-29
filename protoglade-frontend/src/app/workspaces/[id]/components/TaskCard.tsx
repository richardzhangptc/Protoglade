import { Task } from '@/types';
import { RemoteDragIndicator } from '@/components/RemoteCursors';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isOverlay?: boolean;
  isLockedByRemote?: boolean;
  lockedByUserName?: string;
  lockedByUserColor?: string;
}

export function TaskCard({
  task,
  onClick,
  isOverlay,
  isLockedByRemote = false,
  lockedByUserName,
  lockedByUserColor,
}: TaskCardProps) {
  const labels = task.labels || [];
  const assignments = task.assignments || [];

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getUserColor = (userId: string) => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
      '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 w-full text-left transition-all relative ${
        isOverlay ? 'shadow-2xl rotate-2 scale-105' : ''
      } ${
        isLockedByRemote 
          ? 'cursor-not-allowed opacity-60' 
          : 'hover:border-[var(--color-primary)] cursor-grab active:cursor-grabbing'
      }`}
    >
      {isLockedByRemote && lockedByUserName && lockedByUserColor && (
        <RemoteDragIndicator userName={lockedByUserName} userColor={lockedByUserColor} />
      )}
      
      {/* Color Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map((color, i) => (
            <span
              key={i}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
      
      <h4 className="font-medium text-sm text-[var(--color-text)] line-clamp-2">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-1">
          {task.description}
        </p>
      )}
      
      {/* Bottom row: Comments count + Assignees */}
      <div className="flex items-center justify-between mt-2">
        {/* Comments count */}
        {task._count && task._count.comments > 0 ? (
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {task._count.comments}
          </span>
        ) : (
          <div />
        )}
        
        {/* Assignees */}
        {assignments.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignments.slice(0, 3).map((assignment) => (
              <span
                key={assignment.user.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[var(--color-surface)]"
                style={{ backgroundColor: getUserColor(assignment.user.id) }}
                title={assignment.user.name || assignment.user.email}
              >
                {getInitials(assignment.user.name, assignment.user.email)}
              </span>
            ))}
            {assignments.length > 3 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border-2 border-[var(--color-surface)]">
                +{assignments.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
