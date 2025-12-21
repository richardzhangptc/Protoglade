'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Workspace, Invitation } from '@/types';

export default function WorkspaceSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
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
      const [workspaceData, invitationsData] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getWorkspaceInvitations(workspaceId).catch(() => []),
      ]);
      setWorkspace(workspaceData);
      setWorkspaceName(workspaceData.name);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Failed to load workspace:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || workspaceName === workspace?.name) return;

    setIsUpdating(true);
    try {
      const updated = await api.updateWorkspace(workspaceId, { name: workspaceName });
      setWorkspace(updated);
      alert('Workspace name updated successfully');
    } catch (error) {
      console.error('Failed to update workspace:', error);
      alert('Failed to update workspace name');
    } finally {
      setIsUpdating(false);
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

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmation !== workspace?.name) {
      alert('Please type the workspace name correctly to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteWorkspace(workspaceId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete workspace');
      setIsDeleting(false);
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

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-2">
            <Link href="/dashboard" className="hover:text-[var(--color-text)]">
              Dashboard
            </Link>
            <span>/</span>
            <Link href={`/workspaces/${workspaceId}`} className="hover:text-[var(--color-text)]">
              {workspace?.name}
            </Link>
            <span>/</span>
            <span className="text-[var(--color-text)]">Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Workspace Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Workspace Name */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Workspace Name</h2>
            <form onSubmit={handleUpdateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  disabled={workspace?.myRole !== 'owner' && workspace?.myRole !== 'admin'}
                />
                {(workspace?.myRole !== 'owner' && workspace?.myRole !== 'admin') && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Only owners and admins can change the workspace name
                  </p>
                )}
              </div>
              {(workspace?.myRole === 'owner' || workspace?.myRole === 'admin') && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdating || !workspaceName.trim() || workspaceName === workspace?.name}
                    className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Members */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Members</h2>
              {(workspace?.myRole === 'owner' || workspace?.myRole === 'admin') && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Invite Member
                </button>
              )}
            </div>

            <div className="space-y-3">
              {workspace?.members
                .sort((a, b) => {
                  const roleOrder = { owner: 0, admin: 1, member: 2 };
                  return roleOrder[a.role] - roleOrder[b.role];
                })
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-[var(--color-surface-hover)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                        {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--color-text)]">
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
                      <span className={`badge ${
                        member.role === 'owner' ? 'badge-done' :
                        member.role === 'admin' ? 'badge-in-progress' :
                        'badge-todo'
                      }`}>
                        {member.role}
                      </span>
                      {canRemoveMember(member.role, member.user.id) && (
                        <button
                          onClick={() => handleRemoveMemberClick(member.user.id, member.user.name || member.user.email)}
                          className="text-sm text-red-400 hover:text-red-300 transition-colors p-2 rounded hover:bg-red-500/10"
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

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Pending Invitations</h3>
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-[var(--color-surface-hover)] rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{invitation.email}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {invitation.role} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      {(workspace?.myRole === 'owner' || workspace?.myRole === 'admin') && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-sm text-red-400 hover:text-red-300 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Danger Zone - Only for Owner */}
          {workspace?.myRole === 'owner' && (
            <section className="bg-[var(--color-surface)] border border-red-500/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Deleting a workspace is permanent and cannot be undone. All projects and tasks will be lost.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete Workspace
              </button>
            </section>
          )}
        </div>
      </main>

      {/* Invite Member Modal */}
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
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                  }}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
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

      {/* Remove Member Modal */}
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

      {/* Delete Workspace Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-red-500/20 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-400">Delete Workspace</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-[var(--color-text-muted)]">
                This action <span className="font-semibold text-[var(--color-text)]">cannot be undone</span>. This will permanently delete the workspace, all projects, and all tasks.
              </p>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                  Type <span className="font-mono bg-[var(--color-surface-hover)] px-2 py-0.5 rounded">{workspace?.name}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={workspace?.name}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                disabled={isDeleting || deleteConfirmation !== workspace?.name}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

