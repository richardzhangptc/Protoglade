'use client';

import { useEffect, useCallback, useState } from 'react';
import { WhiteboardStroke, WhiteboardPoint } from '@/types';
import {
  ToolType,
  ShapeElement,
  TextElement,
  StickyNoteElement,
  ImageElement,
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
import { WhiteboardImage } from './whiteboard/WhiteboardImage';
import { validateImageFile, getImageDimensions } from './whiteboard/imageUpload';
import { api } from '@/lib/api';
import {
  useWhiteboardState,
  useHistoryActions,
  useTextHandlers,
  useStickyHandlers,
  useImageHandlers,
  useImageDropHandler,
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
  initialStickyNotes?: StickyNoteElement[];
  initialImages?: ImageElement[];
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
  onStickyCreate?: (sticky: StickyNoteElement) => void;
  onStickyUpdate?: (sticky: StickyNoteElement) => void;
  onStickyDelete?: (id: string) => void;
  onImageUpdate?: (image: ImageElement) => void;
  onImageDelete?: (id: string) => void;
}

export function Whiteboard({
  projectId,
  strokes,
  remoteStrokes,
  remoteCursors,
  sidebarCollapsed,
  initialShapes = [],
  initialTexts = [],
  initialStickyNotes = [],
  initialImages = [],
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
  onImageUpdate,
  onImageDelete,
}: WhiteboardProps) {
  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Centralized state management
  const state = useWhiteboardState({
    initialShapes,
    initialTexts,
    initialStickyNotes,
    initialImages,
  });

  const {
    refs: { canvasRef, containerRef, lastPanPoint, initializedRef, textInitializedRef, stickyInitializedRef, imageInitializedRef },
    canvas: { canvasSize, setCanvasSize, pan, setPan, zoom, setZoom, isPanning, setIsPanning },
    tools: { activeTool, setActiveTool, showPenOptions, setShowPenOptions, showShapeOptions, setShowShapeOptions, color, setColor, size, setSize, selectedShapeType, setSelectedShapeType, shapeFilled, setShapeFilled },
    textTool: { textFontSize, textFontWeight, textAlign },
    drawing: { isDrawing, setIsDrawing, currentStroke, setCurrentStroke, currentStrokeId, setCurrentStrokeId },
    shapeDrawing: { isDrawingShape, setIsDrawingShape, shapeStartPoint, setShapeStartPoint, currentShape, setCurrentShape },
    elements: { shapes, setShapes, texts, setTexts, stickyNotes, setStickyNotes, images, setImages },
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
      onImageCreate: undefined, // Images are created via upload, not redo
      onImageUpdate,
      onImageDelete,
    },
    state: { shapes, texts, stickyNotes, images, setShapes, setTexts, setStickyNotes, setImages },
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

  // Image handlers
  const {
    handleImageSelect,
    handleImageMove,
    handleImageMoveEnd,
    handleImageResize,
    handleImageResizeEnd,
    handleImageDelete: handleImageDeleteLocal,
    handleImageAdd,
  } = useImageHandlers({
    images,
    setImages,
    selectedElementId,
    selectedElementType,
    setSelectedElementId,
    setSelectedElementType,
    onImageUpdate,
    onImageDelete,
    pushHistory: (action) => {
      // Map to the history action format
      if (action.type === 'addImage') {
        pushAction({ type: 'image_create', image: (action.data as { image: ImageElement }).image });
      } else if (action.type === 'updateImage') {
        const { before, after } = action.data as { before: ImageElement; after: ImageElement };
        if (before.x !== after.x || before.y !== after.y) {
          pushAction({ type: 'image_move', imageId: after.id, fromX: before.x, fromY: before.y, toX: after.x, toY: after.y });
        } else {
          pushAction({ type: 'image_resize', imageId: after.id, from: before, to: after });
        }
      } else if (action.type === 'deleteImage') {
        pushAction({ type: 'image_delete', image: (action.data as { image: ImageElement }).image });
      }
    },
  });

  // Image drop handler for drag-and-drop uploads
  const { isDragOver, isUploading: isDropUploading, uploadError } = useImageDropHandler({
    projectId,
    containerRef,
    zoom,
    pan,
    shapes,
    texts,
    stickyNotes,
    images,
    onImageAdd: handleImageAdd,
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
    images,
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
    images,
    setShapes,
    setTexts,
    setStickyNotes,
    setImages,
    setSelectedElementId,
    setSelectedElementType,
    pushAction,
    handleUndo,
    handleRedo,
    onShapeDelete,
    onTextDelete,
    onStickyDelete,
    onImageDelete,
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

  // Initialize images from props
  useEffect(() => {
    if (!imageInitializedRef.current && initialImages.length > 0) {
      setImages(initialImages);
      imageInitializedRef.current = true;
    }
  }, [initialImages, imageInitializedRef, setImages]);

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
    setImages([]);
    setSelectedElementId(null);
    setSelectedElementType(null);
    setEditingTextId(null);
    setEditingStickyId(null);
    clearHistory();
    onClear();
  }, [onClear, clearHistory, setShapes, setTexts, setStickyNotes, setImages, setSelectedElementId, setSelectedElementType, setEditingTextId, setEditingStickyId]);

  // Handle image upload from toolbar
  const handleImageUpload = useCallback(async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      console.error('Invalid file:', validation.error);
      return;
    }

    try {
      setIsUploadingImage(true);

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Scale down if too large (max 400px on longest side for initial placement)
      const maxSize = 400;
      let width = dimensions.width;
      let height = dimensions.height;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = width * scale;
        height = height * scale;
      }

      // Place at center of viewport
      const centerX = (-pan.x + (containerRef.current?.clientWidth || 800) / 2) / zoom - width / 2;
      const centerY = (-pan.y + (containerRef.current?.clientHeight || 600) / 2) / zoom - height / 2;

      // Generate a temporary ID
      const tempId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Compute the next zIndex across all element types
      const allZIndices = [
        ...shapes.map((s) => s.zIndex),
        ...texts.map((t) => t.zIndex),
        ...stickyNotes.map((s) => s.zIndex),
        ...images.map((i) => i.zIndex),
      ];
      const zIndex = allZIndices.length > 0 ? Math.max(...allZIndices) + 1 : 0;

      // Upload the image
      const uploadedImage = await api.uploadWhiteboardImage(projectId, file, {
        id: tempId,
        x: centerX,
        y: centerY,
        width,
        height,
        zIndex,
      });

      // Add to canvas
      handleImageAdd({
        id: uploadedImage.id,
        url: uploadedImage.url,
        s3Key: uploadedImage.s3Key,
        x: uploadedImage.x,
        y: uploadedImage.y,
        width: uploadedImage.width,
        height: uploadedImage.height,
        zIndex: uploadedImage.zIndex,
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  }, [projectId, pan, zoom, containerRef, shapes, texts, stickyNotes, images, handleImageAdd]);

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

      {/* All elements layer - sorted by zIndex */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          ...texts.map((text) => ({ type: 'text' as const, element: text, zIndex: text.zIndex })),
          ...stickyNotes.map((sticky) => ({ type: 'sticky' as const, element: sticky, zIndex: sticky.zIndex })),
          ...images.map((image) => ({ type: 'image' as const, element: image, zIndex: image.zIndex })),
        ]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((item) => {
            if (item.type === 'text') {
              const text = item.element;
              return (
                <div key={text.id} className="pointer-events-auto" style={{ zIndex: text.zIndex }}>
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
              );
            } else if (item.type === 'sticky') {
              const sticky = item.element;
              return (
                <div key={sticky.id} className="pointer-events-auto" style={{ zIndex: sticky.zIndex }}>
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
              );
            } else {
              const image = item.element;
              return (
                <div key={image.id} className="pointer-events-auto" style={{ zIndex: image.zIndex }}>
                  <WhiteboardImage
                    element={image}
                    isSelected={selectedElementId === image.id}
                    zoom={zoom}
                    pan={pan}
                    onSelect={() => handleImageSelect(image.id)}
                    onMove={(x, y) => handleImageMove(image.id, x, y)}
                    onMoveEnd={handleImageMoveEnd}
                    onResize={(w, h) => handleImageResize(image.id, w, h)}
                    onResizeEnd={handleImageResizeEnd}
                  />
                </div>
              );
            }
          })}
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none flex items-center justify-center z-50">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg text-blue-600 font-medium">
            Drop image here
          </div>
        </div>
      )}

      {/* Upload error toast */}
      {uploadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {uploadError}
        </div>
      )}

      {/* Toolbar */}
      <WhiteboardToolbar
        activeTool={activeTool}
        zoom={zoom}
        sidebarCollapsed={sidebarCollapsed}
        canUndo={canUndo}
        canRedo={canRedo}
        isUploadingImage={isUploadingImage || isDropUploading}
        onToolClick={handleToolClick}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onZoomIn={() => setZoom((z) => Math.min(5, z * 1.25))}
        onZoomOut={() => setZoom((z) => Math.max(0.1, z * 0.8))}
        onResetView={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
        onImageUpload={handleImageUpload}
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
