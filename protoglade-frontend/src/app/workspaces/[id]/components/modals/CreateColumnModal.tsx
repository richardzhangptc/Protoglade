import { COLUMN_COLORS } from '../constants';

interface CreateColumnModalProps {
  isOpen: boolean;
  name: string;
  color: string;
  isCreating: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateColumnModal({
  isOpen,
  name,
  color,
  isCreating,
  onClose,
  onNameChange,
  onColorChange,
  onSubmit,
}: CreateColumnModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Add Column</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Column name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLUMN_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onColorChange(col)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === col 
                      ? 'ring-2 ring-offset-2 ring-offset-[var(--color-surface)] ring-[var(--color-primary)] scale-110' 
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
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
              disabled={isCreating || !name.trim()}
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

