export class CreateStickyDto {
  id?: string;  // Optional - client can provide ID for consistency
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  fontSize?: number;
  zIndex?: number;
}

