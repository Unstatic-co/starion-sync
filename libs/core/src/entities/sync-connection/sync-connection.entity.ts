import { DataSource } from '../data-source';
import { SyncConfiguration } from './sync-configuration';

export enum SyncConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class SyncConnection {
  id: string;
  status: SyncConnectionStatus;
  source: DataSource;
  destination: DataSource;
  config: SyncConfiguration;
  createdAt: Date;
  updatedAt: Date;

  public getId(): string {
    return this.id;
  }

  public getStatus(): SyncConnectionStatus {
    return this.status;
  }
}
