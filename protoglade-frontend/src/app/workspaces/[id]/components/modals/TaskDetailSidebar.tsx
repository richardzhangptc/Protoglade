import { Task, KanbanColumn } from '@/types';
import { priorityColors } from '../constants';

interface TaskDetailSidebarProps {
  task: Task;
  columns: KanbanColumn[];
  onClose: () => void;
  onUpdateColumn: (taskId: string, columnId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailSidebar({
  task,
  columns,
  onClose,
  onUpdateColumn,
  onDelete,
}: TaskDetailSidebarProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] p-6 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{task.title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Column</label>
            <div className="flex gap-2 flex-wrap">
              {columns.map((column) => (
                <button
                  key={column.id}
                  onClick={() => onUpdateColumn(task.id, column.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    task.columnId === column.id
                      ? 'bg-[var(--color-primary)] text-[#2B2B2B]'
                      : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: column.color }}
                  />
                  {column.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Priority</label>
            <span className={`badge ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Description</label>
              <p className="text-[var(--color-text-muted)]">{task.description}</p>
            </div>
          )}

          {task._count && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Comments</label>
              <p className="text-[var(--color-text-muted)]">
                {task._count.comments} comment{task._count.comments !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={() => onDelete(task.id)}
              className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

