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
import { CreateStickyNoteDto } from './dto/create-sticky-note.dto';
import { UpdateStickyNoteDto } from './dto/update-sticky-note.dto';
import { CreateTextElementDto } from './dto/create-text-element.dto';
import { UpdateTextElementDto } from './dto/update-text-element.dto';
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

  // Sticky Notes
  @Post(':projectId/sticky-notes')
  createStickyNote(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: CreateStickyNoteDto,
  ) {
    return this.whiteboardService.createStickyNote(projectId, req.user.id, dto);
  }

  @Put('sticky-notes/:id')
  updateStickyNote(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateStickyNoteDto,
  ) {
    return this.whiteboardService.updateStickyNote(id, req.user.id, dto);
  }

  @Delete('sticky-notes/:id')
  deleteStickyNote(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteStickyNote(id, req.user.id);
  }

  // Text Elements
  @Post(':projectId/text-elements')
  createTextElement(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTextElementDto,
  ) {
    return this.whiteboardService.createTextElement(projectId, req.user.id, dto);
  }

  @Put('text-elements/:id')
  updateTextElement(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTextElementDto,
  ) {
    return this.whiteboardService.updateTextElement(id, req.user.id, dto);
  }

  @Delete('text-elements/:id')
  deleteTextElement(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteTextElement(id, req.user.id);
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
