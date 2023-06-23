import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  appConfigRegister,
  databaseConfigRegister,
  microsoftConfigRegister,
  orchestratorConfigRegister,
  redisConfigRegister,
} from '@lib/core/config';
import { DatabaseModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { BullModule, BullRootModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { ConfigName, RedisConfig } from '@lib/core/config';
import { TriggerModule } from './modules/trigger/trigger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        brokerConfigRegister,
        orchestratorConfigRegister,
        microsoftConfigRegister,
        redisConfigRegister,
      ],
    }),
    DatabaseModule.forRootAsync(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(
          `${ConfigName.REDIS}`,
        );
        const { host, port, password } = redisConfig;
        return {
          redis: {
            host,
            port,
            password,
          },
        } as BullRootModuleOptions;
      },
    }),
    BrokerModule,
    CommonModule,
    // ActivityModule,
    // WorkflowModule,
    // OrchestratorWorkerModule,
    TriggerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
