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
} from '@lib/core/config';
import { DatabaseModule, LoggerModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ActivityModule } from './modules/activities/activity.module';
import { OrchestratorWorkerModule } from './modules/orchestrator-worker/orchestratorWorker.module';
import { controllerConfigRegister } from './modules/config';
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
        googleConfigRegister,
        controllerConfigRegister,
      ],
    }),
    LoggerModule,
    DatabaseModule.forRootAsync(),
    BrokerModule,
    CommonModule,
    WorkflowModule,
    ActivityModule,
    OrchestratorWorkerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
