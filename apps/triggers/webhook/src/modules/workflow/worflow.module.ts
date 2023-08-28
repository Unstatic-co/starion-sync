import { Module } from '@nestjs/common';
import { WorkflowController } from './worklow.controller';
import { WorkflowService } from './workflow.service';
import { OrchestratorModule } from '@lib/modules/orchestrator/orchestrator.module';

@Module({
  imports: [OrchestratorModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
