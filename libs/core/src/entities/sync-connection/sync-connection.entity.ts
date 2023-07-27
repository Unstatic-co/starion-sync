import { DataSourceId } from '../data-source';
import { Syncflow } from '../syncflow/syncflow.entity';
import { SyncConnectionConfig } from './sync-configuration';

export type SyncConnectionId = string;

export enum SyncConnectionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum SyncConnectionHealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
}

export type SyncConnectionState = {
  status: SyncConnectionStatus;
  healthStatus: SyncConnectionHealthStatus;
  runningSyncflows: Array<Partial<Syncflow>>;
};

export class SyncConnection {
  id: SyncConnectionId;
  state: SyncConnectionState;
  sourceId: DataSourceId;
  config: SyncConnectionConfig;
  syncflows: Array<Partial<Syncflow>>;

  createdAt: Date;
  updatedAt: Date;
}

export const defaultSyncConnectionState: SyncConnectionState = {
  status: SyncConnectionStatus.ACTIVE,
  healthStatus: SyncConnectionHealthStatus.HEALTHY,
  runningSyncflows: [],
};
