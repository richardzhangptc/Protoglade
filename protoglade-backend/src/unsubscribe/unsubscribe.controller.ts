import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { UnsubscribeService } from './unsubscribe.service';

class UnsubscribeDto {
  token: string;
}

@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private unsubscribeService: UnsubscribeService) {}

  @Post()
  async unsubscribe(@Body() body: UnsubscribeDto) {
    if (!body.token) {
      throw new BadRequestException('Unsubscribe token is required');
    }

    return this.unsubscribeService.unsubscribe(body.token);
  }

  @Post('resubscribe')
  async resubscribe(@Body() body: UnsubscribeDto) {
    if (!body.token) {
      throw new BadRequestException('Token is required');
    }

    return this.unsubscribeService.resubscribe(body.token);
  }
}

