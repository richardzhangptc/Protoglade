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
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('workspaces')
@UseGuards(AuthGuard('jwt')) // All routes require authentication
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  // POST /workspaces - Create a new workspace
  @Post()
  async create(@Req() req, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(req.user.id, dto.name);
  }

  // GET /workspaces - Get all workspaces for the logged-in user
  @Get()
  async findAll(@Req() req) {
    return this.workspaceService.findAllForUser(req.user.id);
  }

  // GET /workspaces/:id - Get a single workspace
  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.workspaceService.findOne(id, req.user.id);
  }

  // DELETE /workspaces/:id - Delete a workspace (owner only)
  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    return this.workspaceService.delete(id, req.user.id);
  }

  // POST /workspaces/:id/members - Add a member to workspace
  @Post(':id/members')
  async addMember(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceService.addMember(
      id,
      req.user.id,
      dto.email,
      dto.role,
    );
  }

  // DELETE /workspaces/:id/members/:userId - Remove a member
  @Delete(':id/members/:userId')
  async removeMember(
    @Req() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.workspaceService.removeMember(id, req.user.id, userId);
  }
}
