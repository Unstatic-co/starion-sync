import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { EventNames, SyncflowSucceedPayload } from '@lib/core';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);

  constructor(private readonly brokerService: BrokerService) {}

  @EventPattern(EventNames.SYNCFLOW_SUCCEED)
  async handleSyncflowSucceedEvent(payload: SyncflowSucceedPayload) {
    this.logger.debug('handleSyncflowSucceedEvent', payload);
  }

  @EventPattern('test-event-to-post-processor')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-post-processor', message);
  }

  @Post('test-sent')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
