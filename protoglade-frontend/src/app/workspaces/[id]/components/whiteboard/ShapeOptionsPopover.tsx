'use client';

import { WhiteboardShapeType } from '@/types';
import { COLORS } from './constants';

interface ShapeOptionsPopoverProps {
  selectedShapeType: WhiteboardShapeType;
  color: string;
  size: number;
  shapeFilled: boolean;
  sidebarCollapsed: boolean;
  onShapeTypeChange: (type: WhiteboardShapeType) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onFilledChange: (filled: boolean) => void;
}

export function ShapeOptionsPopover({
  selectedShapeType,
  color,
  size,
  shapeFilled,
  sidebarCollapsed,
  onShapeTypeChange,
  onColorChange,
  onSizeChange,
  onFilledChange,
}: ShapeOptionsPopoverProps) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-[left] duration-200"
      style={{ left: sidebarCollapsed ? 80 : 336 }}
    >
      {/* Shape type selector */}
      <div className="flex gap-1">
        <button
          onClick={() => onShapeTypeChange('rectangle')}
          className={`p-2 rounded-lg transition-all ${
            selectedShapeType === 'rectangle'
              ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
          }`}
          title="Rectangle"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
          </svg>
        </button>
        <button
          onClick={() => onShapeTypeChange('circle')}
          className={`p-2 rounded-lg transition-all ${
            selectedShapeType === 'circle'
              ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
          }`}
          title="Circle"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
          </svg>
        </button>
        <button
          onClick={() => onShapeTypeChange('line')}
          className={`p-2 rounded-lg transition-all ${
            selectedShapeType === 'line'
              ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
          }`}
          title="Line"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Color picker */}
      <div className="flex flex-wrap gap-1.5 max-w-[120px]">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              color === c ? 'border-[var(--color-primary)] scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--color-border)]" />

      {/* Filled toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={shapeFilled}
          onChange={(e) => onFilledChange(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-primary)]"
        />
        <span className="text-xs text-[var(--color-text)]">Filled</span>
      </label>

      {/* Size slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Stroke</span>
          <span className="text-xs text-[var(--color-text-muted)]">{size}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>
    </div>
  );
}

