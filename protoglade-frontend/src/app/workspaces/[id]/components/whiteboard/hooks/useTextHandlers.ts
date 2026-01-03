import { useCallback } from 'react';
import { TextElement } from '../types';
import { HistoryAction } from '../useHistory';

export interface UseTextHandlersOptions {
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  dragStartPosition: { x: number; y: number } | null;
  setDragStartPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  textBeforeEdit: string;
  setTextBeforeEdit: React.Dispatch<React.SetStateAction<string>>;
  editingTextId: string | null;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedElementType: React.Dispatch<React.SetStateAction<'shape' | 'text' | 'sticky' | 'image' | 'stroke' | null>>;
  pushAction: (action: HistoryAction) => void;
  onTextUpdate?: (text: TextElement) => void;
}

export function useTextHandlers({
  texts,
  setTexts,
  dragStartPosition,
  setDragStartPosition,
  textBeforeEdit,
  setTextBeforeEdit,
  setEditingTextId,
  setSelectedElementId,
  setSelectedElementType,
  pushAction,
  onTextUpdate,
}: UseTextHandlersOptions) {
  const handleTextSelect = useCallback((textId: string) => {
    setSelectedElementId(textId);
    setSelectedElementType('text');
    setEditingTextId(null);
  }, [setSelectedElementId, setSelectedElementType, setEditingTextId]);

  const handleTextStartEdit = useCallback((textId: string) => {
    const text = texts.find((t) => t.id === textId);
    if (text) {
      setTextBeforeEdit(text.content);
      setEditingTextId(textId);
    }
  }, [texts, setTextBeforeEdit, setEditingTextId]);

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
  }, [textBeforeEdit, pushAction, onTextUpdate, texts, setTexts, setEditingTextId]);

  const handleTextCancelEdit = useCallback(() => {
    setEditingTextId(null);
  }, [setEditingTextId]);

  const handleTextMove = useCallback((textId: string, x: number, y: number) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === textId ? { ...t, x, y } : t))
    );
  }, [setTexts]);

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
  }, [texts, dragStartPosition, pushAction, onTextUpdate, setDragStartPosition]);

  const handleTextResize = useCallback((textId: string, width: number, height: number, fontSize?: number) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === textId ? { ...t, width, height, ...(fontSize !== undefined && { fontSize }) } : t))
    );
  }, [setTexts]);

  const handleTextResizeEnd = useCallback((textId: string) => {
    const text = texts.find((t) => t.id === textId);
    if (text) {
      onTextUpdate?.(text);
    }
  }, [texts, onTextUpdate]);

  const handleTextFormatUpdate = useCallback((textId: string, updates: Partial<TextElement>) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === textId ? { ...t, ...updates } : t))
    );
    const text = texts.find((t) => t.id === textId);
    if (text) {
      onTextUpdate?.({ ...text, ...updates });
    }
  }, [texts, onTextUpdate, setTexts]);

  return {
    handleTextSelect,
    handleTextStartEdit,
    handleTextEndEdit,
    handleTextCancelEdit,
    handleTextMove,
    handleTextMoveEnd,
    handleTextResize,
    handleTextResizeEnd,
    handleTextFormatUpdate,
  };
}
