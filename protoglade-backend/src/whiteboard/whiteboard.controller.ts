import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WhiteboardService } from './whiteboard.service';
import { CreateStrokeDto } from './dto/create-stroke.dto';

@Controller('whiteboard')
@UseGuards(AuthGuard('jwt'))
export class WhiteboardController {
  constructor(private whiteboardService: WhiteboardService) {}

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
}
