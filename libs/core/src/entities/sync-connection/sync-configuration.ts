import { DataSourceId, ProviderAuthConfig } from '../data-source';

export type SyncConnectionAuthConfig = ProviderAuthConfig | any;
export type SyncConnectionTriggerConfig = any;

export interface SyncConnectionConfig {
  sourceId: DataSourceId;
  destinationId?: DataSourceId;
  auth: SyncConnectionAuthConfig;
  trigger: SyncConnectionTriggerConfig;
}
