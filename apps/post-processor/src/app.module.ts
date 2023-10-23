import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './modules/common/common.module';
import {
  appConfigRegister,
  databaseConfigRegister,
  storageConfigRegister,
} from '@lib/core/config';
import { DatabaseModule, LoggerModule } from '@lib/modules';
import { brokerConfigRegister } from '@lib/core/config/broker.config';
import { BrokerModule } from './modules/broker/broker.module';
import { orchestratorConfigRegister } from '@lib/core/config/orchestrator.config';
import { WorkflowModule } from './modules/workflow/worflow.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfigRegister,
        databaseConfigRegister,
        brokerConfigRegister,
        orchestratorConfigRegister,
        storageConfigRegister,
      ],
    }),
    LoggerModule,
    DatabaseModule.forRootAsync(),
    BrokerModule,
    CommonModule,
    WorkflowModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
