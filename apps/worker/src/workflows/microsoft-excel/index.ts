import {
  EventNames,
  SyncflowScheduledPayload,
  SyncflowSucceedPayload,
  WorkflowStatus,
} from '@lib/core';
import { workflowWrapper } from '../wrapper';
import { WorkflowActivities } from '../../activities/workflow.activities';
import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { MicrosoftExcelActivities } from '../../activities';

const {
  checkAndUpdateStatusBeforeStartSyncflow,
  updateSyncflowStatus,
  updateSyncflowState,
} = proxyActivities<WorkflowActivities>({
  startToCloseTimeout: '10 second',
});

const { downloadExcel } = proxyActivities<MicrosoftExcelActivities>({
  startToCloseTimeout: '4m',
  // scheduleToCloseTimeout: '10y',
});

const { compareExcel, loadExcel } = proxyActivities<MicrosoftExcelActivities>({
  startToCloseTimeout: '30 second',
  // scheduleToCloseTimeout: '10y',
});

const { getSyncDataExcel } = proxyActivities<MicrosoftExcelActivities>({
  startToCloseTimeout: '5 second',
});

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '5 second',
});

export async function excelFullSync(data: SyncflowScheduledPayload) {
  return await workflowWrapper(async () => {
    try {
      await checkAndUpdateStatusBeforeStartSyncflow(data.syncflow.id);

      const syncData = await getSyncDataExcel(data.syncflow);

      await downloadExcel({
        dataSourceId: syncData.dataSourceId,
        syncVersion: data.version,
        workbookId: syncData.workbookId,
        worksheetId: syncData.worksheetId,
        timezone: syncData.timezone,
        accessToken: syncData.accessToken,
      });
      await compareExcel({
        dataSourceId: syncData.dataSourceId,
        syncVersion: data.version,
        prevVersion: data.syncflow.state.prevVersion,
      });
      const loadedDataStatistics = await loadExcel({
        dataSourceId: syncData.dataSourceId,
        syncVersion: data.version,
        prevVersion: data.syncflow.state.prevVersion,
      });

      await emitEvent(EventNames.SYNCFLOW_SUCCEED, {
        payload: {
          dataSourceId: syncData.dataSourceId,
          syncflowId: data.syncflow.id,
          loadedDataStatistics,
        } as SyncflowSucceedPayload,
      });

      await updateSyncflowState(data.syncflow.id, {
        prevVersion: data.version,
        status: WorkflowStatus.IDLING,
      });
    } catch (error) {
      await updateSyncflowStatus(data.syncflow.id, WorkflowStatus.IDLING);
      throw error;
    }
  });
}
