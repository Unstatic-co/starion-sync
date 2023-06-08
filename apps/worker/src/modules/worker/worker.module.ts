import { Module } from '@nestjs/common';
import { WorkerProvider } from './worker.provider';
import { WorkerService } from './worker.service';
import { ActivitiesModule } from '../../activities';
import { OrchestratorModule } from '@lib/modules/orchestrator/orchestrator.module';

@Module({
  imports: [OrchestratorModule, ActivitiesModule],
  controllers: [],
  providers: [WorkerProvider, WorkerService],
})
export class WorkerModule {}
