import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import {
  DataSourceDeletedPayload,
  EventNames,
  SyncConnectionId,
} from '@lib/core';
import { DataSourceActivities } from '../modules/activities/dataSource.activities';

const { deleteDataSource } = proxyActivities<DataSourceActivities>({
  startToCloseTimeout: '10 second',
});

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

export async function deleteDataSourceWf(id: SyncConnectionId) {
  const result = await deleteDataSource(id);
  if (result.isAlreadyDeleted === false) {
    await emitEvent(EventNames.DATA_SOURCE_DELETED, {
      payload: {
        dataSourceId: id,
      } as DataSourceDeletedPayload,
    });
  }
  return result;
}
