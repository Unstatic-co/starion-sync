import { Module } from '@nestjs/common';
import { WorkflowController } from './worklow.controller';
import { WorkflowService } from './workflow.service';
import { OrchestratorProviders } from '@lib/modules/orchestrator';

@Module({
  imports: [],
  controllers: [WorkflowController],
  providers: [...OrchestratorProviders, WorkflowService],
  exports: [...OrchestratorProviders, WorkflowService],
})
export class WorkflowModule {}
