import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  ConfigName,
  RedisConfig,
  appConfigRegister,
  brokerConfigRegister,
  databaseConfigRegister,
  redisConfigRegister,
} from '@lib/core/config';
import { DatabaseModule, LoggerModule } from '@lib/modules';
import { BrokerModule } from './modules/broker/broker.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { webhookConfigRegister } from './config/webhook.config';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        redisConfigRegister,
        brokerConfigRegister,
        webhookConfigRegister,
      ],
    }),
    DatabaseModule.forRootAsync(),
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
    BrokerModule,
    CommonModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
