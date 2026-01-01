import { useCallback } from 'react';
import { WhiteboardStroke } from '@/types';
import { ShapeElement, TextElement, StickyNoteElement } from '../types';
import { HistoryAction } from '../useHistory';

export interface HistoryActionsCallbacks {
  onStrokeUndo: (strokeId: string) => void;
  onStrokeRedo: (stroke: WhiteboardStroke) => void;
  onShapeCreate?: (shape: ShapeElement) => void;
  onShapeUpdate?: (shape: ShapeElement) => void;
  onShapeDelete?: (id: string) => void;
  onTextCreate?: (text: TextElement) => void;
  onTextUpdate?: (text: TextElement) => void;
  onTextDelete?: (id: string) => void;
  onStickyCreate?: (sticky: StickyNoteElement) => void;
  onStickyUpdate?: (sticky: StickyNoteElement) => void;
  onStickyDelete?: (id: string) => void;
}

export interface HistoryActionsState {
  shapes: ShapeElement[];
  texts: TextElement[];
  stickyNotes: StickyNoteElement[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeElement[]>>;
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteElement[]>>;
}

export interface UseHistoryActionsOptions {
  callbacks: HistoryActionsCallbacks;
  state: HistoryActionsState;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
}

export function useHistoryActions({
  callbacks,
  state,
  undo,
  redo,
}: UseHistoryActionsOptions) {
  const {
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
  } = callbacks;

  const { shapes, texts, stickyNotes, setShapes, setTexts, setStickyNotes } = state;

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
  }, [onStrokeUndo, onShapeDelete, onShapeCreate, onShapeUpdate, shapes, onTextDelete, onTextCreate, onTextUpdate, texts, onStickyDelete, onStickyCreate, onStickyUpdate, stickyNotes, setShapes, setTexts, setStickyNotes]);

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
  }, [onStrokeRedo, onShapeCreate, onShapeDelete, onShapeUpdate, shapes, onTextCreate, onTextDelete, onTextUpdate, texts, onStickyCreate, onStickyDelete, onStickyUpdate, stickyNotes, setShapes, setTexts, setStickyNotes]);

  const handleUndo = useCallback(() => {
    const action = undo();
    if (action) {
      applyUndo(action);
    }
  }, [undo, applyUndo]);

  const handleRedo = useCallback(() => {
    const action = redo();
    if (action) {
      applyRedo(action);
    }
  }, [redo, applyRedo]);

  return {
    applyUndo,
    applyRedo,
    handleUndo,
    handleRedo,
  };
}
