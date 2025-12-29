export class UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string | null;  // null to unassign
  position?: number;
  columnId?: string | null;    // Kanban column ID
  labels?: string[];           // Color labels (hex colors)
  assignedUserIds?: string[];  // Array of user IDs for multiple assignees
}

