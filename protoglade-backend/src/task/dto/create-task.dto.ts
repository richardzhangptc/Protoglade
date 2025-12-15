export class CreateTaskDto {
  title: string;
  description?: string;
  status?: string;      // "todo", "in_progress", "done"
  priority?: string;    // "low", "medium", "high", "urgent"
  dueDate?: string;     // ISO date string
  assigneeId?: string;
  projectId: string;
}

