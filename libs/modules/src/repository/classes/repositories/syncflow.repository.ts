import {
  SyncConnectionId,
  Syncflow,
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
}

export type CreateSyncflowData = any;

export type UpdateSyncflowData = any;
