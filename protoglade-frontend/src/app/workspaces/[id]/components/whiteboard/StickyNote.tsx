'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { StickyNoteElement, ResizeHandle } from './types';

interface StickyNoteProps {
  element: StickyNoteElement;
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
  onResize: (width: number, height: number) => void;
  onResizeEnd: () => void;
}

const MIN_SIZE = 100;
const MAX_ASPECT_RATIO = 2; // Maximum width:height ratio (horizontal rectangle limit)

export function StickyNote({
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
}: StickyNoteProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [previousContent, setPreviousContent] = useState(element.content);

  // Focus the contenteditable when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
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
    if ((e.target as HTMLElement).dataset.handle) return;
    
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
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: element.width, height: element.height });
    setInitialPos({ x: element.x, y: element.y });
  }, [isEditing, element.width, element.height, element.x, element.y]);

  // Handle mouse move for drag/resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    // Prevent text selection during drag/resize
    document.body.style.userSelect = 'none';
    (document.body.style as unknown as Record<string, string>).webkitUserSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      // Clear any selection
      window.getSelection()?.removeAllRanges();
      
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      if (isDragging) {
        onMove(initialPos.x + dx, initialPos.y + dy);
      } else if (isResizing && activeHandle) {
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;
        let newX = initialPos.x;
        let newY = initialPos.y;

        // Diagonal handles: maintain aspect ratio (only change size, not shape)
        const isDiagonal = ['nw', 'ne', 'se', 'sw'].includes(activeHandle);

        if (isDiagonal) {
          // Calculate scale based on the dominant axis movement
          const aspectRatio = initialSize.width / initialSize.height;
          // Use the diagonal distance for uniform scaling
          const diagonalDelta = (dx + dy) / 2;

          // For corners, determine direction based on handle position
          let scale: number;
          switch (activeHandle) {
            case 'se':
              scale = Math.max(MIN_SIZE / initialSize.width, 1 + diagonalDelta / initialSize.width);
              break;
            case 'nw':
              scale = Math.max(MIN_SIZE / initialSize.width, 1 - diagonalDelta / initialSize.width);
              break;
            case 'ne':
              scale = Math.max(MIN_SIZE / initialSize.width, 1 + (dx - dy) / 2 / initialSize.width);
              break;
            case 'sw':
              scale = Math.max(MIN_SIZE / initialSize.width, 1 + (-dx + dy) / 2 / initialSize.width);
              break;
            default:
              scale = 1;
          }

          newWidth = initialSize.width * scale;
          newHeight = initialSize.height * scale;

          // Ensure minimum size
          if (newWidth < MIN_SIZE) {
            newWidth = MIN_SIZE;
            newHeight = MIN_SIZE / aspectRatio;
          }
          if (newHeight < MIN_SIZE) {
            newHeight = MIN_SIZE;
            newWidth = MIN_SIZE * aspectRatio;
          }

          // Apply max aspect ratio constraint
          if (newWidth / newHeight > MAX_ASPECT_RATIO) {
            newWidth = newHeight * MAX_ASPECT_RATIO;
          }
          // Prevent vertical rectangles (height > width)
          if (newHeight > newWidth) {
            newHeight = newWidth;
          }

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
            // 'se' doesn't need position adjustment
          }
        } else {
          // Edge handles: allow independent width/height changes with constraints
          switch (activeHandle) {
            case 'e':
              newWidth = Math.max(MIN_SIZE, initialSize.width + dx);
              // Limit max aspect ratio
              if (newWidth / newHeight > MAX_ASPECT_RATIO) {
                newWidth = newHeight * MAX_ASPECT_RATIO;
              }
              // Prevent vertical rectangle (width can't go below height)
              if (newWidth < newHeight) {
                newWidth = newHeight;
              }
              break;
            case 'w':
              newWidth = Math.max(MIN_SIZE, initialSize.width - dx);
              // Limit max aspect ratio
              if (newWidth / newHeight > MAX_ASPECT_RATIO) {
                newWidth = newHeight * MAX_ASPECT_RATIO;
              }
              // Prevent vertical rectangle (width can't go below height)
              if (newWidth < newHeight) {
                newWidth = newHeight;
              }
              newX = initialPos.x + (initialSize.width - newWidth);
              break;
            case 's':
              newHeight = Math.max(MIN_SIZE, initialSize.height + dy);
              // Prevent vertical rectangle (height > width)
              if (newHeight > newWidth) {
                newHeight = newWidth;
              }
              break;
            case 'n':
              newHeight = Math.max(MIN_SIZE, initialSize.height - dy);
              // Prevent vertical rectangle (height > width)
              if (newHeight > newWidth) {
                newHeight = newWidth;
              }
              newY = initialPos.y + (initialSize.height - newHeight);
              break;
          }
        }

        if (newX !== element.x || newY !== element.y) {
          onMove(newX, newY);
        }
        onResize(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
      (document.body.style as unknown as Record<string, string>).webkitUserSelect = '';
      
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
      document.body.style.userSelect = '';
      (document.body.style as unknown as Record<string, string>).webkitUserSelect = '';
    };
  }, [isDragging, isResizing, dragStart, initialPos, initialSize, zoom, activeHandle, onMove, onMoveEnd, onResize, onResizeEnd, element.x, element.y]);

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

  return (
    <div
      ref={containerRef}
      className={`absolute ${isEditing ? '' : 'cursor-move'} ${!isEditing ? 'select-none' : ''}`}
      style={{
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
        minWidth: MIN_SIZE * zoom,
        minHeight: MIN_SIZE * zoom,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Sticky note body with shadow and color */}
      <div
        className={`absolute inset-0 rounded-sm transition-shadow ${
          isSelected ? 'shadow-lg ring-2 ring-blue-500' : 'shadow-md hover:shadow-lg'
        }`}
        style={{
          backgroundColor: element.color,
        }}
      />

      {/* Text content - only shown when NOT editing */}
      {!isEditing && (
        <div
          className="absolute inset-0 p-3 overflow-auto"
          style={{
            fontSize: 14 * zoom,
            color: '#1f2937',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.5,
          }}
        >
          {isEmpty ? (
            <span className="text-gray-500 italic">Click to add text...</span>
          ) : (
            element.content
          )}
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
          className="absolute inset-0 p-3 outline-none overflow-auto"
          style={{
            fontSize: 14 * zoom,
            color: '#1f2937',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            cursor: 'text',
            lineHeight: 1.5,
            backgroundColor: 'transparent',
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
              zIndex: 10,
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

