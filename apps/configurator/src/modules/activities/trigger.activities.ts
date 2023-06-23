import { Injectable } from '@nestjs/common';
import { TriggerService } from '../trigger/trigger.service';

@Injectable()
export class TriggerActivities {
  constructor(private readonly triggerService: TriggerService) {}

  async unregisterTrigger(arg: any) {
    return this.triggerService.unregisterTrigger(arg);
  }
}
