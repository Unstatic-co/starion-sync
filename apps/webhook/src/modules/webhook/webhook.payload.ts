import {
  DataSourceConfig,
  DataSourceId,
  ProviderType,
  SyncflowId,
  WebhookPayload,
} from '@lib/core';

export interface SyncConnectionCreatedWebhookPayload extends WebhookPayload {
  dataProvider: ProviderType;
  dataSourceId: DataSourceId;
  dataSourceConfig: DataSourceConfig;
}

export interface SyncflowScheduledWebhookPayload extends WebhookPayload {
  syncflowId: SyncflowId;
  dataSourceId: DataSourceId;
}
