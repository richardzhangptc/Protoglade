'use client';

import { TextElement } from './types';
import { COLORS } from './constants';

interface TextFormatToolbarProps {
  element: TextElement;
  zoom: number;
  pan: { x: number; y: number };
  onUpdate: (updates: Partial<TextElement>) => void;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

export function TextFormatToolbar({
  element,
  zoom,
  pan,
  onUpdate,
}: TextFormatToolbarProps) {
  // Position the toolbar above the text element
  const screenX = element.x * zoom + pan.x;
  const screenY = element.y * zoom + pan.y;
  const screenWidth = element.width * zoom;

  return (
    <div
      className="absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
      style={{
        left: screenX + screenWidth / 2,
        top: screenY - 48,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font size dropdown */}
      <div className="flex items-center">
        <select
          value={element.fontSize}
          onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
          className="h-7 w-11 pl-2 pr-5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-text-muted)] transition-colors appearance-none tabular-nums text-right"
          title="Font size"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 6px center',
            backgroundSize: '14px',
          }}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="ml-1 text-xs text-[var(--color-text-muted)] select-none">px</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--color-border)]" />

      {/* Bold toggle */}
      <button
        onClick={() => onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
        className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
          element.fontWeight === 'bold'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Bold"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--color-border)]" />

      {/* Align left */}
      <button
        onClick={() => onUpdate({ align: 'left' })}
        className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
          element.align === 'left'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Align left"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M3 6h18M3 12h12M3 18h18" />
        </svg>
      </button>

      {/* Align center */}
      <button
        onClick={() => onUpdate({ align: 'center' })}
        className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
          element.align === 'center'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Align center"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M3 6h18M6 12h12M3 18h18" />
        </svg>
      </button>

      {/* Align right */}
      <button
        onClick={() => onUpdate({ align: 'right' })}
        className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
          element.align === 'right'
            ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
            : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
        }`}
        title="Align right"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M3 6h18M9 12h12M3 18h18" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--color-border)]" />

      {/* Color picker */}
      <div className="flex items-center gap-0.5">
        {COLORS.slice(0, 6).map((c) => (
          <button
            key={c}
            onClick={() => onUpdate({ color: c })}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              element.color === c ? 'border-[var(--color-text)] scale-110' : 'border-transparent hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        
        {/* More colors dropdown */}
        <div className="relative group">
          <button
            className="w-5 h-5 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            title="More colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 6v.01M12 12v.01M12 18v.01" />
            </svg>
          </button>
          
          {/* Dropdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="flex flex-wrap gap-1 w-[100px]">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate({ color: c })}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    element.color === c ? 'border-[var(--color-text)] scale-110' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
