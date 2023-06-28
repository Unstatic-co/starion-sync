import { EventNames, SyncflowScheduledPayload } from '@lib/core';
import { workflowWrapper } from '../wrapper';
import { WorkflowActivities } from '../../activities/workflow.activities';
import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';

const { checkAndUpdateStatusBeforeStartSyncflow } =
  proxyActivities<WorkflowActivities>({
    startToCloseTimeout: '10 second',
  });

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '5 second',
});

export async function excelFullSync(data: SyncflowScheduledPayload) {
  return await workflowWrapper(async () => {
    await checkAndUpdateStatusBeforeStartSyncflow(data);

    const result = {};

    await emitEvent(EventNames.SYNCFLOW_SUCCEED, {
      payload: result as SyncflowScheduledPayload,
    });
  });
}
