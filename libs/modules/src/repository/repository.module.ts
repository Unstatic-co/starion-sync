import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import * as MongoRepositories from './mongodb/repositories';
import { DatabaseType } from '@lib/core/config';
import { DATA_PROVIDER_REPOSITORY, DATA_SOURCE_REPOSITORY } from './classes';

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
            provide: DATA_PROVIDER_REPOSITORY,
            useClass: MongoRepositories.DataProviderRepository,
          },
          {
            provide: DATA_SOURCE_REPOSITORY,
            useClass: MongoRepositories.DataSourceRepository,
          },
        );
      default:
        reporitories.push(
          {
            provide: DATA_PROVIDER_REPOSITORY,
            useClass: MongoRepositories.DataProviderRepository,
          },
          {
            provide: DATA_SOURCE_REPOSITORY,
            useClass: MongoRepositories.DataSourceRepository,
          },
        );
    }

    return {
      module,
      imports: [DatabaseModule.forFeatureAsync()],
      providers: reporitories,
      exports: reporitories,
    };
  }
}
