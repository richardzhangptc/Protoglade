import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Workspace } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';

interface WorkspaceSwitcherProps {
  workspace: Workspace | null;
  workspaceId: string;
  allWorkspaces: Workspace[];
  showWorkspaceSwitcher: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCreateWorkspace: () => void;
  onCollapse: () => void;
  onWorkspacesReordered: (workspaces: Workspace[]) => void;
}

interface SortableWorkspaceItemProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
}

function SortableWorkspaceItem({ workspace, isActive, onSelect }: SortableWorkspaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button
        onClick={onSelect}
        {...listeners}
        {...attributes}
        className={`flex items-center gap-3 px-3 py-2 w-full text-left transition-colors cursor-grab active:cursor-grabbing ${
          isActive
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-text)]' 
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
        }`}
      >
        <div className="w-6 h-6 rounded-md bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-xs font-medium">
          {workspace.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm truncate flex-1">{workspace.name}</span>
        {isActive && (
          <svg className="w-4 h-4 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function WorkspaceSwitcher({
  workspace,
  workspaceId,
  allWorkspaces,
  showWorkspaceSwitcher,
  onToggle,
  onClose,
  onCreateWorkspace,
  onCollapse,
  onWorkspacesReordered,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const workspaceSwitcherRef = useRef<HTMLDivElement>(null);
  const [localWorkspaces, setLocalWorkspaces] = useState(allWorkspaces);

  // Update local workspaces when props change
  useEffect(() => {
    setLocalWorkspaces(allWorkspaces);
  }, [allWorkspaces]);

  // Close workspace switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceSwitcherRef.current && !workspaceSwitcherRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleWorkspaceDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localWorkspaces.findIndex((w) => w.id === active.id);
      const newIndex = localWorkspaces.findIndex((w) => w.id === over.id);

      const newWorkspaces = arrayMove(localWorkspaces, oldIndex, newIndex);
      setLocalWorkspaces(newWorkspaces);

      // Update on server
      try {
        const reorderedWorkspaces = await api.reorderWorkspaces(
          newWorkspaces.map((w) => w.id)
        );
        onWorkspacesReordered(reorderedWorkspaces);
      } catch (error) {
        console.error('Failed to reorder workspaces:', error);
        // Revert on error
        setLocalWorkspaces(allWorkspaces);
      }
    }
  }, [localWorkspaces, allWorkspaces, onWorkspacesReordered]);

  return (
    <div className="p-3 border-b border-[var(--color-border)] relative" ref={workspaceSwitcherRef}>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
        >
          <div className="w-8 h-8 rounded-md bg-[var(--color-primary)] flex items-center justify-center text-sm font-semibold text-[#2B2B2B] flex-shrink-0">
            {workspace?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">
              {workspace?.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {workspace?.members.length} member{workspace?.members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <svg 
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${showWorkspaceSwitcher ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Collapse Button */}
        <button
          onClick={onCollapse}
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Floating Workspace Switcher Dropdown */}
      {showWorkspaceSwitcher && (
        <div className="absolute left-3 right-3 top-full mt-1 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50">
          <div className="max-h-64 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleWorkspaceDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={localWorkspaces.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                {localWorkspaces.map((ws) => (
                  <SortableWorkspaceItem
                    key={ws.id}
                    workspace={ws}
                    isActive={ws.id === workspaceId}
                    onSelect={() => {
                      onClose();
                      if (ws.id !== workspaceId) {
                        router.push(`/workspaces/${ws.id}`);
                      }
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="border-t border-[var(--color-border)] mt-1 pt-1">
            <button
              onClick={() => {
                onClose();
                onCreateWorkspace();
              }}
              className="flex items-center gap-3 px-3 py-2 w-full text-left hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Workspace
            </button>
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              All Workspaces
            </Link>
            <Link
              href={`/workspaces/${workspaceId}/settings`}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Workspace Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
