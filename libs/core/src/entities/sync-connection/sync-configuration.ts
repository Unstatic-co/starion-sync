import { ProviderAuthConfig } from '../data-source';

export type SyncConnectionAuthConfig = ProviderAuthConfig | any;
export type SyncConnectionTriggerConfig = any;
export type SyncConnectionWorkflowConfig = any;

export interface SyncConnectionConfig {
  auth: SyncConnectionAuthConfig;
  trigger: SyncConnectionTriggerConfig;
  workflow: SyncConnectionWorkflowConfig;
}
