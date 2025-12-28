import { Project } from '@/types';
import { OnlineUsers } from '@/components/OnlineUsers';
import { OnlineUser } from '@/hooks/usePresence';

interface ProjectHeaderProps {
  project: Project;
  sidebarCollapsed: boolean;
  onExpandSidebar: () => void;
  onCreateColumn: () => void;
  onlineUsers: OnlineUser[];
  currentUserId?: string;
}

export function ProjectHeader({
  project,
  sidebarCollapsed,
  onExpandSidebar,
  onCreateColumn,
  onlineUsers,
  currentUserId,
}: ProjectHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Expand Sidebar Button - shown when sidebar is collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={onExpandSidebar}
              className="p-2 -ml-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex-shrink-0"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[var(--color-text)] truncate">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <OnlineUsers users={onlineUsers} currentUserId={currentUserId} />
          <button
            onClick={onCreateColumn}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            New Column
          </button>
        </div>
      </div>
    </header>
  );
}

