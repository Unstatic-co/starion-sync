import { Worker } from '@temporalio/worker';
import { Logger } from '@nestjs/common';

export const WORKFLOW_WORKER = 'WORKFLOW_WORKER';

export const WorkflowWorkerProvider = {
  provide: WORKFLOW_WORKER,
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
