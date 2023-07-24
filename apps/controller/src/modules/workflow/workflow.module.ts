import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { RepositoryModule } from '@lib/modules';
import { DataSourceModule } from '../datasource/datasource.module';
import { ControllerModule } from '../controller/controller.module';

@Module({
  imports: [
    RepositoryModule.registerAsync(),
    DataSourceModule,
    ControllerModule,
  ],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
