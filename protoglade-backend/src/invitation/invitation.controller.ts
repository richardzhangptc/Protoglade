import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller()
export class InvitationController {
  constructor(private invitationService: InvitationService) {}

  // POST /workspaces/:workspaceId/invitations - Send invitation
  @Post('workspaces/:workspaceId/invitations')
  @UseGuards(AuthGuard('jwt'))
  async createInvitation(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(
      workspaceId,
      req.user.id,
      dto.email,
      dto.role,
    );
  }

  // GET /workspaces/:workspaceId/invitations - List pending invitations
  @Get('workspaces/:workspaceId/invitations')
  @UseGuards(AuthGuard('jwt'))
  async getWorkspaceInvitations(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.invitationService.getWorkspaceInvitations(workspaceId, req.user.id);
  }

  // DELETE /workspaces/:workspaceId/invitations/:id - Cancel invitation
  @Delete('workspaces/:workspaceId/invitations/:id')
  @UseGuards(AuthGuard('jwt'))
  async cancelInvitation(@Req() req, @Param('id') id: string) {
    return this.invitationService.cancelInvitation(id, req.user.id);
  }

  // GET /invitations/:token - Get invitation details (public, for preview)
  @Get('invitations/:token')
  async getInvitationByToken(@Param('token') token: string) {
    return this.invitationService.getInvitationByToken(token);
  }

  // POST /invitations/:token/accept - Accept invitation
  @Post('invitations/:token/accept')
  @UseGuards(AuthGuard('jwt'))
  async acceptInvitation(@Req() req, @Param('token') token: string) {
    return this.invitationService.acceptInvitation(token, req.user.id);
  }
}

