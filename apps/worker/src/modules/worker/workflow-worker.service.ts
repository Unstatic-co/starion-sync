import { Inject, Injectable } from '@nestjs/common';
import { WORKFLOW_WORKER } from './workflow-worker.provider';
import { Worker } from '@temporalio/worker';

@Injectable()
export class WorkflowWorkerService {
  constructor(
    @Inject(WORKFLOW_WORKER) private readonly workflowWorker: Worker,
  ) {}

  async close() {
    await this.workflowWorker.shutdown();
  }
}
