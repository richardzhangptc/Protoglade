import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Send an invitation to join a workspace
  async createInvitation(
    workspaceId: string,
    inviterId: string,
    email: string,
    role: string = 'member',
  ) {
    // Check if inviter has permission (owner or admin)
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: inviterId, workspaceId } },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owners and admins can send invitations');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingMember) {
      const alreadyMember = await this.prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId: existingMember.id, workspaceId },
        },
      });

      if (alreadyMember) {
        throw new ConflictException('User is already a member of this workspace');
      }
    }

    // Check for existing pending invitation
    const existingInvite = await this.prisma.workspaceInvitation.findUnique({
      where: { email_workspaceId: { email, workspaceId } },
    });

    if (existingInvite && existingInvite.status === 'pending') {
      // Resend the existing invitation
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterId },
      });

      await this.emailService.sendWorkspaceInvitation(
        email,
        inviter?.name || inviter?.email || 'A team member',
        workspace?.name || 'a workspace',
        existingInvite.token,
      );

      return existingInvite;
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        email,
        token,
        role,
        workspaceId,
        invitedById: inviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Send invitation email
    await this.emailService.sendWorkspaceInvitation(
      email,
      invitation.invitedBy.name || invitation.invitedBy.email,
      invitation.workspace.name,
      token,
    );

    return invitation;
  }

  // Get invitation by token (for preview before accepting)
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('This invitation has already been used');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('This invitation has expired');
    }

    return invitation;
  }

  // Accept invitation
  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.getInvitationByToken(token);

    // Verify the accepting user's email matches the invitation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    // Check if already a member
    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invitation.workspaceId },
      },
    });

    if (existingMember) {
      // Mark invitation as accepted and return
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });
      throw new ConflictException('You are already a member of this workspace');
    }

    // Add user to workspace
    const membership = await this.prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
      },
      include: {
        workspace: true,
      },
    });

    // Mark invitation as accepted
    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return membership;
  }

  // Get pending invitations for a workspace
  async getWorkspaceInvitations(workspaceId: string, userId: string) {
    // Verify user has access
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId, status: 'pending' },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cancel/revoke an invitation
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if user has permission
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invitation.workspaceId },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Only owners and admins can cancel invitations');
    }

    await this.prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invitation cancelled successfully' };
  }
}

