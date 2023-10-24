import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { connectionName } from './constants';
import {
  DataSourceDataModel,
  DataSourceDataSchema,
  DataSourceModel,
  DataSourceSchema,
} from './mongodb';
import { DatabaseType, destinationDatabaseConfig } from '@lib/core/config';
import { ConfigModule } from '@nestjs/config';
import { IDestinationDatabaseService } from './destinationDatabase.service';
import * as Mongodb from './mongodb';
import * as Postgres from './postgres';
import { InjectTokens } from '../inject-tokens';

@Module({})
export class DestinationDatabaseModule {
  static async forRoot(): Promise<DynamicModule> {
    const { type, host, port, user, password, database, uri } =
      destinationDatabaseConfig;
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
      case DatabaseType.POSTGRES:
        return TypeOrmModule.forRoot({
          type: 'postgres',
          url: uri,
          ssl: {
            rejectUnauthorized: false,
          },
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
    const databaseType = destinationDatabaseConfig.type;
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
      case DatabaseType.POSTGRES:
        return TypeOrmModule.forFeature([], connectionName);
      default:
        throw new Error('Database type not supported');
    }
  }

  static async register(): Promise<DynamicModule> {
    const databaseType = destinationDatabaseConfig.type;
    let destDatabaseService;
    switch (databaseType) {
      case DatabaseType.MONGODB:
        destDatabaseService = Mongodb.DestinationDatabaseService;
        break;
      case DatabaseType.POSTGRES:
        destDatabaseService = Postgres.DestinationDatabaseService;
        break;
      default:
        throw new Error('Database type not supported');
    }
    const destDatabaseServiceProvider = {
      provide: InjectTokens.DESTINATION_DATABASE_SERVICE,
      useClass: destDatabaseService,
    };
    return {
      module: DestinationDatabaseModule,
      imports: [ConfigModule, DestinationDatabaseModule.forFeature()],
      providers: [destDatabaseServiceProvider],
      exports: [destDatabaseServiceProvider],
    };
  }

  static getType(): DatabaseType {
    return destinationDatabaseConfig.type;
  }
}
