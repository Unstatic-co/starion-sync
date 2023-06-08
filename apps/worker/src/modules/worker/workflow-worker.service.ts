import { Inject, Injectable } from '@nestjs/common';
import { Worker } from '@temporalio/worker';
import { InjectTokens } from '../../common/inject-tokens';

@Injectable()
export class WorkflowWorkerService {
  constructor(
    @Inject(InjectTokens.WORKFLOW_WORKER)
    private readonly workflowWorker: Worker,
  ) {}

  async close() {
    await this.workflowWorker.shutdown();
  }
}
