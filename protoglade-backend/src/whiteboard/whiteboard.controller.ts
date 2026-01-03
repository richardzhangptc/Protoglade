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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UsePipes,
  ValidationPipe,
  StreamableFile,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhiteboardService } from './whiteboard.service';
import { CreateStrokeDto } from './dto/create-stroke.dto';
import { UpdateStrokeDto } from './dto/update-stroke.dto';
import { CreateShapeDto } from './dto/create-shape.dto';
import { UpdateShapeDto } from './dto/update-shape.dto';
import { CreateTextDto } from './dto/create-text.dto';
import { UpdateTextDto } from './dto/update-text.dto';
import { CreateStickyDto } from './dto/create-sticky.dto';
import { UpdateStickyDto } from './dto/update-sticky.dto';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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

  @Put('strokes/:id')
  updateStroke(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateStrokeDto,
  ) {
    return this.whiteboardService.updateStroke(id, req.user.id, dto);
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

  // Texts
  @Post(':projectId/texts')
  createText(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTextDto,
  ) {
    return this.whiteboardService.createText(projectId, req.user.id, dto);
  }

  @Put('texts/:id')
  updateText(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTextDto,
  ) {
    return this.whiteboardService.updateText(id, req.user.id, dto);
  }

  @Delete('texts/:id')
  deleteText(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteText(id, req.user.id);
  }

  // Sticky Notes
  @Post(':projectId/sticky-notes')
  createStickyNote(
    @Req() req,
    @Param('projectId') projectId: string,
    @Body() dto: CreateStickyDto,
  ) {
    return this.whiteboardService.createStickyNote(projectId, req.user.id, dto);
  }

  @Put('sticky-notes/:id')
  updateStickyNote(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateStickyDto,
  ) {
    return this.whiteboardService.updateStickyNote(id, req.user.id, dto);
  }

  @Delete('sticky-notes/:id')
  deleteStickyNote(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteStickyNote(id, req.user.id);
  }

  // Images
  @Get(':projectId/images')
  getImages(@Req() req, @Param('projectId') projectId: string) {
    return this.whiteboardService.getImages(projectId, req.user.id);
  }

  // Streams image bytes from S3 (useful if bucket objects are private / browser can't load direct URL)
  @Get('images/:id/file')
  async getImageFile(
    @Req() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { body, contentType, contentLength } =
      await this.whiteboardService.getImageFileStream(id, req.user.id);

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (typeof contentLength === 'number') {
      res.setHeader('Content-Length', String(contentLength));
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return new StreamableFile(body);
  }

  @Post(':projectId/images')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ transform: true }))
  createImage(
    @Req() req,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
    }

    return this.whiteboardService.createImage(projectId, req.user.id, file, dto);
  }

  @Put('images/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateImage(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
  ) {
    return this.whiteboardService.updateImage(id, req.user.id, dto);
  }

  @Delete('images/:id')
  deleteImage(@Req() req, @Param('id') id: string) {
    return this.whiteboardService.deleteImage(id, req.user.id);
  }
}
