import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  appConfigRegister,
  databaseConfigRegister,
  googleConfigRegister,
  microsoftConfigRegister,
  orchestratorConfigRegister,
  redisConfigRegister,
} from '@lib/core/config';
import { DatabaseModule, LoggerModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { ConfigName, RedisConfig } from '@lib/core/config';
import { TriggerModule } from './modules/trigger/trigger.module';
import { webhookConfigRegister } from './config';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        brokerConfigRegister,
        orchestratorConfigRegister,
        redisConfigRegister,
        webhookConfigRegister,
        microsoftConfigRegister,
        googleConfigRegister,
      ],
    }),
    DatabaseModule.forRootAsync(),
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
    }),
    LoggerModule,
    BrokerModule,
    CommonModule,
    TriggerModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
