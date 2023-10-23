import {
  SyncConnectionId,
  Syncflow,
  SyncflowCursor,
  SyncflowId,
  TriggerId,
  WorkflowStatus,
} from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';

export interface ISyncflowRepository extends IRepository {
  getById(
    id: SyncConnectionId,
    options?: QueryOptions,
  ): Promise<Syncflow | null>;
  getByTriggerId(
    id: TriggerId,
    options?: QueryOptions,
  ): Promise<Syncflow | null>;
  create(data: CreateSyncflowData): Promise<Syncflow>;
  update(
    data: UpdateSyncflowData,
    options?: QueryOptions,
  ): Promise<Syncflow | void>;
  delete(id: string, options?: QueryOptions): Promise<void>;
  updateStatus(
    id: SyncflowId,
    status: WorkflowStatus,
    options?: QueryOptions,
  ): Promise<Syncflow | void>;
  increaseVersion(
    id: SyncflowId,
    options?: QueryOptions,
  ): Promise<Syncflow | void>;
  updateState(
    id: SyncflowId,
    state: UpdateSyncflowStateData,
    options?: QueryOptions,
  ): Promise<Syncflow | void>;
}

export type CreateSyncflowData = any;

export type UpdateSyncflowData = any;

export type UpdateSyncflowStateData = {
  status?: WorkflowStatus;
  version?: number;
  prevVersion?: number;
  cursor?: SyncflowCursor;
};
