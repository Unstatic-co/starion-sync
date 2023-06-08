import { Worker } from '@temporalio/worker';
import { Logger } from '@nestjs/common';
import { InjectTokens } from '../../common/inject-tokens';

export const WorkflowWorkerProvider = {
  provide: InjectTokens.ORCHESTRATOR_WORKER,
  useFactory: async () => {
    const worker = await Worker.create({
      workflowsPath: require.resolve('../../workflows'),
      taskQueue: 'default',
    });

    worker.run();

    Logger.log('Workflow Worker has been started');

    return worker;
  },
};
