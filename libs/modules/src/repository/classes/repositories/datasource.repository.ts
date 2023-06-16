import {
  DataSource,
  DataSourceId,
  Metadata,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';

export interface IDataSourceRepository extends IRepository {
  getById(id: DataSourceId): Promise<DataSource | null>;
  getByExternalId(id: string): Promise<DataSource | null>;
  create(data: CreateDataSourceData): Promise<DataSource>;
  update(
    data: UpdateDataSourceData,
    options?: QueryOptions,
  ): Promise<DataSource | void>;
  delete(): Promise<void>;
}

export type CreateDataSourceData = {
  providerType: ProviderType;
  providerId: ProviderId;
  externalId: string;
  externalLocalId: string;
  name?: string;
  metadata: Metadata;
};

export type UpdateDataSourceData = {
  id: ProviderId;
  metadata?: object;
};
