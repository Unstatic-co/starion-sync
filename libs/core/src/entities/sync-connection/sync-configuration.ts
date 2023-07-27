import { DataSourceAuthConfig, ProviderAuthConfig } from '../data-source';
import { TriggerConfig } from '../trigger/trigger.config';

export type SyncConnectionAuthConfig =
  | ProviderAuthConfig
  | DataSourceAuthConfig
  | any;
export type SyncConnectionTriggerConfig = TriggerConfig;

export interface SyncConnectionConfig {
  auth?: SyncConnectionAuthConfig;
  trigger?: SyncConnectionTriggerConfig;
}
