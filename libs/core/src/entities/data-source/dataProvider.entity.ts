import { ProviderAuthConfig } from './dataSourceConfig.interface';

export type ProviderId = string;

export enum ProviderType {
  GOOGLE_SHEETS = 'google-sheets',
  MICROSOFT_EXCEL = 'microsoft-excel',
  AIR_TABLE = 'air-table',
}

export interface ProviderConfig {
  auth: ProviderAuthConfig;
  client?: ProviderClientConfig;
}

export interface ProviderClientConfig {
  [key: string]: any;
}

export class DataProvider {
  id: ProviderId;
  externalId: string;
  type: ProviderType;
  config: ProviderConfig;
  metadata: object;

  createdAt: Date;
  updatedAt: Date;
}
