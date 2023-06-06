import { BROKER_PROVIDER_TOKEN } from '@lib/modules/broker/broker.provider';
import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable({
  scope: Scope.REQUEST,
  durable: true,
})
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name);

  constructor(
    @Inject(BROKER_PROVIDER_TOKEN) private readonly brokerClient: ClientKafka,
  ) {}

  async testSentEvent() {
    this.logger.debug('testSentEvent');
    await this.brokerClient.emit('test-event-from-worker', {
      value: 'test-event-from-worker',
    });
  }
}
