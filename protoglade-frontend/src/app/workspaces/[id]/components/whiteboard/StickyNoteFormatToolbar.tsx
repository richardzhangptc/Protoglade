'use client';

import { StickyNoteElement, STICKY_COLORS } from './types';

interface StickyNoteFormatToolbarProps {
  element: StickyNoteElement;
  zoom: number;
  pan: { x: number; y: number };
  onUpdate: (updates: Partial<StickyNoteElement>) => void;
}

export function StickyNoteFormatToolbar({
  element,
  zoom,
  pan,
  onUpdate,
}: StickyNoteFormatToolbarProps) {
  // Position the toolbar above the sticky note
  const screenX = element.x * zoom + pan.x;
  const screenY = element.y * zoom + pan.y;
  const screenWidth = element.width * zoom;

  return (
    <div
      className="absolute z-50 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
      style={{
        left: screenX + screenWidth / 2,
        top: screenY - 44,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Color label */}
      <span className="text-xs text-[var(--color-text-muted)] mr-1">Color:</span>
      
      {/* Color picker */}
      {STICKY_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onUpdate({ color })}
          className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
            element.color === color 
              ? 'border-gray-800 scale-110' 
              : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

