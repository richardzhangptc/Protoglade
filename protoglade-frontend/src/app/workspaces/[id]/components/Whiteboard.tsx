'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  WhiteboardStroke,
  WhiteboardPoint,
  WhiteboardStickyNote,
  WhiteboardTextElement,
  WhiteboardShape,
  WhiteboardShapeType
} from '@/types';

type ToolType = 'select' | 'sticky' | 'text' | 'shapes' | 'pen';

// Local element types (without persistence metadata)
interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface ShapeElement {
  id: string;
  type: WhiteboardShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
}

interface RemoteStroke {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  size: number;
  userId: string;
}

interface RemoteCursor {
  odataId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    color: string;
  };
  x: number;
  y: number;
  lastUpdate: number;
}

interface WhiteboardProps {
  projectId: string;
  strokes: WhiteboardStroke[];
  remoteStrokes: Map<string, RemoteStroke>;
  remoteCursors: RemoteCursor[];
  sidebarCollapsed: boolean;
  // Initial element data for persistence
  initialStickyNotes?: StickyNote[];
  initialTextElements?: TextElement[];
  initialShapes?: ShapeElement[];
  onStrokeStart: (strokeId: string, point: WhiteboardPoint, color: string, size: number) => void;
  onStrokePoint: (strokeId: string, point: WhiteboardPoint) => void;
  onStrokeEnd: (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onCursorMove: (x: number, y: number) => void;
  onCursorLeave: () => void;
  // Element persistence callbacks
  onStickyNoteCreate?: (note: StickyNote) => void;
  onStickyNoteUpdate?: (note: StickyNote) => void;
  onStickyNoteDelete?: (id: string) => void;
  onTextElementCreate?: (textEl: TextElement) => void;
  onTextElementUpdate?: (textEl: TextElement) => void;
  onTextElementDelete?: (id: string) => void;
  onShapeCreate?: (shape: ShapeElement) => void;
  onShapeUpdate?: (shape: ShapeElement) => void;
  onShapeDelete?: (id: string) => void;
}

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function Whiteboard({
  strokes,
  remoteStrokes,
  remoteCursors,
  sidebarCollapsed,
  initialStickyNotes = [],
  initialTextElements = [],
  initialShapes = [],
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
  onUndo,
  onClear,
  onCursorMove,
  onCursorLeave,
  onStickyNoteCreate,
  onStickyNoteUpdate,
  onStickyNoteDelete,
  onTextElementCreate,
  onTextElementUpdate,
  onTextElementDelete,
  onShapeCreate,
  onShapeUpdate,
  onShapeDelete,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<WhiteboardPoint[]>([]);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(3);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [showPenOptions, setShowPenOptions] = useState(false);

  // Element states - initialized from props
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(initialStickyNotes);
  const [textElements, setTextElements] = useState<TextElement[]>(initialTextElements);
  const [shapes, setShapes] = useState<ShapeElement[]>(initialShapes);

  // Track if initial data has been set to avoid resetting on re-renders
  const initializedRef = useRef(false);

  // Update state when initial data changes (e.g., after loading from backend)
  useEffect(() => {
    if (!initializedRef.current && (initialStickyNotes.length > 0 || initialTextElements.length > 0 || initialShapes.length > 0)) {
      setStickyNotes(initialStickyNotes);
      setTextElements(initialTextElements);
      setShapes(initialShapes);
      initializedRef.current = true;
    }
  }, [initialStickyNotes, initialTextElements, initialShapes]);

  // Shape tool state
  const [selectedShapeType, setSelectedShapeType] = useState<WhiteboardShapeType>('rectangle');
  const [showShapeOptions, setShowShapeOptions] = useState(false);
  const [shapeFilled, setShapeFilled] = useState(false);

  // Selection state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'sticky' | 'text' | 'shape' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState<WhiteboardPoint | null>(null);
  const [currentShape, setCurrentShape] = useState<ShapeElement | null>(null);

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const stickyInputRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts for deleting selected elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId && !editingTextId && !editingStickyId) {
        if (selectedElementType === 'shape') {
          setShapes((prev) => prev.filter((s) => s.id !== selectedElementId));
          onShapeDelete?.(selectedElementId);
        } else if (selectedElementType === 'text') {
          setTextElements((prev) => prev.filter((t) => t.id !== selectedElementId));
          onTextElementDelete?.(selectedElementId);
        } else if (selectedElementType === 'sticky') {
          setStickyNotes((prev) => prev.filter((s) => s.id !== selectedElementId));
          onStickyNoteDelete?.(selectedElementId);
        }
        setSelectedElementId(null);
        setSelectedElementType(null);
      }
      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedElementId(null);
        setSelectedElementType(null);
        setEditingTextId(null);
        setEditingStickyId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, selectedElementType, editingTextId, editingStickyId, onShapeDelete, onTextElementDelete, onStickyNoteDelete]);

  // Resize canvas to fill container (full screen)
  // Whiteboard is now positioned absolutely and independent of sidebar
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
        // Update state to trigger redraw
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    // Use ResizeObserver to detect container size changes (window resize)
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(container);
    resizeCanvas();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Native wheel event listener with passive: false to allow preventDefault
  // This is necessary to prevent browser zoom on pinch gestures
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Pinch-to-zoom on trackpad (ctrlKey is true for pinch gestures)
      if (e.ctrlKey) {
        const zoomSensitivity = 0.01;
        const delta = 1 - e.deltaY * zoomSensitivity;

        setZoom((prevZoom) => {
          const newZoom = Math.min(Math.max(prevZoom * delta, 0.1), 5);
          const zoomRatio = newZoom / prevZoom;

          setPan((prevPan) => ({
            x: mouseX - (mouseX - prevPan.x) * zoomRatio,
            y: mouseY - (mouseY - prevPan.y) * zoomRatio,
          }));

          return newZoom;
        });
      } else {
        // Two-finger scroll on trackpad for panning
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    // Use passive: false to allow preventDefault() which blocks browser zoom
    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel);
  }, []);

  // Drawing helper functions (defined before useEffect to avoid hoisting issues)
  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    points: WhiteboardPoint[],
    strokeColor: string,
    strokeSize: number,
    alpha: number = 1
  ) => {
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
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    shape: ShapeElement,
    isSelected: boolean
  ) => {
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

    // Draw selection handles
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(shape.x - 4, shape.y - 4, shape.width + 8, shape.height + 8);
      ctx.setLineDash([]);
    }
  };

  const drawTextElement = (
    ctx: CanvasRenderingContext2D,
    textEl: TextElement,
    isSelected: boolean
  ) => {
    ctx.font = `${textEl.fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = textEl.color;
    ctx.fillText(textEl.text, textEl.x, textEl.y + textEl.fontSize);

    // Draw selection box
    if (isSelected) {
      const metrics = ctx.measureText(textEl.text);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(textEl.x - 4, textEl.y - 4, metrics.width + 8, textEl.fontSize + 8);
      ctx.setLineDash([]);
    }
  };

  // Draw all elements
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

    // Draw shapes
    shapes.forEach((shape) => {
      drawShape(ctx, shape, shape.id === selectedElementId);
    });

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape, false);
    }

    // Draw saved strokes
    strokes.forEach((stroke) => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.size);
    });

    // Draw remote strokes in progress
    remoteStrokes.forEach((stroke) => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.size, 0.7);
    });

    // Draw current stroke
    if (currentStroke.length > 0) {
      drawStroke(ctx, currentStroke, color, size);
    }

    // Draw text elements
    textElements.forEach((textEl) => {
      drawTextElement(ctx, textEl, textEl.id === selectedElementId);
    });

    ctx.restore();

    // Draw remote cursors (in screen space, not canvas space)
    remoteCursors.forEach((cursor) => {
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
    });
  }, [strokes, remoteStrokes, currentStroke, pan, zoom, color, size, remoteCursors, canvasSize, shapes, currentShape, textElements, selectedElementId]);

  const getCanvasPoint = useCallback((e: React.PointerEvent): WhiteboardPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Helper function for line hit testing
  const pointToLineDistance = (point: WhiteboardPoint, lineStart: WhiteboardPoint, lineEnd: WhiteboardPoint): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = lineStart.x; yy = lineStart.y; }
    else if (param > 1) { xx = lineEnd.x; yy = lineEnd.y; }
    else { xx = lineStart.x + param * C; yy = lineStart.y + param * D; }
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Hit testing for elements
  const hitTestElement = useCallback((point: WhiteboardPoint): { id: string; type: 'sticky' | 'text' | 'shape' } | null => {
    // Check shapes (in reverse order, so topmost is checked first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.type === 'line') {
        // Line hit test - check if point is near the line
        const dist = pointToLineDistance(point, { x: shape.x, y: shape.y }, { x: shape.x + shape.width, y: shape.y + shape.height });
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

    // Check text elements
    for (let i = textElements.length - 1; i >= 0; i--) {
      const textEl = textElements[i];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${textEl.fontSize}px system-ui, sans-serif`;
          const metrics = ctx.measureText(textEl.text);
          if (point.x >= textEl.x && point.x <= textEl.x + metrics.width &&
              point.y >= textEl.y && point.y <= textEl.y + textEl.fontSize) {
            return { id: textEl.id, type: 'text' };
          }
        }
      }
    }

    // Check sticky notes
    for (let i = stickyNotes.length - 1; i >= 0; i--) {
      const sticky = stickyNotes[i];
      if (point.x >= sticky.x && point.x <= sticky.x + sticky.width &&
          point.y >= sticky.y && point.y <= sticky.y + sticky.height) {
        return { id: sticky.id, type: 'sticky' };
      }
    }

    return null;
  }, [shapes, textElements, stickyNotes]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Middle click or alt+click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const point = getCanvasPoint(e);

    switch (activeTool) {
      case 'select': {
        const hit = hitTestElement(point);
        if (hit) {
          setSelectedElementId(hit.id);
          setSelectedElementType(hit.type);
          setIsDragging(true);
          setDragOffset({ x: point.x, y: point.y });
        } else {
          setSelectedElementId(null);
          setSelectedElementType(null);
        }
        break;
      }

      case 'sticky': {
        const newSticky: StickyNote = {
          id: crypto.randomUUID(),
          x: point.x,
          y: point.y,
          width: 200,
          height: 150,
          text: '',
          color: '#fef08a', // Yellow
        };
        setStickyNotes((prev) => [...prev, newSticky]);
        setSelectedElementId(newSticky.id);
        setSelectedElementType('sticky');
        setEditingStickyId(newSticky.id);
        onStickyNoteCreate?.(newSticky);
        break;
      }

      case 'text': {
        const newText: TextElement = {
          id: crypto.randomUUID(),
          x: point.x,
          y: point.y,
          text: 'Text',
          fontSize: 16,
          color: color,
        };
        setTextElements((prev) => [...prev, newText]);
        setSelectedElementId(newText.id);
        setSelectedElementType('text');
        setEditingTextId(newText.id);
        onTextElementCreate?.(newText);
        break;
      }

      case 'shapes': {
        setIsDrawingShape(true);
        setShapeStartPoint(point);
        const newShape: ShapeElement = {
          id: crypto.randomUUID(),
          type: selectedShapeType,
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          color: color,
          strokeWidth: size,
          filled: shapeFilled,
        };
        setCurrentShape(newShape);
        break;
      }

      case 'pen': {
        const strokeId = crypto.randomUUID();
        setCurrentStrokeId(strokeId);
        setIsDrawing(true);
        setCurrentStroke([point]);
        onStrokeStart(strokeId, point, color, size);
        break;
      }
    }

    canvas.setPointerCapture(e.pointerId);
  }, [activeTool, color, size, getCanvasPoint, onStrokeStart, hitTestElement, selectedShapeType, shapeFilled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    onCursorMove(e.clientX - rect.left, e.clientY - rect.top);

    if (isPanning) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const point = getCanvasPoint(e);

    // Handle dragging selected elements
    if (isDragging && selectedElementId && selectedElementType) {
      const dx = point.x - dragOffset.x;
      const dy = point.y - dragOffset.y;

      if (selectedElementType === 'shape') {
        setShapes((prev) =>
          prev.map((s) =>
            s.id === selectedElementId ? { ...s, x: s.x + dx, y: s.y + dy } : s
          )
        );
      } else if (selectedElementType === 'text') {
        setTextElements((prev) =>
          prev.map((t) =>
            t.id === selectedElementId ? { ...t, x: t.x + dx, y: t.y + dy } : t
          )
        );
      } else if (selectedElementType === 'sticky') {
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === selectedElementId ? { ...s, x: s.x + dx, y: s.y + dy } : s
          )
        );
      }
      setDragOffset({ x: point.x, y: point.y });
      return;
    }

    // Handle drawing shapes
    if (isDrawingShape && shapeStartPoint && currentShape) {
      setCurrentShape({
        ...currentShape,
        width: point.x - shapeStartPoint.x,
        height: point.y - shapeStartPoint.y,
      });
      return;
    }

    // Handle pen drawing
    if (!isDrawing || !currentStrokeId) return;

    setCurrentStroke((prev) => [...prev, point]);
    onStrokePoint(currentStrokeId, point);
  }, [isDrawing, isPanning, currentStrokeId, getCanvasPoint, onStrokePoint, onCursorMove, isDragging, selectedElementId, selectedElementType, dragOffset, isDrawingShape, shapeStartPoint, currentShape]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.releasePointerCapture(e.pointerId);

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // End dragging - persist position update
    if (isDragging && selectedElementId && selectedElementType) {
      if (selectedElementType === 'shape') {
        const shape = shapes.find((s) => s.id === selectedElementId);
        if (shape) onShapeUpdate?.(shape);
      } else if (selectedElementType === 'text') {
        const textEl = textElements.find((t) => t.id === selectedElementId);
        if (textEl) onTextElementUpdate?.(textEl);
      } else if (selectedElementType === 'sticky') {
        const sticky = stickyNotes.find((s) => s.id === selectedElementId);
        if (sticky) onStickyNoteUpdate?.(sticky);
      }
      setIsDragging(false);
      return;
    }

    // End shape drawing
    if (isDrawingShape && currentShape) {
      // Only add shape if it has some size
      if (Math.abs(currentShape.width) > 5 || Math.abs(currentShape.height) > 5) {
        // Normalize negative dimensions
        const normalizedShape = { ...currentShape };
        if (normalizedShape.width < 0) {
          normalizedShape.x += normalizedShape.width;
          normalizedShape.width = Math.abs(normalizedShape.width);
        }
        if (normalizedShape.height < 0) {
          normalizedShape.y += normalizedShape.height;
          normalizedShape.height = Math.abs(normalizedShape.height);
        }
        setShapes((prev) => [...prev, normalizedShape]);
        setSelectedElementId(normalizedShape.id);
        setSelectedElementType('shape');
        onShapeCreate?.(normalizedShape);
      }
      setIsDrawingShape(false);
      setShapeStartPoint(null);
      setCurrentShape(null);
      return;
    }

    // End pen drawing
    if (!isDrawing || !currentStrokeId || currentStroke.length === 0) return;

    onStrokeEnd(currentStrokeId, currentStroke, color, size);
    setIsDrawing(false);
    setCurrentStroke([]);
    setCurrentStrokeId(null);
  }, [isDrawing, isPanning, currentStroke, color, size, currentStrokeId, onStrokeEnd, isDragging, isDrawingShape, currentShape]);

  const handlePointerLeave = useCallback(() => {
    onCursorLeave();
  }, [onCursorLeave]);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleToolClick = useCallback((tool: ToolType) => {
    if (tool === 'pen' && activeTool === 'pen') {
      setShowPenOptions((prev) => !prev);
    } else if (tool === 'shapes' && activeTool === 'shapes') {
      setShowShapeOptions((prev) => !prev);
    } else {
      setActiveTool(tool);
      setShowPenOptions(tool === 'pen');
      setShowShapeOptions(tool === 'shapes');
    }
    // Clear selection when switching tools
    if (tool !== 'select') {
      setSelectedElementId(null);
      setSelectedElementType(null);
    }
  }, [activeTool]);

  const getCursorStyle = useCallback(() => {
    if (isPanning) return 'grabbing';
    switch (activeTool) {
      case 'select': return 'default';
      case 'text': return 'text';
      case 'sticky':
      case 'shapes':
      case 'pen':
      default: return 'crosshair';
    }
  }, [activeTool, isPanning]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
    >
      {/* Canvas - fills entire container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none bg-white"
        style={{ cursor: getCursorStyle() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />

      {/* Vertical Toolbar - positioned on left side, vertically centered */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-[left] duration-200"
        style={{ left: sidebarCollapsed ? 16 : 272 }}
      >
        {/* Tool buttons */}
        <button
          onClick={() => handleToolClick('select')}
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
          onClick={() => handleToolClick('sticky')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'sticky'
              ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
          }`}
          title="Sticky Note"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        <button
          onClick={() => handleToolClick('text')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'text'
              ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
          }`}
          title="Text"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 6v2m16-2v2M9 6v12m0 0h6m-6 0H7m8 0h2" />
          </svg>
        </button>

        <button
          onClick={() => handleToolClick('shapes')}
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
          onClick={() => handleToolClick('pen')}
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
          onClick={() => {
            // Clear local element states
            setStickyNotes([]);
            setTextElements([]);
            setShapes([]);
            setSelectedElementId(null);
            setSelectedElementType(null);
            // Clear strokes via parent handler
            onClear();
          }}
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
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
          className="p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
          title="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <button
          onClick={resetView}
          className="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={() => setZoom((z) => Math.min(5, z * 1.25))}
          className="p-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
          title="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Pen Options Popover */}
      {showPenOptions && activeTool === 'pen' && (
        <div
          className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-[left] duration-200"
          style={{ left: sidebarCollapsed ? 80 : 336 }}
        >
          {/* Color picker */}
          <div className="flex flex-wrap gap-1.5 max-w-[120px]">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === c ? 'border-[var(--color-primary)] scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-[var(--color-border)]" />

          {/* Size slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Size</span>
              <span className="text-xs text-[var(--color-text-muted)]">{size}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      {/* Shapes Options Popover */}
      {showShapeOptions && activeTool === 'shapes' && (
        <div
          className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg transition-[left] duration-200"
          style={{ left: sidebarCollapsed ? 80 : 336 }}
        >
          {/* Shape type selector */}
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedShapeType('rectangle')}
              className={`p-2 rounded-lg transition-all ${
                selectedShapeType === 'rectangle'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                  : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
              }`}
              title="Rectangle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
              </svg>
            </button>
            <button
              onClick={() => setSelectedShapeType('circle')}
              className={`p-2 rounded-lg transition-all ${
                selectedShapeType === 'circle'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                  : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
              }`}
              title="Circle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={2} />
              </svg>
            </button>
            <button
              onClick={() => setSelectedShapeType('line')}
              className={`p-2 rounded-lg transition-all ${
                selectedShapeType === 'line'
                  ? 'bg-[var(--color-primary)] text-[var(--color-text)]'
                  : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]'
              }`}
              title="Line"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-[var(--color-border)]" />

          {/* Color picker */}
          <div className="flex flex-wrap gap-1.5 max-w-[120px]">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === c ? 'border-[var(--color-primary)] scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-[var(--color-border)]" />

          {/* Filled toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shapeFilled}
              onChange={(e) => setShapeFilled(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--color-text)]">Filled</span>
          </label>

          {/* Size slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Stroke</span>
              <span className="text-xs text-[var(--color-text-muted)]">{size}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      {/* Sticky Notes - rendered as DOM elements for text editing */}
      {stickyNotes.map((sticky) => {
        const screenX = sticky.x * zoom + pan.x;
        const screenY = sticky.y * zoom + pan.y;
        const screenWidth = sticky.width * zoom;
        const screenHeight = sticky.height * zoom;

        return (
          <div
            key={sticky.id}
            className={`absolute rounded-lg shadow-lg cursor-move ${
              selectedElementId === sticky.id ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{
              left: screenX,
              top: screenY,
              width: screenWidth,
              height: screenHeight,
              backgroundColor: sticky.color,
              transform: 'translate(0, 0)',
            }}
            onPointerDown={(e) => {
              if (activeTool === 'select') {
                e.stopPropagation();
                const point = getCanvasPoint(e);
                setSelectedElementId(sticky.id);
                setSelectedElementType('sticky');
                setIsDragging(true);
                setDragOffset({ x: point.x, y: point.y });
              }
            }}
            onDoubleClick={() => {
              setEditingStickyId(sticky.id);
            }}
          >
            {editingStickyId === sticky.id ? (
              <textarea
                ref={stickyInputRef}
                className="w-full h-full p-2 bg-transparent resize-none outline-none text-sm"
                value={sticky.text}
                onChange={(e) => {
                  setStickyNotes((prev) =>
                    prev.map((s) =>
                      s.id === sticky.id ? { ...s, text: e.target.value } : s
                    )
                  );
                }}
                onBlur={() => {
                  setEditingStickyId(null);
                  onStickyNoteUpdate?.(sticky);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingStickyId(null);
                    onStickyNoteUpdate?.(sticky);
                  }
                }}
                autoFocus
              />
            ) : (
              <div className="w-full h-full p-2 text-sm overflow-hidden whitespace-pre-wrap">
                {sticky.text || 'Double-click to edit'}
              </div>
            )}
          </div>
        );
      })}

      {/* Text Elements - rendered as DOM for editing */}
      {textElements.map((textEl) => {
        const screenX = textEl.x * zoom + pan.x;
        const screenY = textEl.y * zoom + pan.y;

        return editingTextId === textEl.id ? (
          <textarea
            key={textEl.id}
            ref={textInputRef}
            className="absolute bg-transparent resize-none outline-none border border-blue-500 rounded p-1"
            style={{
              left: screenX,
              top: screenY,
              fontSize: textEl.fontSize * zoom,
              color: textEl.color,
              minWidth: 100,
            }}
            value={textEl.text}
            onChange={(e) => {
              setTextElements((prev) =>
                prev.map((t) =>
                  t.id === textEl.id ? { ...t, text: e.target.value } : t
                )
              );
            }}
            onBlur={() => {
              setEditingTextId(null);
              onTextElementUpdate?.(textEl);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingTextId(null);
                onTextElementUpdate?.(textEl);
              }
            }}
            autoFocus
          />
        ) : null;
      })}

      {/* Help text */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
        Two-finger scroll to pan • Pinch to zoom • Alt+drag to pan
      </div>
    </div>
  );
}
