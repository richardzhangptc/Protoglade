import { Module, forwardRef } from '@nestjs/common';
import { UnsubscribeController } from './unsubscribe.controller';
import { UnsubscribeService } from './unsubscribe.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => EmailModule)],
  controllers: [UnsubscribeController],
  providers: [UnsubscribeService, PrismaService],
  exports: [UnsubscribeService],
})
export class UnsubscribeModule {}

