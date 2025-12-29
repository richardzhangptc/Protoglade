'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, KanbanColumn, Comment, WorkspaceMember } from '@/types';
import { api } from '@/lib/api';

// Available label colors
const LABEL_COLORS = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Lime', color: '#84cc16' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Fuchsia', color: '#d946ef' },
  { name: 'Pink', color: '#ec4899' },
];

interface TaskDetailModalProps {
  task: Task;
  columns: KanbanColumn[];
  workspaceMembers?: WorkspaceMember[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  columns,
  workspaceMembers = [],
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Get current labels from task
  const currentLabels = task.labels || [];
  const currentAssignments = task.assignments || [];
  const assignedUserIds = currentAssignments.map(a => a.user.id);

  useEffect(() => {
    loadComments();
  }, [task.id]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (labelPickerRef.current && !labelPickerRef.current.contains(event.target as Node)) {
        setShowLabelPicker(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadComments = async () => {
    try {
      const data = await api.getComments(task.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim() || title === task.title) {
      setTitle(task.title);
      setIsEditingTitle(false);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.updateTask(task.id, { title });
      onUpdate(updated);
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
      setTitle(task.title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    if (description === (task.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.updateTask(task.id, { description: description || null });
      onUpdate(updated);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to update description:', error);
      setDescription(task.description || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLabel = async (color: string) => {
    const newLabels = currentLabels.includes(color)
      ? currentLabels.filter(l => l !== color)
      : [...currentLabels, color];
    
    setIsSaving(true);
    try {
      const updated = await api.updateTask(task.id, { labels: newLabels });
      onUpdate(updated);
    } catch (error) {
      console.error('Failed to update labels:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAssignee = async (userId: string) => {
    const newAssignedUserIds = assignedUserIds.includes(userId)
      ? assignedUserIds.filter(id => id !== userId)
      : [...assignedUserIds, userId];
    
    setIsSaving(true);
    try {
      const updated = await api.updateTask(task.id, { assignedUserIds: newAssignedUserIds });
      onUpdate(updated);
    } catch (error) {
      console.error('Failed to update assignees:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await api.createComment(task.id, newComment);
      const newComments = [...comments, comment];
      setComments(newComments);
      setNewComment('');
      // Update the task's comment count
      onUpdate({
        ...task,
        _count: { comments: newComments.length },
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      const newComments = comments.filter((c) => c.id !== commentId);
      setComments(newComments);
      // Update the task's comment count
      onUpdate({
        ...task,
        _count: { comments: newComments.length },
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const currentColumn = columns.find((c) => c.id === task.columnId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getUserColor = (userId: string) => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
      '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex-1 min-w-0 pr-4">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitle(task.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full text-xl font-semibold bg-transparent border-b-2 border-[var(--color-primary)] outline-none text-[var(--color-text)] pb-1"
                disabled={isSaving}
              />
            ) : (
              <h2
                className="text-xl font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-primary)] transition-colors truncate"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit"
              >
                {task.title}
              </h2>
            )}
            {currentColumn && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentColumn.color }}
                />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {currentColumn.name}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Labels and Assignees Row */}
          <div className="flex flex-wrap gap-4">
            {/* Labels */}
            <div className="relative" ref={labelPickerRef}>
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Labels
                {currentLabels.length > 0 && (
                  <span className="flex gap-0.5">
                    {currentLabels.slice(0, 3).map((color, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {currentLabels.length > 3 && (
                      <span className="text-xs text-[var(--color-text-muted)]">+{currentLabels.length - 3}</span>
                    )}
                  </span>
                )}
              </button>
              
              {showLabelPicker && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-10 min-w-[200px]">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Select labels</p>
                  <div className="grid grid-cols-4 gap-2">
                    {LABEL_COLORS.map(({ name, color }) => (
                      <button
                        key={color}
                        onClick={() => handleToggleLabel(color)}
                        title={name}
                        className={`w-8 h-8 rounded-lg transition-all relative ${
                          currentLabels.includes(color) 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)]' 
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                        disabled={isSaving}
                      >
                        {currentLabels.includes(color) && (
                          <svg className="w-4 h-4 text-white absolute inset-0 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="relative" ref={assigneeDropdownRef}>
              <button
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Assign
                {currentAssignments.length > 0 && (
                  <span className="flex -space-x-1.5">
                    {currentAssignments.slice(0, 3).map((assignment) => (
                      <span
                        key={assignment.user.id}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[var(--color-bg)]"
                        style={{ backgroundColor: getUserColor(assignment.user.id) }}
                        title={assignment.user.name || assignment.user.email}
                      >
                        {getInitials(assignment.user.name, assignment.user.email)}
                      </span>
                    ))}
                    {currentAssignments.length > 3 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border-2 border-[var(--color-bg)]">
                        +{currentAssignments.length - 3}
                      </span>
                    )}
                  </span>
                )}
              </button>
              
              {showAssigneeDropdown && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-10 min-w-[220px] max-h-[300px] overflow-y-auto">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 px-2">Workspace members</p>
                  {workspaceMembers.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] px-2 py-1">No members available</p>
                  ) : (
                    workspaceMembers.map((member) => (
                      <button
                        key={member.user.id}
                        onClick={() => handleToggleAssignee(member.user.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                          assignedUserIds.includes(member.user.id)
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                        }`}
                        disabled={isSaving}
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: getUserColor(member.user.id) }}
                        >
                          {getInitials(member.user.name, member.user.email)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.user.name || member.user.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {member.user.email}
                          </p>
                        </div>
                        {assignedUserIds.includes(member.user.id) && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Current Labels Display */}
          {currentLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentLabels.map((color, i) => (
                <span
                  key={i}
                  className="h-2 w-10 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {/* Current Assignees Display */}
          {currentAssignments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">
                Assigned to
              </label>
              <div className="flex flex-wrap gap-2">
                {currentAssignments.map((assignment) => (
                  <div
                    key={assignment.user.id}
                    className="flex items-center gap-2 px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: getUserColor(assignment.user.id) }}
                    >
                      {getInitials(assignment.user.name, assignment.user.email)}
                    </span>
                    <span className="text-sm text-[var(--color-text)]">
                      {assignment.user.name || assignment.user.email.split('@')[0]}
                    </span>
                    <button
                      onClick={() => handleToggleAssignee(assignment.user.id)}
                      className="p-0.5 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      disabled={isSaving}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">
              Description
            </label>
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  ref={descriptionInputRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  disabled={isSaving}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setDescription(task.description || '');
                      setIsEditingDescription(false);
                    }}
                    className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="min-h-[80px] px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors"
              >
                {description ? (
                  <p className="text-[var(--color-text)] whitespace-pre-wrap">{description}</p>
                ) : (
                  <p className="text-[var(--color-text-muted)] italic">Click to add a description...</p>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--color-text)]">
              Comments {comments.length > 0 && `(${comments.length})`}
            </label>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                  disabled={isSubmittingComment}
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmittingComment ? '...' : 'Send'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--color-text-muted)] border-t-transparent" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                No comments yet
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--color-text)]">
                            {comment.author.name || comment.author.email.split('@')[0]}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)]">{comment.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete comment"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--color-border)]">
          <button
            onClick={() => onDelete(task.id)}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
}
