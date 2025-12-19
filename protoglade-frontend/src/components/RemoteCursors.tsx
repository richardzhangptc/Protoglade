'use client';

import { RemoteCursor } from '@/hooks/usePresence';

interface RemoteCursorsProps {
  cursors: RemoteCursor[];
  containerRef: React.RefObject<HTMLElement | null>;
}

export function RemoteCursors({ cursors, containerRef }: RemoteCursorsProps) {
  if (!containerRef.current) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
        <RemoteCursorIndicator
          key={cursor.odataId}
          cursor={cursor}
          containerRef={containerRef}
        />
      ))}
    </div>
  );
}

function RemoteCursorIndicator({
  cursor,
  containerRef,
}: {
  cursor: RemoteCursor;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  if (!containerRef.current) return null;

  // Get container position to convert relative coords to screen coords
  const rect = containerRef.current.getBoundingClientRect();
  const scrollLeft = containerRef.current.scrollLeft || 0;
  const scrollTop = containerRef.current.scrollTop || 0;

  // Calculate screen position
  const screenX = rect.left + cursor.x - scrollLeft;
  const screenY = rect.top + cursor.y - scrollTop;

  // Don't render if cursor is outside viewport
  if (
    screenX < rect.left - 50 ||
    screenX > rect.right + 200 ||
    screenY < rect.top - 50 ||
    screenY > rect.bottom + 200
  ) {
    return null;
  }

  const displayName = cursor.user.name || cursor.user.email.split('@')[0];

  return (
    <div
      className="absolute transition-all duration-75 ease-out"
      style={{
        left: screenX,
        top: screenY,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.86a.5.5 0 0 0-.85.35Z"
          fill={cursor.user.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: cursor.user.color }}
      >
        {displayName}
      </div>

      {/* Ghost task card when dragging */}
      {cursor.isDragging && cursor.dragTaskTitle && (
        <div
          className="absolute left-4 top-8 w-72 transition-transform duration-75"
          style={{
            transform: 'rotate(3deg)',
          }}
        >
          <div
            className="rounded-xl p-4 shadow-2xl border-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: cursor.user.color,
              opacity: 0.95,
            }}
          >
            {/* User indicator */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: cursor.user.color }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: cursor.user.color }}
              >
                {displayName} is moving...
              </span>
            </div>
            {/* Task title */}
            <h4 className="font-medium text-[var(--color-text)] line-clamp-2">
              {cursor.dragTaskTitle}
            </h4>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get tasks being dragged by remote users
export function getRemoteDraggedTaskIds(cursors: RemoteCursor[]): Set<string> {
  const ids = new Set<string>();
  for (const cursor of cursors) {
    if (cursor.isDragging && cursor.dragTaskId) {
      ids.add(cursor.dragTaskId);
    }
  }
  return ids;
}

// Component to show on a task that's being dragged by someone else
export function RemoteDragIndicator({ 
  userName, 
  userColor 
}: { 
  userName: string; 
  userColor: string;
}) {
  return (
    <div 
      className="absolute inset-0 rounded-xl flex items-center justify-center z-10"
      style={{
        backgroundColor: `${userColor}15`,
        border: `2px dashed ${userColor}`,
      }}
    >
      <div 
        className="px-3 py-1.5 rounded-full text-xs font-medium text-white flex items-center gap-2"
        style={{ backgroundColor: userColor }}
      >
        <svg
          className="w-3 h-3 animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
          />
        </svg>
        {userName} is dragging
      </div>
    </div>
  );
}
