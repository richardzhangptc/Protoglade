interface CreateTaskModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  isCreating: boolean;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateTaskModal({
  isOpen,
  title,
  description,
  isCreating,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
}: CreateTaskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Create Task</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">
              Description <span className="text-[var(--color-text-muted)]">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Task description"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[#2B2B2B] rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
