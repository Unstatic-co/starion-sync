import { Module } from '@nestjs/common';
import { WorkflowController } from './worklow.controller';
import { WorkflowService } from './workflow.service';
import orchestratorProviders from '@lib/modules/orchestrator/orchestrator.provider';

@Module({
  imports: [],
  controllers: [WorkflowController],
  providers: [...orchestratorProviders, WorkflowService],
  exports: [...orchestratorProviders, WorkflowService],
})
export class WorkflowModule {}
