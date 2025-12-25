export class UpdateColumnDto {
  name?: string;
  color?: string;
  position?: number;
}

export class ReorderColumnsDto {
  columnIds: string[];
}
