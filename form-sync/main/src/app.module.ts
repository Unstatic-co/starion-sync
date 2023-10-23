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
        const { uri, database } = dbConfig;
        return {
          type: 'postgres',
          url: uri,
          database,
          entities: entities,
          synchronize: true,
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
        const { host, port, password, tls } = redisConfig;
        return {
          store: await redisStore({
            socket: {
              host,
              port: Number(port),
              tls,
            },
            password,
            database: 0,
          }),
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(
          `${ConfigName.REDIS}`,
        );
        const { host, port, password, tls } = redisConfig;
        return {
          redis: {
            host,
            port,
            password,
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
