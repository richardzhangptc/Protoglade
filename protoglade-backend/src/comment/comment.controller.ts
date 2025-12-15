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
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
@UseGuards(AuthGuard('jwt'))
export class CommentController {
  constructor(private commentService: CommentService) {}

  // POST /comments - Create a new comment
  @Post()
  async create(@Req() req, @Body() dto: CreateCommentDto) {
    return this.commentService.create(req.user.id, dto);
  }

  // GET /comments?taskId=xxx - Get all comments for a task
  @Get()
  async findAll(@Req() req, @Query('taskId') taskId: string) {
    return this.commentService.findAllForTask(taskId, req.user.id);
  }

  // PUT /comments/:id - Update a comment
  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, req.user.id, dto);
  }

  // DELETE /comments/:id - Delete a comment
  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    return this.commentService.delete(id, req.user.id);
  }
}
