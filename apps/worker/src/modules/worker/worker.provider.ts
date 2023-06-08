import { NativeConnection, Worker } from '@temporalio/worker';
import { CommonActivities } from '../../activities/common.activities';
import { GoogleSheetsActivities } from '../../activities/google-sheets/googleSheet.activities';
import { Logger } from '@nestjs/common';
import { TestActivities } from '../../activities';
import { ORCHESTRATOR_NATIVE_CONNECTION } from '@lib/modules/orchestrator';

export const ORCHESTRATOR_WORKER = 'ORCHESTRATOR_WORKER';

export const WorkerProvider = {
  provide: ORCHESTRATOR_WORKER,
  inject: [
    ORCHESTRATOR_NATIVE_CONNECTION,
    CommonActivities,
    TestActivities,
    GoogleSheetsActivities,
  ],
  useFactory: async (
    orchestratorConnection: NativeConnection,
    commonActivityService: CommonActivities,
    testActivitiesService: TestActivities,
    googleSheetsActivitiesService: GoogleSheetsActivities,
  ) => {
    const activities = {
      greeting: commonActivityService.greeting.bind(commonActivityService),
      testGreeting: testActivitiesService.testGreeting.bind(
        testActivitiesService,
      ),
      testSaveDb: testActivitiesService.testSaveDb.bind(testActivitiesService),
    };

    const worker = await Worker.create({
      connection: orchestratorConnection,
      workflowsPath: require.resolve('../../workflows'),
      taskQueue: 'default',
      activities,
    });

    worker.run();

    Logger.log("Orchestrator's Worker has been started");

    return worker;
  },
};
