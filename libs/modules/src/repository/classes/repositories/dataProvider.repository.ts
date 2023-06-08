import {
  DataProvider,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { IRepository } from '../baseRepository';

export interface IDataProviderRepository extends IRepository {
  getById(id: ProviderId): Promise<DataProvider>;
  create(arg: CreateDataProviderArgs): Promise<DataProvider>;
  delete(id: ProviderId): Promise<void>;
}

export type CreateDataProviderArgs = {
  type: ProviderType;
  config: ProviderConfig;
  metadata?: object;
};
