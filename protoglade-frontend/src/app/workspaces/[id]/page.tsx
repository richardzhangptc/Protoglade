'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
import { COLUMN_COLORS } from './components/constants';
import {
  useWorkspaceState,
  useProjectState,
  useWhiteboardPageState,
  useRealtimeSync,
  useWorkspaceOperations,
  useKanbanOperations,
  useWhiteboardOperations,
  useDataLoading,
} from './hooks';

export default function WorkspacePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;
  const projectFromUrl = searchParams.get('project');

  // State hooks
  const workspaceState = useWorkspaceState({ initialWorkspaceId: workspaceId });
  const projectState = useProjectState();
  const whiteboardState = useWhiteboardPageState();

  // Destructure for easier access
  const {
    workspace, setWorkspace,
    allWorkspaces, setAllWorkspaces,
    invitations, setInvitations,
    isLoading, setIsLoading,
    sidebarCollapsed, setSidebarCollapsed,
    sidebarView, setSidebarView,
    showWorkspaceSwitcher, setShowWorkspaceSwitcher,
    showCreateProjectModal, setShowCreateProjectModal,
    showCreateWorkspaceModal, setShowCreateWorkspaceModal,
    showInviteModal, setShowInviteModal,
    showRemoveModal, setShowRemoveModal,
    memberToRemove, setMemberToRemove,
    newProjectName, setNewProjectName,
    newProjectDescription, setNewProjectDescription,
    newProjectType, setNewProjectType,
    newWorkspaceName, setNewWorkspaceName,
    inviteEmail, setInviteEmail,
    inviteRole, setInviteRole,
    inviteError, setInviteError,
    isCreatingProject, setIsCreatingProject,
    isCreatingWorkspace, setIsCreatingWorkspace,
    isInviting, setIsInviting,
    isRemoving, setIsRemoving,
  } = workspaceState;

  const {
    projects, setProjects,
    selectedProjectId, setSelectedProjectId,
    selectedProject, setSelectedProject,
    isLoadingProject, setIsLoadingProject,
    tasks, setTasks,
    columns, setColumns,
    tasksByColumn,
    showCreateTaskModal, setShowCreateTaskModal,
    createTaskColumnId, setCreateTaskColumnId,
    newTask, setNewTask,
    isCreatingTask, setIsCreatingTask,
    selectedTask, setSelectedTask,
    activeTask, setActiveTask,
    activeColumn, setActiveColumn,
    showCreateColumnModal, setShowCreateColumnModal,
    newColumnName, setNewColumnName,
    newColumnColor, setNewColumnColor,
    isCreatingColumn, setIsCreatingColumn,
    editingColumnId, setEditingColumnId,
    editingColumnName, setEditingColumnName,
    lastCursorPosRef,
  } = projectState;

  const {
    strokes, setStrokes,
    remoteStrokes, setRemoteStrokes,
    shapes, setShapes,
    texts, setTexts,
    stickyNotes, setStickyNotes,
    images, setImages,
  } = whiteboardState;

  // Realtime sync
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
  } = useRealtimeSync({
    selectedProjectId,
    setTasks,
    setSelectedTask,
    setColumns,
    setStrokes,
    setRemoteStrokes,
  });

  // Data loading
  const { loadWorkspaceData, loadProjectData } = useDataLoading({
    workspaceId,
    setWorkspace,
    setProjects,
    setInvitations,
    setAllWorkspaces,
    setIsLoading,
    setSelectedProject,
    setSelectedProjectId,
    setIsLoadingProject,
    setTasks,
    setColumns,
    setStrokes,
    setShapes,
    setTexts,
    setStickyNotes,
    setImages,
    setRemoteStrokes,
  });

  // Workspace operations
  const {
    handleCreateProject,
    handleCreateWorkspace,
    handleInviteMember,
    handleCancelInvitation,
    handleConfirmRemoveMember,
  } = useWorkspaceOperations({
    workspaceId,
    workspace,
    setWorkspace,
    projects,
    setProjects,
    allWorkspaces,
    setAllWorkspaces,
    invitations,
    setInvitations,
    newProjectName,
    setNewProjectName,
    newProjectDescription,
    setNewProjectDescription,
    newProjectType,
    setNewProjectType,
    newWorkspaceName,
    setNewWorkspaceName,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    setInviteError,
    setShowCreateProjectModal,
    setShowCreateWorkspaceModal,
    setShowWorkspaceSwitcher,
    setShowInviteModal,
    setShowRemoveModal,
    memberToRemove,
    setMemberToRemove,
    setIsCreatingProject,
    setIsCreatingWorkspace,
    setIsInviting,
    setIsRemoving,
    setSelectedProjectId,
  });

  // Kanban operations
  const {
    handleCreateTask,
    handleCreateColumn,
    handleUpdateColumnName,
    handleDeleteColumn,
    handleDeleteTask,
    handleTaskUpdated,
    handleColumnsReordered,
  } = useKanbanOperations({
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
  });

  // Whiteboard operations
  const {
    handleStrokeStart,
    handleStrokePoint,
    handleStrokeEnd,
    handleStrokeUndo,
    handleStrokeRedo,
    handleWhiteboardClear,
    handleShapeCreate,
    handleShapeUpdate,
    handleShapeDelete,
    handleTextCreate,
    handleTextUpdate,
    handleTextDelete,
    handleStickyCreate,
    handleStickyUpdate,
    handleStickyDelete,
    handleImageUpdate,
    handleImageDelete,
    handleWhiteboardCursorMove,
  } = useWhiteboardOperations({
    selectedProjectId,
    userId: user?.id,
    strokes,
    setStrokes,
    setShapes,
    setTexts,
    setStickyNotes,
    setImages,
    setRemoteStrokes,
    emitStrokeStart,
    emitStrokePoint,
    emitStrokeEnd,
    emitStrokeUndo,
    emitCanvasClear,
    emitCursorMove,
  });

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load workspace data
  useEffect(() => {
    if (user && workspaceId) {
      loadWorkspaceData();
    }
  }, [user, workspaceId, loadWorkspaceData]);

  // Auto-select project from URL query param
  useEffect(() => {
    if (projectFromUrl && !isLoading && projects.length > 0) {
      const projectExists = projects.some(p => p.id === projectFromUrl);
      if (projectExists && selectedProjectId !== projectFromUrl) {
        setSelectedProjectId(projectFromUrl);
        router.replace(`/workspaces/${workspaceId}`, { scroll: false });
      }
    }
  }, [projectFromUrl, isLoading, projects, selectedProjectId, workspaceId, router, setSelectedProjectId]);

  // Load project when selected
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    } else {
      setSelectedProject(null);
      setTasks([]);
      setColumns([]);
    }
  }, [selectedProjectId, loadProjectData, setSelectedProject, setTasks, setColumns]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
      </div>
    );
  }

  const isWhiteboardMode = selectedProjectId && selectedProject?.type === 'whiteboard';

  return (
    <div className="h-screen flex bg-[var(--color-bg)] overflow-hidden relative">
      {/* Whiteboard Layer */}
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
              initialImages={images}
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
              onImageUpdate={handleImageUpdate}
              onImageDelete={handleImageDelete}
            />
          )}
        </div>
      )}

      {/* Sidebar */}
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
          onProjectsReordered={setProjects}
          onWorkspacesReordered={setAllWorkspaces}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden ${isWhiteboardMode ? 'pointer-events-none' : ''}`}>
        {selectedProjectId && selectedProject ? (
          <>
            {selectedProject.type === 'whiteboard' ? (
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
