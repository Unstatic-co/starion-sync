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
  syncVersion: number;
}

export interface SyncflowSucceedWebhookPayload extends WebhookPayload {
  syncflowId: SyncflowId;
  dataSourceId: DataSourceId;
  syncVersion: number;
  statistics: {
    addedRowsCount: number;
    deletedRowsCount: number;
    isSchemaChanged: boolean;
  };
}

export interface SyncflowCompletedWebhookPayload extends WebhookPayload {
  syncflowId: SyncflowId;
  dataSourceId: DataSourceId;
  rowsNumber: number;
  syncVersion: number;
}

export interface DataSourceDeletedWebhookPayload extends WebhookPayload {
  syncConnectionId?: SyncflowId;
  dataSourceId: DataSourceId;
}

export interface DataSourceErrorWebhookPayload extends WebhookPayload {
  dataSourceId: DataSourceId;
  code: number;
  message: string;
}
