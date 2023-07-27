import { Worker } from '@temporalio/worker';
import { CommonActivities } from '../../activities/common.activities';
import { GoogleSheetsActivities } from '../../activities/google-sheets/googleSheet.activities';
import { Logger } from '@nestjs/common';
import { TestActivities } from '../../activities';
import { InjectTokens } from '../../common/inject-tokens';

export const ActivityWorkerProvider = {
  provide: InjectTokens.ACTIVITY_WORKER,
  inject: [CommonActivities, GoogleSheetsActivities],
  useFactory: async (
    commonActivityService: CommonActivities,
    testActivitiesService: TestActivities,
    googleSheetsActivitiesService: GoogleSheetsActivities,
  ) => {
    const activities = {
      greeting: commonActivityService.greeting.bind(commonActivityService),
      testGreeting: testActivitiesService.testGreeting.bind(
        testActivitiesService,
      ),
    };

    const worker = await Worker.create({
      taskQueue: 'default',
      activities,
    });

    worker.run();

    Logger.log('Activity Worker has been started');

    return worker;
  },
};
