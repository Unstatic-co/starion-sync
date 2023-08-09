import { EventName } from '@lib/core/events';

export type WebhookId = string;

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum WebhookType {
  SYNC_CONNECTION_CREATED = 'sync-connection-created',
}

export class Webhook {
  id: WebhookId;

  status: WebhookStatus;

  url: string;

  type: WebhookType;
}

export interface WebhookPayload {
  [key: string]: any;

  timestamp: Date;
}

export type WebhookConnectionCreatedPayload = WebhookPayload;
