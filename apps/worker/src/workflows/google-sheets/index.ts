import {
  DataSourceErrorPayload,
  ErrorType,
  EventNames,
  GoogleSheetsFullSyncState,
  SyncflowScheduledPayload,
  SyncflowSucceedPayload,
  WorkflowStatus,
} from '@lib/core';
import { getActivityErrorDetail, workflowWrapper } from '../wrapper';
import { WorkflowActivities } from '../../activities/workflow.activities';
import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { GoogleSheetsActivities } from '../../activities';
import { ProcessorRetryPolicy } from '../retryPolicy';
import { GoogleSheetsDownloadPayload, WorkflowEvents } from '../events';

const {
  checkAndUpdateStatusBeforeStartSyncflow,
  updateSyncflowStatus,
  updateSyncflowState,
} = proxyActivities<WorkflowActivities>({
  startToCloseTimeout: '10 second',
});

const { downloadGoogleSheets, ingestGoogleSheets } =
  proxyActivities<GoogleSheetsActivities>({
    startToCloseTimeout: '4m',
    retry: ProcessorRetryPolicy,
    // scheduleToCloseTimeout: '10y',
  });

const { compareGoogleSheets } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '1m',
  retry: ProcessorRetryPolicy,
  // scheduleToCloseTimeout: '10y',
});

const { loadGoogleSheets } = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '7m',
  retry: ProcessorRetryPolicy,
  // scheduleToCloseTimeout: '10y',
});

const {
  getSyncDataGoogleSheets,
  getDownloadDataGoogleSheets,
  getSpreadSheetDataGoogleSheets,
  getDataSourceProviderGoogleSheets,
  updateProviderStateGoogleSheets,
} = proxyActivities<GoogleSheetsActivities>({
  startToCloseTimeout: '5 second',
});

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '5 second',
});

export async function googleSheetsDownload(data: GoogleSheetsDownloadPayload) {
  return await workflowWrapper(async () => {
    try {
      const { syncflow, version } = data;
      const downloadData = await getDownloadDataGoogleSheets(data.syncflow);

      const { downloadedAt, providerDownloadedAt } = downloadData;

      if (
        providerDownloadedAt &&
        (!downloadedAt || downloadedAt < providerDownloadedAt)
      ) {
        // already has data, no need to run download
        await updateSyncflowState(syncflow.id, {
          downloadedAt: providerDownloadedAt,
        } as GoogleSheetsFullSyncState);
      } else {
        // download data
        const { dataProviderId, spreadsheetId, refreshToken } = downloadData;

        const [, spreadSheetData] = await Promise.all([
          downloadGoogleSheets({
            spreadsheetId,
            refreshToken,
          }),
          getSpreadSheetDataGoogleSheets({
            spreadsheetId,
            refreshToken,
          }),
        ]);
        const downloadedAt = new Date();
        await Promise.all([
          updateProviderStateGoogleSheets(dataProviderId, {
            downloadedAt,
            timeZone: spreadSheetData.timeZone,
            sheets: spreadSheetData.sheets,
          }),
          updateSyncflowState(syncflow.id, {
            downloadedAt,
          } as GoogleSheetsFullSyncState),
        ]);
      }

      await emitEvent(WorkflowEvents.GoogleSheetsProceedSync, {
        payload: {
          syncflow,
          version,
        },
      });
    } catch (error) {
      const errorDetail = getActivityErrorDetail(error);
      // detect processor external error
      if (errorDetail.errorData?.type === ErrorType.EXTERNAL) {
        await updateSyncflowState(data.syncflow.id, {
          version: data.version + 1, // increment version to correctly run retry
          status: WorkflowStatus.IDLING,
        });
        await Promise.all([
          emitEvent(EventNames.DATA_SOURCE_ERROR, {
            payload: {
              dataSourceId: data.syncflow.sourceId,
              code: errorDetail.errorData.code,
              message: errorDetail.errorData.message,
            } as DataSourceErrorPayload,
          }),
          emitEvent(EventNames.SYNCFLOW_FAILED, {
            payload: {
              dataSourceId: data.syncflow.sourceId,
              syncflowId: data.syncflow.id,
              syncVersion: data.version,
              error: {
                type: ErrorType.EXTERNAL,
                code: errorDetail.errorData.code,
                message: errorDetail.errorData.message,
              },
            },
          }),
        ]);
        throw error;
      } else if (errorDetail.errorData?.type === ErrorType.INTERNAL) {
        await updateSyncflowState(data.syncflow.id, {
          version: data.version + 1, // increment version to correctly run retry
          status: WorkflowStatus.IDLING,
        });
        await emitEvent(EventNames.SYNCFLOW_FAILED, {
          payload: {
            dataSourceId: data.syncflow.sourceId,
            syncflowId: data.syncflow.id,
            syncVersion: data.version,
            error: {
              type: ErrorType.INTERNAL,
              code: errorDetail.errorData.code,
              message: errorDetail.errorData.message,
            },
          },
        });
        throw error;
      } else {
        throw error;
      }
    }
  });
}

export async function googleSheetsProceedSync(data: SyncflowScheduledPayload) {
  return await workflowWrapper(async () => {
    try {
      const syncData = await getSyncDataGoogleSheets(data.syncflow);

      const syncVersion = data.version;
      const prevSyncVersion = data.syncflow.state.prevVersion;
      const sheet = syncData.dataProviderState.sheets[syncData.sheetId];

      const timeZone = syncData.dataProviderState.timeZone;

      await ingestGoogleSheets({
        dataSourceId: syncData.dataSourceId,
        syncVersion,
        spreadsheetId: syncData.spreadsheetId,
        sheetId: syncData.sheetId,
        sheetName: sheet.name,
        sheetIndex: sheet.index,
        timeZone,
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
        metadata: syncData.metadata,
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
        await updateSyncflowState(data.syncflow.id, {
          version: data.version + 1, // increment version to correctly run retry
          status: WorkflowStatus.IDLING,
        });
        await Promise.all([
          emitEvent(EventNames.DATA_SOURCE_ERROR, {
            payload: {
              dataSourceId: data.syncflow.sourceId,
              code: errorDetail.errorData.code,
              message: errorDetail.errorData.message,
            } as DataSourceErrorPayload,
          }),
          emitEvent(EventNames.SYNCFLOW_FAILED, {
            payload: {
              dataSourceId: data.syncflow.sourceId,
              syncflowId: data.syncflow.id,
              syncVersion: data.version,
              error: {
                type: ErrorType.EXTERNAL,
                code: errorDetail.errorData.code,
                message: errorDetail.errorData.message,
              },
            },
          }),
        ]);
        throw error;
      } else if (errorDetail.errorData?.type === ErrorType.INTERNAL) {
        await updateSyncflowState(data.syncflow.id, {
          version: data.version + 1, // increment version to correctly run retry
          status: WorkflowStatus.IDLING,
        });
        await emitEvent(EventNames.SYNCFLOW_FAILED, {
          payload: {
            dataSourceId: data.syncflow.sourceId,
            syncflowId: data.syncflow.id,
            syncVersion: data.version,
            error: {
              type: ErrorType.INTERNAL,
              code: errorDetail.errorData.code,
              message: errorDetail.errorData.message,
            },
          },
        });
        throw error;
      } else {
        throw error;
      }
    }
  });
}

export async function googleSheetsFullSync(data: SyncflowScheduledPayload) {
  return await workflowWrapper(async () => {
    try {
      await checkAndUpdateStatusBeforeStartSyncflow(data.syncflow.id);

      const provider = await getDataSourceProviderGoogleSheets(
        data.syncflow.sourceId,
      );

      await emitEvent(WorkflowEvents.GoogleSheetsDownload, {
        key: provider.id,
        payload: {
          syncflow: data.syncflow,
          version: data.version,
        },
      });
      return;
    } catch (error) {
      const errorDetail = getActivityErrorDetail(error);
      // detect processor external error
      if (errorDetail.errorData?.type === ErrorType.EXTERNAL) {
        await updateSyncflowStatus(data.syncflow.id, WorkflowStatus.IDLING);
        await Promise.all([
          emitEvent(EventNames.DATA_SOURCE_ERROR, {
            payload: {
              dataSourceId: data.syncflow.sourceId,
              code: errorDetail.errorData.code,
              message: errorDetail.errorData.message,
            } as DataSourceErrorPayload,
          }),
          emitEvent(EventNames.SYNCFLOW_FAILED, {
            payload: {
              dataSourceId: data.syncflow.sourceId,
              syncflowId: data.syncflow.id,
              syncVersion: data.version,
              error: {
                type: ErrorType.EXTERNAL,
                code: errorDetail.errorData.code,
                message: errorDetail.errorData.message,
              },
            },
          }),
        ]);
        throw error;
      } else if (errorDetail.errorData?.type === ErrorType.INTERNAL) {
        await updateSyncflowState(data.syncflow.id, {
          version: data.version + 1, // increment version to correctly run retry
          status: WorkflowStatus.IDLING,
        });
        await emitEvent(EventNames.SYNCFLOW_FAILED, {
          payload: {
            dataSourceId: data.syncflow.sourceId,
            syncflowId: data.syncflow.id,
            syncVersion: data.version,
            error: {
              type: ErrorType.INTERNAL,
              code: errorDetail.errorData.code,
              message: errorDetail.errorData.message,
            },
          },
        });
        throw error;
      } else {
        throw error;
      }
    }
  });
}
