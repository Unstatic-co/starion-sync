import { DataSource, DataSourceId, ProviderId } from '@lib/core';
import { IRepository } from '../baseRepository';
import { type } from 'os';

export const DATA_SOURCE_REPOSITORY = 'DATA_SOURCE_REPOSITORY';

export interface IDataSourceRepository extends IRepository {
  getById(id: DataSourceId): Promise<DataSource>;
  create(): Promise<DataSource>;
  delete(): Promise<void>;
}

export type CreateDataSourceArgs = {
  providerId: ProviderId;
};
