import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  // Create a new project in a workspace
  async create(userId: string, dto: CreateProjectDto) {
    // Verify user is a member of the workspace
    await this.checkWorkspaceMembership(dto.workspaceId, userId);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        workspaceId: dto.workspaceId,
      },
      include: {
        tasks: true,
        workspace: { select: { id: true, name: true } },
      },
    });

    return project;
  }

  // Get all projects in a workspace
  async findAllInWorkspace(workspaceId: string, userId: string) {
    await this.checkWorkspaceMembership(workspaceId, userId);

    return this.prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get a single project with its tasks
  async findOne(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: { select: { id: true, name: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, email: true, name: true } },
          },
          orderBy: [{ status: 'asc' }, { position: 'asc' }],
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user has access to this project's workspace
    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return project;
  }

  // Update a project
  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
      include: {
        workspace: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  // Delete a project
  async delete(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Only owners and admins can delete projects
    await this.checkWorkspacePermission(project.workspaceId, userId, [
      'owner',
      'admin',
    ]);

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { message: 'Project deleted successfully' };
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

  // Helper: Check if user has required role
  private async checkWorkspacePermission(
    workspaceId: string,
    userId: string,
    allowedRoles: string[],
  ) {
    const membership = await this.checkWorkspaceMembership(workspaceId, userId);

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission for this action');
    }

    return membership;
  }
}
