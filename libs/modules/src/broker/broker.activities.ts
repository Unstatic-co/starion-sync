import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectTokens } from '@lib/modules';
import { ClientKafka } from '@nestjs/microservices';
import { EventName, EventPayload } from '@lib/core';

@Injectable()
export class BrokerActivities {
  private readonly logger = new Logger(BrokerActivities.name);
  constructor(
    @Inject(InjectTokens.BROKER_CLIENT)
    private readonly brokerClient: ClientKafka,
  ) {}

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
