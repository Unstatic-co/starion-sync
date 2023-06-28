import { Module } from '@nestjs/common';
import { WorkflowController } from './worklow.controller';
import { WorkflowService } from './workflow.service';
import { RepositoryModule } from '@lib/modules';

@Module({
  imports: [RepositoryModule.registerAsync()],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
