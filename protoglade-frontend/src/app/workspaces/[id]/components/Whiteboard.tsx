'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { WhiteboardStroke, WhiteboardPoint } from '@/types';

type ToolType = 'select' | 'sticky' | 'text' | 'shapes' | 'pen';

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
  onStrokeStart: (strokeId: string, point: WhiteboardPoint, color: string, size: number) => void;
  onStrokePoint: (strokeId: string, point: WhiteboardPoint) => void;
  onStrokeEnd: (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onCursorMove: (x: number, y: number) => void;
  onCursorLeave: () => void;
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
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
  onUndo,
  onClear,
  onCursorMove,
  onCursorLeave,
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

  // Draw all strokes
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
  }, [strokes, remoteStrokes, currentStroke, pan, zoom, color, size, remoteCursors, canvasSize]);

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

  const getCanvasPoint = useCallback((e: React.PointerEvent): WhiteboardPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Middle click or space+click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const point = getCanvasPoint(e);
    const strokeId = crypto.randomUUID();

    setCurrentStrokeId(strokeId);
    setIsDrawing(true);
    setCurrentStroke([point]);
    onStrokeStart(strokeId, point, color, size);

    canvas.setPointerCapture(e.pointerId);
  }, [color, size, getCanvasPoint, onStrokeStart]);

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

    if (!isDrawing || !currentStrokeId) return;

    const point = getCanvasPoint(e);
    setCurrentStroke((prev) => [...prev, point]);
    onStrokePoint(currentStrokeId, point);
  }, [isDrawing, isPanning, currentStrokeId, getCanvasPoint, onStrokePoint, onCursorMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning) {
      setIsPanning(false);
      canvas.style.cursor = 'crosshair';
      return;
    }

    if (!isDrawing || !currentStrokeId || currentStroke.length === 0) return;

    canvas.releasePointerCapture(e.pointerId);
    onStrokeEnd(currentStrokeId, currentStroke, color, size);
    setIsDrawing(false);
    setCurrentStroke([]);
    setCurrentStrokeId(null);
  }, [isDrawing, isPanning, currentStroke, color, size, currentStrokeId, onStrokeEnd]);

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
    } else {
      setActiveTool(tool);
      if (tool === 'pen') {
        setShowPenOptions(true);
      } else {
        setShowPenOptions(false);
      }
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
          onClick={onClear}
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

      {/* Help text */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
        Two-finger scroll to pan • Pinch to zoom • Alt+drag to pan
      </div>
    </div>
  );
}
