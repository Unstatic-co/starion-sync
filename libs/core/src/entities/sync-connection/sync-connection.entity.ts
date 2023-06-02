import { DestinationId } from 'aws-sdk/clients/firehose';
import { DataSourceId } from '../data-source';
import { SyncflowId, SyncflowStatus } from '../syncflow/syncFlow.entity';
import { SyncConnectionConfig } from './sync-configuration';

export type SyncConnectionId = string;

export enum SyncConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class SyncConnection {
  id: SyncConnectionId;
  status: SyncConnectionStatus;
  currentSyncflow: {
    id: SyncflowId;
    status: SyncflowStatus;
  };
  sourceId: DataSourceId;
  destinationId: DestinationId;
  config: SyncConnectionConfig;

  createdAt: Date;
  updatedAt: Date;
}
