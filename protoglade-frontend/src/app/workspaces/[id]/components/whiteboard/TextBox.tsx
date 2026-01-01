'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { TextElement, ResizeHandle } from './types';

interface TextBoxProps {
  element: TextElement;
  isSelected: boolean;
  isEditing: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onSelect: () => void;
  onStartEdit: () => void;
  onEndEdit: (content: string) => void;
  onCancelEdit: () => void;
  onMove: (x: number, y: number) => void;
  onMoveEnd: () => void;
  onResize: (width: number, height: number, fontSize?: number) => void;
  onResizeEnd: () => void;
}

export function TextBox({
  element,
  isSelected,
  isEditing,
  zoom,
  pan,
  onSelect,
  onStartEdit,
  onEndEdit,
  onCancelEdit,
  onMove,
  onMoveEnd,
  onResize,
  onResizeEnd,
}: TextBoxProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialFontSize, setInitialFontSize] = useState(16);
  const [previousContent, setPreviousContent] = useState(element.content);

  // Prevent native browser text selection flicker while dragging/resizing.
  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const prevUserSelect = document.body.style.userSelect;
    const prevWebkitUserSelect = (document.body.style as any).webkitUserSelect as string | undefined;
    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';
    return () => {
      document.body.style.userSelect = prevUserSelect;
      (document.body.style as any).webkitUserSelect = prevWebkitUserSelect ?? '';
    };
  }, [isDragging, isResizing]);

  // Focus the contenteditable when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
      // Set the content
      contentRef.current.textContent = element.content;
      contentRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      if (contentRef.current.childNodes.length > 0) {
        range.selectNodeContents(contentRef.current);
        range.collapse(false);
      } else {
        range.setStart(contentRef.current, 0);
        range.collapse(true);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
      // Store current content for cancel
      setPreviousContent(element.content);
    }
  }, [isEditing, element.content]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isEditing) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (contentRef.current) {
        contentRef.current.textContent = previousContent;
      }
      onCancelEdit();
      return;
    }

    // Allow Enter for newlines (don't submit)
    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  }, [isEditing, onCancelEdit, previousContent]);

  // Handle blur (clicking outside)
  const handleBlur = useCallback(() => {
    if (isEditing && contentRef.current) {
      const newContent = contentRef.current.textContent || '';
      onEndEdit(newContent);
    }
  }, [isEditing, onEndEdit]);

  // Handle double click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onStartEdit();
    }
  }, [isEditing, onStartEdit]);

  // Handle single click to select
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onSelect();
    }
  }, [isEditing, onSelect]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    if ((e.target as HTMLElement).dataset.handle) return; // Don't start drag on resize handles
    
    // Prevent native text selection while dragging.
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: element.x, y: element.y });
  }, [isEditing, onSelect, element.x, element.y]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    if (isEditing) return;
    // Prevent native text selection while resizing.
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: element.width, height: element.height });
    setInitialPos({ x: element.x, y: element.y });
    setInitialFontSize(element.fontSize);
  }, [isEditing, element.width, element.height, element.x, element.y, element.fontSize]);

  // Handle mouse move for drag/resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Clear any selection that may have started.
      const sel = window.getSelection?.();
      if (sel && sel.rangeCount > 0) sel.removeAllRanges();

      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      if (isDragging) {
        onMove(initialPos.x + dx, initialPos.y + dy);
      } else if (isResizing && activeHandle) {
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;
        let newX = initialPos.x;
        let newY = initialPos.y;
        let newFontSize: number | undefined = undefined;

        // Check if this is a diagonal/corner handle
        const isDiagonal = ['nw', 'ne', 'se', 'sw'].includes(activeHandle);

        if (isDiagonal) {
          // Diagonal handles: maintain aspect ratio (only change size, not shape)
          const aspectRatio = initialSize.width / initialSize.height;
          const diagonalDelta = (dx + dy) / 2;

          let scale: number;
          switch (activeHandle) {
            case 'se':
              scale = Math.max(50 / initialSize.width, 1 + diagonalDelta / initialSize.width);
              break;
            case 'nw':
              scale = Math.max(50 / initialSize.width, 1 - diagonalDelta / initialSize.width);
              break;
            case 'ne':
              scale = Math.max(50 / initialSize.width, 1 + (dx - dy) / 2 / initialSize.width);
              break;
            case 'sw':
              scale = Math.max(50 / initialSize.width, 1 + (-dx + dy) / 2 / initialSize.width);
              break;
            default:
              scale = 1;
          }

          newWidth = initialSize.width * scale;
          newHeight = initialSize.height * scale;

          // Ensure minimum sizes
          if (newWidth < 50) {
            newWidth = 50;
            newHeight = 50 / aspectRatio;
          }
          if (newHeight < 24) {
            newHeight = 24;
            newWidth = 24 * aspectRatio;
          }

          // Scale font size proportionally
          newFontSize = Math.round(initialFontSize * scale);
          newFontSize = Math.max(8, Math.min(72, newFontSize));

          // Adjust position for corners that move the origin
          switch (activeHandle) {
            case 'nw':
              newX = initialPos.x + initialSize.width - newWidth;
              newY = initialPos.y + initialSize.height - newHeight;
              break;
            case 'ne':
              newY = initialPos.y + initialSize.height - newHeight;
              break;
            case 'sw':
              newX = initialPos.x + initialSize.width - newWidth;
              break;
          }
        } else {
          // Edge handles: allow independent width/height changes
          switch (activeHandle) {
            case 'e':
              newWidth = Math.max(50, initialSize.width + dx);
              break;
            case 'w':
              newWidth = Math.max(50, initialSize.width - dx);
              newX = initialPos.x + (initialSize.width - newWidth);
              break;
            case 's':
              newHeight = Math.max(24, initialSize.height + dy);
              break;
            case 'n':
              newHeight = Math.max(24, initialSize.height - dy);
              newY = initialPos.y + (initialSize.height - newHeight);
              break;
          }
        }

        if (newX !== element.x || newY !== element.y) {
          onMove(newX, newY);
        }
        onResize(newWidth, newHeight, newFontSize);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        onMoveEnd();
      } else if (isResizing) {
        onResizeEnd();
      }
      setIsDragging(false);
      setIsResizing(false);
      setActiveHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, initialPos, initialSize, initialFontSize, zoom, activeHandle, onMove, onMoveEnd, onResize, onResizeEnd, element.x, element.y]);

  // Calculate screen position
  const screenX = element.x * zoom + pan.x;
  const screenY = element.y * zoom + pan.y;
  const screenWidth = element.width * zoom;
  const screenHeight = element.height * zoom;

  // Resize handle cursor styles
  const getHandleCursor = (handle: ResizeHandle): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      default:
        return 'default';
    }
  };

  const isEmpty = !element.content;
  const showPlaceholder = isEmpty && !isEditing;

  return (
    <div
      ref={containerRef}
      className={`absolute ${isEditing ? '' : 'cursor-move select-none'}`}
      style={{
        left: screenX,
        top: screenY,
        width: screenWidth,
        minHeight: screenHeight,
        minWidth: 50 * zoom,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Selection/hover border */}
      <div
        className={`absolute inset-0 rounded pointer-events-none transition-all ${
          isEditing
            ? 'border-2 border-blue-500 border-dashed'
            : isSelected
            ? 'border-2 border-blue-500'
            : 'border border-transparent hover:border-gray-300'
        }`}
      />

      {/* Text content - only shown when NOT editing */}
      {!isEditing && (
        <div
          className="w-full h-full p-2 overflow-hidden"
          style={{
            fontSize: element.fontSize * zoom,
            fontWeight: element.fontWeight,
            color: showPlaceholder ? '#9ca3af' : element.color,
            textAlign: element.align,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {showPlaceholder ? 'Click to add text...' : element.content}
        </div>
      )}

      {/* Editable text area - only shown when editing */}
      {isEditing && (
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-full p-2 outline-none overflow-hidden bg-transparent"
          style={{
            fontSize: element.fontSize * zoom,
            fontWeight: element.fontWeight,
            color: element.color,
            textAlign: element.align,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            cursor: 'text',
            lineHeight: 1.4,
            minHeight: screenHeight,
          }}
        />
      )}

      {/* Resize handles - only show when selected and not editing */}
      {isSelected && !isEditing && (
        <>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((handle) => {
            const handleSize = 8;
            let style: React.CSSProperties = {
              position: 'absolute',
              width: handleSize,
              height: handleSize,
              backgroundColor: 'white',
              border: '2px solid #3b82f6',
              borderRadius: 2,
              cursor: getHandleCursor(handle),
            };

            switch (handle) {
              case 'nw':
                style = { ...style, top: -handleSize / 2, left: -handleSize / 2 };
                break;
              case 'n':
                style = { ...style, top: -handleSize / 2, left: '50%', transform: 'translateX(-50%)' };
                break;
              case 'ne':
                style = { ...style, top: -handleSize / 2, right: -handleSize / 2 };
                break;
              case 'e':
                style = { ...style, top: '50%', right: -handleSize / 2, transform: 'translateY(-50%)' };
                break;
              case 'se':
                style = { ...style, bottom: -handleSize / 2, right: -handleSize / 2 };
                break;
              case 's':
                style = { ...style, bottom: -handleSize / 2, left: '50%', transform: 'translateX(-50%)' };
                break;
              case 'sw':
                style = { ...style, bottom: -handleSize / 2, left: -handleSize / 2 };
                break;
              case 'w':
                style = { ...style, top: '50%', left: -handleSize / 2, transform: 'translateY(-50%)' };
                break;
            }

            return (
              <div
                key={handle}
                data-handle={handle}
                style={style}
                onMouseDown={(e) => handleResizeStart(e, handle)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
