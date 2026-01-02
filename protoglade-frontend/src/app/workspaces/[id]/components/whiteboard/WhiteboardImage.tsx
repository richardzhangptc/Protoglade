'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ImageElement, ResizeHandle } from './types';
import { api } from '@/lib/api';

interface WhiteboardImageProps {
  element: ImageElement;
  isSelected: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onMoveEnd: () => void;
  onResize: (width: number, height: number) => void;
  onResizeEnd: () => void;
}

const MIN_SIZE = 50;

export function WhiteboardImage({
  element,
  isSelected,
  zoom,
  pan,
  onSelect,
  onMove,
  onMoveEnd,
  onResize,
  onResizeEnd,
}: WhiteboardImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(element.url);
  const [triedProxy, setTriedProxy] = useState(false);

  // Reset when URL changes (e.g. new upload)
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setTriedProxy(false);
    setImgSrc(element.url);
  }, [element.url]);

  // Cleanup any created object URL
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const loadViaProxy = useCallback(async () => {
    const blob = await api.getWhiteboardImageFileBlob(element.id);
    const objectUrl = URL.createObjectURL(blob);

    // Revoke previous object URL if we had one
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = objectUrl;

    setImgSrc(objectUrl);
  }, [element.id]);

  // Handle single click to select
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: element.x, y: element.y });
  }, [onSelect, element.x, element.y]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: element.width, height: element.height });
    setInitialPos({ x: element.x, y: element.y });
  }, [element.width, element.height, element.x, element.y]);

  // Handle mouse move for drag/resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    document.body.style.userSelect = 'none';
    (document.body.style as unknown as Record<string, string>).webkitUserSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
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

        // Maintain aspect ratio for all corner handles
        const aspectRatio = initialSize.width / initialSize.height;

        switch (activeHandle) {
          case 'se':
            // Use the larger delta to maintain aspect ratio
            if (Math.abs(dx) > Math.abs(dy)) {
              newWidth = Math.max(MIN_SIZE, initialSize.width + dx);
              newHeight = newWidth / aspectRatio;
            } else {
              newHeight = Math.max(MIN_SIZE, initialSize.height + dy);
              newWidth = newHeight * aspectRatio;
            }
            break;
          case 'nw':
            if (Math.abs(dx) > Math.abs(dy)) {
              newWidth = Math.max(MIN_SIZE, initialSize.width - dx);
              newHeight = newWidth / aspectRatio;
            } else {
              newHeight = Math.max(MIN_SIZE, initialSize.height - dy);
              newWidth = newHeight * aspectRatio;
            }
            newX = initialPos.x + initialSize.width - newWidth;
            newY = initialPos.y + initialSize.height - newHeight;
            break;
          case 'ne':
            if (Math.abs(dx) > Math.abs(dy)) {
              newWidth = Math.max(MIN_SIZE, initialSize.width + dx);
              newHeight = newWidth / aspectRatio;
            } else {
              newHeight = Math.max(MIN_SIZE, initialSize.height - dy);
              newWidth = newHeight * aspectRatio;
            }
            newY = initialPos.y + initialSize.height - newHeight;
            break;
          case 'sw':
            if (Math.abs(dx) > Math.abs(dy)) {
              newWidth = Math.max(MIN_SIZE, initialSize.width - dx);
              newHeight = newWidth / aspectRatio;
            } else {
              newHeight = Math.max(MIN_SIZE, initialSize.height + dy);
              newWidth = newHeight * aspectRatio;
            }
            newX = initialPos.x + initialSize.width - newWidth;
            break;
        }

        // Ensure minimum size
        if (newWidth < MIN_SIZE) {
          newWidth = MIN_SIZE;
          newHeight = MIN_SIZE / aspectRatio;
        }
        if (newHeight < MIN_SIZE) {
          newHeight = MIN_SIZE;
          newWidth = MIN_SIZE * aspectRatio;
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
      default:
        return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute cursor-move select-none"
      style={{
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
        minWidth: MIN_SIZE * zoom,
        minHeight: MIN_SIZE * zoom,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Selection ring */}
      <div
        className={`absolute inset-0 rounded transition-shadow ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      />

      {/* Loading state */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="text-center text-gray-500 text-sm">
            <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Failed to load
          </div>
        </div>
      )}

      {/* Image */}
      <img
        src={imgSrc}
        alt=""
        className={`absolute inset-0 w-full h-full object-contain rounded ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={async () => {
          // If the direct S3 URL fails (private object / 403 / etc), retry via backend proxy.
          if (!triedProxy) {
            setTriedProxy(true);
            try {
              setIsLoaded(false);
              setHasError(false);
              await loadViaProxy();
              return;
            } catch (e) {
              console.error('Whiteboard image failed to load (proxy fallback also failed):', e);
            }
          }
          setHasError(true);
        }}
        draggable={false}
      />

      {/* Resize handles - only corner handles for aspect ratio lock */}
      {isSelected && (
        <>
          {(['nw', 'ne', 'se', 'sw'] as const).map((handle) => {
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
              case 'ne':
                style = { ...style, top: -handleSize / 2, right: -handleSize / 2 };
                break;
              case 'se':
                style = { ...style, bottom: -handleSize / 2, right: -handleSize / 2 };
                break;
              case 'sw':
                style = { ...style, bottom: -handleSize / 2, left: -handleSize / 2 };
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
