export class CreateStrokeDto {
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
}
