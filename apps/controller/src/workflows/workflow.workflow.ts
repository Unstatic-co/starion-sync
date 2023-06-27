import {
  EventNames,
  WorkflowScheduledPayload,
  WorkflowTriggeredPayload,
} from '@lib/core';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { proxyActivities, proxyLocalActivities } from '@temporalio/workflow';
import { WorkflowActivities } from '../modules/activities/workflow.activities';

const { emitEvent } = proxyLocalActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

const { handleWorkflowTriggered, isWorkflowScheduled } =
  proxyActivities<WorkflowActivities>({
    startToCloseTimeout: '10 second',
  });

export async function handleWorkflowTriggeredWf(
  data: WorkflowTriggeredPayload,
) {
  const isScheduled = await isWorkflowScheduled(data);
  if (isScheduled) {
    return;
  }
  const result = await handleWorkflowTriggered(data);
  await emitEvent(EventNames.WORFKFLOW_SCHEDULED, {
    payload: result as WorkflowScheduledPayload,
  });
}
