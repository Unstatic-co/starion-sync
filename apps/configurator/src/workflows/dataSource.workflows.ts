import { proxyActivities } from '@temporalio/workflow';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import {
  ConnectionDeletedPayload,
  DataProviderDeletedPayload,
  DataSourceDeletedPayload,
  EventNames,
  SyncConnectionId,
} from '@lib/core';
import { DataSourceActivities } from '../modules/activities/dataSource.activities';

const { deleteDataSource, terminateDataSourceWorkflows } =
  proxyActivities<DataSourceActivities>({
    startToCloseTimeout: '10 second',
  });

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

export async function deleteDataSourceWf(id: SyncConnectionId) {
  const result = await deleteDataSource(id);

  await terminateDataSourceWorkflows(id);

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
    if (result.data?.isProviderDeleted) {
      await emitEvent(EventNames.DATA_PROVIDER_DELETED, {
        payload: {
          providerId: result.data.dataSource.provider.id,
          providerType: result.data.dataSource.provider.type,
        } as DataProviderDeletedPayload,
      });
    }
  }
  return result;
}
