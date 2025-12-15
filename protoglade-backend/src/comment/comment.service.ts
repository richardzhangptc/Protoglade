import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  // Create a new comment on a task
  async create(userId: string, dto: CreateCommentDto) {
    // Get the task and verify user has access
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkWorkspaceMembership(task.project.workspaceId, userId);

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        taskId: dto.taskId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, email: true, name: true } },
      },
    });

    return comment;
  }

  // Get all comments for a task
  async findAllForTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkWorkspaceMembership(task.project.workspaceId, userId);

    return this.prisma.comment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Update a comment (only the author can update)
  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the author can edit their comment
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        author: { select: { id: true, email: true, name: true } },
      },
    });
  }

  // Delete a comment (author or workspace admin/owner can delete)
  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: { include: { project: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author
    if (comment.authorId === userId) {
      await this.prisma.comment.delete({ where: { id: commentId } });
      return { message: 'Comment deleted successfully' };
    }

    // If not author, check if user is admin/owner
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: comment.task.project.workspaceId,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException(
        'You can only delete your own comments or be a workspace admin',
      );
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }

  // Helper: Check workspace membership
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
