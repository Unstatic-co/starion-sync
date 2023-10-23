import {
  DataSourceErrorPayload,
  ErrorType,
  EventNames,
  SyncflowScheduledPayload,
  SyncflowSucceedPayload,
  WorkflowStatus,
} from '@lib/core';
import { getActivityErrorDetail, workflowWrapper } from '../wrapper';
import { WorkflowActivities } from '../../activities/workflow.activities';
import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { GoogleSheetsActivities } from '../../activities';

const {
  checkAndUpdateStatusBeforeStartSyncflow,
  updateSyncflowStatus,
  updateSyncflowState,
} = proxyActivities<WorkflowActivities>({
  startToCloseTimeout: '10 second',
});

const { downloadGoogleSheets } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '4m',
  // scheduleToCloseTimeout: '10y',
});

const { compareGoogleSheets } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '1m',
  // scheduleToCloseTimeout: '10y',
});

const { loadGoogleSheets } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '4m',
  // scheduleToCloseTimeout: '10y',
});

const { getSyncDataGoogleSheets } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '5 second',
});

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '5 second',
});

export async function googleSheetsFullSync(data: SyncflowScheduledPayload) {
  return await workflowWrapper(async () => {
    try {
      await checkAndUpdateStatusBeforeStartSyncflow(data.syncflow.id);

      const syncData = await getSyncDataGoogleSheets(data.syncflow);

      const syncVersion = data.version;
      const prevSyncVersion = data.syncflow.state.prevVersion;

      await downloadGoogleSheets({
        dataSourceId: syncData.dataSourceId,
        syncVersion,
        spreadsheetId: syncData.spreadsheetId,
        sheetId: syncData.sheetId,
        refreshToken: syncData.refreshToken,
      });
      await compareGoogleSheets({
        dataSourceId: syncData.dataSourceId,
        syncVersion,
        prevVersion: prevSyncVersion,
      });
      const loadedDataStatistics = await loadGoogleSheets({
        dataSourceId: syncData.dataSourceId,
        syncVersion,
        prevVersion: prevSyncVersion,
        tableName: syncData.destTableName,
      });

      await emitEvent(EventNames.SYNCFLOW_SUCCEED, {
        payload: {
          dataSourceId: syncData.dataSourceId,
          syncflowId: data.syncflow.id,
          syncVersion,
          prevSyncVersion,
          statistics: loadedDataStatistics,
        } as SyncflowSucceedPayload,
      });

      await updateSyncflowState(data.syncflow.id, {
        version: data.version + 1,
        prevVersion: data.version,
        status: WorkflowStatus.IDLING,
      });
    } catch (error) {
      const errorDetail = getActivityErrorDetail(error);
      // detect processor external error
      if (errorDetail.errorData?.type === ErrorType.EXTERNAL) {
        await updateSyncflowStatus(data.syncflow.id, WorkflowStatus.IDLING);
        await emitEvent(EventNames.DATA_SOURCE_ERROR, {
          payload: {
            dataSourceId: data.syncflow.sourceId,
            code: errorDetail.errorData.code,
            message: errorDetail.errorData.message,
          } as DataSourceErrorPayload,
        });
        throw error;
      } else {
        throw error;
      }
    }
  });
}
