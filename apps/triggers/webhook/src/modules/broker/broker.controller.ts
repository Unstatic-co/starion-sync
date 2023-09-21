import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { TriggerService } from '../trigger/trigger.service';
import {
  ConnectionCreatedPayload,
  ConnectionDeletedPayload,
  EventNames,
} from '@lib/core';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(
    private readonly brokerService: BrokerService,
    private readonly triggerService: TriggerService,
  ) {}

  @EventPattern(EventNames.CONNECTION_CREATED)
  async onConnectionCreated(data: ConnectionCreatedPayload) {
    this.logger.debug('onConnectionCreated', data);
    await this.triggerService.createTriggerFromSyncConnection(data);
  }

  @EventPattern(EventNames.CONNECTION_DELETED)
  async onConnectionDeleted(data: ConnectionDeletedPayload) {
    this.logger.debug('onConnectionDeleted', data);
    await this.triggerService.deleteTriggerFromSyncConnection(data);
  }

  // @EventPattern('test-event-to-webhook-trigger')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-webhook-trigger', message);
  }

  @Post('test-sent')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
