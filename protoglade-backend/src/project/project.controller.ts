import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  // POST /projects - Create a new project
  @Post()
  async create(@Req() req, @Body() dto: CreateProjectDto) {
    return this.projectService.create(req.user.id, dto);
  }

  // GET /projects?workspaceId=xxx - Get all projects in a workspace
  @Get()
  async findAll(@Req() req, @Query('workspaceId') workspaceId: string) {
    return this.projectService.findAllInWorkspace(workspaceId, req.user.id);
  }

  // GET /projects/:id - Get a single project with tasks
  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.projectService.findOne(id, req.user.id);
  }

  // PUT /projects/:id - Update a project
  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, req.user.id, dto);
  }

  // DELETE /projects/:id - Delete a project
  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    return this.projectService.delete(id, req.user.id);
  }
}
