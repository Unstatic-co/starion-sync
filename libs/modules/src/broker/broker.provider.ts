import { ConfigName } from '@lib/core/config';
import { TRANSPORT_MAP } from '@lib/core/config/broker.config';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';

export const BROKER_PROVIDER_TOKEN = 'BROKER_PROVIDER';
export const BrokerProvider = {
  provide: BROKER_PROVIDER_TOKEN,
  useFactory: (configService: ConfigService) => {
    const brokerConfig = configService.get(ConfigName.BROKER);
    return ClientProxyFactory.create({
      transport: TRANSPORT_MAP[brokerConfig.type],
      options: brokerConfig.options,
    });
  },
  inject: [ConfigService],
};
