import { useState, useCallback, useRef } from 'react';
import { ShapeElement, TextElement, StickyNoteElement, ImageElement, StrokeElement } from './types';
import { WhiteboardStroke } from '@/types';

// Action types for undo/redo
export type HistoryAction =
  | { type: 'stroke_create'; stroke: WhiteboardStroke }
  | { type: 'stroke_delete'; stroke: StrokeElement }
  | { type: 'stroke_move'; strokeId: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'shape_create'; shape: ShapeElement }
  | { type: 'shape_delete'; shape: ShapeElement }
  | { type: 'shape_move'; shapeId: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'shape_resize'; shapeId: string; from: ShapeElement; to: ShapeElement }
  | { type: 'text_create'; text: TextElement }
  | { type: 'text_delete'; text: TextElement }
  | { type: 'text_move'; textId: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'text_resize'; textId: string; from: TextElement; to: TextElement }
  | { type: 'text_edit'; textId: string; fromContent: string; toContent: string }
  | { type: 'sticky_create'; sticky: StickyNoteElement }
  | { type: 'sticky_delete'; sticky: StickyNoteElement }
  | { type: 'sticky_move'; stickyId: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'sticky_resize'; stickyId: string; from: StickyNoteElement; to: StickyNoteElement }
  | { type: 'sticky_edit'; stickyId: string; fromContent: string; toContent: string }
  | { type: 'sticky_color'; stickyId: string; fromColor: string; toColor: string }
  | { type: 'image_create'; image: ImageElement }
  | { type: 'image_delete'; image: ImageElement }
  | { type: 'image_move'; imageId: string; fromX: number; fromY: number; toX: number; toY: number }
  | { type: 'image_resize'; imageId: string; from: ImageElement; to: ImageElement };

interface UseHistoryOptions {
  maxHistory?: number;
}

interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  pushAction: (action: HistoryAction) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  clear: () => void;
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const { maxHistory = 100 } = options;
  
  // Use refs to store history to avoid re-renders on every history change
  const historyRef = useRef<HistoryAction[]>([]);
  const indexRef = useRef(-1); // Points to current position in history
  
  // State to trigger re-renders for canUndo/canRedo
  const [, forceUpdate] = useState({});

  const pushAction = useCallback((action: HistoryAction) => {
    // Remove any future history (if we've undone and then do a new action)
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    
    // Add new action
    historyRef.current.push(action);
    
    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current = historyRef.current.slice(-maxHistory);
    }
    
    // Point to the new action
    indexRef.current = historyRef.current.length - 1;
    
    forceUpdate({});
  }, [maxHistory]);

  const undo = useCallback((): HistoryAction | null => {
    if (indexRef.current < 0) return null;
    
    const action = historyRef.current[indexRef.current];
    indexRef.current--;
    
    forceUpdate({});
    return action;
  }, []);

  const redo = useCallback((): HistoryAction | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    
    indexRef.current++;
    const action = historyRef.current[indexRef.current];
    
    forceUpdate({});
    return action;
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
    forceUpdate({});
  }, []);

  return {
    canUndo: indexRef.current >= 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
    pushAction,
    undo,
    redo,
    clear,
  };
}
