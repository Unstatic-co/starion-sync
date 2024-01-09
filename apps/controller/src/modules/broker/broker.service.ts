import { EventName, EventPayload } from '@lib/core';
import { InjectTokens } from '@lib/modules';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name);

  constructor(
    @Inject(InjectTokens.BROKER_CLIENT)
    private readonly brokerClient: ClientKafka,
  ) {}

  async testSentEvent() {
    this.logger.debug('testSentEvent');
    await this.brokerClient.emit('test-event-from-worker', {
      value: 'test-event-from-worker',
    });
  }

  async emitEvent(
    eventName: EventName,
    data: {
      key?: string;
      payload: EventPayload;
      headers?: Record<string, string>;
    },
  ) {
    this.logger.debug(`emitEvent: ${eventName}`);
    await this.brokerClient.emit(eventName, {
      key: data.key,
      value: data.payload,
      headers: data.headers,
    });
  }
}
