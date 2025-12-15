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
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TaskController {
  constructor(private taskService: TaskService) {}

  // POST /tasks - Create a new task
  @Post()
  async create(@Req() req, @Body() dto: CreateTaskDto) {
    return this.taskService.create(req.user.id, dto);
  }

  // GET /tasks?projectId=xxx - Get all tasks in a project
  @Get()
  async findAll(@Req() req, @Query('projectId') projectId: string) {
    if (projectId) {
      return this.taskService.findAllInProject(projectId, req.user.id);
    }
    // If no projectId, return user's assigned tasks
    return this.taskService.findMyTasks(req.user.id);
  }

  // GET /tasks/my - Get all tasks assigned to me
  @Get('my')
  async findMyTasks(@Req() req) {
    return this.taskService.findMyTasks(req.user.id);
  }

  // GET /tasks/:id - Get a single task
  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.taskService.findOne(id, req.user.id);
  }

  // PUT /tasks/:id - Update a task
  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(id, req.user.id, dto);
  }

  // DELETE /tasks/:id - Delete a task
  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    return this.taskService.delete(id, req.user.id);
  }
}
