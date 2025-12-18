'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Project, Task } from '@/types';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const statusColors: Record<string, string> = {
  todo: 'badge-todo',
  in_progress: 'badge-in-progress',
  done: 'badge-done',
};

const priorityColors: Record<string, string> = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  urgent: 'badge-urgent',
};

type TaskStatus = 'todo' | 'in_progress' | 'done';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-zinc-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-indigo-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

export default function ProjectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && projectId) {
      loadData();
    }
  }, [user, projectId]);

  const loadData = async () => {
    try {
      const [projectData, tasksData] = await Promise.all([
        api.getProject(projectId),
        api.getTasks(projectId),
      ]);
      setProject(projectData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load project:', error);
      router.push(`/workspaces/${workspaceId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsCreating(true);
    try {
      const task = await api.createTask({
        ...newTask,
        projectId,
      });
      setTasks([...tasks, task]);
      setNewTask({ title: '', description: '', priority: 'medium' });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updated = await api.updateTask(taskId, { status });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updated);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Group tasks by status with stable sorting
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    // Sort by position within each status
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [tasks]);

  // All task IDs for global SortableContext
  const allTaskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const findColumnByTaskId = (taskId: string): TaskStatus | null => {
    const task = tasks.find((t) => t.id === taskId);
    return task ? task.status : null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine if we're dropping on a column or a task
    const isOverColumn = COLUMNS.some((col) => col.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    let targetStatus: TaskStatus;
    
    if (isOverColumn) {
      // Dropped directly on a column
      targetStatus = overId as TaskStatus;
    } else if (overTask) {
      // Dropped on a task - use that task's column
      targetStatus = overTask.status;
    } else {
      // Fallback - keep current status
      targetStatus = activeTask.status;
    }

    const sourceStatus = activeTask.status;
    const isSameColumn = sourceStatus === targetStatus;

    // Get tasks in the source and target columns
    const sourceColumnTasks = tasksByStatus[sourceStatus].filter((t) => t.id !== activeId);
    const targetColumnTasks = isSameColumn
      ? tasksByStatus[targetStatus]
      : tasksByStatus[targetStatus];

    let newPosition: number;

    if (isOverColumn) {
      // Dropped on column header/empty area - add at end
      const lastTask = targetColumnTasks[targetColumnTasks.length - 1];
      newPosition = lastTask ? lastTask.position + 1000 : 1000;
    } else if (overTask) {
      // Dropped on a specific task
      const overTaskIndex = targetColumnTasks.findIndex((t) => t.id === overId);
      const activeTaskIndex = targetColumnTasks.findIndex((t) => t.id === activeId);

      if (isSameColumn) {
        // Reordering within the same column
        if (activeTaskIndex === overTaskIndex) {
          // Dropped on itself - no change
          return;
        }

        // Use arrayMove logic for position calculation
        const movingDown = activeTaskIndex < overTaskIndex;

        if (movingDown) {
          // Moving down - place after the target
          const targetTask = targetColumnTasks[overTaskIndex];
          const nextTask = targetColumnTasks[overTaskIndex + 1];
          if (nextTask) {
            newPosition = (targetTask.position + nextTask.position) / 2;
          } else {
            newPosition = targetTask.position + 1000;
          }
        } else {
          // Moving up - place before the target
          const targetTask = targetColumnTasks[overTaskIndex];
          const prevTask = targetColumnTasks[overTaskIndex - 1];
          if (prevTask) {
            newPosition = (prevTask.position + targetTask.position) / 2;
          } else {
            newPosition = targetTask.position / 2;
          }
        }
      } else {
        // Moving to a different column
        const targetTasksWithoutActive = targetColumnTasks.filter((t) => t.id !== activeId);
        const overIndex = targetTasksWithoutActive.findIndex((t) => t.id === overId);

        if (overIndex === 0) {
          // Insert before first task
          newPosition = targetTasksWithoutActive[0].position / 2;
        } else if (overIndex > 0) {
          // Insert between tasks
          const prevPosition = targetTasksWithoutActive[overIndex - 1].position;
          const nextPosition = targetTasksWithoutActive[overIndex].position;
          newPosition = (prevPosition + nextPosition) / 2;
        } else {
          // Insert at end (shouldn't normally happen)
          const lastTask = targetTasksWithoutActive[targetTasksWithoutActive.length - 1];
          newPosition = lastTask ? lastTask.position + 1000 : 1000;
        }
      }
    } else {
      // Fallback
      return;
    }

    // Check if anything actually changed
    if (isSameColumn && Math.abs(newPosition - activeTask.position) < 0.001) {
      return;
    }

    // Update local state immediately for smooth UX
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === activeId
          ? { ...t, status: targetStatus, position: newPosition }
          : t
      )
    );

    // Persist to backend
    try {
      await api.updateTask(activeId, {
        status: targetStatus,
        position: newPosition,
      });
    } catch (error) {
      console.error('Failed to update task position:', error);
      // Reload to get correct state
      loadData();
    }
  };

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-2">
            <Link href="/dashboard" className="hover:text-[var(--color-text)]">
              Dashboard
            </Link>
            <span>/</span>
            <Link href={`/workspaces/${workspaceId}`} className="hover:text-[var(--color-text)]">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-[var(--color-text)]">{project?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{project?.name}</h1>
              {project?.description && (
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {project.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id]}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <TaskCard task={activeTask} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-[var(--color-text-muted)]">(optional)</span>
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTask.title.trim()}
                  className="btn btn-primary"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSelectedTask(null)} />
          <div className="w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold">{selectedTask.title}</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className="flex gap-2">
                  {(['todo', 'in_progress', 'done'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedTask.status === status
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Done'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <span className={`badge ${priorityColors[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </span>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <p className="text-[var(--color-text-muted)]">{selectedTask.description}</p>
                </div>
              )}

              {/* Comments count */}
              {selectedTask._count && (
                <div>
                  <label className="block text-sm font-medium mb-2">Comments</label>
                  <p className="text-[var(--color-text-muted)]">
                    {selectedTask._count.comments} comment{selectedTask._count.comments !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Delete button */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="btn btn-danger w-full"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Kanban Column Component with useDroppable
function KanbanColumn({
  column,
  tasks,
  onTaskClick,
}: {
  column: { id: TaskStatus; title: string; color: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      status: column.id,
    },
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="w-80 flex-shrink-0">
      <div className="flex items-center gap-2 mb-4 px-2">
        <span className={`w-3 h-3 rounded-full ${column.color}`} />
        <h3 className="font-semibold">{column.title}</h3>
        <span className="text-sm text-[var(--color-text-muted)]">({tasks.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className={`rounded-xl p-2 min-h-[200px] transition-colors ${
          isOver ? 'bg-[var(--color-surface-hover)]' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// Sortable Task Card Wrapper
function SortableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
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
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  onClick,
  isOverlay,
}: {
  task: Task;
  onClick?: () => void;
  isOverlay?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`card w-full text-left hover:border-[var(--color-primary)] transition-all cursor-grab active:cursor-grabbing ${
        isOverlay ? 'shadow-2xl rotate-2 scale-105' : ''
      }`}
    >
      <h4 className="font-medium mb-2">{task.title}</h4>
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
