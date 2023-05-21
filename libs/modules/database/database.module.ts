import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DataSourceModel,
  DataSourceSchema,
} from '../repository/mongodb/models/datasource.model';
import { DatabaseType, databaseConfig as dbConfig } from '../config';

@Module({})
export class DatabaseModule {
  static async forRootAsync(): Promise<DynamicModule> {
    const { type, host, port, user, password, database, uri } = dbConfig;
    switch (type) {
      case DatabaseType.MONGODB:
        return MongooseModule.forRoot(uri);
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
        return MongooseModule.forRoot(uri);
    }
  }

  static async forFeatureAsync(): Promise<DynamicModule> {
    const databaseType = dbConfig.type;
    switch (databaseType) {
      case DatabaseType.MONGODB:
        return MongooseModule.forFeature([
          { name: DataSourceModel.name, schema: DataSourceSchema },
        ]);
      // case DatabaseType.MYSQL:
      default:
        return MongooseModule.forFeature([
          { name: DataSourceModel.name, schema: DataSourceSchema },
        ]);
    }
  }

  static async getType(): Promise<DatabaseType> {
    return dbConfig.type;
  }
}
