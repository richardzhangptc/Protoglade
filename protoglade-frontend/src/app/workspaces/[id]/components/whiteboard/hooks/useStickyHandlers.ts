import { useCallback } from 'react';
import { StickyNoteElement } from '../types';
import { HistoryAction } from '../useHistory';

export interface UseStickyHandlersOptions {
  stickyNotes: StickyNoteElement[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteElement[]>>;
  dragStartPosition: { x: number; y: number } | null;
  setDragStartPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  stickyBeforeEdit: string;
  setStickyBeforeEdit: React.Dispatch<React.SetStateAction<string>>;
  setEditingStickyId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElementType: React.Dispatch<React.SetStateAction<'shape' | 'text' | 'sticky' | null>>;
  pushAction: (action: HistoryAction) => void;
  onStickyUpdate?: (sticky: StickyNoteElement) => void;
}

export function useStickyHandlers({
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
}: UseStickyHandlersOptions) {
  const handleStickySelect = useCallback((stickyId: string) => {
    setSelectedElementId(stickyId);
    setSelectedElementType('sticky');
    setEditingStickyId(null);
  }, [setSelectedElementId, setSelectedElementType, setEditingStickyId]);

  const handleStickyStartEdit = useCallback((stickyId: string) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky) {
      setStickyBeforeEdit(sticky.content);
      setEditingStickyId(stickyId);
    }
  }, [stickyNotes, setStickyBeforeEdit, setEditingStickyId]);

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
  }, [stickyBeforeEdit, pushAction, onStickyUpdate, stickyNotes, setStickyNotes, setEditingStickyId]);

  const handleStickyCancelEdit = useCallback(() => {
    setEditingStickyId(null);
  }, [setEditingStickyId]);

  const handleStickyMove = useCallback((stickyId: string, x: number, y: number) => {
    setStickyNotes((prev) =>
      prev.map((s) => (s.id === stickyId ? { ...s, x, y } : s))
    );
  }, [setStickyNotes]);

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
  }, [stickyNotes, dragStartPosition, pushAction, onStickyUpdate, setDragStartPosition]);

  const handleStickyResize = useCallback((stickyId: string, width: number, height: number, fontSize?: number) => {
    setStickyNotes((prev) =>
      prev.map((s) => (s.id === stickyId ? { ...s, width, height, ...(fontSize !== undefined && { fontSize }) } : s))
    );
  }, [setStickyNotes]);

  const handleStickyResizeEnd = useCallback((stickyId: string) => {
    const sticky = stickyNotes.find((s) => s.id === stickyId);
    if (sticky) {
      onStickyUpdate?.(sticky);
    }
  }, [stickyNotes, onStickyUpdate]);

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
  }, [stickyNotes, pushAction, onStickyUpdate, setStickyNotes]);

  return {
    handleStickySelect,
    handleStickyStartEdit,
    handleStickyEndEdit,
    handleStickyCancelEdit,
    handleStickyMove,
    handleStickyMoveEnd,
    handleStickyResize,
    handleStickyResizeEnd,
    handleStickyFormatUpdate,
  };
}
