import { ProviderType } from '@lib/core';
import { Logger } from '@nestjs/common';
import {
  HostComponentInfo,
  ContextId,
  ContextIdFactory,
  ContextIdStrategy,
} from '@nestjs/core';
import { RequestContext } from '@nestjs/microservices';
import { IncomingMessage } from 'http';

const providers = new Map<ProviderType, ContextId>(
  Object.values(ProviderType).map((providerType) => [
    providerType,
    ContextIdFactory.create(),
  ]),
);

const logger = new Logger('DataProviderContextIdStrategy');

export class AggregateByDataProvidertTypeContextIdStrategy
  implements ContextIdStrategy
{
  attach(
    contextId: ContextId,
    request: RequestContext | IncomingMessage | any,
    // http: IncomminMessage, kafka: RequestContext
  ) {
    const headers =
      request.headers || request.getContext()?.getMessage()?.headers;
    const providerType = headers
      ? ((headers['x-provider-type'] ||
          headers['provider-type']) as ProviderType)
      : null;

    let subTreeId: ContextId;
    if (providerType && providers.has(providerType)) {
      subTreeId = providers.get(providerType);
      logger.debug(`Use ${providerType} subtree`);
    } else {
      subTreeId = ContextIdFactory.create();
      logger.debug(`Use default subtree`);
    }

    // If tree is not durable, return the original "contextId" object
    return {
      resolve: (info: HostComponentInfo) => {
        const context = info.isTreeDurable ? subTreeId : contextId;
        return context;
      },
      payload: { dataProviderType: providerType },
    };
  }
}
