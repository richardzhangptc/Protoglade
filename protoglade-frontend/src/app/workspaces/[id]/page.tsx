'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Workspace, Project, Invitation } from '@/types';
import Footer from '@/components/Footer';

type TabType = 'projects' | 'members';

export default function WorkspacePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && workspaceId) {
      loadData();
    }
  }, [user, workspaceId]);

  const loadData = async () => {
    try {
      const [workspaceData, projectsData, invitationsData] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getProjects(workspaceId),
        api.getWorkspaceInvitations(workspaceId).catch(() => []),
      ]);
      setWorkspace(workspaceData);
      setProjects(projectsData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to load workspace:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const project = await api.createProject(
        newProjectName,
        workspaceId,
        newProjectDescription || undefined
      );
      setProjects([...projects, project]);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
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
      // Update the workspace members list
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

  // Check if the current user can remove a specific member
  const canRemoveMember = (memberRole: 'owner' | 'admin' | 'member', memberId: string): boolean => {
    // Can't remove yourself
    if (memberId === user?.id) return false;
    
    // Owner can remove admins and members (not other owners, but there's only one owner)
    if (workspace?.myRole === 'owner') {
      return memberRole !== 'owner';
    }
    
    // Admin can only remove members
    if (workspace?.myRole === 'admin') {
      return memberRole === 'member';
    }
    
    return false;
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
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-2">
            <Link href="/dashboard" className="hover:text-[var(--color-text)]">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[var(--color-text)]">{workspace?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] flex items-center justify-center text-[var(--color-text)] font-bold">
                {workspace?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold">{workspace?.name}</h1>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {workspace?.members.length} member{workspace?.members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${
                workspace?.myRole === 'owner' ? 'badge-done' :
                workspace?.myRole === 'admin' ? 'badge-in-progress' :
                'badge-todo'
              }`}>
                {workspace?.myRole}
              </span>
              {(workspace?.myRole === 'owner' || workspace?.myRole === 'admin') && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn btn-secondary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Invite Members
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'projects'
                  ? 'bg-[var(--color-bg)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Projects
                <span className="text-xs bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded">
                  {projects.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'members'
                  ? 'bg-[var(--color-bg)] text-[var(--color-text)] border-t border-l border-r border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Members
                <span className="text-xs bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded">
                  {workspace?.members.length || 0}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {/* Projects Tab Content */}
        {activeTab === 'projects' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold">Projects</h2>
                <p className="text-[var(--color-text-muted)] mt-1">
                  Organize your work into projects
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="card text-center py-16">
                <div className="w-16 h-16 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-[var(--color-text-muted)] mb-6">
                  Create your first project to start organizing tasks
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspaces/${workspaceId}/projects/${project.id}`}
                    className="card hover:border-[var(--color-primary)] transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      {project._count && (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {project._count.tasks} task{project._count.tasks !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Members Tab Content */}
        {activeTab === 'members' && (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold">Team Members</h2>
              <p className="text-[var(--color-text-muted)] mt-1">
                People who have access to this workspace
              </p>
            </div>

            {/* Members List */}
            <div className="card">
              <div className="divide-y divide-[var(--color-border)]">
                {workspace?.members
                  .sort((a, b) => {
                    // Sort by role: owner first, then admin, then member
                    const roleOrder = { owner: 0, admin: 1, member: 2 };
                    return roleOrder[a.role] - roleOrder[b.role];
                  })
                  .map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                          {member.user.name
                            ? member.user.name.charAt(0).toUpperCase()
                            : member.user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {member.user.name || 'Unnamed User'}
                            </p>
                            {member.user.id === user?.id && (
                              <span className="text-xs text-[var(--color-text-muted)]">(you)</span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                        <span className={`badge ${
                          member.role === 'owner' ? 'badge-done' :
                          member.role === 'admin' ? 'badge-in-progress' :
                          'badge-todo'
                        }`}>
                          {member.role === 'owner' && (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-2a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L12 12.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4A1 1 0 0112 10z" clipRule="evenodd" />
                            </svg>
                          )}
                          {member.role}
                        </span>
                        {canRemoveMember(member.role, member.user.id) && (
                          <button
                            onClick={() => handleRemoveMemberClick(member.user.id, member.user.name || member.user.email)}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/10"
                            title="Remove member"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Role Permissions Legend */}
            <div className="mt-8 card bg-[var(--color-surface-hover)]/50">
              <h3 className="font-semibold mb-4">Role Permissions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-done">owner</span>
                  </div>
                  <ul className="text-sm text-[var(--color-text-muted)] space-y-1">
                    <li>• Full workspace control</li>
                    <li>• Delete workspace</li>
                    <li>• Manage all members</li>
                    <li>• All admin permissions</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-in-progress">admin</span>
                  </div>
                  <ul className="text-sm text-[var(--color-text-muted)] space-y-1">
                    <li>• Invite new members</li>
                    <li>• Remove members</li>
                    <li>• Manage projects</li>
                    <li>• All member permissions</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-todo">member</span>
                  </div>
                  <ul className="text-sm text-[var(--color-text-muted)] space-y-1">
                    <li>• View all projects</li>
                    <li>• Create & manage tasks</li>
                    <li>• Add comments</li>
                    <li>• View team members</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
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
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newProjectName.trim()}
                  className="btn btn-primary"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Invite Member</h3>
            <form onSubmit={handleInviteMember} className="space-y-4">
              {inviteError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Pending Invitations</label>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between bg-[var(--color-surface-hover)] p-3 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{invitation.email}</p>
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
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="btn btn-primary"
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
          <div className="card w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Remove Member</h3>
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
                className="btn btn-secondary"
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemoving}
                className="btn bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
              >
                {isRemoving ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

