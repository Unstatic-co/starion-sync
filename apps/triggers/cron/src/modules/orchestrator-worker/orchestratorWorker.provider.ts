import { NativeConnection, Worker } from '@temporalio/worker';
import { Logger } from '@nestjs/common';
import { InjectTokens } from '@lib/modules';
import { InjectTokens as AppInjectTokens } from '../../common/inject-tokens';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { CommonActivities } from '../activities/common.activities';
import { ConfigService } from '@nestjs/config';
import { ConfigName } from '@lib/core/config';

export const OrchestratorWorkerProvider = {
  provide: AppInjectTokens.ORCHESTRATOR_WORKER,
  inject: [
    ConfigService,
    InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION,
    BrokerActivities,
    CommonActivities,
  ],
  useFactory: async (
    configService: ConfigService,
    orchestratorConnection: NativeConnection,
    brokerActivities: BrokerActivities,
  ) => {
    const activities = {
      emitEvent: brokerActivities.emitEvent.bind(brokerActivities),
    };

    const taskQueue = configService.get<string>(
      `${ConfigName.ORCHESTRATOR}.workerTaskQueue`,
    );

    const worker = await Worker.create({
      connection: orchestratorConnection,
      workflowsPath: require.resolve('../../workflows'),
      taskQueue,
      activities,
    });

    worker.run();

    Logger.log("Orchestrator's Worker has been started");

    return worker;
  },
};
