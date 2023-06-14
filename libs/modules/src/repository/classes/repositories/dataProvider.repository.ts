import {
  DataProvider,
  ProviderAuthConfig,
  ProviderConfig,
  ProviderId,
  ProviderType,
} from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';

export interface IDataProviderRepository extends IRepository {
  getById(id: ProviderId): Promise<DataProvider | null>;
  getByExternalId(id: string): Promise<DataProvider | null>;
  create(data: CreateDataProviderData): Promise<DataProvider>;
  update(
    data: UpdateDataProviderData,
    options?: QueryOptions,
  ): Promise<DataProvider | void>;
  delete(id: ProviderId): Promise<void>;
}

export type CreateDataProviderData = {
  type: ProviderType;
  externalId: string;
  config: ProviderConfig;
  metadata?: object;
};

export type UpdateDataProviderData = {
  id: ProviderId;
  auth?: ProviderAuthConfig;
  metadata?: object;
};
