import { Module } from '@nestjs/common';
import { OrchestratorWorkerProvider } from './orchestratorWorker.provider';
import { OrchestratorModule } from '@lib/modules/orchestrator/orchestrator.module';
import { ActivityModule } from '../activities/activity.module';
import { OrchestratorWorkerService } from './orchestratorWorker.service';

@Module({
  imports: [OrchestratorModule, ActivityModule],
  providers: [OrchestratorWorkerProvider, OrchestratorWorkerService],
  exports: [OrchestratorWorkerService],
})
export class OrchestratorWorkerModule {}
