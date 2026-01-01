import { useState, useMemo, useRef } from 'react';
import { Project, Task, KanbanColumn } from '@/types';
import { COLUMN_COLORS } from '../components/constants';

export function useProjectState() {
  // Project data
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // Kanban data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);

  // Task modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Drag state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);

  // Column modal state
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLUMN_COLORS[0]);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  // Refs
  const lastCursorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Computed: group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    columns.forEach((col) => {
      grouped[col.id] = [];
    });
    tasks.forEach((task) => {
      if (task.columnId && grouped[task.columnId]) {
        grouped[task.columnId].push(task);
      } else if (columns.length > 0) {
        // Put orphan tasks in the first column
        grouped[columns[0].id]?.push(task);
      }
    });
    // Sort tasks by position within each column
    Object.keys(grouped).forEach((columnId) => {
      grouped[columnId].sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [tasks, columns]);

  return {
    // Project data
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    setSelectedProject,
    isLoadingProject,
    setIsLoadingProject,

    // Kanban data
    tasks,
    setTasks,
    columns,
    setColumns,
    tasksByColumn,

    // Task modal state
    showCreateTaskModal,
    setShowCreateTaskModal,
    createTaskColumnId,
    setCreateTaskColumnId,
    newTask,
    setNewTask,
    isCreatingTask,
    setIsCreatingTask,
    selectedTask,
    setSelectedTask,

    // Drag state
    activeTask,
    setActiveTask,
    activeColumn,
    setActiveColumn,

    // Column modal state
    showCreateColumnModal,
    setShowCreateColumnModal,
    newColumnName,
    setNewColumnName,
    newColumnColor,
    setNewColumnColor,
    isCreatingColumn,
    setIsCreatingColumn,
    editingColumnId,
    setEditingColumnId,
    editingColumnName,
    setEditingColumnName,

    // Refs
    lastCursorPosRef,
  };
}

export type ProjectState = ReturnType<typeof useProjectState>;
