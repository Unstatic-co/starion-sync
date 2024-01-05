import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import * as MongoRepositories from './mongodb/repositories';
import { DatabaseType } from '@lib/core/config';
import { InjectTokens } from '../inject-tokens';
import { TransactionManager as MongodbTransactionManager } from './mongodb';

export interface RepositoryModuleOptions {
  databaseType: DatabaseType;
}

@Module({})
export class RepositoryModule {
  static async registerAsync(): Promise<DynamicModule> {
    const module = RepositoryModule;

    const databaseType = await DatabaseModule.getType();
    const reporitories = [];

    switch (databaseType) {
      case DatabaseType.MONGODB:
        reporitories.push(
          {
            provide: InjectTokens.DATA_PROVIDER_REPOSITORY,
            useClass: MongoRepositories.DataProviderRepository,
          },
          {
            provide: InjectTokens.DATA_SOURCE_REPOSITORY,
            useClass: MongoRepositories.DataSourceRepository,
          },
          {
            provide: InjectTokens.SYNC_CONNECTION_REPOSITORY,
            useClass: MongoRepositories.SyncConnectionRepository,
          },
          {
            provide: InjectTokens.SYNCFLOW_REPOSITORY,
            useClass: MongoRepositories.SyncflowRepository,
          },
          {
            provide: InjectTokens.TRIGGER_REPOSITORY,
            useClass: MongoRepositories.TriggerRepository,
          },
          {
            provide: InjectTokens.WEBHOOK_REPOSITORY,
            useClass: MongoRepositories.WebhookRepository,
          },
          {
            provide: InjectTokens.TRANSACTION_MANAGER,
            useClass: MongodbTransactionManager,
          }
        );
        break;
      default:
        throw new Error(`Database type ${databaseType} is not supported`);
    }

    return {
      module,
      imports: [DatabaseModule.forFeatureAsync()],
      providers: reporitories,
      exports: reporitories,
    };
  }
}
