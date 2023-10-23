import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { TriggerService } from '../trigger/trigger.service';
import {
  ConnectionCreatedPayload,
  ConnectionDeletedPayload,
  DataSourceErrorPayload,
  EventNames,
} from '@lib/core';
import { ExternalError } from '@lib/core/error';

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
    try {
      await this.triggerService.createTriggerFromSyncConnection(data);
    } catch (error) {
      if (error instanceof ExternalError) {
        this.logger.warn(
          `External error when creating trigger: ${error.code} - ${error.message}`,
        );
        await this.brokerService.emitEvent(EventNames.DATA_SOURCE_ERROR, {
          payload: {
            dataSourceId: data.sourceId,
            code: error.code,
            message: error.message,
          } as DataSourceErrorPayload,
        });
      }
    }
  }

  @EventPattern(EventNames.CONNECTION_DELETED)
  async onConnectionDeleted(data: ConnectionDeletedPayload) {
    this.logger.debug('onConnectionDeleted', data);
    try {
      await this.triggerService.deleteTriggerFromSyncConnection(data);
    } catch (error) {
      if (error instanceof ExternalError) {
        this.logger.warn(
          `External error when delete trigger: ${error.code} - ${error.message}`,
        );
        await this.brokerService.emitEvent(EventNames.DATA_SOURCE_ERROR, {
          payload: {
            dataSourceId: data.sourceId,
            code: error.code,
            message: error.message,
          } as DataSourceErrorPayload,
        });
      }
    }
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
