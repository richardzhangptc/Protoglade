import { Workspace, Project, User } from '@/types';
import { SidebarView } from './constants';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { UserPopup } from '@/components/UserPopup';

interface WorkspaceSidebarProps {
  workspace: Workspace | null;
  workspaceId: string;
  allWorkspaces: Workspace[];
  projects: Project[];
  sidebarCollapsed: boolean;
  sidebarView: SidebarView;
  showWorkspaceSwitcher: boolean;
  user: User | null;
  onCollapse: () => void;
  onExpand: () => void;
  onToggleWorkspaceSwitcher: () => void;
  onCloseWorkspaceSwitcher: () => void;
  onCreateProject: () => void;
  onCreateWorkspace: () => void;
  onSelectProject: (projectId: string) => void;
  onToggleSidebarView: () => void;
  onInviteMember: () => void;
  selectedProjectId: string | null;
  onLogout: () => void;
}

export function WorkspaceSidebar({
  workspace,
  workspaceId,
  allWorkspaces,
  projects,
  sidebarCollapsed,
  sidebarView,
  showWorkspaceSwitcher,
  user,
  onCollapse,
  onExpand,
  onToggleWorkspaceSwitcher,
  onCloseWorkspaceSwitcher,
  onCreateProject,
  onCreateWorkspace,
  onSelectProject,
  onToggleSidebarView,
  onInviteMember,
  selectedProjectId,
  onLogout,
}: WorkspaceSidebarProps) {
  return (
    <>
      {/* Collapsed Sidebar Toggle - Only show when no project is selected */}
      {sidebarCollapsed && !selectedProjectId && (
        <div className="fixed top-0 left-0 z-40 p-3">
          <button
            onClick={onExpand}
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
        <WorkspaceSwitcher
          workspace={workspace}
          workspaceId={workspaceId}
          allWorkspaces={allWorkspaces}
          showWorkspaceSwitcher={showWorkspaceSwitcher}
          onToggle={onToggleWorkspaceSwitcher}
          onClose={onCloseWorkspaceSwitcher}
          onCreateWorkspace={onCreateWorkspace}
          onCollapse={onCollapse}
        />

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {/* Projects Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                Projects
              </span>
              <button
                onClick={onCreateProject}
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
                    onClick={() => onSelectProject(project.id)}
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
              onClick={onToggleSidebarView}
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
                    onClick={onInviteMember}
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
        {user && (
          <div className="p-3 border-t border-[var(--color-border)]">
            <UserPopup 
              user={user} 
              onLogout={onLogout}
            />
          </div>
        )}
      </aside>
    </>
  );
}

