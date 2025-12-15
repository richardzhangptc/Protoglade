import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  // Create a new workspace and add the creator as owner
  async create(userId: string, name: string) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    return workspace;
  }

  // Get all workspaces the user belongs to
  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Return workspaces with user's role attached
    return memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role,
    }));
  }

  // Get a single workspace by ID (if user is a member)
  async findOne(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    return { ...workspace, myRole: membership.role };
  }

  // Add a member to a workspace (only owners/admins can do this)
  async addMember(
    workspaceId: string,
    requesterId: string,
    email: string,
    role: string = 'member',
  ) {
    // Check requester has permission
    await this.checkPermission(workspaceId, requesterId, ['owner', 'admin']);

    // Find the user to add
    const userToAdd = await this.prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      throw new NotFoundException('User not found with that email');
    }

    // Add them to the workspace
    const membership = await this.prisma.workspaceMember.create({
      data: {
        userId: userToAdd.id,
        workspaceId,
        role,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return membership;
  }

  // Remove a member from workspace
  async removeMember(
    workspaceId: string,
    requesterId: string,
    userIdToRemove: string,
  ) {
    // Check requester has permission
    await this.checkPermission(workspaceId, requesterId, ['owner', 'admin']);

    // Prevent removing the owner
    const memberToRemove = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: userIdToRemove, workspaceId },
      },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found in this workspace');
    }

    if (memberToRemove.role === 'owner') {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    await this.prisma.workspaceMember.delete({
      where: { id: memberToRemove.id },
    });

    return { message: 'Member removed successfully' };
  }

  // Delete a workspace (only owner can do this)
  async delete(workspaceId: string, userId: string) {
    await this.checkPermission(workspaceId, userId, ['owner']);

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { message: 'Workspace deleted successfully' };
  }

  // Helper: Check if user has required role
  private async checkPermission(
    workspaceId: string,
    userId: string,
    allowedRoles: string[],
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission for this action');
    }

    return membership;
  }
}
