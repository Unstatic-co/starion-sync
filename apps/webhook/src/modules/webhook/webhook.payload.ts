import {
  DataSourceConfig,
  DataSourceId,
  ProviderType,
  WebhookPayload,
} from '@lib/core';

export interface SyncConnectionCreatedWebhookPayload extends WebhookPayload {
  dataProvider: ProviderType;
  dataSourceId: DataSourceId;
  dataSourceConfig: DataSourceConfig;
}
