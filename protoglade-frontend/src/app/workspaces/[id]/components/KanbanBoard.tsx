import { useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { KanbanColumn as KanbanColumnType, Task } from '@/types';
import { RemoteCursor } from '@/hooks/usePresence';
import { RemoteCursors } from '@/components/RemoteCursors';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { COLUMN_COLORS } from './constants';
import { api } from '@/lib/api';

interface KanbanBoardProps {
  columns: KanbanColumnType[];
  tasks: Task[];
  tasksByColumn: Record<string, Task[]>;
  selectedProjectId: string;
  remoteCursors: RemoteCursor[];
  activeTask: Task | null;
  activeColumn: KanbanColumnType | null;
  editingColumnId: string | null;
  editingColumnName: string;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onEditColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditingNameChange: (name: string) => void;
  onSaveColumnName: (columnId: string) => void;
  onCancelEdit: () => void;
  onAddColumn: () => void;
  onTaskUpdated: (task: Task) => void;
  onColumnsReordered: (columns: KanbanColumnType[]) => void;
  onLoadProjectData: (projectId: string) => void;
  onCursorMove: (data: { x: number; y: number; isDragging: boolean; dragTaskId: string | null; dragTaskTitle: string | null }) => void;
  onCursorLeave: () => void;
  setActiveTask: (task: Task | null) => void;
  setActiveColumn: (column: KanbanColumnType | null) => void;
  setColumns: (columns: KanbanColumnType[]) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  lastCursorPosRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function KanbanBoard({
  columns,
  tasks,
  tasksByColumn,
  selectedProjectId,
  remoteCursors,
  activeTask,
  activeColumn,
  editingColumnId,
  editingColumnName,
  onTaskClick,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onEditingNameChange,
  onSaveColumnName,
  onCancelEdit,
  onAddColumn,
  onTaskUpdated,
  onColumnsReordered,
  onLoadProjectData,
  onCursorMove,
  onCursorLeave,
  setActiveTask,
  setActiveColumn,
  setColumns,
  setTasks,
  lastCursorPosRef,
}: KanbanBoardProps) {
  const boardRef = useRef<HTMLElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection that prioritizes columns when dragging columns,
  // and tasks when dragging tasks
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // If dragging a column, only consider other columns
      if (activeColumn) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => columns.some((c) => c.id === container.id)
          ),
        });
      }

      // For tasks, use pointer within first, then fall back to closest center
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }
      return closestCenter(args);
    },
    [activeColumn, columns]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const scrollLeft = boardRef.current.scrollLeft || 0;
      const scrollTop = boardRef.current.scrollTop || 0;

      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top + scrollTop;

      lastCursorPosRef.current = { x, y };

      onCursorMove({
        x,
        y,
        isDragging: !!activeTask,
        dragTaskId: activeTask?.id || null,
        dragTaskTitle: activeTask?.title || null,
      });
    },
    [onCursorMove, activeTask, lastCursorPosRef]
  );

  const handleMouseLeave = useCallback(() => {
    onCursorLeave();
  }, [onCursorLeave]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'column') {
      const column = columns.find((c) => c.id === active.id);
      if (column) {
        setActiveColumn(column);
      }
    } else {
      const task = tasks.find((t) => t.id === active.id);
      if (task) {
        setActiveTask(task);
        onCursorMove({
          x: lastCursorPosRef.current.x,
          y: lastCursorPosRef.current.y,
          isDragging: true,
          dragTaskId: task.id,
          dragTaskTitle: task.title,
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;
    
    // Reset active items
    setActiveTask(null);
    setActiveColumn(null);

    onCursorMove({
      x: lastCursorPosRef.current.x,
      y: lastCursorPosRef.current.y,
      isDragging: false,
      dragTaskId: null,
      dragTaskTitle: null,
    });

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle column reordering
    if (activeData?.type === 'column') {
      if (activeId !== overId) {
        const oldIndex = columns.findIndex((c) => c.id === activeId);
        const newIndex = columns.findIndex((c) => c.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newColumns = arrayMove(columns, oldIndex, newIndex);
          setColumns(newColumns);
          
          // Update positions on server
          try {
            const reorderedColumns = await api.reorderColumns(
              selectedProjectId,
              newColumns.map((c) => c.id)
            );
            setColumns(reorderedColumns);
            onColumnsReordered(reorderedColumns);
          } catch (error) {
            console.error('Failed to reorder columns:', error);
            onLoadProjectData(selectedProjectId);
          }
        }
      }
      return;
    }

    // Handle task dragging
    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    const overData = over.data.current;
    const isOverColumnDropArea = overData?.type === 'column';
    const overTask = tasks.find((t) => t.id === overId);

    let targetColumnId: string;

    if (isOverColumnDropArea) {
      // Extract the actual column ID from the drop area ID (format: column-drop-{columnId})
      targetColumnId = overData?.columnId || columns[0]?.id;
    } else if (overTask) {
      targetColumnId = overTask.columnId || columns[0]?.id;
    } else {
      targetColumnId = draggedTask.columnId || columns[0]?.id;
    }

    const sourceColumnId = draggedTask.columnId || columns[0]?.id;
    const isSameColumn = sourceColumnId === targetColumnId;

    const targetColumnTasks = tasksByColumn[targetColumnId] || [];

    let newPosition: number;

    if (isOverColumnDropArea) {
      const lastTask = targetColumnTasks[targetColumnTasks.length - 1];
      newPosition = lastTask ? lastTask.position + 1000 : 1000;
    } else if (overTask) {
      const overTaskIndex = targetColumnTasks.findIndex((t) => t.id === overId);
      const activeTaskIndex = targetColumnTasks.findIndex((t) => t.id === activeId);

      if (isSameColumn) {
        if (activeTaskIndex === overTaskIndex) {
          return;
        }

        const movingDown = activeTaskIndex < overTaskIndex;

        if (movingDown) {
          const targetTask = targetColumnTasks[overTaskIndex];
          const nextTask = targetColumnTasks[overTaskIndex + 1];
          if (nextTask) {
            newPosition = (targetTask.position + nextTask.position) / 2;
          } else {
            newPosition = targetTask.position + 1000;
          }
        } else {
          const targetTask = targetColumnTasks[overTaskIndex];
          const prevTask = targetColumnTasks[overTaskIndex - 1];
          if (prevTask) {
            newPosition = (prevTask.position + targetTask.position) / 2;
          } else {
            newPosition = targetTask.position / 2;
          }
        }
      } else {
        const targetTasksWithoutActive = targetColumnTasks.filter((t) => t.id !== activeId);
        const overIndex = targetTasksWithoutActive.findIndex((t) => t.id === overId);

        if (overIndex === 0) {
          newPosition = targetTasksWithoutActive[0].position / 2;
        } else if (overIndex > 0) {
          const prevPosition = targetTasksWithoutActive[overIndex - 1].position;
          const nextPosition = targetTasksWithoutActive[overIndex].position;
          newPosition = (prevPosition + nextPosition) / 2;
        } else {
          const lastTask = targetTasksWithoutActive[targetTasksWithoutActive.length - 1];
          newPosition = lastTask ? lastTask.position + 1000 : 1000;
        }
      }
    } else {
      return;
    }

    if (isSameColumn && Math.abs(newPosition - draggedTask.position) < 0.001) {
      return;
    }

    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === activeId
          ? { ...t, columnId: targetColumnId, position: newPosition }
          : t
      )
    );

    try {
      const updated = await api.updateTask(activeId, {
        columnId: targetColumnId,
        position: newPosition,
      });
      onTaskUpdated(updated);
    } catch (error) {
      console.error('Failed to update task position:', error);
      onLoadProjectData(selectedProjectId);
    }
  };

  return (
    <main
      ref={boardRef}
      className="flex-1 overflow-auto p-6 relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <RemoteCursors cursors={remoteCursors} containerRef={boardRef} />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={columns.map((c) => c.id)} 
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4 min-h-full pb-4" style={{ minWidth: 'max-content' }}>
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] || []}
                onTaskClick={onTaskClick}
                remoteCursors={remoteCursors}
                onAddTask={() => onAddTask(column.id)}
                onEditColumn={onEditColumn}
                onDeleteColumn={onDeleteColumn}
                editingColumnId={editingColumnId}
                editingColumnName={editingColumnName}
                onEditingNameChange={onEditingNameChange}
                onSaveColumnName={onSaveColumnName}
                onCancelEdit={onCancelEdit}
              />
            ))}
            
            {/* Add Column Button */}
            <button
              onClick={onAddColumn}
              className="w-80 flex-shrink-0 min-h-[200px] rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-all flex items-center justify-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Column
            </button>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCard task={activeTask} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}

