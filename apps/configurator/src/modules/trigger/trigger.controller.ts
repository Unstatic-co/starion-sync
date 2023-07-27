import { Controller, Post, Param } from '@nestjs/common';
import { TriggerService } from './trigger.service';

@Controller('triggers')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Post(':id/manual')
  async manualTrigger(@Param('id') id: string) {
    return this.triggerService.manualTrigger(id);
  }
}
