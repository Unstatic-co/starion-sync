import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import * as MongoRepositories from './mongodb/repositories';
import { DatabaseType } from '@lib/core/config';

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
        reporitories.push(MongoRepositories.DataSourceRepository);
      default:
        reporitories.push(MongoRepositories.DataSourceRepository);
    }

    return {
      module,
      imports: [DatabaseModule.forFeatureAsync()],
      providers: reporitories,
      exports: reporitories,
    };
  }
}
