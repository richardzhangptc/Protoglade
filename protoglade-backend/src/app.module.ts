import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { CommentModule } from './comment/comment.module';
import { InvitationModule } from './invitation/invitation.module';
import { UnsubscribeModule } from './unsubscribe/unsubscribe.module';
import { PresenceModule } from './presence/presence.module';
import { ColumnModule } from './column/column.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';

@Module({
  imports: [
    AuthModule,
    WorkspaceModule,
    ProjectModule,
    TaskModule,
    CommentModule,
    InvitationModule,
    UnsubscribeModule,
    PresenceModule,
    ColumnModule,
    WhiteboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
