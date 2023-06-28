import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker } from '@temporalio/worker';
import { InjectTokens } from '../../common/inject-tokens';

@Injectable()
export class WorkerService implements OnModuleDestroy {
  constructor(
    @Inject(InjectTokens.ORCHESTRATOR_WORKER) private readonly worker: Worker,
  ) {}

  async onModuleDestroy() {
    await this.close();
  }

  async close() {
    await this.worker.shutdown();
  }
}
