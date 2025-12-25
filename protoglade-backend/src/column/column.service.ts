import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto, ReorderColumnsDto } from './dto/update-column.dto';

// Default columns to create for new projects
const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#71717a', position: 0 },
  { name: 'In Progress', color: '#6366f1', position: 1 },
  { name: 'Done', color: '#22c55e', position: 2 },
];

@Injectable()
export class ColumnService {
  constructor(private prisma: PrismaService) {}

  // Create default columns for a project
  async createDefaultColumns(projectId: string) {
    const columns = await this.prisma.kanbanColumn.createMany({
      data: DEFAULT_COLUMNS.map((col) => ({
        ...col,
        projectId,
      })),
    });

    return this.prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  // Create a new column
  async create(userId: string, dto: CreateColumnDto) {
    // Verify user has access to the project's workspace
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    // Get the highest position in this project
    const lastColumn = await this.prisma.kanbanColumn.findFirst({
      where: { projectId: dto.projectId },
      orderBy: { position: 'desc' },
    });

    const column = await this.prisma.kanbanColumn.create({
      data: {
        name: dto.name,
        color: dto.color || '#6366f1',
        position: dto.position ?? (lastColumn?.position ?? -1) + 1,
        projectId: dto.projectId,
      },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    return column;
  }

  // Get all columns in a project
  async findAllInProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    const columns = await this.prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });

    // If no columns exist, create default ones
    if (columns.length === 0) {
      return this.createDefaultColumns(projectId);
    }

    return columns;
  }

  // Update a column
  async update(columnId: string, userId: string, dto: UpdateColumnDto) {
    const column = await this.prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { project: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.checkWorkspaceMembership(column.project.workspaceId, userId);

    return this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: {
        name: dto.name,
        color: dto.color,
        position: dto.position,
      },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  // Reorder columns
  async reorder(projectId: string, userId: string, dto: ReorderColumnsDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    // Update positions for all columns
    const updates = dto.columnIds.map((columnId, index) =>
      this.prisma.kanbanColumn.update({
        where: { id: columnId },
        data: { position: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  }

  // Delete a column
  async delete(columnId: string, userId: string) {
    const column = await this.prisma.kanbanColumn.findUnique({
      where: { id: columnId },
      include: { project: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.checkWorkspaceMembership(column.project.workspaceId, userId);

    // Move tasks from this column to the first column, or leave them unassigned
    const firstColumn = await this.prisma.kanbanColumn.findFirst({
      where: { 
        projectId: column.projectId,
        id: { not: columnId },
      },
      orderBy: { position: 'asc' },
    });

    if (firstColumn) {
      await this.prisma.task.updateMany({
        where: { columnId },
        data: { columnId: firstColumn.id },
      });
    } else {
      await this.prisma.task.updateMany({
        where: { columnId },
        data: { columnId: null },
      });
    }

    await this.prisma.kanbanColumn.delete({
      where: { id: columnId },
    });

    return { message: 'Column deleted successfully' };
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

