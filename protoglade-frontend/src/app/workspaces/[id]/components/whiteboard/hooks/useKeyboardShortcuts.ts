import { useEffect } from 'react';
import { ShapeElement, TextElement, StickyNoteElement } from '../types';
import { HistoryAction } from '../useHistory';

export interface UseKeyboardShortcutsOptions {
  editingTextId: string | null;
  editingStickyId: string | null;
  selectedElementId: string | null;
  selectedElementType: 'shape' | 'text' | 'sticky' | null;
  shapes: ShapeElement[];
  texts: TextElement[];
  stickyNotes: StickyNoteElement[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeElement[]>>;
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteElement[]>>;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElementType: React.Dispatch<React.SetStateAction<'shape' | 'text' | 'sticky' | null>>;
  pushAction: (action: HistoryAction) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  onShapeDelete?: (id: string) => void;
  onTextDelete?: (id: string) => void;
  onStickyDelete?: (id: string) => void;
}

export function useKeyboardShortcuts({
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
}: UseKeyboardShortcutsOptions) {
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
  }, [
    selectedElementId,
    selectedElementType,
    onShapeDelete,
    onTextDelete,
    onStickyDelete,
    shapes,
    texts,
    stickyNotes,
    handleUndo,
    handleRedo,
    pushAction,
    editingTextId,
    editingStickyId,
    setShapes,
    setTexts,
    setStickyNotes,
    setSelectedElementId,
    setSelectedElementType,
  ]);
}
