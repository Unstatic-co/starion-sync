import { proxyActivities, proxyLocalActivities } from '@temporalio/workflow';
import { CreateSyncConnectionDto } from '../modules/sync-connection/dto/createSyncConnection.dto';
import { BrokerActivities } from '@lib/modules/broker/broker.activities';
import {
  ConnectionCreatedPayload,
  ConnectionDeletedPayload,
  EventNames,
  SyncConnectionId,
} from '@lib/core';
import { SyncConnectionActivities } from '../modules/activities/syncConnection.activities';
import { TriggerActivities } from '../modules/activities/trigger.activities';

const { createSyncConnection, deleteSyncConnection } =
  proxyActivities<SyncConnectionActivities>({
    startToCloseTimeout: '10 second',
  });

const { unregisterTrigger } = proxyActivities<TriggerActivities>({
  startToCloseTimeout: '10 second',
});

const { emitEvent } = proxyActivities<BrokerActivities>({
  startToCloseTimeout: '10 second',
});

export async function createSyncConnectionWf(data: CreateSyncConnectionDto) {
  const result = await createSyncConnection(data);
  if (!result.isAlreadyCreated) {
    await emitEvent(EventNames.CONNECTION_CREATED, {
      payload: result.data as ConnectionCreatedPayload,
    });
  }
  return result;
}

export async function deleteSyncConnectionWf(id: SyncConnectionId) {
  const result = await deleteSyncConnection(id);
  if (!result.isAlreadyDeleted) {
    // await unregisterTrigger(id);
    await emitEvent(EventNames.CONNECTION_DELETED, {
      payload: result.data as ConnectionDeletedPayload,
    });
  }
  return result;
}
