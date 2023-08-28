import { DataSource, Trigger } from '@lib/core';

export abstract class WebhookService {
  abstract createWebhook(data: {
    trigger: Trigger;
    dataSource: DataSource;
  }): Promise<void>;

  abstract stopWebhook(data: any): Promise<void>;
}
