import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import {
  ConnectionCreatedPayload,
  DataSourceDeletedPayload,
  DataSourceErrorPayload,
  EventNames,
  SyncflowFailedPayload,
  SyncflowScheduledPayload,
} from '@lib/core';
import { WebhookService } from '../webhook/webhook.service';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(
    private readonly brokerService: BrokerService,
    private readonly webhookService: WebhookService,
  ) {}

  @EventPattern(EventNames.DATA_SOURCE_DELETED)
  async dataSourceDeleted(data: DataSourceDeletedPayload) {
    this.logger.log(`data source ${data.dataSourceId} deleted`);
    return this.webhookService.addWebhookExecution(
      EventNames.DATA_SOURCE_DELETED,
      data,
    );
  }

  @EventPattern(EventNames.DATA_SOURCE_ERROR)
  async dataSourceError(data: DataSourceErrorPayload) {
    this.logger.log(`data source ${data.dataSourceId} error`);
    return this.webhookService.addWebhookExecution(
      EventNames.DATA_SOURCE_ERROR,
      data,
    );
  }

  @EventPattern(EventNames.CONNECTION_CREATED)
  async connectionCreated(data: ConnectionCreatedPayload) {
    this.logger.log(`connection ${data.id} created`);
    return this.webhookService.addWebhookExecution(
      EventNames.CONNECTION_CREATED,
      data,
    );
  }

  @EventPattern(EventNames.SYNCFLOW_SCHEDULED)
  async syncflowScheduled(data: SyncflowScheduledPayload) {
    this.logger.log(`syncflow ${data.syncflow.id} scheduled`);
    return this.webhookService.addWebhookExecution(
      EventNames.SYNCFLOW_SCHEDULED,
      data,
    );
  }

  @EventPattern(EventNames.SYNCFLOW_SUCCEED)
  async syncflowSucceed(data: SyncflowScheduledPayload) {
    this.logger.log(`syncflow ${data.syncflowId} succeed`);
    return this.webhookService.addWebhookExecution(
      EventNames.SYNCFLOW_SUCCEED,
      data,
    );
  }

  @EventPattern(EventNames.SYNCFLOW_COMPLETED)
  async syncflowCompleted(data: SyncflowScheduledPayload) {
    this.logger.log(`syncflow ${data.syncflowId} completed`);
    return this.webhookService.addWebhookExecution(
      EventNames.SYNCFLOW_COMPLETED,
      data,
    );
  }

  @EventPattern(EventNames.SYNCFLOW_FAILED)
  async syncflowFailed(data: SyncflowFailedPayload) {
    this.logger.log(`syncflow ${data.syncflowId} failed`);
    return this.webhookService.addWebhookExecution(
      EventNames.SYNCFLOW_FAILED,
      data,
    );
  }

  // @EventPattern('test-event-to-webhook')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-webhook', message);
  }

  // @Post('test-sent-from-webhook')
  // async testSent() {
  // await this.brokerService.testSentEvent();
  // }
}
