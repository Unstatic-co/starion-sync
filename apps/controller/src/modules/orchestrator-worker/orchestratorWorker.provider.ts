import { NativeConnection, Worker } from '@temporalio/worker';
import { Logger } from '@nestjs/common';
import { InjectTokens } from '@lib/modules';
import { InjectTokens as AppInjectTokens } from '../../common/inject-tokens';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { ConfigService } from '@nestjs/config';
import { ConfigName } from '@lib/core/config';
import { WorkflowActivities } from '../activities/workflow.activities';
import { DataSourceActivities } from '../activities/datasource.activities';

export const OrchestratorWorkerProvider = {
  provide: AppInjectTokens.ORCHESTRATOR_WORKER,
  inject: [
    ConfigService,
    InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION,
    BrokerActivities,
    WorkflowActivities,
    DataSourceActivities,
  ],
  useFactory: async (
    configService: ConfigService,
    orchestratorConnection: NativeConnection,
    brokerActivities: BrokerActivities,
    workflowActivities: WorkflowActivities,
    dataSourceActivities: DataSourceActivities,
  ) => {
    const activities = {
      emitEvent: brokerActivities.emitEvent.bind(brokerActivities),
      handleWorkflowTriggered:
        workflowActivities.handleWorkflowTriggered.bind(workflowActivities),
      checkWorkflowAlreadyScheduled:
        workflowActivities.checkWorkflowAlreadyScheduled.bind(
          workflowActivities,
        ),
      checkDataSourceLimitation:
        dataSourceActivities.checkDataSourceLimitation.bind(
          dataSourceActivities,
        ),
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
