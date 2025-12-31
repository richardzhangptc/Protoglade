import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrokeDto } from './dto/create-stroke.dto';
import { CreateShapeDto } from './dto/create-shape.dto';
import { UpdateShapeDto } from './dto/update-shape.dto';
import { CreateTextDto } from './dto/create-text.dto';
import { UpdateTextDto } from './dto/update-text.dto';

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

    // Delete all whiteboard elements
    await Promise.all([
      this.prisma.whiteboardStroke.deleteMany({ where: { projectId } }),
      this.prisma.whiteboardShape.deleteMany({ where: { projectId } }),
      this.prisma.whiteboardText.deleteMany({ where: { projectId } }),
    ]);

    return { message: 'Canvas cleared successfully' };
  }

  // Get all elements for a project
  async getElements(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    const shapes = await this.prisma.whiteboardShape.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    const texts = await this.prisma.whiteboardText.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return { shapes, texts };
  }

  // Shapes CRUD
  async createShape(projectId: string, userId: string, dto: CreateShapeDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.whiteboardShape.create({
      data: {
        type: dto.type,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        color: dto.color,
        strokeWidth: dto.strokeWidth,
        filled: dto.filled,
        createdBy: userId,
        projectId,
      },
    });
  }

  async updateShape(id: string, userId: string, dto: UpdateShapeDto) {
    const shape = await this.prisma.whiteboardShape.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!shape) {
      throw new NotFoundException('Shape not found');
    }

    await this.checkWorkspaceMembership(shape.project.workspaceId, userId);

    return this.prisma.whiteboardShape.update({
      where: { id },
      data: dto,
    });
  }

  async deleteShape(id: string, userId: string) {
    const shape = await this.prisma.whiteboardShape.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!shape) {
      throw new NotFoundException('Shape not found');
    }

    await this.checkWorkspaceMembership(shape.project.workspaceId, userId);

    await this.prisma.whiteboardShape.delete({
      where: { id },
    });

    return { message: 'Shape deleted successfully' };
  }

  // Texts CRUD
  async createText(projectId: string, userId: string, dto: CreateTextDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.whiteboardText.create({
      data: {
        id: dto.id,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        content: dto.content ?? '',
        fontSize: dto.fontSize ?? 16,
        fontWeight: dto.fontWeight ?? 'normal',
        color: dto.color ?? '#000000',
        align: dto.align ?? 'left',
        createdBy: userId,
        projectId,
      },
    });
  }

  async updateText(id: string, userId: string, dto: UpdateTextDto) {
    const text = await this.prisma.whiteboardText.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!text) {
      throw new NotFoundException('Text not found');
    }

    await this.checkWorkspaceMembership(text.project.workspaceId, userId);

    return this.prisma.whiteboardText.update({
      where: { id },
      data: dto,
    });
  }

  async deleteText(id: string, userId: string) {
    const text = await this.prisma.whiteboardText.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!text) {
      throw new NotFoundException('Text not found');
    }

    await this.checkWorkspaceMembership(text.project.workspaceId, userId);

    await this.prisma.whiteboardText.delete({
      where: { id },
    });

    return { message: 'Text deleted successfully' };
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
