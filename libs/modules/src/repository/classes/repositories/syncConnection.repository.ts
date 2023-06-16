import {
  DataSourceId,
  ProviderId,
  SyncConnection,
  SyncConnectionConfig,
  SyncConnectionId,
  SyncflowAttributes,
  SyncflowConfig,
  SyncflowName,
} from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';
import { TriggerName } from '@lib/core/entities/trigger';
import { TriggerConfig } from '@lib/core/entities/trigger/trigger.config';

export interface ISyncConnectionRepository extends IRepository {
  getById(id: SyncConnectionId): Promise<SyncConnection | null>;
  getByDataSourceId(id: DataSourceId): Promise<SyncConnection | null>;
  create(data: CreateSyncConnectionData): Promise<SyncConnection>;
  update(
    data: UpdateSyncConnectionData,
    options?: QueryOptions,
  ): Promise<SyncConnection | void>;
  delete(): Promise<void>;
}

export type CreateSyncConnectionData = {
  config?: SyncConnectionConfig;
  sourceId: DataSourceId;
  syncflows: Array<{
    name: SyncflowName;
    attributes: SyncflowAttributes;
    trigger: {
      name: TriggerName;
      config?: TriggerConfig;
    };
    config?: SyncflowConfig;
  }>;
};

export type UpdateSyncConnectionData = {
  id: ProviderId;
};
