import { useCallback } from 'react';
import { WhiteboardPoint, WhiteboardStroke } from '@/types';
import {
  ToolType,
  ResizeHandle,
  ShapeElement,
  TextElement,
  StickyNoteElement,
  STICKY_COLORS,
} from '../types';
import { hitTestResizeHandle, hitTestElement, getResizeCursor, normalizeShape } from '../hitTestUtils';
import { HistoryAction } from '../useHistory';

export interface UsePointerHandlersOptions {
  // Refs
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  lastPanPoint: React.MutableRefObject<{ x: number; y: number }>;

  // Canvas state
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;

  // Tool state
  activeTool: ToolType;
  color: string;
  size: number;
  selectedShapeType: string;
  shapeFilled: boolean;
  setShowPenOptions: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShapeOptions: React.Dispatch<React.SetStateAction<boolean>>;

  // Text tool state
  textFontSize: number;
  textFontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center';

  // Drawing state
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  currentStroke: WhiteboardPoint[];
  setCurrentStroke: React.Dispatch<React.SetStateAction<WhiteboardPoint[]>>;
  currentStrokeId: string | null;
  setCurrentStrokeId: React.Dispatch<React.SetStateAction<string | null>>;

  // Shape drawing state
  isDrawingShape: boolean;
  setIsDrawingShape: React.Dispatch<React.SetStateAction<boolean>>;
  shapeStartPoint: WhiteboardPoint | null;
  setShapeStartPoint: React.Dispatch<React.SetStateAction<WhiteboardPoint | null>>;
  currentShape: ShapeElement | null;
  setCurrentShape: React.Dispatch<React.SetStateAction<ShapeElement | null>>;

  // Elements
  shapes: ShapeElement[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeElement[]>>;
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  stickyNotes: StickyNoteElement[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteElement[]>>;

  // Selection state
  selectedElementId: string | null;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedElementType: 'shape' | 'text' | 'sticky' | 'image' | null;
  setSelectedElementType: React.Dispatch<React.SetStateAction<'shape' | 'text' | 'sticky' | 'image' | null>>;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  dragOffset: { x: number; y: number };
  setDragOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  dragStartPosition: { x: number; y: number } | null;
  setDragStartPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;

  // Editing state
  editingTextId: string | null;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setTextBeforeEdit: React.Dispatch<React.SetStateAction<string>>;
  editingStickyId: string | null;
  setEditingStickyId: React.Dispatch<React.SetStateAction<string | null>>;
  setStickyBeforeEdit: React.Dispatch<React.SetStateAction<string>>;

  // Resize state
  activeResizeHandle: ResizeHandle;
  setActiveResizeHandle: React.Dispatch<React.SetStateAction<ResizeHandle>>;
  hoveredResizeHandle: ResizeHandle;
  setHoveredResizeHandle: React.Dispatch<React.SetStateAction<ResizeHandle>>;
  resizeStartShape: ShapeElement | null;
  setResizeStartShape: React.Dispatch<React.SetStateAction<ShapeElement | null>>;
  resizeStartPoint: WhiteboardPoint | null;
  setResizeStartPoint: React.Dispatch<React.SetStateAction<WhiteboardPoint | null>>;

  // Callbacks
  pushAction: (action: HistoryAction) => void;
  onStrokeStart: (strokeId: string, point: WhiteboardPoint, color: string, size: number) => void;
  onStrokePoint: (strokeId: string, point: WhiteboardPoint) => void;
  onStrokeEnd: (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => void;
  onCursorMove: (x: number, y: number) => void;
  onCursorLeave: () => void;
  onShapeCreate?: (shape: ShapeElement) => void;
  onShapeUpdate?: (shape: ShapeElement) => void;
  onTextCreate?: (text: TextElement) => void;
  onStickyCreate?: (sticky: StickyNoteElement) => void;
}

export function usePointerHandlers(options: UsePointerHandlersOptions) {
  const {
    canvasRef,
    lastPanPoint,
    pan,
    setPan,
    zoom,
    isPanning,
    setIsPanning,
    activeTool,
    color,
    size,
    selectedShapeType,
    shapeFilled,
    setShowPenOptions,
    setShowShapeOptions,
    textFontSize,
    textFontWeight,
    textAlign,
    isDrawing,
    setIsDrawing,
    currentStroke,
    setCurrentStroke,
    currentStrokeId,
    setCurrentStrokeId,
    isDrawingShape,
    setIsDrawingShape,
    shapeStartPoint,
    setShapeStartPoint,
    currentShape,
    setCurrentShape,
    shapes,
    setShapes,
    texts,
    setTexts,
    stickyNotes,
    setStickyNotes,
    selectedElementId,
    setSelectedElementId,
    selectedElementType,
    setSelectedElementType,
    isDragging,
    setIsDragging,
    dragOffset,
    setDragOffset,
    setDragStartPosition,
    editingTextId,
    setEditingTextId,
    editingStickyId,
    setEditingStickyId,
    setTextBeforeEdit,
    setStickyBeforeEdit,
    activeResizeHandle,
    setActiveResizeHandle,
    setHoveredResizeHandle,
    resizeStartShape,
    setResizeStartShape,
    resizeStartPoint,
    setResizeStartPoint,
    pushAction,
    onStrokeStart,
    onStrokePoint,
    onStrokeEnd,
    onCursorMove,
    onCursorLeave,
    onShapeCreate,
    onShapeUpdate,
    onTextCreate,
    onStickyCreate,
  } = options;

  const getCanvasPoint = useCallback((e: React.PointerEvent | React.MouseEvent): WhiteboardPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [canvasRef, pan, zoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Close options panels when interacting with canvas
    setShowPenOptions(false);
    setShowShapeOptions(false);

    // If we're editing a text box or sticky note, clicking the canvas should commit + exit edit mode.
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
          type: selectedShapeType as ShapeElement['type'],
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
          color: STICKY_COLORS[0],
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
  }, [activeTool, color, size, getCanvasPoint, onStrokeStart, selectedShapeType, shapeFilled, selectedElementId, selectedElementType, shapes, zoom, editingTextId, editingStickyId, textFontSize, textFontWeight, textAlign, pushAction, onTextCreate, onStickyCreate, canvasRef, lastPanPoint, setShowPenOptions, setShowShapeOptions, setEditingTextId, setEditingStickyId, setIsPanning, setActiveResizeHandle, setResizeStartShape, setResizeStartPoint, setSelectedElementId, setSelectedElementType, setIsDragging, setDragOffset, setDragStartPosition, setIsDrawingShape, setShapeStartPoint, setCurrentShape, setCurrentStrokeId, setIsDrawing, setCurrentStroke, setTexts, setTextBeforeEdit, setStickyNotes, setStickyBeforeEdit]);

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
  }, [isDrawing, isPanning, currentStrokeId, getCanvasPoint, onStrokePoint, onCursorMove, isDragging, selectedElementId, selectedElementType, dragOffset, isDrawingShape, shapeStartPoint, currentShape, activeResizeHandle, resizeStartShape, resizeStartPoint, activeTool, shapes, zoom, canvasRef, lastPanPoint, setPan, setShapes, setDragOffset, setCurrentShape, setCurrentStroke, setHoveredResizeHandle]);

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
    if (isDragging && selectedElementId && selectedElementType === 'shape') {
      const shape = shapes.find((s) => s.id === selectedElementId);
      const dragStart = options.dragStartPosition;
      if (shape && dragStart && (shape.x !== dragStart.x || shape.y !== dragStart.y)) {
        pushAction({
          type: 'shape_move',
          shapeId: selectedElementId,
          fromX: dragStart.x,
          fromY: dragStart.y,
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

    const newStroke: WhiteboardStroke = {
      id: currentStrokeId,
      points: currentStroke,
      color,
      size,
      createdAt: new Date().toISOString(),
      createdBy: '',
      projectId: '',
    };

    pushAction({ type: 'stroke_create', stroke: newStroke });

    onStrokeEnd(currentStrokeId, currentStroke, color, size);
    setIsDrawing(false);
    setCurrentStroke([]);
    setCurrentStrokeId(null);
  }, [isDrawing, isPanning, currentStroke, color, size, currentStrokeId, onStrokeEnd, isDragging, isDrawingShape, currentShape, selectedElementId, selectedElementType, shapes, onShapeUpdate, onShapeCreate, activeResizeHandle, resizeStartShape, pushAction, canvasRef, setIsPanning, setShapes, setActiveResizeHandle, setResizeStartShape, setResizeStartPoint, setIsDragging, setDragStartPosition, setIsDrawingShape, setShapeStartPoint, setCurrentShape, setSelectedElementId, setSelectedElementType, setIsDrawing, setCurrentStroke, setCurrentStrokeId, options.dragStartPosition]);

  const handlePointerLeave = useCallback(() => {
    onCursorLeave();
  }, [onCursorLeave]);

  const getCursorStyle = useCallback(() => {
    if (isPanning) return 'grabbing';
    if (activeResizeHandle) return getResizeCursor(activeResizeHandle);
    if (options.hoveredResizeHandle) return getResizeCursor(options.hoveredResizeHandle);
    switch (activeTool) {
      case 'select': return 'default';
      case 'text': return 'text';
      case 'sticky': return 'crosshair';
      case 'shapes':
      case 'pen':
      default: return 'crosshair';
    }
  }, [activeTool, isPanning, activeResizeHandle, options.hoveredResizeHandle]);

  return {
    getCanvasPoint,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    getCursorStyle,
  };
}
