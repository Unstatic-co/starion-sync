import { EventNames, SyncflowScheduledPayload } from '@lib/core';
import { workflowWrapper } from '../wrapper';
import { WorkflowActivities } from '../../activities/workflow.activities';
import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { MicrosoftExcelActivities } from '../../activities';

const { checkAndUpdateStatusBeforeStartSyncflow } =
  proxyActivities<WorkflowActivities>({
    startToCloseTimeout: '10 second',
  });

const { downloadExcel } = proxyActivities<MicrosoftExcelActivities>({
  startToCloseTimeout: '1 minute',
});

const { compareExcel, loadExcel } = proxyActivities<MicrosoftExcelActivities>({
  startToCloseTimeout: '30 second',
});

const { getSyncDataExcel } = proxyActivities<MicrosoftExcelActivities>({
  startToCloseTimeout: '5 second',
});

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '5 second',
});

export async function excelFullSync(data: SyncflowScheduledPayload) {
  return await workflowWrapper(async () => {
    await checkAndUpdateStatusBeforeStartSyncflow(data);

    const syncData = await getSyncDataExcel(data);

    await downloadExcel({
      dataSourceId: syncData.dataSourceId,
      syncVersion: syncData.syncVersion,
      workbookId: syncData.workbookId,
      worksheetId: syncData.worksheetId,
      accessToken: syncData.accessToken,
    });
    await compareExcel({
      dataSourceId: syncData.dataSourceId,
      syncVersion: syncData.syncVersion,
    });
    await loadExcel({
      dataSourceId: syncData.dataSourceId,
      syncVersion: syncData.syncVersion,
    });

    await emitEvent(EventNames.SYNCFLOW_SUCCEED, {
      payload: {},
    });
  });
}
