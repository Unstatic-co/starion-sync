import { DataSourceId } from '../data-source';
import {
  SyncConnectionConfig,
  SyncConnectionCursor,
  SyncConnectionVersion,
} from '../sync-connection';
import { Workflow } from '../workflow/workFlow.entity';

export type SyncflowId = string;

export enum SyncflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export type SyncflowPayload = any;

export class Syncflow {
  id: SyncflowId;
  version: SyncConnectionVersion;
  cursor?: SyncConnectionCursor;
  status: SyncflowStatus;
  sourceId: DataSourceId;
  destinationId: DataSourceId;
  workflow: Workflow;
  payload?: SyncflowPayload;
  config: Partial<SyncConnectionConfig>;

  createdAt: Date;
  updatedAt: Date;

  public getId(): SyncflowId {
    return this.id;
  }

  public getStatus(): SyncflowStatus {
    return this.status;
  }
}
