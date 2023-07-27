import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseType, databaseConfig as dbConfig } from '@lib/core/config';
import { connectionName } from './constants';
import {
  DataSourceDataModel,
  DataSourceDataSchema,
  DataSourceModel,
  DataSourceSchema,
} from './mongodb';

@Module({})
export class DestinationDatabaseModule {
  static async forRoot(): Promise<DynamicModule> {
    const { type, host, port, user, password, database, uri } = dbConfig;
    switch (type) {
      case DatabaseType.MONGODB:
        return MongooseModule.forRoot(uri, {
          connectionName,
        });
      case DatabaseType.MYSQL:
        return TypeOrmModule.forRoot({
          type: 'mysql',
          host,
          port,
          username: user,
          password,
          database,
          entities: [],
          synchronize: true,
          name: connectionName,
        });
      default:
        throw new Error('Database type not supported');
    }
  }

  static async forFeature(): Promise<DynamicModule> {
    const databaseType = dbConfig.type;
    switch (databaseType) {
      case DatabaseType.MONGODB:
        return MongooseModule.forFeature(
          [
            { name: DataSourceModel.name, schema: DataSourceSchema },
            { name: DataSourceDataModel.name, schema: DataSourceDataSchema },
          ],
          connectionName,
        );
      case DatabaseType.MYSQL:
        break;
      default:
        throw new Error('Database type not supported');
    }
  }

  static getType(): DatabaseType {
    return dbConfig.type;
  }
}
