import {
  DataSourceErrorPayload,
  ErrorType,
  EventNames,
  Syncflow,
  SyncflowScheduledPayload,
  WorkflowTriggeredPayload,
  WorkflowType,
} from '@lib/core';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { proxyActivities, proxyLocalActivities } from '@temporalio/workflow';
import { WorkflowActivities } from '../modules/activities/workflow.activities';
import { getActivityErrorDetail, workflowWrapper } from './wrapper';

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
    try {
      const syncflow = await handleWorkflowTriggered(data);
      if (data.workflow.type === WorkflowType.SYNCFLOW) {
        await emitEvent(EventNames.SYNCFLOW_SCHEDULED, {
          payload: {
            syncflow,
            version: (syncflow as Syncflow).state.version,
          } as SyncflowScheduledPayload,
        });
      }
    } catch (error) {
      const errorDetail = getActivityErrorDetail(error);
      // detect processor external error
      if (errorDetail.errorData?.type === ErrorType.EXTERNAL) {
        await emitEvent(EventNames.DATA_SOURCE_ERROR, {
          payload: {
            dataSourceId: data.sourceId,
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
