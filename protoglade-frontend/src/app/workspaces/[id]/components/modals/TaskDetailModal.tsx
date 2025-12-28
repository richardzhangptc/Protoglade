'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, KanbanColumn, Comment } from '@/types';
import { api } from '@/lib/api';

interface TaskDetailModalProps {
  task: Task;
  columns: KanbanColumn[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  columns,
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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await api.createComment(task.id, newComment);
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
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

