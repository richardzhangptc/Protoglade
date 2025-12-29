import { Module } from '@nestjs/common';
import { WhiteboardController } from './whiteboard.controller';
import { WhiteboardService } from './whiteboard.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WhiteboardController],
  providers: [WhiteboardService, PrismaService],
  exports: [WhiteboardService],
})
export class WhiteboardModule {}
