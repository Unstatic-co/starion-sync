import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(private readonly brokerService: BrokerService) {}

  @EventPattern('test-event-to-webhook')
  async testEvent(message: any) {
    this.logger.debug('test-event-to-webhook', message);
  }

  @Post('test-sent-from-webhook')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
