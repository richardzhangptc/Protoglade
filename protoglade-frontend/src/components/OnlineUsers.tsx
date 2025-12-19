'use client';

import { OnlineUser } from '@/hooks/usePresence';

interface OnlineUsersProps {
  users: OnlineUser[];
  currentUserId?: string;
  maxVisible?: number;
}

export function OnlineUsers({ users, currentUserId, maxVisible = 5 }: OnlineUsersProps) {
  if (users.length === 0) return null;

  // Sort users so current user is last (shown on right)
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return 1;
    if (b.id === currentUserId) return -1;
    return 0;
  });

  const visibleUsers = sortedUsers.slice(0, maxVisible);
  const remainingCount = sortedUsers.length - maxVisible;

  return (
    <div className="flex items-center">
      {/* Label */}
      <span className="text-sm text-[var(--color-text-muted)] mr-3 hidden sm:inline">
        {users.length} online
      </span>
      
      {/* Avatar stack */}
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user, index) => (
          <div
            key={user.id}
            className="relative group"
            style={{ zIndex: visibleUsers.length - index }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-[var(--color-surface)] transition-transform hover:scale-110 hover:z-50"
              style={{ backgroundColor: user.color }}
              title={user.name || user.email}
            >
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : user.email.charAt(0).toUpperCase()}
            </div>
            
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-[var(--color-surface)]" />
            
            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <p className="text-sm font-medium">
                {user.name || 'Unnamed User'}
                {user.id === currentUserId && (
                  <span className="text-[var(--color-text-muted)]"> (you)</span>
                )}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
            </div>
          </div>
        ))}
        
        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-muted)] ring-2 ring-[var(--color-surface)]"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}

