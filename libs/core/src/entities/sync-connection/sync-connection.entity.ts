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
  currentSyncflows: Array<Partial<Syncflow>>;
};

export class SyncConnection {
  id: SyncConnectionId;
  state: SyncConnectionState;
  config: SyncConnectionConfig;
  syncflows: Array<Partial<Syncflow>>;

  createdAt: Date;
  updatedAt: Date;
}
