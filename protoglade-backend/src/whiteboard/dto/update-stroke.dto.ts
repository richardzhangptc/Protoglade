export class UpdateStrokeDto {
  points?: Array<{ x: number; y: number }>;
  color?: string;
  size?: number;
  zIndex?: number;
}
