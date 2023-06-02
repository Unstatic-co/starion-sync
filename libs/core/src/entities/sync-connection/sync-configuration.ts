import { ProviderAuthConfig } from '../data-source';

export type SyncConnectionAuthConfig = ProviderAuthConfig | any;

export interface SyncConnectionConfig {
  auth: SyncConnectionAuthConfig;
}
