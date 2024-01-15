import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DataSourceModel,
  DataSourceSchema,
} from '../repository/mongodb/models/dataSource.model';
import { DatabaseType, databaseConfig as dbConfig } from '@lib/core/config';
import {
  DataProviderModel,
  DataProviderSchema,
  IdempotencyModel,
  IdempotencySchema,
  SyncConnectionModel,
  SyncConnectionSchema,
  WebhookModel,
  WebhookSchema,
} from '../repository';
import {
  SyncflowModel,
  SyncflowSchema,
} from '../repository/mongodb/models/syncflow.model';
import {
  TriggerModel,
  TriggerSchema,
} from '../repository/mongodb/models/trigger.model';

@Module({})
export class DatabaseModule {
  static async forRootAsync(): Promise<DynamicModule> {
    const { type, host, port, user, password, database, uri } = dbConfig;
    switch (type) {
      case DatabaseType.MONGODB:
        return MongooseModule.forRoot(uri, {
          tlsInsecure: true,
          tlsAllowInvalidCertificates: true,
          tlsAllowInvalidHostnames: true,
          sslValidate: false,
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
        });
      default:
        return MongooseModule.forRoot(uri, {
          tlsInsecure: true,
          tlsAllowInvalidCertificates: true,
          tlsAllowInvalidHostnames: true,
          sslValidate: false,
        });
    }
  }

  static async forFeatureAsync(): Promise<DynamicModule> {
    const databaseType = dbConfig.type;
    switch (databaseType) {
      case DatabaseType.MONGODB:
        return MongooseModule.forFeature([
          { name: IdempotencyModel.name, schema: IdempotencySchema },
          { name: DataSourceModel.name, schema: DataSourceSchema },
          { name: DataProviderModel.name, schema: DataProviderSchema },
          { name: SyncConnectionModel.name, schema: SyncConnectionSchema },
          { name: SyncflowModel.name, schema: SyncflowSchema },
          { name: TriggerModel.name, schema: TriggerSchema },
          { name: WebhookModel.name, schema: WebhookSchema },
        ]);
      // case DatabaseType.MYSQL:
      default:
        throw new Error(`Database type ${databaseType} is not supported`);
    }
  }

  static forFeature(): DynamicModule {
    const databaseType = dbConfig.type;
    switch (databaseType) {
      case DatabaseType.MONGODB:
        return MongooseModule.forFeature([
          { name: IdempotencyModel.name, schema: IdempotencySchema },
          { name: DataSourceModel.name, schema: DataSourceSchema },
          { name: DataProviderModel.name, schema: DataProviderSchema },
          { name: SyncConnectionModel.name, schema: SyncConnectionSchema },
          { name: SyncflowModel.name, schema: SyncflowSchema },
          { name: TriggerModel.name, schema: TriggerSchema },
          { name: WebhookModel.name, schema: WebhookSchema },
        ]);
      // case DatabaseType.MYSQL:
      default:
        throw new Error(`Database type ${databaseType} is not supported`);
    }
  }

  static getType(): DatabaseType {
    return dbConfig.type;
  }
}
