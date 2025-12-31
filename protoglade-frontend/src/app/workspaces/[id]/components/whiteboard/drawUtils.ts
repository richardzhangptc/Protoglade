import { WhiteboardPoint } from '@/types';
import { ShapeElement } from './types';

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: WhiteboardPoint[],
  strokeColor: string,
  strokeSize: number,
  alpha: number = 1
): void {
  if (points.length < 2) {
    // Draw a single dot for single point
    if (points.length === 1) {
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, strokeSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    return;
  }

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  // Use quadratic curves for smoother lines
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  // Draw last segment
  if (points.length > 1) {
    const lastPoint = points[points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeElement,
  isSelected: boolean,
  zoom: number
): void {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.fillStyle = shape.color;

  if (shape.type === 'rectangle') {
    if (shape.filled) {
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    } else {
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    }
  } else if (shape.type === 'circle') {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const radiusX = Math.abs(shape.width) / 2;
    const radiusY = Math.abs(shape.height) / 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    if (shape.filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  } else if (shape.type === 'line') {
    ctx.beginPath();
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
    ctx.stroke();
  }

  // Draw selection border and resize handles
  if (isSelected) {
    const handleSize = 8 / zoom; // Scale handles with zoom
    const padding = 4 / zoom;

    // Selection border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(
      shape.x - padding,
      shape.y - padding,
      shape.width + padding * 2,
      shape.height + padding * 2
    );
    ctx.setLineDash([]);

    // Draw resize handles (8 handles: corners + midpoints)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / zoom;

    const handles = [
      { x: shape.x, y: shape.y }, // nw
      { x: shape.x + shape.width / 2, y: shape.y }, // n
      { x: shape.x + shape.width, y: shape.y }, // ne
      { x: shape.x + shape.width, y: shape.y + shape.height / 2 }, // e
      { x: shape.x + shape.width, y: shape.y + shape.height }, // se
      { x: shape.x + shape.width / 2, y: shape.y + shape.height }, // s
      { x: shape.x, y: shape.y + shape.height }, // sw
      { x: shape.x, y: shape.y + shape.height / 2 }, // w
    ];

    handles.forEach((handle) => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }
}

export function drawRemoteCursor(
  ctx: CanvasRenderingContext2D,
  cursor: { x: number; y: number; user: { color: string; name: string | null; email: string }; lastUpdate: number }
): void {
  const now = Date.now();
  if (now - cursor.lastUpdate > 5000) return; // Skip stale cursors

  ctx.save();

  // Draw cursor
  ctx.fillStyle = cursor.user.color;
  ctx.beginPath();
  ctx.moveTo(cursor.x, cursor.y);
  ctx.lineTo(cursor.x + 5, cursor.y + 18);
  ctx.lineTo(cursor.x + 12, cursor.y + 12);
  ctx.closePath();
  ctx.fill();

  // Draw name label
  const name = cursor.user.name || cursor.user.email.split('@')[0];
  ctx.font = '12px system-ui, sans-serif';
  const textWidth = ctx.measureText(name).width;

  ctx.fillStyle = cursor.user.color;
  ctx.beginPath();
  ctx.roundRect(cursor.x + 14, cursor.y + 10, textWidth + 8, 18, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, cursor.x + 18, cursor.y + 23);

  ctx.restore();
}

