import { useState } from 'react';
import {
  WhiteboardStroke,
  WhiteboardPoint,
  WhiteboardShape,
  WhiteboardText,
  WhiteboardStickyNote,
} from '@/types';

export interface RemoteStroke {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  size: number;
  userId: string;
}

export function useWhiteboardPageState() {
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [remoteStrokes, setRemoteStrokes] = useState<Map<string, RemoteStroke>>(new Map());
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [texts, setTexts] = useState<WhiteboardText[]>([]);
  const [stickyNotes, setStickyNotes] = useState<WhiteboardStickyNote[]>([]);

  const clearWhiteboardState = () => {
    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setStickyNotes([]);
    setRemoteStrokes(new Map());
  };

  return {
    strokes,
    setStrokes,
    remoteStrokes,
    setRemoteStrokes,
    shapes,
    setShapes,
    texts,
    setTexts,
    stickyNotes,
    setStickyNotes,
    clearWhiteboardState,
  };
}

export type WhiteboardPageState = ReturnType<typeof useWhiteboardPageState>;
