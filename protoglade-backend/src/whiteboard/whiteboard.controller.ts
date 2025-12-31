import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WhiteboardService } from './whiteboard.service';
import { CreateStrokeDto } from './dto/create-stroke.dto';
import { CreateShapeDto } from './dto/create-shape.dto';
import { UpdateShapeDto } from './dto/update-shape.dto';

@Controller('whiteboard')
@UseGuards(AuthGuard('jwt'))
export class WhiteboardController {
  constructor(private whiteboardService: WhiteboardService) {}

  // Strokes
  @Get(':projectId/strokes')
  getStrokes(@Req() req, @Param('projectId') projectId: string) {
    return this.whiteboardService.getStrokes(projectId, req.user.id);
  }

  @Post(':projectId/strokes')
  createStroke(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: CreateStrokeDto,
  ) {
    return this.whiteboardService.createStroke(projectId, req.user.id, dto);
  }

  @Delete('strokes/:id')
  deleteStroke(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteStroke(id, req.user.id);
  }

  @Delete(':projectId/clear')
  clearCanvas(@Req() req, @Param('projectId') projectId: string) {
    return this.whiteboardService.clearCanvas(projectId, req.user.id);
  }

  // Elements (combined endpoint for loading all elements at once)
  @Get(':projectId/elements')
  getElements(@Req() req, @Param('projectId') projectId: string) {
    return this.whiteboardService.getElements(projectId, req.user.id);
  }

  // Shapes
  @Post(':projectId/shapes')
  createShape(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: CreateShapeDto,
  ) {
    return this.whiteboardService.createShape(projectId, req.user.id, dto);
  }

  @Put('shapes/:id')
  updateShape(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateShapeDto,
  ) {
    return this.whiteboardService.updateShape(id, req.user.id, dto);
  }

  @Delete('shapes/:id')
  deleteShape(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteShape(id, req.user.id);
  }
}
