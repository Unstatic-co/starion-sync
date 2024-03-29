import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  appConfigRegister,
  brokerConfigRegister,
  databaseConfigRegister,
  // destinationDatabaseConfigRegister,
  googleConfigRegister,
  microsoftConfigRegister,
  orchestratorConfigRegister,
  processorConfigRegister,
} from '@lib/core/config';
import {
  DatabaseModule,
  //  DestinationDatabaseModule,
  LoggerModule
} from '@lib/modules';
import { BrokerModule } from './modules/broker/broker.module';
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
        // destinationDatabaseConfigRegister,
        brokerConfigRegister,
        orchestratorConfigRegister,
        processorConfigRegister,
        microsoftConfigRegister,
        googleConfigRegister,
      ],
    }),
    LoggerModule,
    DatabaseModule.forRootAsync(),
    // DestinationDatabaseModule.forRoot(),
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
export class AppModule { }
