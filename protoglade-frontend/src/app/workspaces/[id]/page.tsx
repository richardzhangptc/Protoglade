'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Workspace,
  Project,
  Invitation,
  Task,
  KanbanColumn,
  WhiteboardStroke,
  WhiteboardPoint,
  WhiteboardShape,
  WhiteboardShapeType,
  WhiteboardText,
  WhiteboardStickyNote,
} from '@/types';
import {
  usePresence,
  TaskSyncEvent,
  TaskDeleteEvent,
  ColumnSyncEvent,
  ColumnDeleteEvent,
  ColumnsReorderedEvent,
  StrokeStartEvent,
  StrokePointEvent,
  StrokeEndEvent,
  StrokeUndoEvent,
  CanvasClearEvent,
} from '@/hooks/usePresence';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ProjectHeader } from './components/ProjectHeader';
import { WhiteboardHeader } from './components/WhiteboardHeader';
import { EmptyState } from './components/EmptyState';
import { KanbanBoard } from './components/KanbanBoard';
import { Whiteboard } from './components/Whiteboard';
import { CreateProjectModal } from './components/modals/CreateProjectModal';
import { CreateWorkspaceModal } from './components/modals/CreateWorkspaceModal';
import { CreateTaskModal } from './components/modals/CreateTaskModal';
import { CreateColumnModal } from './components/modals/CreateColumnModal';
import { InviteMemberModal } from './components/modals/InviteMemberModal';
import { RemoveMemberModal } from './components/modals/RemoveMemberModal';
import { TaskDetailModal } from './components/modals/TaskDetailModal';
import { SidebarView, COLUMN_COLORS } from './components/constants';

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
  const [newProjectType, setNewProjectType] = useState<'kanban' | 'whiteboard'>('kanban');
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
  const [newTask, setNewTask] = useState({ title: '', description: '' });
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

  // Whiteboard state
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [remoteStrokes, setRemoteStrokes] = useState<Map<string, { id: string; points: WhiteboardPoint[]; color: string; size: number; userId: string }>>(new Map());
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [texts, setTexts] = useState<WhiteboardText[]>([]);
  const [stickyNotes, setStickyNotes] = useState<WhiteboardStickyNote[]>([]);

  // Refs
  const lastCursorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Whiteboard stroke sync handlers
  const handleRemoteStrokeStart = useCallback((event: StrokeStartEvent) => {
    setRemoteStrokes((prev) => {
      const next = new Map(prev);
      next.set(event.strokeId, {
        id: event.strokeId,
        points: [event.point],
        color: event.color,
        size: event.size,
        userId: event.userId,
      });
      return next;
    });
  }, []);

  const handleRemoteStrokePoint = useCallback((event: StrokePointEvent) => {
    setRemoteStrokes((prev) => {
      const stroke = prev.get(event.strokeId);
      if (!stroke) return prev;
      const next = new Map(prev);
      next.set(event.strokeId, {
        ...stroke,
        points: [...stroke.points, event.point],
      });
      return next;
    });
  }, []);

  const handleRemoteStrokeEnd = useCallback((event: StrokeEndEvent) => {
    // Remove from remote strokes
    setRemoteStrokes((prev) => {
      const next = new Map(prev);
      next.delete(event.strokeId);
      return next;
    });
    // Add to saved strokes
    setStrokes((prev) => [
      ...prev,
      {
        id: event.strokeId,
        points: event.points,
        color: event.color,
        size: event.size,
        createdAt: new Date().toISOString(),
        createdBy: event.userId,
        projectId: event.projectId,
      },
    ]);
  }, []);

  const handleRemoteStrokeUndo = useCallback((event: StrokeUndoEvent) => {
    setStrokes((prev) => prev.filter((s) => s.id !== event.strokeId));
  }, []);

  const handleRemoteCanvasClear = useCallback((_event: CanvasClearEvent) => {
    setStrokes([]);
    setRemoteStrokes(new Map());
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
    emitStrokeStart,
    emitStrokePoint,
    emitStrokeEnd,
    emitStrokeUndo,
    emitCanvasClear,
  } = usePresence(selectedProjectId, {
    onTaskCreated: handleRemoteTaskCreated,
    onTaskUpdated: handleRemoteTaskUpdated,
    onTaskDeleted: handleRemoteTaskDeleted,
    onColumnCreated: handleRemoteColumnCreated,
    onColumnUpdated: handleRemoteColumnUpdated,
    onColumnDeleted: handleRemoteColumnDeleted,
    onColumnsReordered: handleRemoteColumnsReordered,
    onStrokeStart: handleRemoteStrokeStart,
    onStrokePoint: handleRemoteStrokePoint,
    onStrokeEnd: handleRemoteStrokeEnd,
    onStrokeUndo: handleRemoteStrokeUndo,
    onCanvasClear: handleRemoteCanvasClear,
  });

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
      const projectData = await api.getProject(projectId);
      setSelectedProject(projectData);

      if (projectData.type === 'whiteboard') {
        // Load whiteboard strokes and elements
        const [strokesData, elementsData] = await Promise.all([
          api.getWhiteboardStrokes(projectId),
          api.getWhiteboardElements(projectId).catch(() => ({ shapes: [], texts: [], stickyNotes: [] })),
        ]);
        setStrokes(strokesData);
        setShapes(elementsData.shapes);
        setTexts(elementsData.texts);
        setStickyNotes(elementsData.stickyNotes || []);
        setTasks([]);
        setColumns([]);
        setRemoteStrokes(new Map());
      } else {
        // Load kanban data
        const [tasksData, columnsData] = await Promise.all([
          api.getTasks(projectId),
          api.getColumns(projectId),
        ]);
        setTasks(tasksData);
        setColumns(columnsData.sort((a, b) => a.position - b.position));
        setStrokes([]);
        setShapes([]);
        setTexts([]);
        setStickyNotes([]);
        setRemoteStrokes(new Map());
      }
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
        newProjectDescription || undefined,
        newProjectType
      );
      setProjects([...projects, project]);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectType('kanban');
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

  // Task handlers
  const handleCreateTask = async (e: React.FormEvent) => {
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

  // Whiteboard handlers
  const handleStrokeStart = useCallback((strokeId: string, point: WhiteboardPoint, color: string, size: number) => {
    emitStrokeStart(strokeId, point, color, size);
  }, [emitStrokeStart]);

  const handleStrokePoint = useCallback((strokeId: string, point: WhiteboardPoint) => {
    emitStrokePoint(strokeId, point);
  }, [emitStrokePoint]);

  const handleStrokeEnd = useCallback(async (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => {
    if (!selectedProjectId) return;

    // Add stroke to local state immediately
    const newStroke: WhiteboardStroke = {
      id: strokeId,
      points,
      color,
      size,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || '',
      projectId: selectedProjectId,
    };
    setStrokes((prev) => [...prev, newStroke]);

    // Emit to other users
    emitStrokeEnd(strokeId, points, color, size);

    // Save to database
    try {
      await api.createWhiteboardStroke(selectedProjectId, { points, color, size });
    } catch (error) {
      console.error('Failed to save stroke:', error);
    }
  }, [selectedProjectId, user?.id, emitStrokeEnd]);

  // Undo a stroke by its ID (called from Whiteboard component's history system)
  const handleStrokeUndo = useCallback(async (strokeId: string) => {
    if (!selectedProjectId) return;

    setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    emitStrokeUndo(strokeId);

    try {
      await api.deleteWhiteboardStroke(strokeId);
    } catch (error) {
      console.error('Failed to undo stroke:', error);
    }
  }, [selectedProjectId, emitStrokeUndo]);

  // Redo a stroke (re-create it)
  const handleStrokeRedo = useCallback(async (stroke: WhiteboardStroke) => {
    if (!selectedProjectId) return;

    // Add stroke back to local state
    setStrokes((prev) => [...prev, stroke]);

    // Emit to other users
    emitStrokeEnd(stroke.id, stroke.points, stroke.color, stroke.size);

    // Save to database
    try {
      await api.createWhiteboardStroke(selectedProjectId, {
        points: stroke.points,
        color: stroke.color,
        size: stroke.size,
      });
    } catch (error) {
      console.error('Failed to redo stroke:', error);
    }
  }, [selectedProjectId, emitStrokeEnd]);

  const handleWhiteboardClear = useCallback(async () => {
    if (!selectedProjectId) return;

    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setStickyNotes([]);
    setRemoteStrokes(new Map());
    emitCanvasClear();

    try {
      await api.clearWhiteboardCanvas(selectedProjectId);
    } catch (error) {
      console.error('Failed to clear canvas:', error);
    }
  }, [selectedProjectId, emitCanvasClear]);

  // Whiteboard element handlers
  const handleShapeCreate = useCallback(async (shape: { id: string; type: WhiteboardShapeType; x: number; y: number; width: number; height: number; color: string; strokeWidth: number; filled: boolean }) => {
    if (!selectedProjectId) return;
    try {
      await api.createWhiteboardShape(selectedProjectId, {
        type: shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        color: shape.color,
        strokeWidth: shape.strokeWidth,
        filled: shape.filled,
      });
    } catch (error) {
      console.error('Failed to create shape:', error);
    }
  }, [selectedProjectId]);

  const handleShapeUpdate = useCallback(async (shape: { id: string; x: number; y: number; width: number; height: number; color: string; strokeWidth: number; filled: boolean }) => {
    try {
      await api.updateWhiteboardShape(shape.id, {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        color: shape.color,
        strokeWidth: shape.strokeWidth,
        filled: shape.filled,
      });
    } catch (error) {
      console.error('Failed to update shape:', error);
    }
  }, []);

  const handleShapeDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardShape(id);
    } catch (error) {
      console.error('Failed to delete shape:', error);
    }
  }, []);

  // Text element handlers (persistence to be implemented with backend)
  const handleTextCreate = useCallback(async (text: { id: string; x: number; y: number; width: number; height: number; content: string; fontSize: number; fontWeight: 'normal' | 'bold'; color: string; align: 'left' | 'center' | 'right' }) => {
    if (!selectedProjectId) return;
    try {
      await api.createWhiteboardText(selectedProjectId, {
        id: text.id,
        x: text.x,
        y: text.y,
        width: text.width,
        height: text.height,
        content: text.content,
        fontSize: text.fontSize,
        fontWeight: text.fontWeight,
        color: text.color,
        align: text.align,
      });
    } catch (error) {
      console.error('Failed to create text:', error);
    }
  }, [selectedProjectId]);

  const handleTextUpdate = useCallback(async (text: { id: string; x: number; y: number; width: number; height: number; content: string; fontSize: number; fontWeight: 'normal' | 'bold'; color: string; align: 'left' | 'center' | 'right' }) => {
    try {
      await api.updateWhiteboardText(text.id, {
        x: text.x,
        y: text.y,
        width: text.width,
        height: text.height,
        content: text.content,
        fontSize: text.fontSize,
        fontWeight: text.fontWeight,
        color: text.color,
        align: text.align,
      });
    } catch (error) {
      console.error('Failed to update text:', error);
    }
  }, []);

  const handleTextDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardText(id);
    } catch (error) {
      console.error('Failed to delete text:', error);
    }
  }, []);

  // Sticky Note handlers
  const handleStickyCreate = useCallback(async (sticky: { id: string; x: number; y: number; width: number; height: number; content: string; color: string }) => {
    if (!selectedProjectId) return;
    try {
      await api.createWhiteboardStickyNote(selectedProjectId, sticky);
    } catch (error) {
      console.error('Failed to create sticky note:', error);
    }
  }, [selectedProjectId]);

  const handleStickyUpdate = useCallback(async (sticky: { id: string; x: number; y: number; width: number; height: number; content: string; color: string }) => {
    try {
      await api.updateWhiteboardStickyNote(sticky.id, {
        x: sticky.x,
        y: sticky.y,
        width: sticky.width,
        height: sticky.height,
        content: sticky.content,
        color: sticky.color,
      });
    } catch (error) {
      console.error('Failed to update sticky note:', error);
    }
  }, []);

  const handleStickyDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardStickyNote(id);
    } catch (error) {
      console.error('Failed to delete sticky note:', error);
    }
  }, []);

  const handleWhiteboardCursorMove = useCallback((x: number, y: number) => {
    emitCursorMove({ x, y, isDragging: false, dragTaskId: null, dragTaskTitle: null });
  }, [emitCursorMove]);

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

  const handleTaskUpdated = useCallback((task: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    emitTaskUpdated(task);
  }, [emitTaskUpdated]);

  const handleColumnsReordered = useCallback((reorderedColumns: KanbanColumn[]) => {
    setColumns(reorderedColumns);
    emitColumnsReordered(reorderedColumns);
  }, [emitColumnsReordered]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
      </div>
    );
  }

  // Check if we're in whiteboard mode - whiteboard uses overlay layout
  const isWhiteboardMode = selectedProjectId && selectedProject?.type === 'whiteboard';

  return (
    <div className="h-screen flex bg-[var(--color-bg)] overflow-hidden relative">
      {/* Whiteboard Layer - positioned absolutely behind everything */}
      {isWhiteboardMode && (
        <div className="absolute inset-0 z-0">
          {isLoadingProject ? (
            <div className="w-full h-full flex items-center justify-center bg-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
            </div>
          ) : (
            <Whiteboard
              projectId={selectedProjectId}
              strokes={strokes}
              remoteStrokes={remoteStrokes}
              remoteCursors={remoteCursors}
              sidebarCollapsed={sidebarCollapsed}
              initialShapes={shapes}
              initialTexts={texts}
              initialStickyNotes={stickyNotes}
              onStrokeStart={handleStrokeStart}
              onStrokePoint={handleStrokePoint}
              onStrokeEnd={handleStrokeEnd}
              onStrokeUndo={handleStrokeUndo}
              onStrokeRedo={handleStrokeRedo}
              onClear={handleWhiteboardClear}
              onCursorMove={handleWhiteboardCursorMove}
              onCursorLeave={emitCursorLeave}
              onShapeCreate={handleShapeCreate}
              onShapeUpdate={handleShapeUpdate}
              onShapeDelete={handleShapeDelete}
              onTextCreate={handleTextCreate}
              onTextUpdate={handleTextUpdate}
              onTextDelete={handleTextDelete}
              onStickyCreate={handleStickyCreate}
              onStickyUpdate={handleStickyUpdate}
              onStickyDelete={handleStickyDelete}
            />
          )}
        </div>
      )}

      {/* Sidebar - floats on top for whiteboard mode */}
      <div className={isWhiteboardMode ? 'relative z-10' : ''}>
        <WorkspaceSidebar
          workspace={workspace}
          workspaceId={workspaceId}
          allWorkspaces={allWorkspaces}
          projects={projects}
          sidebarCollapsed={sidebarCollapsed}
          sidebarView={sidebarView}
          showWorkspaceSwitcher={showWorkspaceSwitcher}
          user={user}
          onCollapse={() => setSidebarCollapsed(true)}
          onExpand={() => setSidebarCollapsed(false)}
          onToggleWorkspaceSwitcher={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
          onCloseWorkspaceSwitcher={() => setShowWorkspaceSwitcher(false)}
          onCreateProject={() => setShowCreateProjectModal(true)}
          onCreateWorkspace={() => setShowCreateWorkspaceModal(true)}
          onSelectProject={setSelectedProjectId}
          onToggleSidebarView={() => setSidebarView(sidebarView === 'members' ? 'projects' : 'members')}
          onInviteMember={() => setShowInviteModal(true)}
          selectedProjectId={selectedProjectId}
          onLogout={() => {
            logout();
            router.push('/auth/login');
          }}
          onProjectsReordered={(reorderedProjects) => setProjects(reorderedProjects)}
          onWorkspacesReordered={(reorderedWorkspaces) => setAllWorkspaces(reorderedWorkspaces)}
        />
      </div>

      {/* Main Content - for non-whiteboard views */}
      <div className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden ${isWhiteboardMode ? 'pointer-events-none' : ''}`}>
        {selectedProjectId && selectedProject ? (
          <>
            {selectedProject.type === 'whiteboard' ? (
              /* Whiteboard header floats on top */
              <div className="pointer-events-auto relative z-10">
                <WhiteboardHeader
                  project={selectedProject}
                  sidebarCollapsed={sidebarCollapsed}
                  onExpandSidebar={() => setSidebarCollapsed(false)}
                  onlineUsers={onlineUsers}
                  currentUserId={user?.id}
                />
              </div>
            ) : (
              <>
                <ProjectHeader
                  project={selectedProject}
                  sidebarCollapsed={sidebarCollapsed}
                  onExpandSidebar={() => setSidebarCollapsed(false)}
                  onCreateColumn={() => setShowCreateColumnModal(true)}
                  onlineUsers={onlineUsers}
                  currentUserId={user?.id}
                />
                {isLoadingProject ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
                  </div>
                ) : (
                  <KanbanBoard
                    columns={columns}
                    tasks={tasks}
                    tasksByColumn={tasksByColumn}
                    selectedProjectId={selectedProjectId}
                    remoteCursors={remoteCursors}
                    activeTask={activeTask}
                    activeColumn={activeColumn}
                    editingColumnId={editingColumnId}
                    editingColumnName={editingColumnName}
                    onTaskClick={setSelectedTask}
                    onAddTask={(columnId) => {
                      setCreateTaskColumnId(columnId);
                      setShowCreateTaskModal(true);
                    }}
                    onEditColumn={(columnId, name) => {
                      setEditingColumnId(columnId);
                      setEditingColumnName(name);
                    }}
                    onDeleteColumn={handleDeleteColumn}
                    onEditingNameChange={setEditingColumnName}
                    onSaveColumnName={handleUpdateColumnName}
                    onCancelEdit={() => setEditingColumnId(null)}
                    onTaskUpdated={handleTaskUpdated}
                    onColumnsReordered={handleColumnsReordered}
                    onLoadProjectData={loadProjectData}
                    onCursorMove={emitCursorMove}
                    onCursorLeave={emitCursorLeave}
                    setActiveTask={setActiveTask}
                    setActiveColumn={setActiveColumn}
                    setColumns={setColumns}
                    setTasks={setTasks}
                    lastCursorPosRef={lastCursorPosRef}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <EmptyState userName={user?.name || undefined} userEmail={user?.email} />
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        name={newProjectName}
        description={newProjectDescription}
        type={newProjectType}
        isCreating={isCreatingProject}
        onClose={() => {
          setShowCreateProjectModal(false);
          setNewProjectType('kanban');
        }}
        onNameChange={setNewProjectName}
        onDescriptionChange={setNewProjectDescription}
        onTypeChange={setNewProjectType}
        onSubmit={handleCreateProject}
      />

      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        name={newWorkspaceName}
        isCreating={isCreatingWorkspace}
        onClose={() => setShowCreateWorkspaceModal(false)}
        onNameChange={setNewWorkspaceName}
        onSubmit={handleCreateWorkspace}
      />

      <CreateTaskModal
        isOpen={showCreateTaskModal}
        title={newTask.title}
        description={newTask.description}
        isCreating={isCreatingTask}
        onClose={() => {
          setShowCreateTaskModal(false);
          setCreateTaskColumnId(null);
        }}
        onTitleChange={(title) => setNewTask({ ...newTask, title })}
        onDescriptionChange={(description) => setNewTask({ ...newTask, description })}
        onSubmit={handleCreateTask}
      />

      <CreateColumnModal
        isOpen={showCreateColumnModal}
        name={newColumnName}
        color={newColumnColor}
        isCreating={isCreatingColumn}
        onClose={() => {
          setShowCreateColumnModal(false);
          setNewColumnName('');
          setNewColumnColor(COLUMN_COLORS[0]);
        }}
        onNameChange={setNewColumnName}
        onColorChange={setNewColumnColor}
        onSubmit={handleCreateColumn}
      />

      <InviteMemberModal
        isOpen={showInviteModal}
        email={inviteEmail}
        role={inviteRole}
        error={inviteError}
        invitations={invitations}
        isInviting={isInviting}
        onClose={() => {
          setShowInviteModal(false);
          setInviteError('');
        }}
        onEmailChange={setInviteEmail}
        onRoleChange={setInviteRole}
        onSubmit={handleInviteMember}
        onCancelInvitation={handleCancelInvitation}
      />

      <RemoveMemberModal
        isOpen={showRemoveModal}
        memberName={memberToRemove?.name || ''}
        isRemoving={isRemoving}
        onClose={() => {
          setShowRemoveModal(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleConfirmRemoveMember}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          columns={columns}
          workspaceMembers={workspace?.members || []}
          onClose={() => setSelectedTask(null)}
          onUpdate={(task) => {
            setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
            setSelectedTask(task);
            emitTaskUpdated(task);
          }}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
