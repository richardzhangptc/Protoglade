export class UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string | null;  // null to unassign
  position?: number;
  columnId?: string | null;    // Kanban column ID
}

