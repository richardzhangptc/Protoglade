import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  // Create a new task
  async create(userId: string, dto: CreateTaskDto) {
    // Verify user has access to the project's workspace
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    // Get the highest position in this column/project to add new task at the end
    const lastTask = await this.prisma.task.findFirst({
      where: { 
        projectId: dto.projectId,
        ...(dto.columnId ? { columnId: dto.columnId } : {}),
      },
      orderBy: { position: 'desc' },
    });

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status || 'todo',
        priority: dto.priority || 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId,
        projectId: dto.projectId,
        columnId: dto.columnId,
        position: (lastTask?.position ?? 0) + 1000,
      },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        project: { select: { id: true, name: true } },
        column: { select: { id: true, name: true, color: true } },
      },
    });

    return task;
  }

  // Get all tasks in a project
  async findAllInProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        column: { select: { id: true, name: true, color: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ position: 'asc' }],
    });
  }

  // Get a single task with comments
  async findOne(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        project: {
          include: {
            workspace: { select: { id: true, name: true } },
          },
        },
        comments: {
          include: {
            author: { select: { id: true, email: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkWorkspaceMembership(task.project.workspaceId, userId);

    return task;
  }

  // Update a task
  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkWorkspaceMembership(task.project.workspaceId, userId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
        position: dto.position,
        columnId: dto.columnId,
      },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        project: { select: { id: true, name: true } },
        column: { select: { id: true, name: true, color: true } },
      },
    });
  }

  // Delete a task
  async delete(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkWorkspaceMembership(task.project.workspaceId, userId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return { message: 'Task deleted successfully' };
  }

  // Get tasks assigned to the current user across all workspaces
  async findMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        project: {
          include: {
            workspace: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });
  }

  // Helper: Check if user is a member of the workspace
  private async checkWorkspaceMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return membership;
  }
}
