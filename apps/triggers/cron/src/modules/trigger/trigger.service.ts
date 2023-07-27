import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QUEUES } from '../../common/queues';
import { Queue } from 'bull';
import { SyncConnection } from '@lib/core';
import { ITriggerRepository, InjectTokens } from '@lib/modules';
import {
  CronTriggerConfig,
  TriggerId,
  TriggerType,
} from '@lib/core/entities/trigger';
import { ApiError } from '../../common/exception/api.exception';
import { ErrorCode } from '../../common/constants';
import { DeleteTriggerDto } from './dto/deleteTrigger.dto';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(
    @InjectQueue(QUEUES.CRON_TRIGGER) private readonly cronTriggerQueue: Queue,
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
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
          this.logger.debug('added trigger to queue', trigger.id);
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

  async testCreateJob() {
    return await this.cronTriggerQueue.count();
  }
}
