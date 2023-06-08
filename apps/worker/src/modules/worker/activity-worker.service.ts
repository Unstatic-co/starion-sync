import { Inject, Injectable } from '@nestjs/common';
import { Worker } from '@temporalio/worker';
import { InjectTokens } from '../../common/inject-tokens';

@Injectable()
export class ActivityWorkerService {
  constructor(
    @Inject(InjectTokens.ACTIVITY_WORKER)
    private readonly activityWorker: Worker,
  ) {}

  async close() {
    await this.activityWorker.shutdown();
  }
}
