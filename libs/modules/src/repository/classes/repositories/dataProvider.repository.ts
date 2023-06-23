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
  getById(id: ProviderId, options?: QueryOptions): Promise<DataProvider | null>;
  getByExternalId(
    id: string,
    options?: QueryOptions,
  ): Promise<DataProvider | null>;
  create(
    data: CreateDataProviderData,
    options?: QueryOptions,
  ): Promise<DataProvider>;
  update(
    data: UpdateDataProviderData,
    options?: QueryOptions,
  ): Promise<DataProvider | void>;
  delete(id: ProviderId, options?: QueryOptions): Promise<void>;
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
