import { ProviderAuthConfig } from './dataSourceConfig.entities';

export type ProviderId = string;

export enum ProviderType {
  GOOGLE_SHEETS = 'google-sheets',
  AIR_TABLE = 'air-table',
}

export class ProviderConfig {
  auth: ProviderAuthConfig;
}

export class DataProvider {
  id: ProviderId;
  type: ProviderType;
  config: ProviderConfig;
  metadata: object;

  createdAt: Date;
  updatedAt: Date;
}
