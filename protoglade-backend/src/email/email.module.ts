import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { UnsubscribeModule } from '../unsubscribe/unsubscribe.module';

@Module({
  imports: [forwardRef(() => UnsubscribeModule)],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

