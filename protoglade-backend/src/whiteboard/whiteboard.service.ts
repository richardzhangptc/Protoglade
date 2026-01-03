import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateStrokeDto } from './dto/create-stroke.dto';
import { UpdateStrokeDto } from './dto/update-stroke.dto';
import { CreateShapeDto } from './dto/create-shape.dto';
import { UpdateShapeDto } from './dto/update-shape.dto';
import { CreateTextDto } from './dto/create-text.dto';
import { UpdateTextDto } from './dto/update-text.dto';
import { CreateStickyDto } from './dto/create-sticky.dto';
import { UpdateStickyDto } from './dto/update-sticky.dto';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

@Injectable()
export class WhiteboardService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

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
      orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
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
        zIndex: dto.zIndex ?? 0,
        createdBy: userId,
        projectId,
      },
    });
  }

  // Update a stroke (for moving, color changes, etc.)
  async updateStroke(strokeId: string, userId: string, dto: UpdateStrokeDto) {
    const stroke = await this.prisma.whiteboardStroke.findUnique({
      where: { id: strokeId },
      include: { project: true },
    });

    if (!stroke) {
      throw new NotFoundException('Stroke not found');
    }

    await this.checkWorkspaceMembership(stroke.project.workspaceId, userId);

    return this.prisma.whiteboardStroke.update({
      where: { id: strokeId },
      data: dto,
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
      this.prisma.whiteboardStickyNote.deleteMany({ where: { projectId } }),
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

    const [shapes, texts, stickyNotes, images] = await Promise.all([
      this.prisma.whiteboardShape.findMany({
        where: { projectId },
        orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.whiteboardText.findMany({
        where: { projectId },
        orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.whiteboardStickyNote.findMany({
        where: { projectId },
        orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.whiteboardImage.findMany({
        where: { projectId },
        orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return { shapes, texts, stickyNotes, images };
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
        zIndex: dto.zIndex ?? 0,
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
        zIndex: dto.zIndex ?? 0,
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

  // Sticky Notes CRUD
  async createStickyNote(projectId: string, userId: string, dto: CreateStickyDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.whiteboardStickyNote.create({
      data: {
        id: dto.id,
        x: dto.x,
        y: dto.y,
        width: dto.width ?? 200,
        height: dto.height ?? 200,
        content: dto.content ?? '',
        color: dto.color ?? '#fef08a',
        zIndex: dto.zIndex ?? 0,
        createdBy: userId,
        projectId,
      },
    });
  }

  async updateStickyNote(id: string, userId: string, dto: UpdateStickyDto) {
    const sticky = await this.prisma.whiteboardStickyNote.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!sticky) {
      throw new NotFoundException('Sticky note not found');
    }

    await this.checkWorkspaceMembership(sticky.project.workspaceId, userId);

    return this.prisma.whiteboardStickyNote.update({
      where: { id },
      data: dto,
    });
  }

  async deleteStickyNote(id: string, userId: string) {
    const sticky = await this.prisma.whiteboardStickyNote.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!sticky) {
      throw new NotFoundException('Sticky note not found');
    }

    await this.checkWorkspaceMembership(sticky.project.workspaceId, userId);

    await this.prisma.whiteboardStickyNote.delete({
      where: { id },
    });

    return { message: 'Sticky note deleted successfully' };
  }

  // Images CRUD
  async getImages(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    return this.prisma.whiteboardImage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createImage(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateImageDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.checkWorkspaceMembership(project.workspaceId, userId);

    // Upload to S3
    const { url, key } = await this.s3Service.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return this.prisma.whiteboardImage.create({
      data: {
        id: dto.id,
        url,
        s3Key: key,
        x: dto.x ?? 0,
        y: dto.y ?? 0,
        width: dto.width ?? 200,
        height: dto.height ?? 200,
        zIndex: dto.zIndex ?? 0,
        createdBy: userId,
        projectId,
      },
    });
  }

  async updateImage(id: string, userId: string, dto: UpdateImageDto) {
    const image = await this.prisma.whiteboardImage.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.checkWorkspaceMembership(image.project.workspaceId, userId);

    return this.prisma.whiteboardImage.update({
      where: { id },
      data: dto,
    });
  }

  async deleteImage(id: string, userId: string) {
    const image = await this.prisma.whiteboardImage.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.checkWorkspaceMembership(image.project.workspaceId, userId);

    // Delete from S3
    try {
      await this.s3Service.deleteFile(image.s3Key);
    } catch (error) {
      console.error('Failed to delete image from S3:', error);
    }

    await this.prisma.whiteboardImage.delete({
      where: { id },
    });

    return { message: 'Image deleted successfully' };
  }

  async getImageFileStream(
    id: string,
    userId: string,
  ): Promise<{ body: Readable; contentType?: string; contentLength?: number }> {
    const image = await this.prisma.whiteboardImage.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.checkWorkspaceMembership(image.project.workspaceId, userId);

    return this.s3Service.getFileStream(image.s3Key);
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
