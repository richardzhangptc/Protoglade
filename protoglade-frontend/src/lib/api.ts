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

  async deleteWorkspace(id: string) {
    return this.request<{ message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(workspaceId: string) {
    return this.request<Array<import('@/types').Project>>(`/projects?workspaceId=${workspaceId}`);
  }

  async createProject(name: string, workspaceId: string, description?: string) {
    return this.request<import('@/types').Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, workspaceId, description }),
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
  }) {
    return this.request<import('@/types').Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTask(id: string) {
    return this.request<import('@/types').Task>(`/tasks/${id}`);
  }

  async updateTask(id: string, data: Partial<import('@/types').Task>) {
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
}

export const api = new ApiClient();

