import { SyncConnectionId, SyncflowId } from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';
import { Trigger } from '@lib/core/entities/trigger';

export interface ITriggerRepository extends IRepository {
  getById(
    id: SyncConnectionId,
    options?: QueryOptions,
  ): Promise<Trigger | null>;
  getByWorkflowId(
    id: SyncflowId,
    options?: QueryOptions,
  ): Promise<Trigger | null>;
  getByWorkflowIds(ids: SyncflowId[]): Promise<Trigger[]>;
  create(data: CreateTriggerData, options?: QueryOptions): Promise<Trigger>;
  update(
    data: UpdateTriggerData,
    options?: QueryOptions,
  ): Promise<Trigger | void>;
  delete(id: string, options?: QueryOptions): Promise<void>;
}

export type CreateTriggerData = any;

export type UpdateTriggerData = any;
