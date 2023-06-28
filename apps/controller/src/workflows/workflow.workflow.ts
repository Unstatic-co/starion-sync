import {
  EventNames,
  SyncflowScheduledPayload,
  WorkflowTriggeredPayload,
  WorkflowType,
} from '@lib/core';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { proxyActivities, proxyLocalActivities } from '@temporalio/workflow';
import { WorkflowActivities } from '../modules/activities/workflow.activities';
import { workflowWrapper } from './wrapper';

const { emitEvent } = proxyLocalActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

const { handleWorkflowTriggered, checkWorkflowAlreadyScheduled } =
  proxyActivities<WorkflowActivities>({
    startToCloseTimeout: '10 second',
  });

export async function handleWorkflowTriggeredWf(
  data: WorkflowTriggeredPayload,
) {
  return await workflowWrapper(async () => {
    await checkWorkflowAlreadyScheduled(data);
    const result = await handleWorkflowTriggered(data);
    if (data.workflow.type === WorkflowType.SYNCFLOW) {
      await emitEvent(EventNames.SYNCFLOW_SCHEDULED, {
        payload: result as SyncflowScheduledPayload,
      });
    }
    return result;
  });
}
