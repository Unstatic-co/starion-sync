import { NativeConnection, Worker } from '@temporalio/worker';
import { CommonActivities } from '../../activities/common.activities';
import { Logger } from '@nestjs/common';
import {
  GoogleSheetsActivities,
  MicrosoftExcelActivities,
  TestActivities,
} from '../../activities';
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
    googleSheetsActivities: GoogleSheetsActivities,
    microsoftExcelActivities: MicrosoftExcelActivities,
  ) => {
    const activities = {
      greeting: commonActivityService.greeting.bind(commonActivityService),
      testGreeting: testActivitiesService.testGreeting.bind(
        testActivitiesService,
      ),
      testSaveDb: testActivitiesService.testSaveDb.bind(testActivitiesService),
      emitEvent: brokerActivities.emitEvent.bind(brokerActivities),
      // workflow
      checkAndUpdateStatusBeforeStartSyncflow:
        workflowActivities.checkAndUpdateStatusBeforeStartSyncflow.bind(
          workflowActivities,
        ),
      updateSyncflowStatus:
        workflowActivities.updateSyncflowStatus.bind(workflowActivities),
      updateSyncflowState:
        workflowActivities.updateSyncflowState.bind(workflowActivities),
      // excel
      getSyncDataExcel: microsoftExcelActivities.getSyncDataExcel.bind(
        microsoftExcelActivities,
      ),
      downloadExcel: microsoftExcelActivities.downloadExcel.bind(
        microsoftExcelActivities,
      ),
      compareExcel: microsoftExcelActivities.compareExcel.bind(
        microsoftExcelActivities,
      ),
      loadExcel: microsoftExcelActivities.loadExcel.bind(
        microsoftExcelActivities,
      ),
      // google sheets
      getDataStateGoogleSheets:
        googleSheetsActivities.getDataStateGoogleSheets.bind(
          googleSheetsActivities,
        ),
      getDownloadDataGoogleSheets:
        googleSheetsActivities.getDownloadDataGoogleSheets.bind(
          googleSheetsActivities,
        ),
      getSpreadSheetDataGoogleSheets:
        googleSheetsActivities.getSpreadSheetDataGoogleSheets.bind(
          googleSheetsActivities,
        ),
      getDataSourceProviderGoogleSheets:
        googleSheetsActivities.getDataSourceProviderGoogleSheets.bind(
          googleSheetsActivities,
        ),
      getSyncDataGoogleSheets:
        googleSheetsActivities.getSyncDataGoogleSheets.bind(
          googleSheetsActivities,
        ),
      updateProviderStateGoogleSheets:
        googleSheetsActivities.updateProviderStateGoogleSheets.bind(
          googleSheetsActivities,
        ),
      downloadGoogleSheets: googleSheetsActivities.downloadGoogleSheets.bind(
        googleSheetsActivities,
      ),
      ingestGoogleSheets: googleSheetsActivities.ingestGoogleSheets.bind(
        googleSheetsActivities,
      ),
      compareGoogleSheets: googleSheetsActivities.compareGoogleSheets.bind(
        googleSheetsActivities,
      ),
      loadGoogleSheets: googleSheetsActivities.loadGoogleSheets.bind(
        googleSheetsActivities,
      ),
    };

    const taskQueue = configService.get<string>(
      `${ConfigName.ORCHESTRATOR}.workerTaskQueue`,
    );

    const namespace = configService.get<string>(
      `${ConfigName.ORCHESTRATOR}.namespace`,
    );

    const worker = await Worker.create({
      connection: orchestratorConnection,
      namespace,
      workflowsPath: require.resolve('../../workflows'),
      dataConverter: {
        payloadConverterPath: require.resolve(
          '../../../../../libs/modules/src/orchestrator/payload-converter',
        ),
      },
      maxConcurrentActivityTaskExecutions: 300,
      maxConcurrentLocalActivityExecutions: 300,
      maxConcurrentWorkflowTaskExecutions: 300,
      taskQueue,
      activities,
    });

    worker.run();

    Logger.log("Orchestrator's Worker has been started");

    return worker;
  },
};
