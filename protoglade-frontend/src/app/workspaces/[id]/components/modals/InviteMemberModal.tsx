import { Invitation } from '@/types';

interface InviteMemberModalProps {
  isOpen: boolean;
  email: string;
  role: string;
  error: string;
  invitations: Invitation[];
  isInviting: boolean;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancelInvitation: (invitationId: string) => void;
}

export function InviteMemberModal({
  isOpen,
  email,
  role,
  error,
  invitations,
  isInviting,
  onClose,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onCancelInvitation,
}: InviteMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Invite Member</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="colleague@example.com"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Role</label>
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
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
                      onClick={() => onCancelInvitation(invitation.id)}
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
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isInviting || !email.trim()}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

