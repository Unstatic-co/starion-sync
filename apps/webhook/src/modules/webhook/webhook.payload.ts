import {
  DataSourceConfig,
  DataSourceId,
  ErrorType,
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
  isInitialSyncVersion: boolean;
}

export interface SyncflowSucceedWebhookPayload extends WebhookPayload {
  syncflowId: SyncflowId;
  dataSourceId: DataSourceId;
  syncVersion: number;
  isInitialSyncVersion: boolean;
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

export interface SyncflowFailedWebhookPayload extends WebhookPayload {
  syncflowId: SyncflowId;
  dataSourceId: DataSourceId;
  syncVersion: number;
  error: {
    type: ErrorType;
    code: number;
    message: string;
  };
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
