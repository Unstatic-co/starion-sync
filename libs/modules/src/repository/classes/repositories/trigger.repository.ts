import { DataSourceId, SyncflowId } from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';
import { Trigger, TriggerConfig, TriggerId } from '@lib/core/entities/trigger';

export interface ITriggerRepository extends IRepository {
  getById(id: TriggerId, options?: QueryOptions): Promise<Trigger | null>;
  getByDataSourceId(
    dataSourceId: DataSourceId,
    options?: QueryOptions,
  ): Promise<Trigger[]>;
  getByWorkflowId(
    id: SyncflowId,
    options?: QueryOptions,
  ): Promise<Trigger | null>;
  getByWorkflowIds(ids: SyncflowId[]): Promise<Trigger[]>;
  getByConfig(
    config: Partial<TriggerConfig>,
    options?: QueryOptions,
  ): Promise<Trigger | null>;
  create(data: CreateTriggerData, options?: QueryOptions): Promise<Trigger>;
  update(
    data: UpdateTriggerData,
    options?: QueryOptions,
  ): Promise<Trigger | void>;
  updateConfig(
    id: string,
    data: UpdateTriggerConfigData,
    options?: QueryOptions,
  ): Promise<Trigger | void>;
  delete(id: string, options?: QueryOptions): Promise<void>;
}

export type CreateTriggerData = any;

export type UpdateTriggerData = any;

export type UpdateTriggerConfigData = Partial<TriggerConfig>;
