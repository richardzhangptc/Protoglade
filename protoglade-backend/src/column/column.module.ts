import { Module } from '@nestjs/common';
import { ColumnController } from './column.controller';
import { ColumnService } from './column.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ColumnController],
  providers: [ColumnService, PrismaService],
  exports: [ColumnService],
})
export class ColumnModule {}

