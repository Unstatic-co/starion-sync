import { Inject, Injectable } from '@nestjs/common';
import { Worker } from '@temporalio/worker';
import { ORCHESTRATOR_WORKER } from './worker.provider';

@Injectable()
export class WorkerService {
  constructor(@Inject(ORCHESTRATOR_WORKER) private readonly worker: Worker) {}

  async close() {
    await this.worker.shutdown();
  }
}
