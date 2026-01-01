'use client';

import { useEffect, useCallback } from 'react';
import { WhiteboardStroke, WhiteboardPoint } from '@/types';
import {
  ToolType,
  ShapeElement,
  TextElement,
  StickyNoteElement,
  RemoteStroke,
  RemoteCursor,
} from './whiteboard/types';
import { useHistory } from './whiteboard/useHistory';
import { WhiteboardToolbar } from './whiteboard/WhiteboardToolbar';
import { PenOptionsPopover } from './whiteboard/PenOptionsPopover';
import { ShapeOptionsPopover } from './whiteboard/ShapeOptionsPopover';
import { TextBox } from './whiteboard/TextBox';
import { TextFormatToolbar } from './whiteboard/TextFormatToolbar';
import { StickyNote } from './whiteboard/StickyNote';
import { StickyNoteFormatToolbar } from './whiteboard/StickyNoteFormatToolbar';
import {
  useWhiteboardState,
  useHistoryActions,
  useTextHandlers,
  useStickyHandlers,
  usePointerHandlers,
  useCanvasResize,
  useCanvasRendering,
  useZoomPan,
  useKeyboardShortcuts,
} from './whiteboard/hooks';

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
  // Centralized state management
  const state = useWhiteboardState({
    initialShapes,
    initialTexts,
    initialStickyNotes,
  });

  const {
    refs: { canvasRef, containerRef, lastPanPoint, initializedRef, textInitializedRef, stickyInitializedRef },
    canvas: { canvasSize, setCanvasSize, pan, setPan, zoom, setZoom, isPanning, setIsPanning },
    tools: { activeTool, setActiveTool, showPenOptions, setShowPenOptions, showShapeOptions, setShowShapeOptions, color, setColor, size, setSize, selectedShapeType, setSelectedShapeType, shapeFilled, setShapeFilled },
    textTool: { textFontSize, textFontWeight, textAlign },
    drawing: { isDrawing, setIsDrawing, currentStroke, setCurrentStroke, currentStrokeId, setCurrentStrokeId },
    shapeDrawing: { isDrawingShape, setIsDrawingShape, shapeStartPoint, setShapeStartPoint, currentShape, setCurrentShape },
    elements: { shapes, setShapes, texts, setTexts, stickyNotes, setStickyNotes },
    selection: { selectedElementId, setSelectedElementId, selectedElementType, setSelectedElementType, isDragging, setIsDragging, dragOffset, setDragOffset, dragStartPosition, setDragStartPosition },
    textEditing: { editingTextId, setEditingTextId, textBeforeEdit, setTextBeforeEdit },
    stickyEditing: { editingStickyId, setEditingStickyId, stickyBeforeEdit, setStickyBeforeEdit },
    resize: { activeResizeHandle, setActiveResizeHandle, hoveredResizeHandle, setHoveredResizeHandle, resizeStartShape, setResizeStartShape, resizeStartPoint, setResizeStartPoint },
  } = state;

  // History for undo/redo
  const { canUndo, canRedo, pushAction, undo, redo, clear: clearHistory } = useHistory();

  // History actions (undo/redo logic)
  const { handleUndo, handleRedo } = useHistoryActions({
    callbacks: {
      onStrokeUndo,
      onStrokeRedo,
      onShapeCreate,
      onShapeUpdate,
      onShapeDelete,
      onTextCreate,
      onTextUpdate,
      onTextDelete,
      onStickyCreate,
      onStickyUpdate,
      onStickyDelete,
    },
    state: { shapes, texts, stickyNotes, setShapes, setTexts, setStickyNotes },
    undo,
    redo,
  });

  // Text handlers
  const {
    handleTextSelect,
    handleTextStartEdit,
    handleTextEndEdit,
    handleTextCancelEdit,
    handleTextMove,
    handleTextMoveEnd,
    handleTextResize,
    handleTextResizeEnd,
    handleTextFormatUpdate,
  } = useTextHandlers({
    texts,
    setTexts,
    dragStartPosition,
    setDragStartPosition,
    textBeforeEdit,
    setTextBeforeEdit,
    editingTextId,
    setEditingTextId,
    setSelectedElementId,
    setSelectedElementType,
    pushAction,
    onTextUpdate,
  });

  // Sticky handlers
  const {
    handleStickySelect,
    handleStickyStartEdit,
    handleStickyEndEdit,
    handleStickyCancelEdit,
    handleStickyMove,
    handleStickyMoveEnd,
    handleStickyResize,
    handleStickyResizeEnd,
    handleStickyFormatUpdate,
  } = useStickyHandlers({
    stickyNotes,
    setStickyNotes,
    dragStartPosition,
    setDragStartPosition,
    stickyBeforeEdit,
    setStickyBeforeEdit,
    setEditingStickyId,
    setSelectedElementId,
    setSelectedElementType,
    pushAction,
    onStickyUpdate,
  });

  // Pointer handlers
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    getCursorStyle,
  } = usePointerHandlers({
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
    dragStartPosition,
    setDragStartPosition,
    editingTextId,
    setEditingTextId,
    setTextBeforeEdit,
    editingStickyId,
    setEditingStickyId,
    setStickyBeforeEdit,
    activeResizeHandle,
    setActiveResizeHandle,
    hoveredResizeHandle,
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
  });

  // Canvas setup hooks
  useCanvasResize({ canvasRef, containerRef, setCanvasSize });
  useZoomPan({ canvasRef, containerRef, setZoom, setPan });
  useCanvasRendering({
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
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    editingTextId,
    editingStickyId,
    selectedElementId,
    selectedElementType,
    shapes,
    texts,
    stickyNotes,
    setShapes,
    setTexts,
    setStickyNotes,
    setSelectedElementId,
    setSelectedElementType,
    pushAction,
    handleUndo,
    handleRedo,
    onShapeDelete,
    onTextDelete,
    onStickyDelete,
  });

  // Initialize shapes from props
  useEffect(() => {
    if (!initializedRef.current && initialShapes.length > 0) {
      setShapes(initialShapes);
      initializedRef.current = true;
    }
  }, [initialShapes, initializedRef, setShapes]);

  // Initialize texts from props
  useEffect(() => {
    if (!textInitializedRef.current && initialTexts.length > 0) {
      setTexts(initialTexts);
      textInitializedRef.current = true;
    }
  }, [initialTexts, textInitializedRef, setTexts]);

  // Initialize sticky notes from props
  useEffect(() => {
    if (!stickyInitializedRef.current && initialStickyNotes.length > 0) {
      setStickyNotes(initialStickyNotes);
      stickyInitializedRef.current = true;
    }
  }, [initialStickyNotes, stickyInitializedRef, setStickyNotes]);

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
  }, [activeTool, setActiveTool, setShowPenOptions, setShowShapeOptions, setSelectedElementId, setSelectedElementType]);

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
  }, [onClear, clearHistory, setShapes, setTexts, setStickyNotes, setSelectedElementId, setSelectedElementType, setEditingTextId, setEditingStickyId]);

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

      {/* Text boxes layer */}
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

      {/* Sticky notes layer */}
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

      {/* Text Format Toolbar */}
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

      {/* Sticky Note Format Toolbar */}
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
