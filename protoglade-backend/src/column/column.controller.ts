import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ColumnService } from './column.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto, ReorderColumnsDto } from './dto/update-column.dto';

@Controller('columns')
@UseGuards(AuthGuard('jwt'))
export class ColumnController {
  constructor(private columnService: ColumnService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateColumnDto) {
    return this.columnService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req, @Query('projectId') projectId: string) {
    return this.columnService.findAllInProject(projectId, req.user.id);
  }

  @Put('project/:projectId/reorder')
  reorder(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.columnService.reorder(projectId, req.user.id, dto);
  }

  @Put(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columnService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.columnService.delete(id, req.user.id);
  }
}
