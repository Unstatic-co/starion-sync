import {
  DataProvider,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { IRepository } from '../baseRepository';

export interface IDataProviderRepository extends IRepository {
  getById(id: ProviderId): Promise<DataProvider | null>;
  getByExternalId(id: ProviderId): Promise<DataProvider | null>;
  create(arg: CreateDataProviderArgs): Promise<DataProvider>;
  delete(id: ProviderId): Promise<void>;
}

export type CreateDataProviderArgs = {
  type: ProviderType;
  externalId: string;
  config: ProviderConfig;
  metadata?: object;
};
