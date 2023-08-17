import { NativeConnection, Worker } from '@temporalio/worker';
import { Logger } from '@nestjs/common';
import { InjectTokens } from '@lib/modules';
import { InjectTokens as AppInjectTokens } from '../../common/inject-tokens';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { CommonActivities } from '../activities/common.activities';
import { SyncConnectionActivities } from '../activities/syncConnection.activities';
import { ConfigService } from '@nestjs/config';
import { ConfigName } from '@lib/core/config';
import { TriggerActivities } from '../activities/trigger.activities';
import { DataSourceActivities } from '../activities/dataSource.activities';

export const OrchestratorWorkerProvider = {
  provide: AppInjectTokens.ORCHESTRATOR_WORKER,
  inject: [
    ConfigService,
    InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION,
    BrokerActivities,
    SyncConnectionActivities,
    TriggerActivities,
    DataSourceActivities,
  ],
  useFactory: async (
    configService: ConfigService,
    orchestratorConnection: NativeConnection,
    brokerActivities: BrokerActivities,
    syncConnectionActivities: SyncConnectionActivities,
    triggerActivities: TriggerActivities,
    dataSourceActivities: DataSourceActivities,
  ) => {
    const activities = {
      emitEvent: brokerActivities.emitEvent.bind(brokerActivities),
      deleteDataSource:
        dataSourceActivities.deleteDataSource.bind(dataSourceActivities),
      createSyncConnection: syncConnectionActivities.createSyncConnection.bind(
        syncConnectionActivities,
      ),
      deleteSyncConnection: syncConnectionActivities.deleteSyncConnection.bind(
        syncConnectionActivities,
      ),
      unregisterTrigger:
        triggerActivities.unregisterTrigger.bind(triggerActivities),
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
