import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateImageDto {
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseFloat(value) : undefined,
  )
  @IsNumber()
  x?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseFloat(value) : undefined,
  )
  @IsNumber()
  y?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseFloat(value) : undefined,
  )
  @IsNumber()
  width?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseFloat(value) : undefined,
  )
  @IsNumber()
  height?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseInt(value, 10) : undefined,
  )
  @IsNumber()
  zIndex?: number;
}
