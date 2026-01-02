import { useCallback } from 'react';
import {
  WhiteboardStroke,
  WhiteboardPoint,
  WhiteboardShapeType,
} from '@/types';
import { api } from '@/lib/api';
import { RemoteStroke } from './useWhiteboardPageState';

export interface UseWhiteboardOperationsOptions {
  selectedProjectId: string | null;
  userId: string | undefined;
  strokes: WhiteboardStroke[];
  setStrokes: React.Dispatch<React.SetStateAction<WhiteboardStroke[]>>;
  setShapes: React.Dispatch<React.SetStateAction<any[]>>;
  setTexts: React.Dispatch<React.SetStateAction<any[]>>;
  setStickyNotes: React.Dispatch<React.SetStateAction<any[]>>;
  setImages: React.Dispatch<React.SetStateAction<any[]>>;
  setRemoteStrokes: React.Dispatch<React.SetStateAction<Map<string, RemoteStroke>>>;
  emitStrokeStart: (strokeId: string, point: WhiteboardPoint, color: string, size: number) => void;
  emitStrokePoint: (strokeId: string, point: WhiteboardPoint) => void;
  emitStrokeEnd: (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => void;
  emitStrokeUndo: (strokeId: string) => void;
  emitCanvasClear: () => void;
  emitCursorMove: (cursor: { x: number; y: number; isDragging: boolean; dragTaskId: string | null; dragTaskTitle: string | null }) => void;
}

export function useWhiteboardOperations({
  selectedProjectId,
  userId,
  setStrokes,
  setShapes,
  setTexts,
  setStickyNotes,
  setImages,
  setRemoteStrokes,
  emitStrokeStart,
  emitStrokePoint,
  emitStrokeEnd,
  emitStrokeUndo,
  emitCanvasClear,
  emitCursorMove,
}: UseWhiteboardOperationsOptions) {
  const handleStrokeStart = useCallback((strokeId: string, point: WhiteboardPoint, color: string, size: number) => {
    emitStrokeStart(strokeId, point, color, size);
  }, [emitStrokeStart]);

  const handleStrokePoint = useCallback((strokeId: string, point: WhiteboardPoint) => {
    emitStrokePoint(strokeId, point);
  }, [emitStrokePoint]);

  const handleStrokeEnd = useCallback(async (strokeId: string, points: WhiteboardPoint[], color: string, size: number) => {
    if (!selectedProjectId) return;

    // Add stroke to local state immediately
    const newStroke: WhiteboardStroke = {
      id: strokeId,
      points,
      color,
      size,
      createdAt: new Date().toISOString(),
      createdBy: userId || '',
      projectId: selectedProjectId,
    };
    setStrokes((prev) => [...prev, newStroke]);

    // Emit to other users
    emitStrokeEnd(strokeId, points, color, size);

    // Save to database
    try {
      await api.createWhiteboardStroke(selectedProjectId, { points, color, size });
    } catch (error) {
      console.error('Failed to save stroke:', error);
    }
  }, [selectedProjectId, userId, setStrokes, emitStrokeEnd]);

  const handleStrokeUndo = useCallback(async (strokeId: string) => {
    if (!selectedProjectId) return;

    setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    emitStrokeUndo(strokeId);

    try {
      await api.deleteWhiteboardStroke(strokeId);
    } catch (error) {
      console.error('Failed to undo stroke:', error);
    }
  }, [selectedProjectId, setStrokes, emitStrokeUndo]);

  const handleStrokeRedo = useCallback(async (stroke: WhiteboardStroke) => {
    if (!selectedProjectId) return;

    // Add stroke back to local state
    setStrokes((prev) => [...prev, stroke]);

    // Emit to other users
    emitStrokeEnd(stroke.id, stroke.points, stroke.color, stroke.size);

    // Save to database
    try {
      await api.createWhiteboardStroke(selectedProjectId, {
        points: stroke.points,
        color: stroke.color,
        size: stroke.size,
      });
    } catch (error) {
      console.error('Failed to redo stroke:', error);
    }
  }, [selectedProjectId, setStrokes, emitStrokeEnd]);

  const handleWhiteboardClear = useCallback(async () => {
    if (!selectedProjectId) return;

    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setStickyNotes([]);
    setImages([]);
    setRemoteStrokes(new Map());
    emitCanvasClear();

    try {
      await api.clearWhiteboardCanvas(selectedProjectId);
    } catch (error) {
      console.error('Failed to clear canvas:', error);
    }
  }, [selectedProjectId, setStrokes, setShapes, setTexts, setStickyNotes, setImages, setRemoteStrokes, emitCanvasClear]);

  // Shape handlers
  const handleShapeCreate = useCallback(async (shape: { id: string; type: WhiteboardShapeType; x: number; y: number; width: number; height: number; color: string; strokeWidth: number; filled: boolean }) => {
    if (!selectedProjectId) return;
    try {
      await api.createWhiteboardShape(selectedProjectId, {
        type: shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        color: shape.color,
        strokeWidth: shape.strokeWidth,
        filled: shape.filled,
      });
    } catch (error) {
      console.error('Failed to create shape:', error);
    }
  }, [selectedProjectId]);

  const handleShapeUpdate = useCallback(async (shape: { id: string; x: number; y: number; width: number; height: number; color: string; strokeWidth: number; filled: boolean }) => {
    try {
      await api.updateWhiteboardShape(shape.id, {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        color: shape.color,
        strokeWidth: shape.strokeWidth,
        filled: shape.filled,
      });
    } catch (error) {
      console.error('Failed to update shape:', error);
    }
  }, []);

  const handleShapeDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardShape(id);
    } catch (error) {
      console.error('Failed to delete shape:', error);
    }
  }, []);

  // Text handlers
  const handleTextCreate = useCallback(async (text: { id: string; x: number; y: number; width: number; height: number; content: string; fontSize: number; fontWeight: 'normal' | 'bold'; color: string; align: 'left' | 'center' | 'right' }) => {
    if (!selectedProjectId) return;
    try {
      await api.createWhiteboardText(selectedProjectId, {
        id: text.id,
        x: text.x,
        y: text.y,
        width: text.width,
        height: text.height,
        content: text.content,
        fontSize: text.fontSize,
        fontWeight: text.fontWeight,
        color: text.color,
        align: text.align,
      });
    } catch (error) {
      console.error('Failed to create text:', error);
    }
  }, [selectedProjectId]);

  const handleTextUpdate = useCallback(async (text: { id: string; x: number; y: number; width: number; height: number; content: string; fontSize: number; fontWeight: 'normal' | 'bold'; color: string; align: 'left' | 'center' | 'right' }) => {
    try {
      await api.updateWhiteboardText(text.id, {
        x: text.x,
        y: text.y,
        width: text.width,
        height: text.height,
        content: text.content,
        fontSize: text.fontSize,
        fontWeight: text.fontWeight,
        color: text.color,
        align: text.align,
      });
    } catch (error) {
      console.error('Failed to update text:', error);
    }
  }, []);

  const handleTextDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardText(id);
    } catch (error) {
      console.error('Failed to delete text:', error);
    }
  }, []);

  // Sticky Note handlers
  const handleStickyCreate = useCallback(async (sticky: { id: string; x: number; y: number; width: number; height: number; content: string; color: string; fontSize?: number }) => {
    if (!selectedProjectId) return;
    try {
      await api.createWhiteboardStickyNote(selectedProjectId, sticky);
    } catch (error) {
      console.error('Failed to create sticky note:', error);
    }
  }, [selectedProjectId]);

  const handleStickyUpdate = useCallback(async (sticky: { id: string; x: number; y: number; width: number; height: number; content: string; color: string; fontSize?: number }) => {
    try {
      await api.updateWhiteboardStickyNote(sticky.id, {
        x: sticky.x,
        y: sticky.y,
        width: sticky.width,
        height: sticky.height,
        content: sticky.content,
        color: sticky.color,
        ...(sticky.fontSize !== undefined && { fontSize: sticky.fontSize }),
      });
    } catch (error) {
      console.error('Failed to update sticky note:', error);
    }
  }, []);

  const handleStickyDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardStickyNote(id);
    } catch (error) {
      console.error('Failed to delete sticky note:', error);
    }
  }, []);

  // Image handlers
  const handleImageUpdate = useCallback(async (image: { id: string; x: number; y: number; width: number; height: number }) => {
    try {
      await api.updateWhiteboardImage(image.id, {
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
      });
    } catch (error) {
      console.error('Failed to update image:', error);
    }
  }, []);

  const handleImageDelete = useCallback(async (id: string) => {
    try {
      await api.deleteWhiteboardImage(id);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }, []);

  const handleWhiteboardCursorMove = useCallback((x: number, y: number) => {
    emitCursorMove({ x, y, isDragging: false, dragTaskId: null, dragTaskTitle: null });
  }, [emitCursorMove]);

  return {
    handleStrokeStart,
    handleStrokePoint,
    handleStrokeEnd,
    handleStrokeUndo,
    handleStrokeRedo,
    handleWhiteboardClear,
    handleShapeCreate,
    handleShapeUpdate,
    handleShapeDelete,
    handleTextCreate,
    handleTextUpdate,
    handleTextDelete,
    handleStickyCreate,
    handleStickyUpdate,
    handleStickyDelete,
    handleImageUpdate,
    handleImageDelete,
    handleWhiteboardCursorMove,
  };
}
