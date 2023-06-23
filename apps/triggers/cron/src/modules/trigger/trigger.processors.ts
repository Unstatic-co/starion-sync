import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUES } from '../../common/queues';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BrokerService } from '../broker/broker.service';
import { EventNames, SyncConnection } from '@lib/core';
import { ITriggerRepository, InjectTokens } from '@lib/modules';

@Processor(QUEUES.CRON_TRIGGER)
@Injectable()
export class CronTriggerProcessor {
  private readonly logger = new Logger(CronTriggerProcessor.name);

  constructor(
    private readonly brokerService: BrokerService,
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
  ) {}

  @Process()
  async process(job: Job<unknown>) {
    this.logger.debug('process cron trigger', job.data);
    const triggerId = (job.data as SyncConnection).id;
    const trigger = await this.triggerRepository.getById(triggerId);
    if (trigger) {
      this.logger.debug(`trigger workflow ${trigger.workflow.id}`);
      await this.brokerService.emitEvent(EventNames.WORKFLOW_TRIGGERED, {
        payload: job.data,
      });
    } else {
      this.logger.debug(`trigger ${triggerId} not found`);
    }
  }
}
