import { useState } from 'react';
import {
  WhiteboardStroke,
  WhiteboardPoint,
  WhiteboardShape,
  WhiteboardText,
  WhiteboardStickyNote,
  WhiteboardImage,
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
  const [images, setImages] = useState<WhiteboardImage[]>([]);

  const clearWhiteboardState = () => {
    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setStickyNotes([]);
    setImages([]);
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
    images,
    setImages,
    clearWhiteboardState,
  };
}

export type WhiteboardPageState = ReturnType<typeof useWhiteboardPageState>;
