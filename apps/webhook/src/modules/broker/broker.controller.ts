import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';
import { EventNames } from '@lib/core';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(private readonly brokerService: BrokerService) {}

  @EventPattern(EventNames.CONNECTION_CREATED)
  async connectionCreated(message: any) {
    this.logger.debug('connectionCreated', message);
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
