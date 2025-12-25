'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Workspace, Project, Invitation, Task, KanbanColumn } from '@/types';
import { 
  usePresence, 
  TaskSyncEvent, 
  TaskDeleteEvent, 
  ColumnSyncEvent, 
  ColumnDeleteEvent, 
  ColumnsReorderedEvent 
} from '@/hooks/usePresence';
import { OnlineUsers } from '@/components/OnlineUsers';
import { RemoteCursors, RemoteDragIndicator } from '@/components/RemoteCursors';
import { RemoteCursor } from '@/hooks/usePresence';
import { UserPopup } from '@/components/UserPopup';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  closestCenter,
  pointerWithin,
  CollisionDetection,
  rectIntersection,
  getFirstCollision,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SidebarView = 'projects' | 'members';

const priorityColors: Record<string, string> = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  urgent: 'badge-urgent',
};

const COLUMN_COLORS = [
  '#71717a', // Zinc
  '#6366f1', // Indigo
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#f97316', // Orange
];

export default function WorkspacePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;
  const projectFromUrl = searchParams.get('project');

  // Workspace state
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('projects');
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLUMN_COLORS[0]);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  // Real-time task sync handlers
  const handleRemoteTaskCreated = useCallback((event: TaskSyncEvent) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === event.task.id)) {
        return prev;
      }
      return [...prev, event.task];
    });
  }, []);

  const handleRemoteTaskUpdated = useCallback((event: TaskSyncEvent) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === event.task.id ? event.task : t))
    );
    setSelectedTask((prev) =>
      prev?.id === event.task.id ? event.task : prev
    );
  }, []);

  const handleRemoteTaskDeleted = useCallback((event: TaskDeleteEvent) => {
    setTasks((prev) => prev.filter((t) => t.id !== event.taskId));
    setSelectedTask((prev) => (prev?.id === event.taskId ? null : prev));
  }, []);

  // Column sync handlers
  const handleRemoteColumnCreated = useCallback((event: ColumnSyncEvent) => {
    setColumns((prev) => {
      if (prev.some((c) => c.id === event.column.id)) {
        return prev;
      }
      return [...prev, event.column].sort((a, b) => a.position - b.position);
    });
  }, []);

  const handleRemoteColumnUpdated = useCallback((event: ColumnSyncEvent) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === event.column.id ? event.column : c))
    );
  }, []);

  const handleRemoteColumnDeleted = useCallback((event: ColumnDeleteEvent) => {
    setColumns((prev) => prev.filter((c) => c.id !== event.columnId));
  }, []);

  const handleRemoteColumnsReordered = useCallback((event: ColumnsReorderedEvent) => {
    setColumns(event.columns.sort((a, b) => a.position - b.position));
  }, []);

  // Real-time presence and task sync
  const {
    onlineUsers,
    remoteCursors,
    emitTaskCreated,
    emitTaskUpdated,
    emitTaskDeleted,
    emitColumnCreated,
    emitColumnUpdated,
    emitColumnDeleted,
    emitColumnsReordered,
    emitCursorMove,
    emitCursorLeave,
  } = usePresence(selectedProjectId, {
    onTaskCreated: handleRemoteTaskCreated,
    onTaskUpdated: handleRemoteTaskUpdated,
    onTaskDeleted: handleRemoteTaskDeleted,
    onColumnCreated: handleRemoteColumnCreated,
    onColumnUpdated: handleRemoteColumnUpdated,
    onColumnDeleted: handleRemoteColumnDeleted,
    onColumnsReordered: handleRemoteColumnsReordered,
  });

  // Refs
  const boardRef = useRef<HTMLElement | null>(null);
  const lastCursorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const workspaceSwitcherRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Lower distance for more responsive drag
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

  // Close workspace switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceSwitcherRef.current && !workspaceSwitcherRef.current.contains(event.target as Node)) {
        setShowWorkspaceSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && workspaceId) {
      loadWorkspaceData();
    }
  }, [user, workspaceId]);

  // Auto-select project from URL query param
  useEffect(() => {
    if (projectFromUrl && !isLoading && projects.length > 0) {
      // Check if the project exists in this workspace
      const projectExists = projects.some(p => p.id === projectFromUrl);
      if (projectExists && selectedProjectId !== projectFromUrl) {
        setSelectedProjectId(projectFromUrl);
        // Clear the URL param after selecting
        router.replace(`/workspaces/${workspaceId}`, { scroll: false });
      }
    }
  }, [projectFromUrl, isLoading, projects, selectedProjectId, workspaceId, router]);

  // Load project when selected
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    } else {
      setSelectedProject(null);
      setTasks([]);
      setColumns([]);
    }
  }, [selectedProjectId]);

  const loadWorkspaceData = async () => {
    try {
      const [workspaceData, projectsData, invitationsData, workspacesData] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getProjects(workspaceId),
        api.getWorkspaceInvitations(workspaceId).catch(() => []),
        api.getWorkspaces(),
      ]);
      setWorkspace(workspaceData);
      setProjects(projectsData);
      setInvitations(invitationsData);
      setAllWorkspaces(workspacesData);
    } catch (error) {
      console.error('Failed to load workspace:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectData = async (projectId: string) => {
    setIsLoadingProject(true);
    try {
      const [projectData, tasksData, columnsData] = await Promise.all([
        api.getProject(projectId),
        api.getTasks(projectId),
        api.getColumns(projectId),
      ]);
      setSelectedProject(projectData);
      setTasks(tasksData);
      setColumns(columnsData.sort((a, b) => a.position - b.position));
    } catch (error) {
      console.error('Failed to load project:', error);
      setSelectedProjectId(null);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreatingProject(true);
    try {
      const project = await api.createProject(
        newProjectName,
        workspaceId,
        newProjectDescription || undefined
      );
      setProjects([...projects, project]);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateProjectModal(false);
      // Auto-select the new project
      setSelectedProjectId(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreatingWorkspace(true);
    try {
      const workspace = await api.createWorkspace(newWorkspaceName);
      setAllWorkspaces([...allWorkspaces, workspace]);
      setNewWorkspaceName('');
      setShowCreateWorkspaceModal(false);
      setShowWorkspaceSwitcher(false);
      // Navigate to the new workspace
      router.push(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError('');
    try {
      const invitation = await api.sendInvitation(workspaceId, inviteEmail, inviteRole);
      setInvitations([...invitations, invitation]);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await api.cancelInvitation(workspaceId, invitationId);
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const handleRemoveMemberClick = (userId: string, userName: string) => {
    setMemberToRemove({ id: userId, name: userName });
    setShowRemoveModal(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      await api.removeMember(workspaceId, memberToRemove.id);
      if (workspace) {
        setWorkspace({
          ...workspace,
          members: workspace.members.filter(m => m.user.id !== memberToRemove.id),
        });
      }
      setShowRemoveModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const canRemoveMember = (memberRole: 'owner' | 'admin' | 'member', memberId: string): boolean => {
    if (memberId === user?.id) return false;
    if (workspace?.myRole === 'owner') {
      return memberRole !== 'owner';
    }
    if (workspace?.myRole === 'admin') {
      return memberRole === 'member';
    }
    return false;
  };

  // Task handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !selectedProjectId) return;

    setIsCreatingTask(true);
    try {
      const task = await api.createTask({
        ...newTask,
        projectId: selectedProjectId,
        columnId: createTaskColumnId || columns[0]?.id,
      });
      setTasks([...tasks, task]);
      setNewTask({ title: '', description: '', priority: 'medium' });
      setShowCreateTaskModal(false);
      setCreateTaskColumnId(null);
      emitTaskCreated(task);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Column handlers
  const handleCreateColumn = async (e: React.FormEvent) => {
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
  };

  const handleUpdateColumnName = async (columnId: string) => {
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
  };

  const handleDeleteColumn = async (columnId: string) => {
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
  };

  const handleUpdateTaskColumn = async (taskId: string, columnId: string) => {
    try {
      const updated = await api.updateTask(taskId, { columnId });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updated);
      }
      emitTaskUpdated(updated);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      setSelectedTask(null);
      emitTaskDeleted(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Group tasks by column
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
        emitCursorMove({
          x: lastCursorPosRef.current.x,
          y: lastCursorPosRef.current.y,
          isDragging: true,
          dragTaskId: task.id,
          dragTaskTitle: task.title,
        });
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const scrollLeft = boardRef.current.scrollLeft || 0;
      const scrollTop = boardRef.current.scrollTop || 0;

      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top + scrollTop;

      lastCursorPosRef.current = { x, y };

      emitCursorMove({
        x,
        y,
        isDragging: !!activeTask,
        dragTaskId: activeTask?.id || null,
        dragTaskTitle: activeTask?.title || null,
      });
    },
    [emitCursorMove, activeTask]
  );

  const handleMouseLeave = useCallback(() => {
    emitCursorLeave();
  }, [emitCursorLeave]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;
    
    // Reset active items
    setActiveTask(null);
    setActiveColumn(null);

    emitCursorMove({
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
              selectedProjectId!,
              newColumns.map((c) => c.id)
            );
            setColumns(reorderedColumns);
            emitColumnsReordered(reorderedColumns);
          } catch (error) {
            console.error('Failed to reorder columns:', error);
            if (selectedProjectId) {
              loadProjectData(selectedProjectId);
            }
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
      emitTaskUpdated(updated);
    } catch (error) {
      console.error('Failed to update task position:', error);
      if (selectedProjectId) {
        loadProjectData(selectedProjectId);
      }
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'there';
  };

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[var(--color-bg)] overflow-hidden">
      {/* Collapsed Sidebar Toggle - Only show when no project is selected */}
      {sidebarCollapsed && !selectedProjectId && (
        <div className="fixed top-0 left-0 z-40 p-3">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors shadow-sm"
            title="Expand sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar - fixed height, doesn't scroll with board */}
      <aside className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'} flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full transition-all duration-200`}>
        {/* Workspace Switcher Header */}
        <div className="p-3 border-b border-[var(--color-border)] relative" ref={workspaceSwitcherRef}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
              className="flex-1 flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
            >
              <div className="w-8 h-8 rounded-md bg-[var(--color-primary)] flex items-center justify-center text-sm font-semibold text-[#2B2B2B] flex-shrink-0">
                {workspace?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">
                  {workspace?.name}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {workspace?.members.length} member{workspace?.members.length !== 1 ? 's' : ''}
                </p>
              </div>
              <svg 
                className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${showWorkspaceSwitcher ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapse Button */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Floating Workspace Switcher Dropdown */}
          {showWorkspaceSwitcher && (
            <div className="absolute left-3 right-3 top-full mt-1 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50">
              <div className="max-h-64 overflow-y-auto">
                {allWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setShowWorkspaceSwitcher(false);
                      if (ws.id !== workspaceId) {
                        router.push(`/workspaces/${ws.id}`);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2 w-full text-left transition-colors ${
                      ws.id === workspaceId 
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-text)]' 
                        : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-xs font-medium">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate flex-1">{ws.name}</span>
                    {ws.id === workspaceId && (
                      <svg className="w-4 h-4 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--color-border)] mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowWorkspaceSwitcher(false);
                    setShowCreateWorkspaceModal(true);
                  }}
                  className="flex items-center gap-3 px-3 py-2 w-full text-left hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Workspace
                </button>
                <Link
                  href="/dashboard"
                  onClick={() => setShowWorkspaceSwitcher(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  All Workspaces
                </Link>
                <Link
                  href={`/workspaces/${workspaceId}/settings`}
                  onClick={() => setShowWorkspaceSwitcher(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Workspace Settings
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {/* Projects Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Projects
              </span>
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                title="New project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              {projects.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-2 py-1">No projects yet</p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-left transition-colors group ${
                      selectedProjectId === project.id
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-text)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{project.name}</span>
                    {project._count && project._count.tasks > 0 && (
                      <span className="ml-auto text-xs text-[var(--color-text-muted)]">
                        {project._count.tasks}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Members Section */}
          <div>
            <button
              onClick={() => setSidebarView(sidebarView === 'members' ? 'projects' : 'members')}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Members</span>
              <span className="ml-auto text-xs bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded">
                {workspace?.members.length || 0}
              </span>
            </button>

            {sidebarView === 'members' && (
              <div className="mt-2 pl-6 space-y-1">
                {workspace?.members
                  .sort((a, b) => {
                    const roleOrder = { owner: 0, admin: 1, member: 2 };
                    return roleOrder[a.role] - roleOrder[b.role];
                  })
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-[var(--color-text-muted)]">
                        {member.user.name || member.user.email.split('@')[0]}
                      </span>
                      {member.user.id === user?.id && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">(you)</span>
                      )}
                    </div>
                  ))}
                
                {(workspace?.myRole === 'owner' || workspace?.myRole === 'admin') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 py-1 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors mt-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Invite members
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <UserPopup 
            user={user} 
            onLogout={() => {
              logout();
              router.push('/auth/login');
            }} 
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {selectedProjectId && selectedProject ? (
          <>
            {/* Project Header - fixed, doesn't scroll */}
            <header className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Expand Sidebar Button - shown when sidebar is collapsed */}
                  {sidebarCollapsed && (
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className="p-2 -ml-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex-shrink-0"
                      title="Expand sidebar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-[var(--color-text)] truncate">{selectedProject.name}</h1>
                    {selectedProject.description && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate">
                        {selectedProject.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <OnlineUsers users={onlineUsers} currentUserId={user?.id} />
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Task
                  </button>
                </div>
              </div>
            </header>

            {/* Kanban Board - scrollable area */}
            {isLoadingProject ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
            </div>
            ) : (
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
                        <SortableKanbanColumn
                          key={column.id}
                          column={column}
                          tasks={tasksByColumn[column.id] || []}
                          onTaskClick={setSelectedTask}
                          remoteCursors={remoteCursors}
                          onAddTask={() => {
                            setCreateTaskColumnId(column.id);
                            setShowCreateTaskModal(true);
                          }}
                          onEditColumn={(columnId, name) => {
                            setEditingColumnId(columnId);
                            setEditingColumnName(name);
                          }}
                          onDeleteColumn={handleDeleteColumn}
                          editingColumnId={editingColumnId}
                          editingColumnName={editingColumnName}
                          onEditingNameChange={setEditingColumnName}
                          onSaveColumnName={handleUpdateColumnName}
                          onCancelEdit={() => setEditingColumnId(null)}
                        />
                      ))}
                      
                      {/* Add Column Button */}
                      <button
                        onClick={() => setShowCreateColumnModal(true)}
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
            )}
          </>
        ) : (
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            <h1 className="text-3xl font-light text-[var(--color-text)]">
              {getGreeting()}, <span className="font-medium">{getUserDisplayName()}</span>
            </h1>
            <p className="mt-4 text-[var(--color-text-muted)]">
              Select a project from the sidebar to get started
            </p>
      </main>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                  Description <span className="text-[var(--color-text-muted)]">(optional)</span>
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject || !newProjectName.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingProject ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Create Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Name</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateWorkspaceModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingWorkspace ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Create Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">
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
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Priority</label>
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
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask || !newTask.title.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingTask ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Column Modal */}
      {showCreateColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Add Column</h3>
            <form onSubmit={handleCreateColumn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Name</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColumnColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newColumnColor === color 
                          ? 'ring-2 ring-offset-2 ring-offset-[var(--color-surface)] ring-[var(--color-primary)] scale-110' 
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateColumnModal(false);
                    setNewColumnName('');
                    setNewColumnColor(COLUMN_COLORS[0]);
                  }}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingColumn || !newColumnName.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingColumn ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Invite Member</h3>
            <form onSubmit={handleInviteMember} className="space-y-4">
              {inviteError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {invitations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Pending Invitations</label>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between bg-[var(--color-surface-hover)] p-3 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">{invitation.email}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {invitation.role}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                  }}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveModal && memberToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Remove Member</h3>
            </div>
            
            <p className="text-[var(--color-text-muted)] mb-6">
              Are you sure you want to remove <span className="font-semibold text-[var(--color-text)]">{memberToRemove.name}</span> from this workspace? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRemoveModal(false);
                  setMemberToRemove(null);
                }}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemoving}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRemoving ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSelectedTask(null)} />
          <div className="w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text)]">{selectedTask.title}</h2>
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
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Column</label>
                <div className="flex gap-2 flex-wrap">
                  {columns.map((column) => (
                    <button
                      key={column.id}
                      onClick={() => handleUpdateTaskColumn(selectedTask.id, column.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        selectedTask.columnId === column.id
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
                <span className={`badge ${priorityColors[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </span>
              </div>

              {selectedTask.description && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Description</label>
                  <p className="text-[var(--color-text-muted)]">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask._count && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Comments</label>
                  <p className="text-[var(--color-text-muted)]">
                    {selectedTask._count.comments} comment{selectedTask._count.comments !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
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

// Sortable Kanban Column Component
function SortableKanbanColumn({
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
}: {
  column: KanbanColumn;
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
}) {
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

// Sortable Task Card Wrapper
function SortableTaskCard({
  task,
  onClick,
  isLockedByRemote = false,
  lockedByUserName,
  lockedByUserColor,
}: {
  task: Task;
  onClick: () => void;
  isLockedByRemote?: boolean;
  lockedByUserName?: string;
  lockedByUserColor?: string;
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

// Task Card Component
function TaskCard({
  task,
  onClick,
  isOverlay,
  isLockedByRemote = false,
  lockedByUserName,
  lockedByUserColor,
}: {
  task: Task;
  onClick?: () => void;
  isOverlay?: boolean;
  isLockedByRemote?: boolean;
  lockedByUserName?: string;
  lockedByUserColor?: string;
}) {
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
