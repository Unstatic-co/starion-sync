import {
  DataProvider,
  ProviderAuthConfig,
  ProviderConfig,
  ProviderId,
  ProviderState,
  ProviderType,
} from '@lib/core';
import { IRepository } from '../base';
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
  ): Promise<{
    data: DataProvider | null;
    isExist: boolean;
  }>;
  update(
    data: UpdateDataProviderData,
    options?: QueryOptions,
  ): Promise<DataProvider | void>;
  updateState(
    id: ProviderId,
    state: Partial<ProviderState>,
    options?: QueryOptions,
  ): Promise<void>;
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
