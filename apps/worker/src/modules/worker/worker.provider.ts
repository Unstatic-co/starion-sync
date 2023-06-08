import { NativeConnection, Worker } from '@temporalio/worker';
import { CommonActivities } from '../../activities/common.activities';
import { GoogleSheetsActivities } from '../../activities/google-sheets/googleSheet.activities';
import { Logger } from '@nestjs/common';
import { TestActivities } from '../../activities';
import { InjectTokens } from '@lib/modules';
import { InjectTokens as AppInjectTokens } from '../../common/inject-tokens';

export const WorkerProvider = {
  provide: AppInjectTokens.ORCHESTRATOR_WORKER,
  inject: [
    InjectTokens.ORCHESTRATOR_NATIVE_CONNECTION,
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
