import { DestinationId } from 'aws-sdk/clients/firehose';
import { DataSourceId } from '../data-source';
import { SyncflowId, SyncflowStatus } from '../syncflow/syncFlow.entity';
import { SyncConnectionConfig } from './sync-configuration';

export type SyncConnectionId = string;

export enum SyncConnectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum SyncConnectionHeatthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
}

export type SyncConnectionVersion = number;

export type SyncConnectionCursor = string | number;

export class SyncConnection {
  id: SyncConnectionId;
  status: SyncConnectionStatus;
  healthStatus: SyncConnectionHeatthStatus;
  currentVersion: SyncConnectionVersion;
  currentCursor?: SyncConnectionCursor;
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
