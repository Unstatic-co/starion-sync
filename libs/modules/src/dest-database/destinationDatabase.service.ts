import { ConfigService } from '@nestjs/config';
import { InjectTokens } from '../inject-tokens';
import { ConfigName, DatabaseType } from '@lib/core/config';
import { DestinationDatabaseConfig } from '@lib/core/config/destinationDatabase.config';
import * as Mongodb from './mongodb';

export abstract class DestinationDatabaseService {
  abstract test(): Promise<void>;
}

export const DestinationDatabaseServiceProvider = {
  provide: DestinationDatabaseService,
  useFactory: async (configService: ConfigService) => {
    const destinationDatabaseConfig = configService.get(
      `${ConfigName.DESTINATION_DATABASE}`,
    ) as DestinationDatabaseConfig;

    switch (destinationDatabaseConfig.type) {
      case DatabaseType.MONGODB:
        return Mongodb.DestinationDatabaseService;
      case DatabaseType.MYSQL:
        break;
      default:
        throw new Error('Database type not supported');
    }
  },
  inject: [ConfigService],
};
