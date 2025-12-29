import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrokeDto } from './dto/create-stroke.dto';

@Injectable()
export class WhiteboardService {
  constructor(private prisma: PrismaService) {}

  // Get all strokes for a project
  async getStrokes(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.whiteboardStroke.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Create a new stroke
  async createStroke(projectId: string, userId: string, dto: CreateStrokeDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.whiteboardStroke.create({
      data: {
        points: dto.points,
        color: dto.color,
        size: dto.size,
        createdBy: userId,
        projectId,
      },
    });
  }

  // Delete a stroke (for undo)
  async deleteStroke(strokeId: string, userId: string) {
    const stroke = await this.prisma.whiteboardStroke.findUnique({
      where: { id: strokeId },
      include: { project: true },
    });

    if (!stroke) {
      throw new NotFoundException('Stroke not found');
    }

    await this.checkWorkspaceMembership(stroke.project.workspaceId, userId);

    await this.prisma.whiteboardStroke.delete({
      where: { id: strokeId },
    });

    return { message: 'Stroke deleted successfully' };
  }

  // Clear all strokes for a project
  async clearCanvas(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    await this.prisma.whiteboardStroke.deleteMany({
      where: { projectId },
    });

    return { message: 'Canvas cleared successfully' };
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
