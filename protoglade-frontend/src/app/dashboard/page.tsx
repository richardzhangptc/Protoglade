'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
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
import { CSS } from '@dnd-kit/utilities';

interface SortableWorkspaceCardProps {
  workspace: Workspace;
  onNavigate: () => void;
}

function SortableWorkspaceCard({ workspace, onNavigate }: SortableWorkspaceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });

  const style = {
    transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), // Lock horizontal movement
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onClick={onNavigate}
        {...listeners}
        {...attributes}
        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group cursor-grab active:cursor-grabbing"
      >
        <div className="w-8 h-8 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-sm font-medium text-[var(--color-text)]">
          {workspace.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-text)]">
            {workspace.name}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <svg 
          className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const workspace = await api.createWorkspace(newWorkspaceName);
      setWorkspaces([...workspaces, workspace]);
      setNewWorkspaceName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

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
      const oldIndex = workspaces.findIndex((w) => w.id === active.id);
      const newIndex = workspaces.findIndex((w) => w.id === over.id);

      const newWorkspaces = arrayMove(workspaces, oldIndex, newIndex);
      setWorkspaces(newWorkspaces);

      // Update on server
      try {
        const reorderedWorkspaces = await api.reorderWorkspaces(
          newWorkspaces.map((w) => w.id)
        );
        setWorkspaces(reorderedWorkspaces);
      } catch (error) {
        console.error('Failed to reorder workspaces:', error);
        // Revert on error
        await loadWorkspaces();
      }
    }
  }, [workspaces]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Minimal Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[var(--color-primary)] rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-[#2B2B2B]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-[var(--color-text)]">Protoglade</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-text-muted)]">
            {user.name || user.email}
          </span>
          <button
            onClick={logout}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-8 text-center">
            Your Workspaces
          </h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-muted)] mb-6">
                No workspaces yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleWorkspaceDragEnd}
              >
                <SortableContext
                  items={workspaces.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {workspaces.map((workspace) => (
                    <SortableWorkspaceCard
                      key={workspace.id}
                      workspace={workspace}
                      onNavigate={() => router.push(`/workspaces/${workspace.id}`)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Create Workspace Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        </div>
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Create Workspace</h3>
            <form onSubmit={handleCreateWorkspace}>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                className="mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newWorkspaceName.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
