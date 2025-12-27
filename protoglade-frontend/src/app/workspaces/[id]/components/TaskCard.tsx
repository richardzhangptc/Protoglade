import { Task } from '@/types';
import { priorityColors } from './constants';
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
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 w-full text-left transition-all relative ${
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
      
      <h4 className="font-medium mb-2 text-[var(--color-text)]">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-3">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className={`badge ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {task._count && task._count.comments > 0 && (
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {task._count.comments}
          </span>
        )}
      </div>
    </div>
  );
}

