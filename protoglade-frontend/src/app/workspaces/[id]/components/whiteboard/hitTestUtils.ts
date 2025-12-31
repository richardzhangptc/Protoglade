import { WhiteboardPoint } from '@/types';
import { ShapeElement, ResizeHandle } from './types';

// Helper function for line hit testing
export function pointToLineDistance(
  point: WhiteboardPoint,
  lineStart: WhiteboardPoint,
  lineEnd: WhiteboardPoint
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Hit testing for resize handles
export function hitTestResizeHandle(
  point: WhiteboardPoint,
  shape: ShapeElement,
  zoom: number
): ResizeHandle {
  const handleSize = 12 / zoom; // Slightly larger hit area than visual
  const handles: { pos: ResizeHandle; x: number; y: number }[] = [
    { pos: 'nw', x: shape.x, y: shape.y },
    { pos: 'n', x: shape.x + shape.width / 2, y: shape.y },
    { pos: 'ne', x: shape.x + shape.width, y: shape.y },
    { pos: 'e', x: shape.x + shape.width, y: shape.y + shape.height / 2 },
    { pos: 'se', x: shape.x + shape.width, y: shape.y + shape.height },
    { pos: 's', x: shape.x + shape.width / 2, y: shape.y + shape.height },
    { pos: 'sw', x: shape.x, y: shape.y + shape.height },
    { pos: 'w', x: shape.x, y: shape.y + shape.height / 2 },
  ];

  for (const handle of handles) {
    if (
      point.x >= handle.x - handleSize / 2 &&
      point.x <= handle.x + handleSize / 2 &&
      point.y >= handle.y - handleSize / 2 &&
      point.y <= handle.y + handleSize / 2
    ) {
      return handle.pos;
    }
  }
  return null;
}

// Hit testing for shapes
export function hitTestElement(
  point: WhiteboardPoint,
  shapes: ShapeElement[]
): { id: string; type: 'shape' } | null {
  // Check shapes (in reverse order, so topmost is checked first)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (shape.type === 'line') {
      // Line hit test - check if point is near the line
      const dist = pointToLineDistance(
        point,
        { x: shape.x, y: shape.y },
        { x: shape.x + shape.width, y: shape.y + shape.height }
      );
      if (dist < 10) return { id: shape.id, type: 'shape' };
    } else {
      const minX = Math.min(shape.x, shape.x + shape.width);
      const maxX = Math.max(shape.x, shape.x + shape.width);
      const minY = Math.min(shape.y, shape.y + shape.height);
      const maxY = Math.max(shape.y, shape.y + shape.height);
      if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
        return { id: shape.id, type: 'shape' };
      }
    }
  }

  return null;
}

// Get cursor style for resize handles
export function getResizeCursor(handle: ResizeHandle): string {
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
}

// Normalize shape with negative dimensions
export function normalizeShape(shape: ShapeElement): ShapeElement {
  const normalized = { ...shape };
  if (normalized.width < 0) {
    normalized.x += normalized.width;
    normalized.width = Math.abs(normalized.width);
  }
  if (normalized.height < 0) {
    normalized.y += normalized.height;
    normalized.height = Math.abs(normalized.height);
  }
  return normalized;
}

