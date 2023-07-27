import { Module } from '@nestjs/common';
import { WorkflowWorkerProvider } from './workflow-worker.provider';
import { WorkflowWorkerService } from './workflow-worker.service';

@Module({
  imports: [],
  controllers: [],
  providers: [WorkflowWorkerProvider, WorkflowWorkerService],
})
export class WorkflowWorkerModule {}
