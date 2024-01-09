import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { RepositoryModule } from '@lib/modules';
import { DataSourceModule } from '../datasource/datasource.module';
import { ControllerModule } from '../controller/controller.module';
import { BrokerModule } from '../broker/broker.module';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    DataSourceModule,
    ControllerModule,
    BrokerModule,
  ],
  providers: [WorkflowService],
  controllers: [WorkflowController],
  exports: [WorkflowService],
})
export class WorkflowModule {}
