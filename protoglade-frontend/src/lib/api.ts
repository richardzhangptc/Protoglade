const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, name?: string) {
    return this.request<{ id: string; email: string; name: string | null }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    const response = await this.request<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.accessToken);
    return response;
  }

  async getMe() {
    return this.request<{ id: string; email: string; name: string | null }>('/auth/me');
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.request<{ id: string; email: string; name: string | null }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  logout() {
    this.setToken(null);
  }

  // Workspaces
  async getWorkspaces() {
    return this.request<Array<import('@/types').Workspace>>('/workspaces');
  }

  async createWorkspace(name: string) {
    return this.request<import('@/types').Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getWorkspace(id: string) {
    return this.request<import('@/types').Workspace>(`/workspaces/${id}`);
  }

  async updateWorkspace(id: string, data: { name?: string }) {
    return this.request<import('@/types').Workspace>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(id: string) {
    return this.request<{ message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderWorkspaces(workspaceIds: string[]) {
    return this.request<Array<import('@/types').Workspace>>('/workspaces/reorder', {
      method: 'PUT',
      body: JSON.stringify({ workspaceIds }),
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(workspaceId: string) {
    return this.request<Array<import('@/types').Project>>(`/projects?workspaceId=${workspaceId}`);
  }

  async createProject(name: string, workspaceId: string, description?: string, type?: 'kanban' | 'whiteboard') {
    return this.request<import('@/types').Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, workspaceId, description, type: type || 'kanban' }),
    });
  }

  async getProject(id: string) {
    return this.request<import('@/types').Project & { tasks: import('@/types').Task[] }>(`/projects/${id}`);
  }

  async deleteProject(id: string) {
    return this.request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderProjects(workspaceId: string, projectIds: string[]) {
    return this.request<Array<import('@/types').Project>>(`/projects/workspace/${workspaceId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ projectIds }),
    });
  }

  // Tasks
  async getTasks(projectId: string) {
    return this.request<Array<import('@/types').Task>>(`/tasks?projectId=${projectId}`);
  }

  async createTask(data: {
    title: string;
    projectId: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
    columnId?: string;
    labels?: string[];
    assignedUserIds?: string[];
  }) {
    return this.request<import('@/types').Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTask(id: string) {
    return this.request<import('@/types').Task>(`/tasks/${id}`);
  }

  async updateTask(id: string, data: Partial<import('@/types').Task> & { assignedUserIds?: string[] }) {
    return this.request<import('@/types').Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async getMyTasks() {
    return this.request<Array<import('@/types').Task>>('/tasks/my');
  }

  // Columns
  async getColumns(projectId: string) {
    return this.request<Array<import('@/types').KanbanColumn>>(`/columns?projectId=${projectId}`);
  }

  async createColumn(data: { name: string; projectId: string; color?: string; position?: number }) {
    return this.request<import('@/types').KanbanColumn>('/columns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateColumn(id: string, data: { name?: string; color?: string; position?: number }) {
    return this.request<import('@/types').KanbanColumn>(`/columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async reorderColumns(projectId: string, columnIds: string[]) {
    return this.request<Array<import('@/types').KanbanColumn>>(`/columns/project/${projectId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ columnIds }),
    });
  }

  async deleteColumn(id: string) {
    return this.request<{ message: string }>(`/columns/${id}`, {
      method: 'DELETE',
    });
  }

  // Comments
  async getComments(taskId: string) {
    return this.request<Array<import('@/types').Comment>>(`/comments?taskId=${taskId}`);
  }

  async createComment(taskId: string, content: string) {
    return this.request<import('@/types').Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify({ taskId, content }),
    });
  }

  async deleteComment(id: string) {
    return this.request<{ message: string }>(`/comments/${id}`, {
      method: 'DELETE',
    });
  }

  // Invitations
  async sendInvitation(workspaceId: string, email: string, role?: string) {
    return this.request<import('@/types').Invitation>(`/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async getWorkspaceInvitations(workspaceId: string) {
    return this.request<Array<import('@/types').Invitation>>(`/workspaces/${workspaceId}/invitations`);
  }

  async cancelInvitation(workspaceId: string, invitationId: string) {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async getInvitationByToken(token: string) {
    return this.request<import('@/types').Invitation>(`/invitations/${token}`);
  }

  async acceptInvitation(token: string) {
    return this.request<{ workspace: import('@/types').Workspace }>(`/invitations/${token}/accept`, {
      method: 'POST',
    });
  }

  // Unsubscribe
  async unsubscribe(token: string) {
    return this.request<{ email: string; message: string }>('/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resubscribe(token: string) {
    return this.request<{ email: string; message: string }>('/unsubscribe/resubscribe', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Whiteboard
  async getWhiteboardStrokes(projectId: string) {
    return this.request<Array<import('@/types').WhiteboardStroke>>(`/whiteboard/${projectId}/strokes`);
  }

  async createWhiteboardStroke(projectId: string, data: {
    points: Array<{ x: number; y: number }>;
    color: string;
    size: number;
  }) {
    return this.request<import('@/types').WhiteboardStroke>(`/whiteboard/${projectId}/strokes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWhiteboardStroke(strokeId: string) {
    return this.request<{ message: string }>(`/whiteboard/strokes/${strokeId}`, {
      method: 'DELETE',
    });
  }

  async clearWhiteboardCanvas(projectId: string) {
    return this.request<{ message: string }>(`/whiteboard/${projectId}/clear`, {
      method: 'DELETE',
    });
  }

  // Whiteboard Elements (Shapes)
  async getWhiteboardElements(projectId: string) {
    return this.request<{
      shapes: Array<import('@/types').WhiteboardShape>;
    }>(`/whiteboard/${projectId}/elements`);
  }

  async createWhiteboardShape(projectId: string, data: {
    type: import('@/types').WhiteboardShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    strokeWidth: number;
    filled: boolean;
  }) {
    return this.request<import('@/types').WhiteboardShape>(`/whiteboard/${projectId}/shapes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWhiteboardShape(id: string, data: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    strokeWidth: number;
    filled: boolean;
  }>) {
    return this.request<import('@/types').WhiteboardShape>(`/whiteboard/shapes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWhiteboardShape(id: string) {
    return this.request<{ message: string }>(`/whiteboard/shapes/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

