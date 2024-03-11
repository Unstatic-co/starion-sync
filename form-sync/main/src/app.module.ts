import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ConfigName,
  DatabaseConfig,
  RedisConfig,
  appConfigRegister,
  databaseConfigRegister,
  microsoftConfigRegister,
  redisConfigRegister,
  starionSyncConfigRegister,
} from './config';
import { orchestratorConfigRegister } from './config/orchestrator.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import entities from './entities';
import { FormSyncModule } from './modules/formsync/formsync.module';
import { MicrosoftModule } from './modules/third-party/microsoft';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import { DataSourceModule } from './modules/datasource/dataSource.module';
import { moduleConfigRegister } from './config/module.config';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookModule } from './modules/webhook/webhook.module';
import { LoggerModule } from './modules/logger/logger.module';
import { googleConfigRegister } from './config/google.config';
import { CleanerModule } from './modules/cleaner/cleaner.module';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        orchestratorConfigRegister,
        redisConfigRegister,
        moduleConfigRegister,
        starionSyncConfigRegister,
        microsoftConfigRegister,
        googleConfigRegister,
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>(ConfigName.DATABASE);
        const { uri, database, tlsEnabled, schema } = dbConfig;
        return {
          type: 'postgres',
          url: uri,
          database,
          ssl: tlsEnabled
            ? {
                rejectUnauthorized: false,
              }
            : false,
          entities: entities,
          synchronize: true,
          schema,
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>(ConfigName.DATABASE);
        return {
          uri: dbConfig.metadataDbUri,
          dbName: dbConfig.database,
          sslValidate: false,
          tlsInsecure: true,
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(
          `${ConfigName.REDIS}`,
        );
        const { host, port, password, db, tls } = redisConfig;
        const store = await redisStore({
          socket: {
            host,
            port: Number(port),
            tls,
            db,
            connectTimeout: 10000,
            disableOfflineQueue: false,
            reconnectStrategy: (retries) => Math.min(retries * 50, 5000),
          },
          password,
          database: db,
          pingInterval: 1000 * 60 * 2,
          disableOfflineQueue: true,
          // legacyMode: true,
        } as RedisClientOptions);
        store.client.on('error', (error) => {
          console.error(error);
        });
        store.client.on('connect', () => {
          console.log('Cache manager connected to redis');
        });
        store.client.on('ready', () => {
          console.log('Cache manager ready to accept commands');
        });
        store.client.on('reconnecting', () => {
          console.log('Cache manager reconnecting to redis');
        });
        store.client.on('end', () => {
          console.log('Cache manager disconnected from redis');
        });

        return {
          store,
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(
          `${ConfigName.REDIS}`,
        );
        const { host, port, password, db, tls } = redisConfig;
        return {
          redis: {
            host,
            port,
            password,
            db,
            tls: tls ? {} : undefined,
          },
        } as BullRootModuleOptions;
      },
      imports: [ConfigModule],
    }),
    LoggerModule,
    FormSyncModule,
    DataSourceModule,
    CleanerModule,
    MicrosoftModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
