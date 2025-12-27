import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';

interface SortableTaskCardProps {
  task: Task;
  onClick: () => void;
  isLockedByRemote?: boolean;
  lockedByUserName?: string;
  lockedByUserColor?: string;
}

export function SortableTaskCard({
  task,
  onClick,
  isLockedByRemote = false,
  lockedByUserName,
  lockedByUserColor,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
    disabled: isLockedByRemote,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isLockedByRemote ? {} : listeners)}
    >
      <TaskCard 
        task={task} 
        onClick={isLockedByRemote ? undefined : onClick}
        isLockedByRemote={isLockedByRemote}
        lockedByUserName={lockedByUserName}
        lockedByUserColor={lockedByUserColor}
      />
    </div>
  );
}

