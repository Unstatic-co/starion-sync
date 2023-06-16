import { DataSourceId } from '../data-source';
import { SyncConnectionAuthConfig } from '../sync-connection';

export interface SyncflowConfig {
  auth: Partial<SyncConnectionAuthConfig>;
}
