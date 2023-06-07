import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import { appConfigRegister, databaseConfigRegister } from '@lib/core/config';
import { DatabaseModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { orchestratorConfigRegister } from '@lib/core/config/orchestrator.config';
import { ActivitiesModule } from './activities/activities.module';
import { WorkflowModule } from './modules/workflow/worflow.module';
import { WorkerModule } from './modules/worker/worker.module';

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
    ActivitiesModule,
    WorkflowModule,
    // ActivityWorkerModule,
    // WorkflowWorkerModule,
    WorkerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
