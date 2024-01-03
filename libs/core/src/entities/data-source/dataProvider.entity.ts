import { Metadata } from '@lib/core/data-type';
import { ProviderAuthConfig } from './dataSourceConfig.interface';

export type ProviderId = string;

export enum ProviderType {
  GOOGLE_SHEETS = 'google-sheets',
  MICROSOFT_EXCEL = 'microsoft-excel',
  AIR_TABLE = 'air-table',
}

export interface ProviderConfig {
  auth: ProviderAuthConfig;
}

export interface ProviderState {
  [key: string]: any;
}

export class DataProvider {
  id: ProviderId;
  externalId: string;
  type: ProviderType;
  config: ProviderConfig;
  state?: ProviderState;
  metadata: Metadata;

  createdAt: Date;
  updatedAt: Date;
}
