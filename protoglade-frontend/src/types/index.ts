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
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  _count?: { tasks: number };
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
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assignee: User | null;
  _count?: { comments: number };
  comments?: Comment[];
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

