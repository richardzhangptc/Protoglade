import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Workspace, Project, Invitation } from '@/types';
import { api } from '@/lib/api';

export interface UseWorkspaceOperationsOptions {
  workspaceId: string;
  workspace: Workspace | null;
  setWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  allWorkspaces: Workspace[];
  setAllWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  invitations: Invitation[];
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>;
  newProjectName: string;
  setNewProjectName: React.Dispatch<React.SetStateAction<string>>;
  newProjectDescription: string;
  setNewProjectDescription: React.Dispatch<React.SetStateAction<string>>;
  newProjectType: 'kanban' | 'whiteboard';
  setNewProjectType: React.Dispatch<React.SetStateAction<'kanban' | 'whiteboard'>>;
  newWorkspaceName: string;
  setNewWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
  inviteEmail: string;
  setInviteEmail: React.Dispatch<React.SetStateAction<string>>;
  inviteRole: string;
  setInviteRole: React.Dispatch<React.SetStateAction<string>>;
  setInviteError: React.Dispatch<React.SetStateAction<string>>;
  setShowCreateProjectModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCreateWorkspaceModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWorkspaceSwitcher: React.Dispatch<React.SetStateAction<boolean>>;
  setShowInviteModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRemoveModal: React.Dispatch<React.SetStateAction<boolean>>;
  memberToRemove: { id: string; name: string } | null;
  setMemberToRemove: React.Dispatch<React.SetStateAction<{ id: string; name: string } | null>>;
  setIsCreatingProject: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCreatingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInviting: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRemoving: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useWorkspaceOperations({
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
}: UseWorkspaceOperationsOptions) {
  const router = useRouter();

  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
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
  }, [
    newProjectName,
    newProjectDescription,
    newProjectType,
    workspaceId,
    projects,
    setProjects,
    setNewProjectName,
    setNewProjectDescription,
    setNewProjectType,
    setShowCreateProjectModal,
    setIsCreatingProject,
    setSelectedProjectId,
  ]);

  const handleCreateWorkspace = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreatingWorkspace(true);
    try {
      const newWorkspace = await api.createWorkspace(newWorkspaceName);
      setAllWorkspaces([...allWorkspaces, newWorkspace]);
      setNewWorkspaceName('');
      setShowCreateWorkspaceModal(false);
      setShowWorkspaceSwitcher(false);
      // Navigate to the new workspace
      router.push(`/workspaces/${newWorkspace.id}`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [
    newWorkspaceName,
    allWorkspaces,
    setAllWorkspaces,
    setNewWorkspaceName,
    setShowCreateWorkspaceModal,
    setShowWorkspaceSwitcher,
    setIsCreatingWorkspace,
    router,
  ]);

  const handleInviteMember = useCallback(async (e: React.FormEvent) => {
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
  }, [
    inviteEmail,
    inviteRole,
    workspaceId,
    invitations,
    setInvitations,
    setInviteEmail,
    setInviteRole,
    setInviteError,
    setShowInviteModal,
    setIsInviting,
  ]);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    try {
      await api.cancelInvitation(workspaceId, invitationId);
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  }, [workspaceId, invitations, setInvitations]);

  const handleRemoveMemberClick = useCallback((userId: string, userName: string) => {
    setMemberToRemove({ id: userId, name: userName });
    setShowRemoveModal(true);
  }, [setMemberToRemove, setShowRemoveModal]);

  const handleConfirmRemoveMember = useCallback(async () => {
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
  }, [
    memberToRemove,
    workspaceId,
    workspace,
    setWorkspace,
    setShowRemoveModal,
    setMemberToRemove,
    setIsRemoving,
  ]);

  return {
    handleCreateProject,
    handleCreateWorkspace,
    handleInviteMember,
    handleCancelInvitation,
    handleRemoveMemberClick,
    handleConfirmRemoveMember,
  };
}
