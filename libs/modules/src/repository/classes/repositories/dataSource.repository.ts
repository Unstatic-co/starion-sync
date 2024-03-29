import {
  DataSource,
  DataSourceConfig,
  DataSourceId,
  DataSourceStatistics,
  Metadata,
  ProviderId,
  ProviderType,
  SyncConnection,
} from '@lib/core';
import { IRepository } from '../base';
import { QueryOptions } from '../common';

export interface IDataSourceRepository extends IRepository {
  getById(id: DataSourceId, options?: QueryOptions): Promise<DataSource | null>;
  getByExternalId(
    id: string,
    options?: QueryOptions,
  ): Promise<DataSource | null>;
  getByProviderId(
    id: ProviderId,
    options?: QueryOptions,
  ): Promise<DataSource[] | null>;
  create(
    data: CreateDataSourceData,
    options?: QueryOptions,
  ): Promise<DataSource>;
  update(
    data: UpdateDataSourceData,
    options?: QueryOptions,
  ): Promise<DataSource | void>;
  delete(
    id: string,
    options?: QueryOptions,
  ): Promise<{
    dataSource: DataSource;
    syncConnection?: SyncConnection;
  } | void>;
  updateStatistics(
    id: string,
    data: UpdateDataSourceStatisticsData,
    options?: QueryOptions,
  ): Promise<void>;
}

export type CreateDataSourceData = {
  providerType: ProviderType;
  providerId: ProviderId;
  externalId: string;
  externalLocalId: string;
  config: DataSourceConfig;
  name?: string;
  metadata: Metadata;
};

export type UpdateDataSourceData = {
  id: ProviderId;
  metadata?: object;
};

export type UpdateDataSourceStatisticsData = Partial<DataSourceStatistics>;
