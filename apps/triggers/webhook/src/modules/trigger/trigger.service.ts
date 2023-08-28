import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventNames, SyncConnection } from '@lib/core';
import {
  IDataSourceRepository,
  ITriggerRepository,
  InjectTokens,
} from '@lib/modules';
import { CronTriggerConfig, TriggerId, Trigger, TriggerType } from '@lib/core';
import { DeleteTriggerDto } from './dto/deleteTrigger.dto';
import { BrokerService } from '../broker/broker.service';
import { WebhookServiceFactory } from '../webhook/webhook.factory';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(
    @Inject(InjectTokens.TRIGGER_REPOSITORY)
    private readonly triggerRepository: ITriggerRepository,
    @Inject(InjectTokens.DATA_SOURCE_REPOSITORY)
    private readonly dataSourceRepository: IDataSourceRepository,
    private readonly brokerService: BrokerService,
    private readonly webhookFactoryService: WebhookServiceFactory,
  ) {}

  async getByWebhookId(webhookId: string) {
    return this.triggerRepository.getByConfig({
      webhookId,
    });
  }

  async createTriggerFromSyncConnection(syncConnection: SyncConnection) {
    for (const syncflow of syncConnection.syncflows) {
      if (syncflow.trigger.type === TriggerType.EVENT_WEBHOOK) {
        const [trigger, dataSource] = await Promise.all([
          this.triggerRepository.getByWorkflowId(syncflow.id),
          this.dataSourceRepository.getById(syncConnection.sourceId),
        ]);
        if (trigger) {
          this.logger.log(`add webhook trigger ${trigger.id}`);
          const webhookService = this.webhookFactoryService.get(trigger.name);
          await webhookService.createWebhook({
            trigger,
            dataSource,
          });
          this.logger.log(`added webhook trigger ${trigger.id}`);
          await this.processTrigger(trigger);
        } else {
          this.logger.debug(`trigger not found, syncflowId = ${syncflow.id}`);
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
          this.logger.debug('deleted trigger', trigger.id);
        }
      }
    }
  }

  async deleteTrigger(data: DeleteTriggerDto) {
    this.logger.debug('delete trigger', data);
    const { cron, jobId } = data;
    // await this.cronTriggerQueue.removeRepeatable({
    // jobId,
    // cron,
    // });
    this.logger.debug('deleted trigger', { jobId });
  }

  async handleReceivedWebhook(triggerId: TriggerId) {
    this.logger.log(`handle received webhook, triggerId = ${triggerId}`);
    const trigger = await this.triggerRepository.getById(triggerId);
    if (trigger) {
      await this.processTrigger(trigger);
    } else {
      this.logger.warn(`trigger ${triggerId} not found`);
    }
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
}
