import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { RepositoryModule } from '@lib/modules';

@Module({
  imports: [RepositoryModule.registerAsync()],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
