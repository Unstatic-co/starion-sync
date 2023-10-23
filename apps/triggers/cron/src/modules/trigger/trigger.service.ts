import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QUEUES } from '../../common/queues';
import { Queue } from 'bull';
import { EventNames, SyncConnection } from '@lib/core';
import { ITriggerRepository, InjectTokens } from '@lib/modules';
import { CronTriggerConfig, TriggerId, Trigger, TriggerType } from '@lib/core';
import { DeleteTriggerDto } from './dto/deleteTrigger.dto';
import { BrokerService } from '../broker/broker.service';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(
    @InjectQueue(QUEUES.CRON_TRIGGER) private readonly cronTriggerQueue: Queue,
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    private readonly brokerService: BrokerService,
  ) {}

  async createTriggerFromSyncConnection(syncConnection: SyncConnection) {
    for (const syncflow of syncConnection.syncflows) {
      if (syncflow.trigger.type === TriggerType.CRON) {
        const trigger = await this.triggerRepository.getByWorkflowId(
          syncflow.id,
        );
        if (trigger) {
          this.logger.debug('add trigger to queue', trigger);
          await this.cronTriggerQueue.add(trigger, {
            jobId: `${(trigger.config as CronTriggerConfig).jobId}`,
            repeat: {
              cron: (trigger.config as CronTriggerConfig).cron,
            },
          });
          this.logger.log('added trigger to queue', trigger.id);
          await this.processTrigger(trigger);
        } else {
          this.logger.debug('trigger not found', syncflow.id);
        }
      }
    }
  }

  async deleteTriggerFromSyncConnection(syncConnection: SyncConnection) {
    for (const syncflow of syncConnection.syncflows) {
      if (syncflow.trigger.type === TriggerType.CRON) {
        const trigger = await this.triggerRepository.getByWorkflowId(
          syncflow.id,
          { includeDeleted: true },
        );
        if (trigger) {
          this.logger.debug('delete trigger', trigger);
          const { cron, jobId } = trigger.config as CronTriggerConfig;
          await this.cronTriggerQueue.removeRepeatable({
            jobId,
            cron,
          });
          this.logger.debug('deleted trigger', trigger.id);
        }
      }
    }
  }

  async deleteTrigger(data: DeleteTriggerDto) {
    this.logger.debug('delete trigger', data);
    const { cron, jobId } = data;
    await this.cronTriggerQueue.removeRepeatable({
      jobId,
      cron,
    });
    this.logger.debug('deleted trigger', { jobId });
  }

  async processTrigger(trigger: Trigger) {
    this.logger.debug(`trigger workflow ${trigger.workflow.id}`);
    await this.brokerService.emitEvent(EventNames.WORKFLOW_TRIGGERED, {
      payload: trigger,
    });
    this.logger.log(
      `triggered, trigger = ${trigger.id}, workflow = ${trigger.workflow.id}`,
    );
  }

  async testCreateJob() {
    return await this.cronTriggerQueue.count();
  }
}
