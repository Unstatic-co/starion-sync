import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  appConfigRegister,
  databaseConfigRegister,
  destinationDatabaseConfigRegister,
  microsoftConfigRegister,
  orchestratorConfigRegister,
  brokerConfigRegister,
} from '@lib/core/config';
import {
  DatabaseModule,
  DestinationDatabaseModule,
  LoggerModule,
} from '@lib/modules';
import { BrokerModule } from './modules/broker/broker.module';
import { DataProviderModule } from './modules/data-provider/data-provider.module';
import { DataSourceModule } from './modules/data-source/data-source.module';
import { SyncConnectionModule } from './modules/sync-connection/syncConnection.module';
import { OrchestratorWorkerModule } from './modules/orchestrator-worker/orchestratorWorker.module';
import { ActivityModule } from './modules/activities/activity.module';
import { WorkflowModule } from './modules/workflow/worflow.module';
import { WebhookModule } from './modules/webhook/webhook.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        destinationDatabaseConfigRegister,
        brokerConfigRegister,
        orchestratorConfigRegister,
        microsoftConfigRegister,
      ],
    }),
    LoggerModule,
    DatabaseModule.forRootAsync(),
    DestinationDatabaseModule.forRoot(),
    BrokerModule,
    ScheduleModule.forRoot(),
    CommonModule,
    DataProviderModule,
    DataSourceModule,
    SyncConnectionModule,
    WebhookModule,
    ActivityModule,
    WorkflowModule,
    OrchestratorWorkerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
