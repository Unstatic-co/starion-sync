import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import { InjectTokens } from 'src/common/inject-tokens';
import { ConfigName, TRANSPORT_MAP } from 'src/config';

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
