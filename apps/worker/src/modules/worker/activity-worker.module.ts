import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../../activities/activities.module';
import { ActivityWorkerProvider } from './activity-worker.provider';

@Module({
  imports: [ActivitiesModule],
  controllers: [],
  providers: [ActivityWorkerProvider],
})
export class ActivityWorkerModule {}
