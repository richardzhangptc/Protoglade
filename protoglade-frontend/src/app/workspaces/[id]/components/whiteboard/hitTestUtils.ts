import { WhiteboardPoint } from '@/types';
import { ShapeElement, StrokeElement, ResizeHandle } from './types';

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

// Hit testing for strokes - check if point is near any segment of the stroke
export function hitTestStroke(
  point: WhiteboardPoint,
  stroke: StrokeElement,
  threshold: number = 10
): boolean {
  const points = stroke.points;
  if (points.length < 2) {
    // Single point stroke - check distance to that point
    if (points.length === 1) {
      const dx = point.x - points[0].x;
      const dy = point.y - points[0].y;
      return Math.sqrt(dx * dx + dy * dy) < threshold + stroke.size / 2;
    }
    return false;
  }

  // Check distance to each line segment
  for (let i = 0; i < points.length - 1; i++) {
    const dist = pointToLineDistance(point, points[i], points[i + 1]);
    if (dist < threshold + stroke.size / 2) {
      return true;
    }
  }
  return false;
}

// Hit test all strokes and return the one that was hit (topmost by zIndex)
export function hitTestStrokes(
  point: WhiteboardPoint,
  strokes: StrokeElement[]
): { id: string; type: 'stroke' } | null {
  // Sort by zIndex descending to check topmost first
  const sortedStrokes = [...strokes].sort((a, b) => b.zIndex - a.zIndex);

  for (const stroke of sortedStrokes) {
    if (hitTestStroke(point, stroke)) {
      return { id: stroke.id, type: 'stroke' };
    }
  }
  return null;
}

// Get bounding box of a stroke
export function getStrokeBounds(stroke: StrokeElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (stroke.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of stroke.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  // Add padding for stroke size
  const padding = stroke.size / 2;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + stroke.size,
    height: maxY - minY + stroke.size,
  };
}

// Translate all points in a stroke by an offset
export function translateStroke(
  stroke: StrokeElement,
  dx: number,
  dy: number
): StrokeElement {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    })),
  };
}

