'use client';

import { COLORS } from './constants';

interface PenOptionsPopoverProps {
  color: string;
  size: number;
  sidebarCollapsed: boolean;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
}

export function PenOptionsPopover({
  color,
  size,
  sidebarCollapsed,
  onColorChange,
  onSizeChange,
}: PenOptionsPopoverProps) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-[left] duration-200"
      style={{ left: sidebarCollapsed ? 80 : 336 }}
    >
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

      {/* Size slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Size</span>
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

