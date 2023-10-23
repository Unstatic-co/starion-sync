import { Controller, Logger, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { BrokerService } from './broker.service';

@Controller('broker')
export class BrokerController {
  private readonly logger = new Logger(BrokerController.name);
  constructor(private readonly brokerService: BrokerService) {}

  @Post('test-sent')
  async testSent() {
    await this.brokerService.testSentEvent();
  }
}
