export class CreateTextDto {
  // We accept a client-generated id so the frontend can immediately edit/move/resize
  // without needing to reconcile ids returned from the server.
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  align: 'left' | 'center' | 'right';
  zIndex?: number;
}


