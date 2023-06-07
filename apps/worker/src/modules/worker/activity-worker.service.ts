import { Inject, Injectable } from '@nestjs/common';
import { WORKFLOW_WORKER } from './workflow-worker.provider';
import { Worker } from '@temporalio/worker';
import { ACTIVITY_WORKER } from './activity-worker.provider';

@Injectable()
export class ActivityWorkerService {
  constructor(
    @Inject(ACTIVITY_WORKER) private readonly activityWorker: Worker,
  ) {}

  async close() {
    await this.activityWorker.shutdown();
  }
}
