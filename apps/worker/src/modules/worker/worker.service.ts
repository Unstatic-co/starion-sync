import { Inject, Injectable } from '@nestjs/common';
import { Worker } from '@temporalio/worker';
import { InjectTokens } from '../../common/inject-tokens';

@Injectable()
export class WorkerService {
  constructor(
    @Inject(InjectTokens.ORCHESTRATOR_WORKER) private readonly worker: Worker,
  ) {}

  async close() {
    await this.worker.shutdown();
  }
}
