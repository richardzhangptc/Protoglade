import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanColumn as KanbanColumnType, Task } from '@/types';
import { RemoteCursor } from '@/hooks/usePresence';
import { SortableTaskCard } from './SortableTaskCard';
import { COLUMN_COLORS } from './constants';

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  remoteCursors: RemoteCursor[];
  onAddTask: () => void;
  onEditColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  editingColumnId: string | null;
  editingColumnName: string;
  onEditingNameChange: (name: string) => void;
  onSaveColumnName: (columnId: string) => void;
  onCancelEdit: () => void;
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  remoteCursors,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  editingColumnId,
  editingColumnName,
  onEditingNameChange,
  onSaveColumnName,
  onCancelEdit,
}: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  // Separate droppable for the task area
  const { setNodeRef: setTaskDroppableRef, isOver: isOverTaskArea } = useDroppable({
    id: `column-drop-${column.id}`,
    data: {
      type: 'column',
      columnId: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const remoteDragInfo = useMemo(() => {
    const info = new Map<string, { userName: string; userColor: string }>();
    for (const cursor of remoteCursors) {
      if (cursor.isDragging && cursor.dragTaskId) {
        info.set(cursor.dragTaskId, {
          userName: cursor.user.name || cursor.user.email.split('@')[0],
          userColor: cursor.user.color,
        });
      }
    }
    return info;
  }, [remoteCursors]);

  const isEditing = editingColumnId === column.id;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`w-80 flex-shrink-0 transition-opacity ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Column Header - Entire header is draggable */}
      <div 
        {...attributes}
        {...listeners}
        className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg group cursor-grab active:cursor-grabbing select-none
          ${isDragging ? 'bg-[var(--color-surface-hover)] shadow-lg' : 'hover:bg-[var(--color-surface-hover)]/50'}
          transition-all`}
      >
        <span 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: column.color }}
        />
        {isEditing ? (
          <input
            type="text"
            value={editingColumnName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={() => onSaveColumnName(column.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveColumnName(column.id);
              if (e.key === 'Escape') onCancelEdit();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-semibold bg-[var(--color-bg)] border border-[var(--color-primary)] rounded px-2 py-1 outline-none"
            autoFocus
          />
        ) : (
          <h3 
            className="font-semibold text-[var(--color-text)] flex-1 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditColumn(column.id, column.name);
            }}
          >
            {column.name}
          </h3>
        )}
        <span className="text-sm text-[var(--color-text-muted)] flex-shrink-0">({tasks.length})</span>
        
        {/* Column Actions */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteColumn(column.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Delete column"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      {/* Tasks Container */}
      <div
        ref={setTaskDroppableRef}
        className={`rounded-xl p-2 min-h-[200px] transition-colors ${
          isOverTaskArea ? 'bg-[var(--color-surface-hover)]' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => {
              const dragInfo = remoteDragInfo.get(task.id);
              return (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  isLockedByRemote={!!dragInfo}
                  lockedByUserName={dragInfo?.userName}
                  lockedByUserColor={dragInfo?.userColor}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* Add Task Button */}
        <button
          onClick={onAddTask}
          className="w-full mt-3 p-3 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-all flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>
    </div>
  );
}

