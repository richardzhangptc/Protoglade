import { WhiteboardShapeType, WhiteboardPoint } from '@/types';

export type ToolType = 'select' | 'shapes' | 'pen' | 'text' | 'sticky' | 'image';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

// Sticky note colors
export const STICKY_COLORS = [
  '#fef08a', // Yellow
  '#fca5a5', // Red/Pink
  '#86efac', // Green
  '#93c5fd', // Blue
  '#c4b5fd', // Purple
  '#fdba74', // Orange
];

// Local element types (without persistence metadata)
export interface ShapeElement {
  id: string;
  type: WhiteboardShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
}

export interface TextElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface StickyNoteElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string; // Background color
  fontSize: number; // Font size in pixels
}

export interface ImageElement {
  id: string;
  url: string;
  s3Key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RemoteStroke {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  size: number;
  userId: string;
}

export interface RemoteCursor {
  odataId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    color: string;
  };
  x: number;
  y: number;
  lastUpdate: number;
}
