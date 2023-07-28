import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUES } from '../../common/queues';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SyncConnection } from '@lib/core';
import { ITriggerRepository, InjectTokens } from '@lib/modules';
import { TriggerService } from './trigger.service';

@Processor(QUEUES.CRON_TRIGGER)
@Injectable()
export class CronTriggerProcessor {
  private readonly logger = new Logger(CronTriggerProcessor.name);

  constructor(
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    private readonly triggerService: TriggerService,
  ) {}

  @Process()
  async process(job: Job<unknown>) {
    this.logger.debug('process cron trigger', job.data);
    const triggerId = (job.data as SyncConnection).id;
    const trigger = await this.triggerRepository.getById(triggerId);
    if (trigger) {
      await this.triggerService.processTrigger(trigger);
    } else {
      this.logger.log(`trigger ${triggerId} not found`);
    }
  }
}
