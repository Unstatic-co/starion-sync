import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { RepositoryModule } from '@lib/modules';
import { DataSourceModule } from '../datasource/datasource.module';

@Module({
  imports: [RepositoryModule.registerAsync(), DataSourceModule],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
