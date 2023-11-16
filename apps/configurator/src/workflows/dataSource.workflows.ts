import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import {
  ConnectionDeletedPayload,
  DataSourceDeletedPayload,
  DataSourceId,
  EventNames,
} from '@lib/core';
import { DataSourceActivities } from '../modules/activities/dataSource.activities';

const { deleteDataSource, terminateDataSourceWorkflows } =
  proxyActivities<DataSourceActivities>({
    startToCloseTimeout: '10 second',
  });
const { deleteDataSourceData } = proxyActivities<DataSourceActivities>({
  startToCloseTimeout: '20 second',
});
const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

export async function deleteDataSourceWf(
  id: DataSourceId,
  options?: {
    isDeleteData?: boolean;
  },
) {
  const result = await deleteDataSource(id);
  await terminateDataSourceWorkflows(id);
  if (options?.isDeleteData) {
    await deleteDataSourceData(result.data.dataSource);
  }
  if (result.isAlreadyDeleted === false) {
    const payload: DataSourceDeletedPayload = {
      dataSourceId: id,
    };
    if (result.data?.syncConnection) {
      payload.syncConnectionId = result.data.syncConnection.id;
      await emitEvent(EventNames.CONNECTION_DELETED, {
        payload: result.data.syncConnection as ConnectionDeletedPayload,
      });
    }
    await emitEvent(EventNames.DATA_SOURCE_DELETED, {
      payload,
    });
  }
  return result;
}
