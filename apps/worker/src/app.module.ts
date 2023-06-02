import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  ConfigName,
  appConfigRegister,
  databaseConfigRegister,
} from '@lib/core/config';
import { DatabaseModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { TemporalModule } from 'nestjs-temporal';
import {
  bundleWorkflowCode,
  NativeConnection,
  Runtime,
} from '@temporalio/worker';
import * as path from 'path';
import { orchestratorConfigRegister } from '@lib/core/config/orchestrator.config';
import { GreetingActivity } from './temporal/activity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        brokerConfigRegister,
        orchestratorConfigRegister,
      ],
    }),
    DatabaseModule.forRootAsync(),
    BrokerModule,
    ScheduleModule.forRoot(),
    CommonModule,
    TemporalModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        Runtime.install({});
        const temporalHost = config.get(`${ConfigName.ORCHESTRATOR}.address`);
        console.log('temporalHost', temporalHost);
        const connection = await NativeConnection.connect({
          address: temporalHost,
        });
        const workflowBundle = await bundleWorkflowCode({
          workflowsPath: path.join(__dirname, './temporal/workflows'),
        });

        return {
          connection,
          taskQueue: 'default',
          workflowBundle,
          activities: {
            greeting: () => {
              console.log('greetingActivity');
            },
          },
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, GreetingActivity],
})
export class AppModule {}
