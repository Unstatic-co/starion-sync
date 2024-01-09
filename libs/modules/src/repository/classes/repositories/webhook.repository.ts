import {
  DataSourceId,
  Webhook,
  WebhookId,
  WebhookScope,
  WebhookType,
} from '@lib/core';
import { IRepository } from '../base';
import { QueryOptions } from '../common';

export interface IWebhookRepository extends IRepository {
  getById(id: WebhookId, options?: QueryOptions): Promise<Webhook | null>;
  getActiveWebhooksByType(
    data: {
      type: WebhookType;
      scope?: WebhookScope;
      dataSourceId?: DataSourceId;
    },
    options?: QueryOptions,
  ): Promise<Webhook[]>;
  create(data: CreateWebhookData, options?: QueryOptions): Promise<Webhook>;
  bulkCreate(data: CreateWebhookData[], options?: QueryOptions): Promise<void>;
  update(
    data: UpdateWebhookData,
    options?: QueryOptions,
  ): Promise<Webhook | void>;
  delete(id: string, options?: QueryOptions): Promise<void>;
}

export type CreateWebhookData = {
  type: WebhookType;
  url: string;
  scope: WebhookScope;
  dataSourceId?: DataSourceId;
  assure?: boolean;
  metadata?: Record<string, any>;
};

export type UpdateWebhookData = any;
