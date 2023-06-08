import { DataSource, DataSourceId, ProviderId } from '@lib/core';
import { IRepository } from '../baseRepository';

export interface IDataSourceRepository extends IRepository {
  getById(id: DataSourceId): Promise<DataSource>;
  create(): Promise<DataSource>;
  delete(): Promise<void>;
}

export type CreateDataSourceArgs = {
  providerId: ProviderId;
};
