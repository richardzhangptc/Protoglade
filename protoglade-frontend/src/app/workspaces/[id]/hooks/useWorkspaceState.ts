import { useState } from 'react';
import { Workspace, Invitation } from '@/types';
import { SidebarView } from '../components/constants';

export interface UseWorkspaceStateOptions {
  initialWorkspaceId: string;
}

export function useWorkspaceState({ initialWorkspaceId }: UseWorkspaceStateOptions) {
  // Workspace data
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('projects');
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);

  // Modal state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState<'kanban' | 'whiteboard'>('kanban');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteError, setInviteError] = useState('');

  // Loading states
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  return {
    // Workspace data
    workspace,
    setWorkspace,
    allWorkspaces,
    setAllWorkspaces,
    invitations,
    setInvitations,
    isLoading,
    setIsLoading,
    workspaceId: initialWorkspaceId,

    // Sidebar state
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarView,
    setSidebarView,
    showWorkspaceSwitcher,
    setShowWorkspaceSwitcher,

    // Modal state
    showCreateProjectModal,
    setShowCreateProjectModal,
    showCreateWorkspaceModal,
    setShowCreateWorkspaceModal,
    showInviteModal,
    setShowInviteModal,
    showRemoveModal,
    setShowRemoveModal,
    memberToRemove,
    setMemberToRemove,

    // Form state
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
    inviteError,
    setInviteError,

    // Loading states
    isCreatingProject,
    setIsCreatingProject,
    isCreatingWorkspace,
    setIsCreatingWorkspace,
    isInviting,
    setIsInviting,
    isRemoving,
    setIsRemoving,
  };
}

export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
