import { proxyActivities, proxyLocalActivities } from '@temporalio/workflow';
import { CreateSyncConnectionDto } from '../modules/sync-connection/dto/createSyncConnection.dto';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import { EventNames } from '@lib/core';
import { SyncConnectionActivities } from '../modules/activities/syncConnection.activities';

const { createSyncConnection } = proxyActivities<SyncConnectionActivities>({
  startToCloseTimeout: '10 second',
});
const { emitEvent } = proxyLocalActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

export async function createSyncConnectionWf(data: CreateSyncConnectionDto) {
  const result = await createSyncConnection(data);
  if (!result.isAlreadyCreated) {
    await emitEvent(EventNames.CONNECTION_CREATED, {
      payload: result.data,
    });
  }
  return result;
}
