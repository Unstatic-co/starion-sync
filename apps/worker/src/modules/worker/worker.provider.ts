import { NativeConnection, Worker } from '@temporalio/worker';
import { CommonActivities } from '../../activities/common.activities';
import { GoogleSheetsActivities } from '../../activities/google-sheets/googleSheet.activities';
import { Logger } from '@nestjs/common';
import { MicrosoftExcelActivities, TestActivities } from '../../activities';
import { InjectTokens } from '@lib/modules';
import { InjectTokens as AppInjectTokens } from '../../common/inject-tokens';
import { WorkflowActivities } from '../../activities/workflow.activities';
import { ConfigService } from '@nestjs/config';
import { ConfigName } from '@lib/core/config';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';

export const WorkerProvider = {
  provide: AppInjectTokens.ORCHESTRATOR_WORKER,
  inject: [
    ConfigService,
    InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION,
    CommonActivities,
    TestActivities,
    BrokerActivities,
    WorkflowActivities,
    GoogleSheetsActivities,
    MicrosoftExcelActivities,
  ],
  useFactory: async (
    configService: ConfigService,
    orchestratorConnection: NativeConnection,
    commonActivityService: CommonActivities,
    testActivitiesService: TestActivities,
    brokerActivities: BrokerActivities,
    workflowActivities: WorkflowActivities,
    googleSheetsActivitiesService: GoogleSheetsActivities,
    microsoftExcelActivities: MicrosoftExcelActivities,
  ) => {
    const activities = {
      greeting: commonActivityService.greeting.bind(commonActivityService),
      testGreeting: testActivitiesService.testGreeting.bind(
        testActivitiesService,
      ),
      testSaveDb: testActivitiesService.testSaveDb.bind(testActivitiesService),
      emitEvent: brokerActivities.emitEvent.bind(brokerActivities),
      checkAndUpdateStatusBeforeStartSyncflow:
        workflowActivities.checkAndUpdateStatusBeforeStartSyncflow.bind(
          workflowActivities,
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
