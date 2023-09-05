import { EventName } from '@lib/core/events';
import { DataSourceId } from '../data-source';

export type WebhookId = string;

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum WebhookType {
  SYNC_CONNECTION_CREATED = 'sync-connection-created',
  DATA_SOURCE_DELETED = 'data-source-deleted',
  SYNCFLOW_SCHEDULED = 'syncflow-scheduled',
  SYNCFLOW_SUCCEED = 'syncflow-succeed',
}

export enum WebhookScope {
  GLOBAL = 'global',
  DATA_SOURCE = 'data-source',
}

export class Webhook {
  id: WebhookId;

  status: WebhookStatus;

  scope: WebhookScope;

  url: string;

  type: WebhookType;

  assure: boolean;

  dataSourceId?: DataSourceId;

  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  [key: string]: any;

  metadata?: Record<string, any>;
  timestamp?: Date;
}

export type WebhookConnectionCreatedPayload = WebhookPayload;
