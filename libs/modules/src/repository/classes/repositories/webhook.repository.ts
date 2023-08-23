import { Webhook, WebhookId, WebhookType } from '@lib/core';
import { IRepository } from '../baseRepository';
import { QueryOptions } from '../common';

export interface IWebhookRepository extends IRepository {
  getById(id: WebhookId, options?: QueryOptions): Promise<Webhook | null>;
  getActiveWebhooksByType(
    type: WebhookType,
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
};

export type UpdateWebhookData = any;
