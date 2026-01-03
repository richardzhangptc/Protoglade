import { useEffect, RefObject } from 'react';
import { WhiteboardPoint } from '@/types';
import { ShapeElement, StrokeElement, RemoteStroke, RemoteCursor } from '../types';
import { drawStroke, drawShape, drawStrokeWithSelection, drawRemoteCursor } from '../drawUtils';
import { getStrokeBounds } from '../hitTestUtils';

export interface UseCanvasSetupOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  setCanvasSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
}

export interface UseCanvasRenderingOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasSize: { width: number; height: number };
  pan: { x: number; y: number };
  zoom: number;
  shapes: ShapeElement[];
  currentShape: ShapeElement | null;
  strokes: StrokeElement[];
  remoteStrokes: Map<string, RemoteStroke>;
  currentStroke: WhiteboardPoint[];
  color: string;
  size: number;
  remoteCursors: RemoteCursor[];
  selectedElementId: string | null;
  selectedElementType: 'shape' | 'text' | 'sticky' | 'image' | 'stroke' | null;
}

export function useCanvasResize({
  canvasRef,
  containerRef,
  setCanvasSize,
}: UseCanvasSetupOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    resizeCanvas();

    return () => resizeObserver.disconnect();
  }, [canvasRef, containerRef, setCanvasSize]);
}

export function useCanvasRendering({
  canvasRef,
  canvasSize,
  pan,
  zoom,
  shapes,
  currentShape,
  strokes,
  remoteStrokes,
  currentStroke,
  color,
  size,
  remoteCursors,
  selectedElementId,
  selectedElementType,
}: UseCanvasRenderingOptions) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Combine shapes and strokes into a unified list with their types for z-ordering
    type DrawableElement =
      | { kind: 'shape'; element: ShapeElement }
      | { kind: 'stroke'; element: StrokeElement };

    const allElements: DrawableElement[] = [
      ...shapes.map((s) => ({ kind: 'shape' as const, element: s })),
      ...strokes.map((s) => ({ kind: 'stroke' as const, element: s })),
    ];

    // Sort by zIndex ascending (lower zIndex drawn first, higher drawn on top)
    allElements.sort((a, b) => a.element.zIndex - b.element.zIndex);

    // Draw all elements in z-order
    allElements.forEach((item) => {
      if (item.kind === 'shape') {
        const shape = item.element;
        drawShape(ctx, shape, shape.id === selectedElementId && selectedElementType === 'shape', zoom);
      } else {
        const stroke = item.element;
        const isSelected = stroke.id === selectedElementId && selectedElementType === 'stroke';
        if (isSelected) {
          drawStrokeWithSelection(ctx, stroke, zoom);
        } else {
          drawStroke(ctx, stroke.points, stroke.color, stroke.size);
        }
      }
    });

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape, false, zoom);
    }

    // Draw remote strokes in progress
    remoteStrokes.forEach((stroke) => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.size, 0.7);
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      drawStroke(ctx, currentStroke, color, size);
    }

    ctx.restore();

    // Draw remote cursors
    remoteCursors.forEach((cursor) => {
      drawRemoteCursor(ctx, cursor);
    });
  }, [
    canvasRef,
    strokes,
    remoteStrokes,
    currentStroke,
    pan,
    zoom,
    color,
    size,
    remoteCursors,
    canvasSize,
    shapes,
    currentShape,
    selectedElementId,
    selectedElementType,
  ]);
}
