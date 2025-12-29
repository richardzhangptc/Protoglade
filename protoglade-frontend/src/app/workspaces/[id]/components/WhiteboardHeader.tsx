import { Project } from '@/types';
import { OnlineUsers } from '@/components/OnlineUsers';
import { OnlineUser } from '@/hooks/usePresence';

interface WhiteboardHeaderProps {
  project: Project;
  sidebarCollapsed: boolean;
  onExpandSidebar: () => void;
  onlineUsers: OnlineUser[];
  currentUserId?: string;
}

export function WhiteboardHeader({
  project,
  sidebarCollapsed,
  onExpandSidebar,
  onlineUsers,
  currentUserId,
}: WhiteboardHeaderProps) {
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
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[var(--color-text)] truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <OnlineUsers users={onlineUsers} currentUserId={currentUserId} />
        </div>
      </div>
    </header>
  );
}
