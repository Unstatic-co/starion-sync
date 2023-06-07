import { BROKER_PROVIDER } from '@lib/modules/broker/broker.provider';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name);

  constructor(
    @Inject(BROKER_PROVIDER) private readonly brokerClient: ClientKafka,
  ) {}

  async testSentEvent() {
    this.logger.debug('testSentEvent');
    await this.brokerClient.emit('test-event-from-worker', {
      value: 'test-event-from-worker',
    });
  }
}
