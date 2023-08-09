import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { ConnectionCreatedPayload, EventNames } from '@lib/core';
import { WebhookService } from '../webhook/webhook.service';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(
    private readonly brokerService: BrokerService,
    private readonly webhookService: WebhookService,
  ) {}

  @EventPattern(EventNames.CONNECTION_CREATED)
  async connectionCreated(data: ConnectionCreatedPayload) {
    this.logger.log(`connection ${data.id} created`);
    return this.webhookService.addWebhookExecution(
      EventNames.CONNECTION_CREATED,
      data,
    );
  }

  @EventPattern('test-event-to-webhook')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-webhook', message);
  }

  @Post('test-sent-from-webhook')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
