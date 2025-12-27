import { Project } from '@/types';
import { OnlineUsers } from '@/components/OnlineUsers';
import { OnlineUser } from '@/hooks/usePresence';

interface ProjectHeaderProps {
  project: Project;
  sidebarCollapsed: boolean;
  onExpandSidebar: () => void;
  onCreateTask: () => void;
  onlineUsers: OnlineUser[];
  currentUserId?: string;
}

export function ProjectHeader({
  project,
  sidebarCollapsed,
  onExpandSidebar,
  onCreateTask,
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
            onClick={onCreateTask}
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
  );
}

