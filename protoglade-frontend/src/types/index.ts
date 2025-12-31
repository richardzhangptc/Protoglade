// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt?: string;
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  myRole: 'owner' | 'admin' | 'member';
  members: WorkspaceMember[];
}

export interface WorkspaceMember {
  id: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user: User;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  type: 'kanban' | 'whiteboard';
  position: number;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: { tasks: number };
}

// Task Assignment types
export interface TaskAssignment {
  id: string;
  createdAt: string;
  taskId: string;
  userId: string;
  user: User;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  position: number;
  labels: string[];  // Color labels (hex colors)
  createdAt: string;
  updatedAt: string;
  projectId: string;
  columnId: string | null;
  column?: KanbanColumn | null;
  assignee: User | null;
  assignments?: TaskAssignment[];  // Multiple assignees
  _count?: { comments: number };
  comments?: Comment[];
}

// Kanban Column types
export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  _count?: { tasks: number };
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

// Invitation types
export interface Invitation {
  id: string;
  email: string;
  token: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
  workspace: { id: string; name: string };
  invitedBy: { id: string; name: string | null; email: string };
}

// Whiteboard types
export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  points: WhiteboardPoint[];
  color: string;
  size: number;
  createdAt: string;
  createdBy: string;
  projectId: string;
}

export interface WhiteboardStickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  createdAt: string;
  createdBy: string;
  projectId: string;
}

export interface WhiteboardTextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  createdAt: string;
  createdBy: string;
  projectId: string;
}

export type WhiteboardShapeType = 'rectangle' | 'circle' | 'line';

export interface WhiteboardShape {
  id: string;
  type: WhiteboardShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
  createdAt: string;
  createdBy: string;
  projectId: string;
}

