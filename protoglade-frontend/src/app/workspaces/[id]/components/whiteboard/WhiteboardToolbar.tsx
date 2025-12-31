'use client';

import { ToolType } from './types';

interface WhiteboardToolbarProps {
  activeTool: ToolType;
  zoom: number;
  sidebarCollapsed: boolean;
  onToolClick: (tool: ToolType) => void;
  onUndo: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export function WhiteboardToolbar({
  activeTool,
  zoom,
  sidebarCollapsed,
  onToolClick,
  onUndo,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetView,
}: WhiteboardToolbarProps) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-[left] duration-200"
      style={{ left: sidebarCollapsed ? 16 : 272 }}
    >
      {/* Tool buttons */}
      <button
        onClick={() => onToolClick('select')}
        className={`p-2.5 rounded-xl transition-all ${
          activeTool === 'select'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Select"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      </button>

      <button
        onClick={() => onToolClick('shapes')}
        className={`p-2.5 rounded-xl transition-all ${
          activeTool === 'shapes'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Shapes & Lines"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="8" height="8" rx="1" strokeWidth={2} />
          <circle cx="16" cy="16" r="5" strokeWidth={2} />
        </svg>
      </button>

      <button
        onClick={() => onToolClick('pen')}
        className={`p-2.5 rounded-xl transition-all ${
          activeTool === 'pen'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Pen"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--color-border)] my-1" />

      {/* Action buttons */}
      <button
        onClick={onUndo}
        className="p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
        title="Undo"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

      <button
        onClick={onClear}
        className="p-2.5 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
        title="Clear canvas"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--color-border)] my-1" />

      {/* Zoom controls */}
      <button
        onClick={onZoomOut}
        className="p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
        title="Zoom out"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      <button
        onClick={onResetView}
        className="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
        title="Zoom in"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

