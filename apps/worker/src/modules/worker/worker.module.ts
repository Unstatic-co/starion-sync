import { Module } from '@nestjs/common';
import { WorkerProvider } from './worker.provider';
import { WorkerService } from './worker.service';
import { ActivitiesModule } from '../../activities';

@Module({
  imports: [ActivitiesModule],
  controllers: [],
  providers: [WorkerProvider, WorkerService],
})
export class WorkerModule {}
