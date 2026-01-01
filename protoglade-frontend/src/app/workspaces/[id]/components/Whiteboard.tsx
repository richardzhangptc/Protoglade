'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { WhiteboardStroke, WhiteboardPoint, WhiteboardShapeType } from '@/types';
import {
  ToolType,
  ResizeHandle,
  ShapeElement,
  TextElement,
  StickyNoteElement,
  RemoteStroke,
  RemoteCursor,
  STICKY_COLORS,
} from './whiteboard/types';
import { drawStroke, drawShape, drawRemoteCursor } from './whiteboard/drawUtils';
import {
  hitTestResizeHandle,
  hitTestElement,
  getResizeCursor,
  normalizeShape,
} from './whiteboard/hitTestUtils';
import { useHistory, HistoryAction } from './whiteboard/useHistory';
import { WhiteboardToolbar } from './whiteboard/WhiteboardToolbar';
import { PenOptionsPopover } from './whiteboard/PenOptionsPopover';
import { ShapeOptionsPopover } from './whiteboard/ShapeOptionsPopover';
import { TextBox } from './whiteboard/TextBox';
import { TextFormatToolbar } from './whiteboard/TextFormatToolbar';
import { StickyNote } from './whiteboard/StickyNote';
import { StickyNoteFormatToolbar } from './whiteboard/StickyNoteFormatToolbar';

interface WhiteboardProps {
  projectId: string;
  strokes: WhiteboardStroke[];
  remoteStrokes: Map<string, RemoteStroke>;
  remoteCursors: RemoteCursor[];
  sidebarCollapsed: boolean;
  initialShapes?: ShapeElement[];
  initialTexts?: TextElement[];
  onStrokeStart: (strokeId: string, point: WhiteboardPoint, color: string, size: number) => void;
  onStrokePoint: (strokeId: string, point: WhiteboardPoint) => void;
  onStrokeEnd: (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => void;
  onStrokeUndo: (strokeId: string) => void;
  onStrokeRedo: (stroke: WhiteboardStroke) => void;
  onClear: () => void;
  onCursorMove: (x: number, y: number) => void;
  onCursorLeave: () => void;
  onShapeCreate?: (shape: ShapeElement) => void;
  onShapeUpdate?: (shape: ShapeElement) => void;
  onShapeDelete?: (id: string) => void;
  onTextCreate?: (text: TextElement) => void;
  onTextUpdate?: (text: TextElement) => void;
  onTextDelete?: (id: string) => void;
  initialStickyNotes?: StickyNoteElement[];
  onStickyCreate?: (sticky: StickyNoteElement) => void;
  onStickyUpdate?: (sticky: StickyNoteElement) => void;
  onStickyDelete?: (id: string) => void;
}

export function Whiteboard({
  strokes,
  remoteStrokes,
  remoteCursors,
  sidebarCollapsed,
  initialShapes = [],
  initialTexts = [],
  initialStickyNotes = [],
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
  onStrokeUndo,
  onStrokeRedo,
  onClear,
  onCursorMove,
  onCursorLeave,
  onShapeCreate,
  onShapeUpdate,
  onShapeDelete,
  onTextCreate,
  onTextUpdate,
  onTextDelete,
  onStickyCreate,
  onStickyUpdate,
  onStickyDelete,
}: WhiteboardProps) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const initializedRef = useRef(false);
  const textInitializedRef = useRef(false);
  const stickyInitializedRef = useRef(false);

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [showPenOptions, setShowPenOptions] = useState(false);
  const [showShapeOptions, setShowShapeOptions] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(3);
  const [selectedShapeType, setSelectedShapeType] = useState<WhiteboardShapeType>('rectangle');
  const [shapeFilled, setShapeFilled] = useState(false);

  // Text tool state
  const [textFontSize, setTextFontSize] = useState(16);
  const [textFontWeight, setTextFontWeight] = useState<'normal' | 'bold'>('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center'>('left');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<WhiteboardPoint[]>([]);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);

  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState<WhiteboardPoint | null>(null);
  const [currentShape, setCurrentShape] = useState<ShapeElement | null>(null);

  // Element state
  const [shapes, setShapes] = useState<ShapeElement[]>(initialShapes);
  const [texts, setTexts] = useState<TextElement[]>(initialTexts);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteElement[]>(initialStickyNotes);

  // Selection state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'shape' | 'text' | 'sticky' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textBeforeEdit, setTextBeforeEdit] = useState<string>('');

  // Sticky note editing state
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [stickyBeforeEdit, setStickyBeforeEdit] = useState<string>('');

  // Resize state
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle>(null);
  const [hoveredResizeHandle, setHoveredResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStartShape, setResizeStartShape] = useState<ShapeElement | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<WhiteboardPoint | null>(null);

  // History for undo/redo
  const { canUndo, canRedo, pushAction, undo, redo, clear: clearHistory } = useHistory();

  // Initialize shapes from props
  useEffect(() => {
    if (!initializedRef.current && initialShapes.length > 0) {
      setShapes(initialShapes);
      initializedRef.current = true;
    }
  }, [initialShapes]);

  // Initialize texts from props
  useEffect(() => {
    if (!textInitializedRef.current && initialTexts.length > 0) {
      setTexts(initialTexts);
      textInitializedRef.current = true;
    }
  }, [initialTexts]);

  // Initialize sticky notes from props
  useEffect(() => {
    if (!stickyInitializedRef.current && initialStickyNotes.length > 0) {
      setStickyNotes(initialStickyNotes);
      stickyInitializedRef.current = true;
    }
  }, [initialStickyNotes]);

  // Apply undo action
  const applyUndo = useCallback((action: HistoryAction) => {
    switch (action.type) {
      case 'stroke_create':
        onStrokeUndo(action.stroke.id);
        break;
      case 'shape_create':
        setShapes((prev) => prev.filter((s) => s.id !== action.shape.id));
        onShapeDelete?.(action.shape.id);
        break;
      case 'shape_delete':
        setShapes((prev) => [...prev, action.shape]);
        onShapeCreate?.(action.shape);
        break;
      case 'shape_move':
        setShapes((prev) =>
          prev.map((s) =>
            s.id === action.shapeId ? { ...s, x: action.fromX, y: action.fromY } : s
          )
        );
        const movedShape = shapes.find((s) => s.id === action.shapeId);
        if (movedShape) {
          onShapeUpdate?.({ ...movedShape, x: action.fromX, y: action.fromY });
        }
        break;
      case 'shape_resize':
        setShapes((prev) =>
          prev.map((s) => (s.id === action.shapeId ? action.from : s))
        );
        onShapeUpdate?.(action.from);
        break;
      case 'text_create':
        setTexts((prev) => prev.filter((t) => t.id !== action.text.id));
        onTextDelete?.(action.text.id);
        break;
      case 'text_delete':
        setTexts((prev) => [...prev, action.text]);
        onTextCreate?.(action.text);
        break;
      case 'text_move':
        setTexts((prev) =>
          prev.map((t) =>
            t.id === action.textId ? { ...t, x: action.fromX, y: action.fromY } : t
          )
        );
        const movedText = texts.find((t) => t.id === action.textId);
        if (movedText) {
          onTextUpdate?.({ ...movedText, x: action.fromX, y: action.fromY });
        }
        break;
      case 'text_resize':
        setTexts((prev) =>
          prev.map((t) => (t.id === action.textId ? action.from : t))
        );
        onTextUpdate?.(action.from);
        break;
      case 'text_edit':
        setTexts((prev) =>
          prev.map((t) =>
            t.id === action.textId ? { ...t, content: action.fromContent } : t
          )
        );
        const editedText = texts.find((t) => t.id === action.textId);
        if (editedText) {
          onTextUpdate?.({ ...editedText, content: action.fromContent });
        }
        break;
      case 'sticky_create':
        setStickyNotes((prev) => prev.filter((s) => s.id !== action.sticky.id));
        onStickyDelete?.(action.sticky.id);
        break;
      case 'sticky_delete':
        setStickyNotes((prev) => [...prev, action.sticky]);
        onStickyCreate?.(action.sticky);
        break;
      case 'sticky_move':
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === action.stickyId ? { ...s, x: action.fromX, y: action.fromY } : s
          )
        );
        const movedSticky = stickyNotes.find((s) => s.id === action.stickyId);
        if (movedSticky) {
          onStickyUpdate?.({ ...movedSticky, x: action.fromX, y: action.fromY });
        }
        break;
      case 'sticky_resize':
        setStickyNotes((prev) =>
          prev.map((s) => (s.id === action.stickyId ? action.from : s))
        );
        onStickyUpdate?.(action.from);
        break;
      case 'sticky_edit':
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === action.stickyId ? { ...s, content: action.fromContent } : s
          )
        );
        const editedSticky = stickyNotes.find((s) => s.id === action.stickyId);
        if (editedSticky) {
          onStickyUpdate?.({ ...editedSticky, content: action.fromContent });
        }
        break;
      case 'sticky_color':
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === action.stickyId ? { ...s, color: action.fromColor } : s
          )
        );
        const coloredSticky = stickyNotes.find((s) => s.id === action.stickyId);
        if (coloredSticky) {
          onStickyUpdate?.({ ...coloredSticky, color: action.fromColor });
        }
        break;
    }
  }, [onStrokeUndo, onShapeDelete, onShapeCreate, onShapeUpdate, shapes, onTextDelete, onTextCreate, onTextUpdate, texts, onStickyDelete, onStickyCreate, onStickyUpdate, stickyNotes]);

  // Apply redo action
  const applyRedo = useCallback((action: HistoryAction) => {
    switch (action.type) {
      case 'stroke_create':
        onStrokeRedo(action.stroke);
        break;
      case 'shape_create':
        setShapes((prev) => [...prev, action.shape]);
        onShapeCreate?.(action.shape);
        break;
      case 'shape_delete':
        setShapes((prev) => prev.filter((s) => s.id !== action.shape.id));
        onShapeDelete?.(action.shape.id);
        break;
      case 'shape_move':
        setShapes((prev) =>
          prev.map((s) =>
            s.id === action.shapeId ? { ...s, x: action.toX, y: action.toY } : s
          )
        );
        const movedShape = shapes.find((s) => s.id === action.shapeId);
        if (movedShape) {
          onShapeUpdate?.({ ...movedShape, x: action.toX, y: action.toY });
        }
        break;
      case 'shape_resize':
        setShapes((prev) =>
          prev.map((s) => (s.id === action.shapeId ? action.to : s))
        );
        onShapeUpdate?.(action.to);
        break;
      case 'text_create':
        setTexts((prev) => [...prev, action.text]);
        onTextCreate?.(action.text);
        break;
      case 'text_delete':
        setTexts((prev) => prev.filter((t) => t.id !== action.text.id));
        onTextDelete?.(action.text.id);
        break;
      case 'text_move':
        setTexts((prev) =>
          prev.map((t) =>
            t.id === action.textId ? { ...t, x: action.toX, y: action.toY } : t
          )
        );
        const movedText = texts.find((t) => t.id === action.textId);
        if (movedText) {
          onTextUpdate?.({ ...movedText, x: action.toX, y: action.toY });
        }
        break;
      case 'text_resize':
        setTexts((prev) =>
          prev.map((t) => (t.id === action.textId ? action.to : t))
        );
        onTextUpdate?.(action.to);
        break;
      case 'text_edit':
        setTexts((prev) =>
          prev.map((t) =>
            t.id === action.textId ? { ...t, content: action.toContent } : t
          )
        );
        const editedText = texts.find((t) => t.id === action.textId);
        if (editedText) {
          onTextUpdate?.({ ...editedText, content: action.toContent });
        }
        break;
      case 'sticky_create':
        setStickyNotes((prev) => [...prev, action.sticky]);
        onStickyCreate?.(action.sticky);
        break;
      case 'sticky_delete':
        setStickyNotes((prev) => prev.filter((s) => s.id !== action.sticky.id));
        onStickyDelete?.(action.sticky.id);
        break;
      case 'sticky_move':
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === action.stickyId ? { ...s, x: action.toX, y: action.toY } : s
          )
        );
        const movedSticky = stickyNotes.find((s) => s.id === action.stickyId);
        if (movedSticky) {
          onStickyUpdate?.({ ...movedSticky, x: action.toX, y: action.toY });
        }
        break;
      case 'sticky_resize':
        setStickyNotes((prev) =>
          prev.map((s) => (s.id === action.stickyId ? action.to : s))
        );
        onStickyUpdate?.(action.to);
        break;
      case 'sticky_edit':
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === action.stickyId ? { ...s, content: action.toContent } : s
          )
        );
        const editedSticky = stickyNotes.find((s) => s.id === action.stickyId);
        if (editedSticky) {
          onStickyUpdate?.({ ...editedSticky, content: action.toContent });
        }
        break;
      case 'sticky_color':
        setStickyNotes((prev) =>
          prev.map((s) =>
            s.id === action.stickyId ? { ...s, color: action.toColor } : s
          )
        );
        const coloredSticky = stickyNotes.find((s) => s.id === action.stickyId);
        if (coloredSticky) {
          onStickyUpdate?.({ ...coloredSticky, color: action.toColor });
        }
        break;
    }
  }, [onStrokeRedo, onShapeCreate, onShapeDelete, onShapeUpdate, shapes, onTextCreate, onTextDelete, onTextUpdate, texts, onStickyCreate, onStickyDelete, onStickyUpdate, stickyNotes]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const action = undo();
    if (action) {
      applyUndo(action);
    }
  }, [undo, applyUndo]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const action = redo();
    if (action) {
      applyRedo(action);
    }
  }, [redo, applyRedo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if editing text or sticky
      if (editingTextId || editingStickyId) return;

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z, Cmd+Shift+Z, Ctrl+Y, or Cmd+Y
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        if (selectedElementType === 'shape') {
          const shapeToDelete = shapes.find((s) => s.id === selectedElementId);
          if (shapeToDelete) {
            pushAction({ type: 'shape_delete', shape: shapeToDelete });
            setShapes((prev) => prev.filter((s) => s.id !== selectedElementId));
            onShapeDelete?.(selectedElementId);
          }
        } else if (selectedElementType === 'text') {
          const textToDelete = texts.find((t) => t.id === selectedElementId);
          if (textToDelete) {
            pushAction({ type: 'text_delete', text: textToDelete });
            setTexts((prev) => prev.filter((t) => t.id !== selectedElementId));
            onTextDelete?.(selectedElementId);
          }
        } else if (selectedElementType === 'sticky') {
          const stickyToDelete = stickyNotes.find((s) => s.id === selectedElementId);
          if (stickyToDelete) {
            pushAction({ type: 'sticky_delete', sticky: stickyToDelete });
            setStickyNotes((prev) => prev.filter((s) => s.id !== selectedElementId));
            onStickyDelete?.(selectedElementId);
          }
        }
        setSelectedElementId(null);
        setSelectedElementType(null);
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedElementId(null);
        setSelectedElementType(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, selectedElementType, onShapeDelete, onTextDelete, onStickyDelete, shapes, texts, stickyNotes, handleUndo, handleRedo, pushAction, editingTextId, editingStickyId]);

  // Canvas resize
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
  }, []);

  // Wheel/pinch zoom handler
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

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
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    // Attach to the container so wheel events still work when the cursor is over
    // DOM overlays (text boxes, floating toolbars), not just the <canvas>.
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, []);

  // Canvas drawing
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
      drawShape(ctx, shape, shape.id === selectedElementId && selectedElementType === 'shape', zoom);
    });

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape, false, zoom);
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

    ctx.restore();

    // Draw remote cursors
    remoteCursors.forEach((cursor) => {
      drawRemoteCursor(ctx, cursor);
    });
  }, [strokes, remoteStrokes, currentStroke, pan, zoom, color, size, remoteCursors, canvasSize, shapes, currentShape, selectedElementId, selectedElementType]);

  // Helper functions
  const getCanvasPoint = useCallback((e: React.PointerEvent | React.MouseEvent): WhiteboardPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Text box handlers
  const handleTextSelect = useCallback((textId: string) => {
    setSelectedElementId(textId);
    setSelectedElementType('text');
    setEditingTextId(null);
  }, []);

  const handleTextStartEdit = useCallback((textId: string) => {
    const text = texts.find((t) => t.id === textId);
    if (text) {
      setTextBeforeEdit(text.content);
      setEditingTextId(textId);
    }
  }, [texts]);

  const handleTextEndEdit = useCallback((textId: string, newContent: string) => {
    const text = texts.find((t) => t.id === textId);
    if (text && newContent !== textBeforeEdit) {
      pushAction({
        type: 'text_edit',
        textId,
        fromContent: textBeforeEdit,
        toContent: newContent,
      });
      setTexts((prev) =>
        prev.map((t) => (t.id === textId ? { ...t, content: newContent } : t))
      );
      onTextUpdate?.({ ...text, content: newContent });
    }
    setEditingTextId(null);
  }, [textBeforeEdit, pushAction, onTextUpdate, texts]);

  const handleTextCancelEdit = useCallback(() => {
    setEditingTextId(null);
  }, []);

  const handleTextMove = useCallback((textId: string, x: number, y: number) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === textId ? { ...t, x, y } : t))
    );
  }, []);

  const handleTextMoveEnd = useCallback((textId: string) => {
    const text = texts.find((t) => t.id === textId);
    if (text && dragStartPosition && (text.x !== dragStartPosition.x || text.y !== dragStartPosition.y)) {
      pushAction({
        type: 'text_move',
        textId,
        fromX: dragStartPosition.x,
        fromY: dragStartPosition.y,
        toX: text.x,
        toY: text.y,
      });
      onTextUpdate?.(text);
    }
    setDragStartPosition(null);
  }, [texts, dragStartPosition, pushAction, onTextUpdate]);

  const handleTextResize = useCallback((textId: string, width: number, height: number, fontSize?: number) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === textId ? { ...t, width, height, ...(fontSize !== undefined && { fontSize }) } : t))
    );
  }, []);

  const handleTextResizeEnd = useCallback((textId: string) => {
    const text = texts.find((t) => t.id === textId);
    if (text) {
      // We'd need to track resize start state similar to shapes
      // For now just persist the update
      onTextUpdate?.(text);
    }
  }, [texts, onTextUpdate]);

  // Update text format from floating toolbar
  const handleTextFormatUpdate = useCallback((textId: string, updates: Partial<TextElement>) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === textId ? { ...t, ...updates } : t))
    );
    const text = texts.find((t) => t.id === textId);
    if (text) {
      onTextUpdate?.({ ...text, ...updates });
    }
  }, [texts, onTextUpdate]);

  // Sticky note handlers
  const handleStickySelect = useCallback((stickyId: string) => {
    setSelectedElementId(stickyId);
    setSelectedElementType('sticky');
    setEditingStickyId(null);
  }, []);

  const handleStickyStartEdit = useCallback((stickyId: string) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky) {
      setStickyBeforeEdit(sticky.content);
      setEditingStickyId(stickyId);
    }
  }, [stickyNotes]);

  const handleStickyEndEdit = useCallback((stickyId: string, newContent: string) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky && newContent !== stickyBeforeEdit) {
      pushAction({
        type: 'sticky_edit',
        stickyId,
        fromContent: stickyBeforeEdit,
        toContent: newContent,
      });
      setStickyNotes((prev) =>
        prev.map((s) => (s.id === stickyId ? { ...s, content: newContent } : s))
      );
      onStickyUpdate?.({ ...sticky, content: newContent });
    }
    setEditingStickyId(null);
  }, [stickyBeforeEdit, pushAction, onStickyUpdate, stickyNotes]);

  const handleStickyCancelEdit = useCallback(() => {
    setEditingStickyId(null);
  }, []);

  const handleStickyMove = useCallback((stickyId: string, x: number, y: number) => {
    setStickyNotes((prev) =>
      prev.map((s) => (s.id === stickyId ? { ...s, x, y } : s))
    );
  }, []);

  const handleStickyMoveEnd = useCallback((stickyId: string) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky && dragStartPosition && (sticky.x !== dragStartPosition.x || sticky.y !== dragStartPosition.y)) {
      pushAction({
        type: 'sticky_move',
        stickyId,
        fromX: dragStartPosition.x,
        fromY: dragStartPosition.y,
        toX: sticky.x,
        toY: sticky.y,
      });
      onStickyUpdate?.(sticky);
    }
    setDragStartPosition(null);
  }, [stickyNotes, dragStartPosition, pushAction, onStickyUpdate]);

  const handleStickyResize = useCallback((stickyId: string, width: number, height: number, fontSize?: number) => {
    setStickyNotes((prev) =>
      prev.map((s) => (s.id === stickyId ? { ...s, width, height, ...(fontSize !== undefined && { fontSize }) } : s))
    );
  }, []);

  const handleStickyResizeEnd = useCallback((stickyId: string) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky) {
      onStickyUpdate?.(sticky);
    }
  }, [stickyNotes, onStickyUpdate]);

  // Update sticky note color from floating toolbar
  const handleStickyFormatUpdate = useCallback((stickyId: string, updates: Partial<StickyNoteElement>) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky && updates.color && updates.color !== sticky.color) {
      pushAction({
        type: 'sticky_color',
        stickyId,
        fromColor: sticky.color,
        toColor: updates.color,
      });
    }
    setStickyNotes((prev) =>
      prev.map((s) => (s.id === stickyId ? { ...s, ...updates } : s))
    );
    if (sticky) {
      onStickyUpdate?.({ ...sticky, ...updates });
    }
  }, [stickyNotes, pushAction, onStickyUpdate]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Close options panels when interacting with canvas
    setShowPenOptions(false);
    setShowShapeOptions(false);

    // If we're editing a text box or sticky note, clicking the canvas should commit + exit edit mode.
    // We call blur() explicitly because preventDefault() can stop the browser from
    // naturally moving focus (and thus prevent the blur handler from firing).
    if (editingTextId || editingStickyId) {
      const active = document.activeElement as HTMLElement | null;
      active?.blur?.();
      setEditingTextId(null);
      setEditingStickyId(null);
    }

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
        // Check resize handles first
        if (selectedElementId && selectedElementType === 'shape') {
          const selectedShape = shapes.find((s) => s.id === selectedElementId);
          if (selectedShape) {
            const handle = hitTestResizeHandle(point, selectedShape, zoom);
            if (handle) {
              setActiveResizeHandle(handle);
              setResizeStartShape({ ...selectedShape });
              setResizeStartPoint(point);
              canvas.setPointerCapture(e.pointerId);
              return;
            }
          }
        }

        const hit = hitTestElement(point, shapes);
        if (hit) {
          const shape = shapes.find((s) => s.id === hit.id);
          setSelectedElementId(hit.id);
          setSelectedElementType(hit.type);
          setIsDragging(true);
          setDragOffset({ x: point.x, y: point.y });
          if (shape) {
            setDragStartPosition({ x: shape.x, y: shape.y });
          }
        } else {
          setSelectedElementId(null);
          setSelectedElementType(null);
        }
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

      case 'text': {
        // Create new text box at click position
        const newText: TextElement = {
          id: crypto.randomUUID(),
          x: point.x,
          y: point.y,
          width: 200,
          height: 32,
          content: '',
          fontSize: textFontSize,
          fontWeight: textFontWeight,
          color: color,
          align: textAlign,
        };
        setTexts((prev) => [...prev, newText]);
        pushAction({ type: 'text_create', text: newText });
        onTextCreate?.(newText);
        // Select and start editing
        setSelectedElementId(newText.id);
        setSelectedElementType('text');
        setEditingTextId(newText.id);
        setTextBeforeEdit('');
        break;
      }

      case 'sticky': {
        // Create new sticky note at click position
        const newSticky: StickyNoteElement = {
          id: crypto.randomUUID(),
          x: point.x,
          y: point.y,
          width: 200,
          height: 200,
          content: '',
          color: STICKY_COLORS[0], // Default yellow
          fontSize: 14,
        };
        setStickyNotes((prev) => [...prev, newSticky]);
        pushAction({ type: 'sticky_create', sticky: newSticky });
        onStickyCreate?.(newSticky);
        // Select and start editing
        setSelectedElementId(newSticky.id);
        setSelectedElementType('sticky');
        setEditingStickyId(newSticky.id);
        setStickyBeforeEdit('');
        break;
      }
    }

    canvas.setPointerCapture(e.pointerId);
  }, [activeTool, color, size, getCanvasPoint, onStrokeStart, selectedShapeType, shapeFilled, selectedElementId, selectedElementType, shapes, zoom, editingTextId, editingStickyId, textFontSize, textFontWeight, textAlign, pushAction, onTextCreate, onStickyCreate]);

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

    // Handle resizing
    if (activeResizeHandle && resizeStartShape && resizeStartPoint && selectedElementId) {
      const dx = point.x - resizeStartPoint.x;
      const dy = point.y - resizeStartPoint.y;
      const orig = resizeStartShape;

      let newX = orig.x;
      let newY = orig.y;
      let newWidth = orig.width;
      let newHeight = orig.height;

      switch (activeResizeHandle) {
        case 'nw':
          newX = orig.x + dx;
          newY = orig.y + dy;
          newWidth = orig.width - dx;
          newHeight = orig.height - dy;
          break;
        case 'n':
          newY = orig.y + dy;
          newHeight = orig.height - dy;
          break;
        case 'ne':
          newY = orig.y + dy;
          newWidth = orig.width + dx;
          newHeight = orig.height - dy;
          break;
        case 'e':
          newWidth = orig.width + dx;
          break;
        case 'se':
          newWidth = orig.width + dx;
          newHeight = orig.height + dy;
          break;
        case 's':
          newHeight = orig.height + dy;
          break;
        case 'sw':
          newX = orig.x + dx;
          newWidth = orig.width - dx;
          newHeight = orig.height + dy;
          break;
        case 'w':
          newX = orig.x + dx;
          newWidth = orig.width - dx;
          break;
      }

      setShapes((prev) =>
        prev.map((s) =>
          s.id === selectedElementId
            ? { ...s, x: newX, y: newY, width: newWidth, height: newHeight }
            : s
        )
      );
      return;
    }

    // Handle dragging
    if (isDragging && selectedElementId && selectedElementType === 'shape') {
      const dx = point.x - dragOffset.x;
      const dy = point.y - dragOffset.y;

      setShapes((prev) =>
        prev.map((s) =>
          s.id === selectedElementId ? { ...s, x: s.x + dx, y: s.y + dy } : s
        )
      );
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
    if (isDrawing && currentStrokeId) {
    setCurrentStroke((prev) => [...prev, point]);
    onStrokePoint(currentStrokeId, point);
      return;
    }

    // Check resize handle hover
    if (activeTool === 'select' && selectedElementId && selectedElementType === 'shape') {
      const selectedShape = shapes.find((s) => s.id === selectedElementId);
      if (selectedShape) {
        const handle = hitTestResizeHandle(point, selectedShape, zoom);
        setHoveredResizeHandle(handle);
      }
    } else {
      setHoveredResizeHandle(null);
    }
  }, [isDrawing, isPanning, currentStrokeId, getCanvasPoint, onStrokePoint, onCursorMove, isDragging, selectedElementId, selectedElementType, dragOffset, isDrawingShape, shapeStartPoint, currentShape, activeResizeHandle, resizeStartShape, resizeStartPoint, activeTool, shapes, zoom]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.releasePointerCapture(e.pointerId);

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // End resizing
    if (activeResizeHandle && selectedElementId && selectedElementType === 'shape' && resizeStartShape) {
      const shape = shapes.find((s) => s.id === selectedElementId);
      if (shape) {
        const normalizedShape = normalizeShape(shape);
        setShapes((prev) =>
          prev.map((s) => (s.id === selectedElementId ? normalizedShape : s))
        );
        // Record resize action for undo
        pushAction({
          type: 'shape_resize',
          shapeId: selectedElementId,
          from: resizeStartShape,
          to: normalizedShape,
        });
        onShapeUpdate?.(normalizedShape);
      }
      setActiveResizeHandle(null);
      setResizeStartShape(null);
      setResizeStartPoint(null);
      return;
    }

    // End dragging
    if (isDragging && selectedElementId && selectedElementType === 'shape' && dragStartPosition) {
      const shape = shapes.find((s) => s.id === selectedElementId);
      if (shape && (shape.x !== dragStartPosition.x || shape.y !== dragStartPosition.y)) {
        // Record move action for undo
        pushAction({
          type: 'shape_move',
          shapeId: selectedElementId,
          fromX: dragStartPosition.x,
          fromY: dragStartPosition.y,
          toX: shape.x,
          toY: shape.y,
        });
        onShapeUpdate?.(shape);
      }
      setIsDragging(false);
      setDragStartPosition(null);
      return;
    }

    // End shape drawing
    if (isDrawingShape && currentShape) {
      if (Math.abs(currentShape.width) > 5 || Math.abs(currentShape.height) > 5) {
        const normalizedShape = normalizeShape(currentShape);
        setShapes((prev) => [...prev, normalizedShape]);
        setSelectedElementId(normalizedShape.id);
        setSelectedElementType('shape');
        // Record shape creation for undo
        pushAction({ type: 'shape_create', shape: normalizedShape });
        onShapeCreate?.(normalizedShape);
      }
      setIsDrawingShape(false);
      setShapeStartPoint(null);
      setCurrentShape(null);
      return;
    }

    // End pen drawing
    if (!isDrawing || !currentStrokeId || currentStroke.length === 0) return;

    // Create stroke object for history
    const newStroke: WhiteboardStroke = {
      id: currentStrokeId,
      points: currentStroke,
      color,
      size,
      createdAt: new Date().toISOString(),
      createdBy: '',
      projectId: '',
    };

    // Record stroke for undo
    pushAction({ type: 'stroke_create', stroke: newStroke });

    onStrokeEnd(currentStrokeId, currentStroke, color, size);
    setIsDrawing(false);
    setCurrentStroke([]);
    setCurrentStrokeId(null);
  }, [isDrawing, isPanning, currentStroke, color, size, currentStrokeId, onStrokeEnd, isDragging, isDrawingShape, currentShape, selectedElementId, selectedElementType, shapes, onShapeUpdate, onShapeCreate, activeResizeHandle, resizeStartShape, dragStartPosition, pushAction]);

  const handlePointerLeave = useCallback(() => {
    onCursorLeave();
  }, [onCursorLeave]);

  // Tool handlers
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
    if (tool !== 'select') {
      setSelectedElementId(null);
      setSelectedElementType(null);
    }
  }, [activeTool]);

  const handleClear = useCallback(() => {
    setShapes([]);
    setTexts([]);
    setStickyNotes([]);
    setSelectedElementId(null);
    setSelectedElementType(null);
    setEditingTextId(null);
    setEditingStickyId(null);
    clearHistory();
    onClear();
  }, [onClear, clearHistory]);

  const getCursorStyle = useCallback(() => {
    if (isPanning) return 'grabbing';
    if (activeResizeHandle) return getResizeCursor(activeResizeHandle);
    if (hoveredResizeHandle) return getResizeCursor(hoveredResizeHandle);
    switch (activeTool) {
      case 'select': return 'default';
      case 'text': return 'text';
      case 'sticky': return 'crosshair';
      case 'shapes':
      case 'pen':
      default: return 'crosshair';
    }
  }, [activeTool, isPanning, activeResizeHandle, hoveredResizeHandle]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none bg-white"
        style={{ cursor: getCursorStyle() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />

      {/* Text boxes layer - rendered as DOM elements on top of canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {texts.map((text) => (
          <div key={text.id} className="pointer-events-auto">
            <TextBox
              element={text}
              isSelected={selectedElementId === text.id}
              isEditing={editingTextId === text.id}
              zoom={zoom}
              pan={pan}
              onSelect={() => handleTextSelect(text.id)}
              onStartEdit={() => handleTextStartEdit(text.id)}
              onEndEdit={(content) => handleTextEndEdit(text.id, content)}
              onCancelEdit={handleTextCancelEdit}
              onMove={(x, y) => {
                if (!dragStartPosition) {
                  setDragStartPosition({ x: text.x, y: text.y });
                }
                handleTextMove(text.id, x, y);
              }}
              onMoveEnd={() => handleTextMoveEnd(text.id)}
              onResize={(w, h, fontSize) => handleTextResize(text.id, w, h, fontSize)}
              onResizeEnd={() => handleTextResizeEnd(text.id)}
            />
          </div>
        ))}
      </div>

      {/* Sticky notes layer - rendered as DOM elements on top of canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stickyNotes.map((sticky) => (
          <div key={sticky.id} className="pointer-events-auto">
            <StickyNote
              element={sticky}
              isSelected={selectedElementId === sticky.id}
              isEditing={editingStickyId === sticky.id}
              zoom={zoom}
              pan={pan}
              onSelect={() => handleStickySelect(sticky.id)}
              onStartEdit={() => handleStickyStartEdit(sticky.id)}
              onEndEdit={(content) => handleStickyEndEdit(sticky.id, content)}
              onCancelEdit={handleStickyCancelEdit}
              onMove={(x, y) => {
                if (!dragStartPosition) {
                  setDragStartPosition({ x: sticky.x, y: sticky.y });
                }
                handleStickyMove(sticky.id, x, y);
              }}
              onMoveEnd={() => handleStickyMoveEnd(sticky.id)}
              onResize={(w, h, fontSize) => handleStickyResize(sticky.id, w, h, fontSize)}
              onResizeEnd={() => handleStickyResizeEnd(sticky.id)}
            />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <WhiteboardToolbar
        activeTool={activeTool}
        zoom={zoom}
        sidebarCollapsed={sidebarCollapsed}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolClick={handleToolClick}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onZoomIn={() => setZoom((z) => Math.min(5, z * 1.25))}
        onZoomOut={() => setZoom((z) => Math.max(0.1, z * 0.8))}
        onResetView={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
      />

      {/* Pen Options */}
      {showPenOptions && activeTool === 'pen' && (
        <PenOptionsPopover
          color={color}
          size={size}
          sidebarCollapsed={sidebarCollapsed}
          onColorChange={setColor}
          onSizeChange={setSize}
        />
      )}

      {/* Shape Options */}
      {showShapeOptions && activeTool === 'shapes' && (
        <ShapeOptionsPopover
          selectedShapeType={selectedShapeType}
          color={color}
          size={size}
          shapeFilled={shapeFilled}
          sidebarCollapsed={sidebarCollapsed}
          onShapeTypeChange={setSelectedShapeType}
          onColorChange={setColor}
          onSizeChange={setSize}
          onFilledChange={setShapeFilled}
        />
      )}

      {/* Text Format Toolbar - floating above selected text (also visible while editing) */}
      {selectedElementId && selectedElementType === 'text' && (() => {
        const selectedText = texts.find((t) => t.id === selectedElementId);
        if (!selectedText) return null;
        return (
          <TextFormatToolbar
            element={selectedText}
            zoom={zoom}
            pan={pan}
            onUpdate={(updates) => handleTextFormatUpdate(selectedElementId, updates)}
          />
        );
      })()}

      {/* Sticky Note Format Toolbar - floating above selected sticky note */}
      {selectedElementId && selectedElementType === 'sticky' && (() => {
        const selectedSticky = stickyNotes.find((s) => s.id === selectedElementId);
        if (!selectedSticky) return null;
        return (
          <StickyNoteFormatToolbar
            element={selectedSticky}
            zoom={zoom}
            pan={pan}
            onUpdate={(updates) => handleStickyFormatUpdate(selectedElementId, updates)}
          />
        );
      })()}

      {/* Help text */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
        Two-finger scroll to pan • Pinch to zoom • Ctrl+Z undo • Ctrl+Shift+Z redo
      </div>
    </div>
  );
}
