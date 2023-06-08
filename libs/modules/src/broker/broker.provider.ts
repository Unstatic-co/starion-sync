import { ConfigName } from '@lib/core/config';
import { TRANSPORT_MAP } from '@lib/core/config/broker.config';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import { InjectTokens } from '../inject-tokens';

export const BrokerProvider = {
  provide: InjectTokens.BROKER_CLIENT,
  useFactory: (configService: ConfigService) => {
    const brokerConfig = configService.get(ConfigName.BROKER);
    return ClientProxyFactory.create({
      transport: TRANSPORT_MAP[brokerConfig.type],
      options: brokerConfig.options,
    });
  },
  inject: [ConfigService],
};
