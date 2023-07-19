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

export class DataProvider {
  id: ProviderId;
  externalId: string;
  type: ProviderType;
  config: ProviderConfig;
  metadata: Metadata;

  createdAt: Date;
  updatedAt: Date;
}
