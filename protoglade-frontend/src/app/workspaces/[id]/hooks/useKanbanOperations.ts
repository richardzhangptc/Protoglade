import { useCallback } from 'react';
import { Task, KanbanColumn } from '@/types';
import { api } from '@/lib/api';
import { COLUMN_COLORS } from '../components/constants';

export interface UseKanbanOperationsOptions {
  selectedProjectId: string | null;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  columns: KanbanColumn[];
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>;
  newTask: { title: string; description: string };
  setNewTask: React.Dispatch<React.SetStateAction<{ title: string; description: string }>>;
  createTaskColumnId: string | null;
  setCreateTaskColumnId: React.Dispatch<React.SetStateAction<string | null>>;
  setShowCreateTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreatingTask: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>;
  newColumnName: string;
  setNewColumnName: React.Dispatch<React.SetStateAction<string>>;
  newColumnColor: string;
  setNewColumnColor: React.Dispatch<React.SetStateAction<string>>;
  setShowCreateColumnModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreatingColumn: React.Dispatch<React.SetStateAction<boolean>>;
  editingColumnName: string;
  setEditingColumnId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingColumnName: React.Dispatch<React.SetStateAction<string>>;
  emitTaskCreated: (task: Task) => void;
  emitTaskUpdated: (task: Task) => void;
  emitTaskDeleted: (taskId: string) => void;
  emitColumnCreated: (column: KanbanColumn) => void;
  emitColumnUpdated: (column: KanbanColumn) => void;
  emitColumnDeleted: (columnId: string) => void;
  emitColumnsReordered: (columns: KanbanColumn[]) => void;
}

export function useKanbanOperations({
  selectedProjectId,
  tasks,
  setTasks,
  columns,
  setColumns,
  newTask,
  setNewTask,
  createTaskColumnId,
  setCreateTaskColumnId,
  setShowCreateTaskModal,
  setIsCreatingTask,
  setSelectedTask,
  newColumnName,
  setNewColumnName,
  newColumnColor,
  setNewColumnColor,
  setShowCreateColumnModal,
  setIsCreatingColumn,
  editingColumnName,
  setEditingColumnId,
  setEditingColumnName,
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
  emitColumnCreated,
  emitColumnUpdated,
  emitColumnDeleted,
  emitColumnsReordered,
}: UseKanbanOperationsOptions) {
  const handleCreateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !selectedProjectId) return;

    setIsCreatingTask(true);
    try {
      const task = await api.createTask({
        title: newTask.title,
        description: newTask.description || undefined,
        projectId: selectedProjectId,
        columnId: createTaskColumnId || columns[0]?.id,
      });
      setTasks([...tasks, task]);
      setNewTask({ title: '', description: '' });
      setShowCreateTaskModal(false);
      setCreateTaskColumnId(null);
      emitTaskCreated(task);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreatingTask(false);
    }
  }, [
    newTask,
    selectedProjectId,
    createTaskColumnId,
    columns,
    tasks,
    setTasks,
    setNewTask,
    setShowCreateTaskModal,
    setCreateTaskColumnId,
    setIsCreatingTask,
    emitTaskCreated,
  ]);

  const handleCreateColumn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !selectedProjectId) return;

    setIsCreatingColumn(true);
    try {
      const column = await api.createColumn({
        name: newColumnName,
        projectId: selectedProjectId,
        color: newColumnColor,
      });
      setColumns([...columns, column]);
      setNewColumnName('');
      setNewColumnColor(COLUMN_COLORS[0]);
      setShowCreateColumnModal(false);
      emitColumnCreated(column);
    } catch (error) {
      console.error('Failed to create column:', error);
    } finally {
      setIsCreatingColumn(false);
    }
  }, [
    newColumnName,
    newColumnColor,
    selectedProjectId,
    columns,
    setColumns,
    setNewColumnName,
    setNewColumnColor,
    setShowCreateColumnModal,
    setIsCreatingColumn,
    emitColumnCreated,
  ]);

  const handleUpdateColumnName = useCallback(async (columnId: string) => {
    if (!editingColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }

    try {
      const updated = await api.updateColumn(columnId, { name: editingColumnName });
      setColumns(columns.map((c) => (c.id === columnId ? updated : c)));
      emitColumnUpdated(updated);
    } catch (error) {
      console.error('Failed to update column:', error);
    } finally {
      setEditingColumnId(null);
      setEditingColumnName('');
    }
  }, [editingColumnName, columns, setColumns, setEditingColumnId, setEditingColumnName, emitColumnUpdated]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    if (columns.length <= 1) {
      alert('You must have at least one column');
      return;
    }

    try {
      await api.deleteColumn(columnId);
      setColumns(columns.filter((c) => c.id !== columnId));
      // Move tasks from this column to the first remaining column
      const firstRemainingColumn = columns.find((c) => c.id !== columnId);
      if (firstRemainingColumn) {
        setTasks(tasks.map((t) =>
          t.columnId === columnId ? { ...t, columnId: firstRemainingColumn.id } : t
        ));
      }
      emitColumnDeleted(columnId);
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  }, [columns, tasks, setColumns, setTasks, emitColumnDeleted]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      setSelectedTask(null);
      emitTaskDeleted(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [tasks, setTasks, setSelectedTask, emitTaskDeleted]);

  const handleTaskUpdated = useCallback((task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    emitTaskUpdated(task);
  }, [setTasks, emitTaskUpdated]);

  const handleColumnsReordered = useCallback((reorderedColumns: KanbanColumn[]) => {
    setColumns(reorderedColumns);
    emitColumnsReordered(reorderedColumns);
  }, [setColumns, emitColumnsReordered]);

  return {
    handleCreateTask,
    handleCreateColumn,
    handleUpdateColumnName,
    handleDeleteColumn,
    handleDeleteTask,
    handleTaskUpdated,
    handleColumnsReordered,
  };
}
