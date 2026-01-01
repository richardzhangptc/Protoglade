import { useRef, useState } from 'react';
import { WhiteboardPoint, WhiteboardShapeType } from '@/types';
import {
  ToolType,
  ResizeHandle,
  ShapeElement,
  TextElement,
  StickyNoteElement,
} from '../types';

export interface WhiteboardStateOptions {
  initialShapes?: ShapeElement[];
  initialTexts?: TextElement[];
  initialStickyNotes?: StickyNoteElement[];
}

export function useWhiteboardState(options: WhiteboardStateOptions = {}) {
  const {
    initialShapes = [],
    initialTexts = [],
    initialStickyNotes = [],
  } = options;

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

  return {
    // Refs
    refs: {
      canvasRef,
      containerRef,
      lastPanPoint,
      initializedRef,
      textInitializedRef,
      stickyInitializedRef,
    },

    // Canvas state
    canvas: {
      canvasSize,
      setCanvasSize,
      pan,
      setPan,
      zoom,
      setZoom,
      isPanning,
      setIsPanning,
    },

    // Tool state
    tools: {
      activeTool,
      setActiveTool,
      showPenOptions,
      setShowPenOptions,
      showShapeOptions,
      setShowShapeOptions,
      color,
      setColor,
      size,
      setSize,
      selectedShapeType,
      setSelectedShapeType,
      shapeFilled,
      setShapeFilled,
    },

    // Text tool state
    textTool: {
      textFontSize,
      setTextFontSize,
      textFontWeight,
      setTextFontWeight,
      textAlign,
      setTextAlign,
    },

    // Drawing state
    drawing: {
      isDrawing,
      setIsDrawing,
      currentStroke,
      setCurrentStroke,
      currentStrokeId,
      setCurrentStrokeId,
    },

    // Shape drawing state
    shapeDrawing: {
      isDrawingShape,
      setIsDrawingShape,
      shapeStartPoint,
      setShapeStartPoint,
      currentShape,
      setCurrentShape,
    },

    // Elements
    elements: {
      shapes,
      setShapes,
      texts,
      setTexts,
      stickyNotes,
      setStickyNotes,
    },

    // Selection state
    selection: {
      selectedElementId,
      setSelectedElementId,
      selectedElementType,
      setSelectedElementType,
      isDragging,
      setIsDragging,
      dragOffset,
      setDragOffset,
      dragStartPosition,
      setDragStartPosition,
    },

    // Text editing state
    textEditing: {
      editingTextId,
      setEditingTextId,
      textBeforeEdit,
      setTextBeforeEdit,
    },

    // Sticky editing state
    stickyEditing: {
      editingStickyId,
      setEditingStickyId,
      stickyBeforeEdit,
      setStickyBeforeEdit,
    },

    // Resize state
    resize: {
      activeResizeHandle,
      setActiveResizeHandle,
      hoveredResizeHandle,
      setHoveredResizeHandle,
      resizeStartShape,
      setResizeStartShape,
      resizeStartPoint,
      setResizeStartPoint,
    },
  };
}

export type WhiteboardState = ReturnType<typeof useWhiteboardState>;
